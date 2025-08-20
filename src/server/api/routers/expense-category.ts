import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationRole } from "@prisma/client";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const expenseCategoryRouter = createTRPCRouter({
  // Create a new expense category (admin only)
  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
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
          message: "Only organization admins can create expense categories",
        });
      }

      // Check if category name already exists in this organization
      const existingCategory = await ctx.db.expenseCategory.findFirst({
        where: {
          organizationId: input.organizationId,
          name: input.name,
        },
      });

      if (existingCategory) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A category with this name already exists in this organization",
        });
      }

      return ctx.db.expenseCategory.create({
        data: {
          name: input.name,
          description: input.description,
          organizationId: input.organizationId,
        },
      });
    }),

  // Get all categories for an organization (members can view)
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

      return ctx.db.expenseCategory.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { name: "asc" },
      });
    }),

  // Get a specific category by ID (members can view)
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const category = await ctx.db.expenseCategory.findUnique({
        where: { id: input.id },
        include: {
          organization: {
            select: { id: true, name: true },
          },
        },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense category not found",
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

      return category;
    }),

  // Update an expense category (admin only)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const category = await ctx.db.expenseCategory.findUnique({
        where: { id: input.id },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense category not found",
        });
      }

      // Check if user is admin of the organization
      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: category.organizationId,
          },
        },
      });

      if (!membership || membership.role !== OrganizationRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can update expense categories",
        });
      }

      // If updating name, check for duplicates
      if (input.name && input.name !== category.name) {
        const existingCategory = await ctx.db.expenseCategory.findFirst({
          where: {
            organizationId: category.organizationId,
            name: input.name,
            id: { not: input.id },
          },
        });

        if (existingCategory) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A category with this name already exists in this organization",
          });
        }
      }

      const { id, ...updateData } = input;
      return ctx.db.expenseCategory.update({
        where: { id },
        data: updateData,
      });
    }),

  // Delete an expense category (admin only)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const category = await ctx.db.expenseCategory.findUnique({
        where: { id: input.id },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense category not found",
        });
      }

      // Check if user is admin of the organization
      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: category.organizationId,
          },
        },
      });

      if (!membership || membership.role !== OrganizationRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can delete expense categories",
        });
      }

      // TODO: In the future, check if category is being used by any expenses
      // For now, we'll allow deletion but this should be implemented when expenses are added

      return ctx.db.expenseCategory.delete({
        where: { id: input.id },
      });
    }),
});
