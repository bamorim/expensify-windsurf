import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationRole, PolicyPeriod, PolicyReviewRule } from "@prisma/client";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const policyRouter = createTRPCRouter({
  // Create a new policy (admin only)
  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        categoryId: z.string(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        maxAmount: z.number().positive(),
        period: z.nativeEnum(PolicyPeriod),
        reviewRule: z.nativeEnum(PolicyReviewRule),
        autoApproveThreshold: z.number().positive().optional(),
        isUserSpecific: z.boolean().default(false),
        userId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin of the organization
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
          message: "Only organization admins can create policies",
        });
      }

      // Validate that category belongs to the organization
      const category = await ctx.db.expenseCategory.findFirst({
        where: {
          id: input.categoryId,
          organizationId: input.organizationId,
        },
      });

      if (!category) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Category not found in this organization",
        });
      }

      // Validate user-specific policy requirements
      if (input.isUserSpecific) {
        if (!input.userId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User ID is required for user-specific policies",
          });
        }

        // Check if user is a member of the organization
        const userMembership = await ctx.db.organizationMembership.findUnique({
          where: {
            userId_organizationId: {
              userId: input.userId,
              organizationId: input.organizationId,
            },
          },
        });

        if (!userMembership) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User is not a member of this organization",
          });
        }
      }

      // Check for existing policy with same org/category/user combination
      const existingPolicy = await ctx.db.policy.findFirst({
        where: {
          organizationId: input.organizationId,
          categoryId: input.categoryId,
          userId: input.isUserSpecific ? input.userId : null,
        },
      });

      if (existingPolicy) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: input.isUserSpecific
            ? "A user-specific policy already exists for this category and user"
            : "An organization-wide policy already exists for this category",
        });
      }

      // Validate conditional review settings
      if (input.reviewRule === PolicyReviewRule.CONDITIONAL && !input.autoApproveThreshold) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Auto-approve threshold is required for conditional review policies",
        });
      }

      return ctx.db.policy.create({
        data: {
          name: input.name,
          description: input.description,
          maxAmount: input.maxAmount,
          period: input.period,
          reviewRule: input.reviewRule,
          autoApproveThreshold: input.autoApproveThreshold,
          isUserSpecific: input.isUserSpecific,
          organizationId: input.organizationId,
          categoryId: input.categoryId,
          userId: input.isUserSpecific ? input.userId : null,
        },
        include: {
          category: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    }),

  // Get all policies for an organization (members can view)
  getByOrganization: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check if user is a member of the organization
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
          code: "FORBIDDEN",
          message: "You are not a member of this organization",
        });
      }

      return ctx.db.policy.findMany({
        where: { organizationId: input.organizationId },
        include: {
          category: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [
          { isUserSpecific: "asc" }, // Organization-wide first
          { category: { name: "asc" } },
          { name: "asc" },
        ],
      });
    }),

  // Get policies for a specific category (members can view)
  getByCategory: protectedProcedure
    .input(z.object({ categoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      const category = await ctx.db.expenseCategory.findUnique({
        where: { id: input.categoryId },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      // Check if user is a member of the organization
      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: category.organizationId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this organization",
        });
      }

      return ctx.db.policy.findMany({
        where: { categoryId: input.categoryId },
        include: {
          category: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [
          { isUserSpecific: "asc" }, // Organization-wide first
          { name: "asc" },
        ],
      });
    }),

  // Get a specific policy by ID (members can view)
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const policy = await ctx.db.policy.findUnique({
        where: { id: input.id },
        include: {
          category: true,
          user: {
            select: { id: true, name: true, email: true },
          },
          organization: {
            select: { id: true, name: true },
          },
        },
      });

      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Policy not found",
        });
      }

      // Check if user is a member of the organization
      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: policy.organizationId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this organization",
        });
      }

      return policy;
    }),

  // Policy resolution engine - get applicable policy for user and category
  resolvePolicy: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        categoryId: z.string(),
        userId: z.string().optional(), // If not provided, uses current user
      }),
    )
    .query(async ({ ctx, input }) => {
      const targetUserId = input.userId ?? ctx.session.user.id;

      // Check if user is a member of the organization
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
          code: "FORBIDDEN",
          message: "You are not a member of this organization",
        });
      }

      // If querying for another user, ensure current user is admin
      if (input.userId && input.userId !== ctx.session.user.id) {
        if (membership.role !== OrganizationRole.ADMIN) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can resolve policies for other users",
          });
        }
      }

      // Find all applicable policies with precedence rules:
      // 1. User-specific policies take precedence over organization-wide
      // 2. If no user-specific policy exists, use organization-wide policy
      const policies = await ctx.db.policy.findMany({
        where: {
          organizationId: input.organizationId,
          categoryId: input.categoryId,
          OR: [
            { isUserSpecific: false, userId: null }, // Organization-wide
            { isUserSpecific: true, userId: targetUserId }, // User-specific
          ],
        },
        include: {
          category: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [
          { isUserSpecific: "desc" }, // User-specific first (higher precedence)
          { createdAt: "desc" }, // Most recent if multiple exist
        ],
      });

      if (policies.length === 0) {
        return null; // No applicable policy found
      }

      // Return the highest precedence policy (first in the ordered list)
      const applicablePolicy = policies[0]!;

      return {
        policy: applicablePolicy,
        precedenceInfo: {
          totalPoliciesFound: policies.length,
          isUserSpecific: applicablePolicy.isUserSpecific,
          hasOrganizationWidePolicy: policies.some(p => !p.isUserSpecific),
          hasUserSpecificPolicy: policies.some(p => p.isUserSpecific),
        },
      };
    }),

  // Update a policy (admin only)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        maxAmount: z.number().positive().optional(),
        period: z.nativeEnum(PolicyPeriod).optional(),
        reviewRule: z.nativeEnum(PolicyReviewRule).optional(),
        autoApproveThreshold: z.number().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const policy = await ctx.db.policy.findUnique({
        where: { id: input.id },
      });

      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Policy not found",
        });
      }

      // Check if user is admin of the organization
      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: policy.organizationId,
          },
        },
      });

      if (!membership || membership.role !== OrganizationRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can update policies",
        });
      }

      // Validate conditional review settings
      const newReviewRule = input.reviewRule ?? policy.reviewRule;
      const newAutoApproveThreshold = input.autoApproveThreshold ?? policy.autoApproveThreshold;

      if (newReviewRule === PolicyReviewRule.CONDITIONAL && !newAutoApproveThreshold) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Auto-approve threshold is required for conditional review policies",
        });
      }

      const { id, ...updateData } = input;
      return ctx.db.policy.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    }),

  // Delete a policy (admin only)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const policy = await ctx.db.policy.findUnique({
        where: { id: input.id },
      });

      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Policy not found",
        });
      }

      // Check if user is admin of the organization
      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: policy.organizationId,
          },
        },
      });

      if (!membership || membership.role !== OrganizationRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can delete policies",
        });
      }

      // TODO: In the future, check if policy is being used by any expenses
      // For now, we'll allow deletion but this should be implemented when expenses are added

      return ctx.db.policy.delete({
        where: { id: input.id },
      });
    }),
});
