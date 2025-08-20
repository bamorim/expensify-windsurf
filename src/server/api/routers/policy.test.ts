import { describe, it, expect, beforeEach, vi } from "vitest";
import { policyRouter } from "./policy";
import { db } from "~/server/db";
import { OrganizationRole, PolicyPeriod, PolicyReviewRule } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";

// Mock the database to use the transactional testing wrapper
vi.mock("~/server/db");

// Mock the auth module
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

describe("Policy Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create organization-wide policy when user is admin", async () => {
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
          description: "Travel expenses",
          organizationId: organization.id,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.create({
        organizationId: organization.id,
        categoryId: category.id,
        name: "Travel Policy",
        description: "Standard travel policy",
        maxAmount: 500,
        period: PolicyPeriod.MONTHLY,
        reviewRule: PolicyReviewRule.MANUAL_REVIEW,
        isUserSpecific: false,
      });

      expect(result).toHaveProperty("id");
      expect(result.name).toBe("Travel Policy");
      expect(result.description).toBe("Standard travel policy");
      expect(Number(result.maxAmount)).toBe(500);
      expect(result.period).toBe(PolicyPeriod.MONTHLY);
      expect(result.reviewRule).toBe(PolicyReviewRule.MANUAL_REVIEW);
      expect(result.isUserSpecific).toBe(false);
      expect(result.organizationId).toBe(organization.id);
      expect(result.categoryId).toBe(category.id);
      expect(result.userId).toBeNull();
    });

    it("should create user-specific policy when user is admin", async () => {
      const adminUser = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      const targetUser = await db.user.create({
        data: {
          name: "Target User",
          email: faker.internet.email(),
        },
      });

      const organization = await db.organization.create({
        data: {
          name: "Test Org",
          createdById: adminUser.id,
        },
      });

      await db.organizationMembership.create({
        data: {
          userId: adminUser.id,
          organizationId: organization.id,
          role: OrganizationRole.ADMIN,
        },
      });

      await db.organizationMembership.create({
        data: {
          userId: targetUser.id,
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
        user: adminUser,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.create({
        organizationId: organization.id,
        categoryId: category.id,
        name: "User Travel Policy",
        maxAmount: 1000,
        period: PolicyPeriod.MONTHLY,
        reviewRule: PolicyReviewRule.AUTO_APPROVE,
        isUserSpecific: true,
        userId: targetUser.id,
      });

      expect(result).toHaveProperty("id");
      expect(result.name).toBe("User Travel Policy");
      expect(Number(result.maxAmount)).toBe(1000);
      expect(result.isUserSpecific).toBe(true);
      expect(result.userId).toBe(targetUser.id);
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

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.create({
          organizationId: organization.id,
          categoryId: category.id,
          name: "Travel Policy",
          maxAmount: 500,
          period: PolicyPeriod.MONTHLY,
          reviewRule: PolicyReviewRule.MANUAL_REVIEW,
          isUserSpecific: false,
        }),
      ).rejects.toThrow("Only organization admins can create policies");
    });

    it("should throw BAD_REQUEST for conditional policy without threshold", async () => {
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

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.create({
          organizationId: organization.id,
          categoryId: category.id,
          name: "Travel Policy",
          maxAmount: 500,
          period: PolicyPeriod.MONTHLY,
          reviewRule: PolicyReviewRule.CONDITIONAL,
          isUserSpecific: false,
        }),
      ).rejects.toThrow("Auto-approve threshold is required for conditional review policies");
    });
  });

  describe("resolvePolicy", () => {
    it("should return user-specific policy when available", async () => {
      const user = await db.user.create({
        data: {
          name: "Test User",
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

      // Create organization-wide policy
      await db.policy.create({
        data: {
          name: "Org Travel Policy",
          maxAmount: 500,
          period: PolicyPeriod.MONTHLY,
          reviewRule: PolicyReviewRule.MANUAL_REVIEW,
          isUserSpecific: false,
          organizationId: organization.id,
          categoryId: category.id,
        },
      });

      // Create user-specific policy (should take precedence)
      await db.policy.create({
        data: {
          name: "User Travel Policy",
          maxAmount: 1000,
          period: PolicyPeriod.MONTHLY,
          reviewRule: PolicyReviewRule.AUTO_APPROVE,
          isUserSpecific: true,
          organizationId: organization.id,
          categoryId: category.id,
          userId: user.id,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.resolvePolicy({
        organizationId: organization.id,
        categoryId: category.id,
      });

      expect(result).toBeTruthy();
      expect(result!.policy.name).toBe("User Travel Policy");
      expect(Number(result!.policy.maxAmount)).toBe(1000);
      expect(result!.policy.isUserSpecific).toBe(true);
      expect(result!.precedenceInfo.isUserSpecific).toBe(true);
      expect(result!.precedenceInfo.hasUserSpecificPolicy).toBe(true);
      expect(result!.precedenceInfo.hasOrganizationWidePolicy).toBe(true);
    });

    it("should return organization-wide policy when no user-specific exists", async () => {
      const user = await db.user.create({
        data: {
          name: "Test User",
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

      // Create only organization-wide policy
      await db.policy.create({
        data: {
          name: "Org Travel Policy",
          maxAmount: 500,
          period: PolicyPeriod.MONTHLY,
          reviewRule: PolicyReviewRule.MANUAL_REVIEW,
          isUserSpecific: false,
          organizationId: organization.id,
          categoryId: category.id,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.resolvePolicy({
        organizationId: organization.id,
        categoryId: category.id,
      });

      expect(result).toBeTruthy();
      expect(result!.policy.name).toBe("Org Travel Policy");
      expect(Number(result!.policy.maxAmount)).toBe(500);
      expect(result!.policy.isUserSpecific).toBe(false);
      expect(result!.precedenceInfo.isUserSpecific).toBe(false);
      expect(result!.precedenceInfo.hasUserSpecificPolicy).toBe(false);
      expect(result!.precedenceInfo.hasOrganizationWidePolicy).toBe(true);
    });

    it("should return null when no policies exist", async () => {
      const user = await db.user.create({
        data: {
          name: "Test User",
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

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.resolvePolicy({
        organizationId: organization.id,
        categoryId: category.id,
      });

      expect(result).toBeNull();
    });
  });

  describe("getByOrganization", () => {
    it("should return all policies for organization members", async () => {
      const user = await db.user.create({
        data: {
          name: "Test User",
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

      await db.policy.create({
        data: {
          name: "Travel Policy",
          maxAmount: 500,
          period: PolicyPeriod.MONTHLY,
          reviewRule: PolicyReviewRule.MANUAL_REVIEW,
          isUserSpecific: false,
          organizationId: organization.id,
          categoryId: category.id,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.getByOrganization({
        organizationId: organization.id,
      });

      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe("Travel Policy");
      expect(result[0]!.organizationId).toBe(organization.id);
    });

    it("should throw FORBIDDEN when user is not a member", async () => {
      const user = await db.user.create({
        data: {
          name: "Test User",
          email: faker.internet.email(),
        },
      });

      const otherUser = await db.user.create({
        data: {
          name: "Other User",
          email: faker.internet.email(),
        },
      });

      const organization = await db.organization.create({
        data: {
          name: "Test Org",
          createdById: otherUser.id,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.getByOrganization({
          organizationId: organization.id,
        }),
      ).rejects.toThrow("You are not a member of this organization");
    });
  });
});
