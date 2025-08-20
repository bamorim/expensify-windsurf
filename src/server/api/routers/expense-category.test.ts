import { describe, it, expect, beforeEach, vi } from "vitest";
import { expenseCategoryRouter } from "./expense-category";
import { db } from "~/server/db";
import { OrganizationRole } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";

// Mock the database to use the transactional testing wrapper
vi.mock("~/server/db");

// Mock the auth module
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

describe("Expense Category Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create expense category when user is admin", async () => {
      const user = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      const organization = await db.organization.create({
        data: {
          name: "Test Org",
          createdById: user.id,
        },
      });

      await db.organizationMembership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: OrganizationRole.ADMIN,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.create({
        organizationId: organization.id,
        name: "Travel",
        description: "Travel expenses",
      });

      expect(result).toHaveProperty("id");
      expect(result.name).toBe("Travel");
      expect(result.description).toBe("Travel expenses");
      expect(result.organizationId).toBe(organization.id);
    });

    it("should throw FORBIDDEN when user is not admin", async () => {
      const user = await db.user.create({
        data: {
          name: "Member User",
          email: faker.internet.email(),
        },
      });

      const organization = await db.organization.create({
        data: {
          name: "Test Org",
          createdById: user.id,
        },
      });

      await db.organizationMembership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: OrganizationRole.MEMBER,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.create({
          organizationId: organization.id,
          name: "Travel",
          description: "Travel expenses",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should throw FORBIDDEN when user is not a member", async () => {
      const user = await db.user.create({
        data: {
          name: "Non-member User",
          email: faker.internet.email(),
        },
      });

      const organization = await db.organization.create({
        data: {
          name: "Test Org",
          createdById: user.id,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.create({
          organizationId: organization.id,
          name: "Travel",
          description: "Travel expenses",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should throw BAD_REQUEST when category name already exists", async () => {
      const user = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      const organization = await db.organization.create({
        data: {
          name: "Test Org",
          createdById: user.id,
        },
      });

      await db.organizationMembership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: OrganizationRole.ADMIN,
        },
      });

      await db.expenseCategory.create({
        data: {
          name: "Travel",
          organizationId: organization.id,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.create({
          organizationId: organization.id,
          name: "Travel",
          description: "Duplicate travel category",
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("getByOrganization", () => {
    it("should return categories for organization member", async () => {
      const user = await db.user.create({
        data: {
          name: "Member User",
          email: faker.internet.email(),
        },
      });

      const organization = await db.organization.create({
        data: {
          name: "Test Org",
          createdById: user.id,
        },
      });

      await db.organizationMembership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: OrganizationRole.MEMBER,
        },
      });

      await db.expenseCategory.create({
        data: {
          name: "Travel",
          organizationId: organization.id,
        },
      });

      await db.expenseCategory.create({
        data: {
          name: "Office Supplies",
          organizationId: organization.id,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.getByOrganization({
        organizationId: organization.id,
      });

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.name)).toContain("Travel");
      expect(result.map((c) => c.name)).toContain("Office Supplies");
    });

    it("should throw FORBIDDEN when user is not a member", async () => {
      const user = await db.user.create({
        data: {
          name: "Non-member User",
          email: faker.internet.email(),
        },
      });

      const organization = await db.organization.create({
        data: {
          name: "Test Org",
          createdById: user.id,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.getByOrganization({
          organizationId: organization.id,
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("update", () => {
    it("should update category when user is admin", async () => {
      const user = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      const organization = await db.organization.create({
        data: {
          name: "Test Org",
          createdById: user.id,
        },
      });

      await db.organizationMembership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: OrganizationRole.ADMIN,
        },
      });

      const category = await db.expenseCategory.create({
        data: {
          name: "Travel",
          organizationId: organization.id,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.update({
        id: category.id,
        name: "Business Travel",
        description: "Updated description",
      });

      expect(result.name).toBe("Business Travel");
      expect(result.description).toBe("Updated description");
    });

    it("should throw FORBIDDEN when user is not admin", async () => {
      const user = await db.user.create({
        data: {
          name: "Member User",
          email: faker.internet.email(),
        },
      });

      const organization = await db.organization.create({
        data: {
          name: "Test Org",
          createdById: user.id,
        },
      });

      await db.organizationMembership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: OrganizationRole.MEMBER,
        },
      });

      const category = await db.expenseCategory.create({
        data: {
          name: "Travel",
          organizationId: organization.id,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.update({
          id: category.id,
          name: "Business Travel",
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("delete", () => {
    it("should delete category when user is admin", async () => {
      const user = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      const organization = await db.organization.create({
        data: {
          name: "Test Org",
          createdById: user.id,
        },
      });

      await db.organizationMembership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: OrganizationRole.ADMIN,
        },
      });

      const category = await db.expenseCategory.create({
        data: {
          name: "Travel",
          organizationId: organization.id,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.delete({
        id: category.id,
      });

      expect(result.id).toBe(category.id);
    });

    it("should throw FORBIDDEN when user is not admin", async () => {
      const user = await db.user.create({
        data: {
          name: "Member User",
          email: faker.internet.email(),
        },
      });

      const organization = await db.organization.create({
        data: {
          name: "Test Org",
          createdById: user.id,
        },
      });

      await db.organizationMembership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: OrganizationRole.MEMBER,
        },
      });

      const category = await db.expenseCategory.create({
        data: {
          name: "Travel",
          organizationId: organization.id,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.delete({
          id: category.id,
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("organization data isolation", () => {
    it("should only return categories from the specified organization", async () => {
      const user = await db.user.create({
        data: {
          name: "User",
          email: faker.internet.email(),
        },
      });

      const org1 = await db.organization.create({
        data: {
          name: "Org 1",
          createdById: user.id,
        },
      });

      const org2 = await db.organization.create({
        data: {
          name: "Org 2",
          createdById: user.id,
        },
      });

      // Add user to both organizations
      await db.organizationMembership.create({
        data: {
          userId: user.id,
          organizationId: org1.id,
          role: OrganizationRole.MEMBER,
        },
      });

      await db.organizationMembership.create({
        data: {
          userId: user.id,
          organizationId: org2.id,
          role: OrganizationRole.MEMBER,
        },
      });

      // Create categories in both organizations
      await db.expenseCategory.create({
        data: {
          name: "Org1 Travel",
          organizationId: org1.id,
        },
      });

      await db.expenseCategory.create({
        data: {
          name: "Org2 Travel",
          organizationId: org2.id,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const org1Categories = await caller.getByOrganization({
        organizationId: org1.id,
      });

      const org2Categories = await caller.getByOrganization({
        organizationId: org2.id,
      });

      expect(org1Categories).toHaveLength(1);
      expect(org1Categories[0]?.name).toBe("Org1 Travel");

      expect(org2Categories).toHaveLength(1);
      expect(org2Categories[0]?.name).toBe("Org2 Travel");
    });
  });
});
