import { describe, it, expect, beforeEach, vi } from "vitest";
import { organizationRouter } from "./organization";
import { db } from "~/server/db";
import { OrganizationRole } from "@prisma/client";
import { faker } from "@faker-js/faker";

// Mock the database to use the transactional testing wrapper
vi.mock("~/server/db");

// Mock the auth module
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

describe("Organization Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create organization and add creator as admin", async () => {
      const user = await db.user.create({
        data: {
          name: "Test User",
          email: faker.internet.email(),
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = organizationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.create({
        name: "Test Org",
        description: "Test Description",
      });

      expect(result).toHaveProperty("id");
      expect(result.name).toBe("Test Org");
      expect(result.description).toBe("Test Description");
      expect(result.memberships).toHaveLength(1);
      expect(result.memberships[0]?.role).toBe(OrganizationRole.ADMIN);
    });

    it("should validate required fields", async () => {
      const user = await db.user.create({
        data: {
          name: "Test User",
          email: faker.internet.email(),
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = organizationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(caller.create({ name: "" })).rejects.toThrow();
    });
  });

  describe("getMyOrganizations", () => {
    it("should return user's organizations", async () => {
      const user = await db.user.create({
        data: {
          name: "Test User",
          email: faker.internet.email(),
        },
      });

      // Create organization first
      const organization = await db.organization.create({
        data: {
          name: "Test Org",
          description: "Test Description",
          createdById: user.id,
        },
      });

      // Create membership
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

      const caller = organizationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.getMyOrganizations();

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Test Org");
      expect(result[0]?.role).toBe(OrganizationRole.ADMIN);
    });
  });
});
