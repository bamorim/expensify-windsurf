import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationRole, InvitationStatus } from "@prisma/client";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const organizationRouter = createTRPCRouter({
  // Create a new organization
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Create organization and automatically add creator as admin
      const organization = await ctx.db.organization.create({
        data: {
          name: input.name,
          description: input.description,
          createdBy: { connect: { id: ctx.session.user.id } },
          memberships: {
            create: {
              userId: ctx.session.user.id,
              role: OrganizationRole.ADMIN,
            },
          },
        },
        include: {
          memberships: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });

      return organization;
    }),

  // Get user's organizations
  getMyOrganizations: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.organizationMembership.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        organization: {
          include: {
            _count: {
              select: { memberships: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    return memberships.map((membership) => ({
      ...membership.organization,
      role: membership.role,
      joinedAt: membership.joinedAt,
      memberCount: membership.organization._count.memberships,
    }));
  }),

  // Get organization details (requires membership)
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check if user is a member
      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: input.id,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this organization",
        });
      }

      const organization = await ctx.db.organization.findUnique({
        where: { id: input.id },
        include: {
          memberships: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { joinedAt: "asc" },
          },
          invitations: {
            where: { status: InvitationStatus.PENDING },
            orderBy: { createdAt: "desc" },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      return {
        ...organization,
        userRole: membership.role,
      };
    }),

  // Update organization (admin only)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: input.id,
          },
        },
      });

      if (!membership || membership.role !== OrganizationRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can update organization details",
        });
      }

      const { id, ...updateData } = input;
      return ctx.db.organization.update({
        where: { id },
        data: updateData,
      });
    }),

  // Remove member (admin only, cannot remove self if last admin)
  removeMember: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if current user is admin
      const currentUserMembership =
        await ctx.db.organizationMembership.findUnique({
          where: {
            userId_organizationId: {
              userId: ctx.session.user.id,
              organizationId: input.organizationId,
            },
          },
        });

      if (
        !currentUserMembership ||
        currentUserMembership.role !== OrganizationRole.ADMIN
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can remove members",
        });
      }

      // Prevent removing self if last admin
      if (input.userId === ctx.session.user.id) {
        const adminCount = await ctx.db.organizationMembership.count({
          where: {
            organizationId: input.organizationId,
            role: OrganizationRole.ADMIN,
          },
        });

        if (adminCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot remove the last admin from the organization",
          });
        }
      }

      return ctx.db.organizationMembership.delete({
        where: {
          userId_organizationId: {
            userId: input.userId,
            organizationId: input.organizationId,
          },
        },
      });
    }),

  // Update member role (admin only)
  updateMemberRole: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        userId: z.string(),
        role: z.nativeEnum(OrganizationRole),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if current user is admin
      const currentUserMembership =
        await ctx.db.organizationMembership.findUnique({
          where: {
            userId_organizationId: {
              userId: ctx.session.user.id,
              organizationId: input.organizationId,
            },
          },
        });

      if (
        !currentUserMembership ||
        currentUserMembership.role !== OrganizationRole.ADMIN
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can update member roles",
        });
      }

      // Prevent demoting self if last admin
      if (
        input.userId === ctx.session.user.id &&
        input.role !== OrganizationRole.ADMIN
      ) {
        const adminCount = await ctx.db.organizationMembership.count({
          where: {
            organizationId: input.organizationId,
            role: OrganizationRole.ADMIN,
          },
        });

        if (adminCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot demote the last admin of the organization",
          });
        }
      }

      return ctx.db.organizationMembership.update({
        where: {
          userId_organizationId: {
            userId: input.userId,
            organizationId: input.organizationId,
          },
        },
        data: { role: input.role },
      });
    }),

  // Leave organization (cannot leave if last admin)
  leave: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: input.organizationId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You are not a member of this organization",
        });
      }

      // Prevent leaving if last admin
      if (membership.role === OrganizationRole.ADMIN) {
        const adminCount = await ctx.db.organizationMembership.count({
          where: {
            organizationId: input.organizationId,
            role: OrganizationRole.ADMIN,
          },
        });

        if (adminCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot leave organization as the last admin. Please promote another member to admin first.",
          });
        }
      }

      return ctx.db.organizationMembership.delete({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: input.organizationId,
          },
        },
      });
    }),

  // Invitation System
  // Send invitation (admin only)
  inviteUser: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        email: z.string().email(),
        role: z.nativeEnum(OrganizationRole).default(OrganizationRole.MEMBER),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if current user is admin
      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: input.organizationId,
          },
        },
      });

      if (!membership || membership.role !== OrganizationRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can invite users",
        });
      }

      // Check if user is already a member
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
        include: {
          memberships: {
            where: { organizationId: input.organizationId },
          },
        },
      });

      if (existingUser?.memberships.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is already a member of this organization",
        });
      }

      // Check if there's already a pending invitation
      const existingInvitation = await ctx.db.organizationInvitation.findFirst({
        where: {
          email: input.email,
          organizationId: input.organizationId,
          status: InvitationStatus.PENDING,
        },
      });

      if (existingInvitation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "There is already a pending invitation for this email",
        });
      }

      // Create invitation (expires in 7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      return ctx.db.organizationInvitation.create({
        data: {
          email: input.email,
          role: input.role,
          expiresAt,
          organizationId: input.organizationId,
          invitedById: ctx.session.user.id,
        },
        include: {
          organization: {
            select: { name: true },
          },
          invitedBy: {
            select: { name: true, email: true },
          },
        },
      });
    }),

  // Accept invitation
  acceptInvitation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.organizationInvitation.findUnique({
        where: { token: input.token },
        include: { organization: true },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has already been processed",
        });
      }

      if (invitation.expiresAt < new Date()) {
        await ctx.db.organizationInvitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.EXPIRED },
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has expired",
        });
      }

      if (invitation.email !== ctx.session.user.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation is not for your email address",
        });
      }

      // Check if user is already a member
      const existingMembership = await ctx.db.organizationMembership.findUnique(
        {
          where: {
            userId_organizationId: {
              userId: ctx.session.user.id,
              organizationId: invitation.organizationId,
            },
          },
        },
      );

      if (existingMembership) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are already a member of this organization",
        });
      }

      // Accept invitation - create membership and update invitation status
      const [membership] = await ctx.db.$transaction([
        ctx.db.organizationMembership.create({
          data: {
            userId: ctx.session.user.id,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
        }),
        ctx.db.organizationInvitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.ACCEPTED },
        }),
      ]);

      return {
        membership,
        organization: invitation.organization,
      };
    }),

  // Reject invitation
  rejectInvitation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.organizationInvitation.findUnique({
        where: { token: input.token },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      if (invitation.email !== ctx.session.user.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation is not for your email address",
        });
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has already been processed",
        });
      }

      return ctx.db.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.REJECTED },
      });
    }),

  // Get user's pending invitations
  getMyInvitations: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.organizationInvitation.findMany({
      where: {
        email: ctx.session.user.email!,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      include: {
        organization: {
          select: { id: true, name: true, description: true },
        },
        invitedBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // Cancel invitation (admin only)
  cancelInvitation: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.organizationInvitation.findUnique({
        where: { id: input.invitationId },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Check if current user is admin of the organization
      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: invitation.organizationId,
          },
        },
      });

      if (!membership || membership.role !== OrganizationRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can cancel invitations",
        });
      }

      return ctx.db.organizationInvitation.delete({
        where: { id: input.invitationId },
      });
    }),
});
