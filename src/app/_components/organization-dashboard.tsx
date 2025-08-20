"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { OrganizationRole } from "@prisma/client";
import { ExpenseCategoryManagement } from "./expense-category-management";

interface OrganizationDashboardProps {
  organizationId: string;
}

export function OrganizationDashboard({
  organizationId,
}: OrganizationDashboardProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrganizationRole>(
    OrganizationRole.MEMBER,
  );
  const [isInviting, setIsInviting] = useState(false);

  const {
    data: organization,
    isLoading,
    refetch,
  } = api.organization.getById.useQuery({ id: organizationId });

  const inviteUser = api.organization.inviteUser.useMutation({
    onSuccess: () => {
      setInviteEmail("");
      setInviteRole(OrganizationRole.MEMBER);
      void refetch();
    },
  });

  const removeMember = api.organization.removeMember.useMutation({
    onSuccess: () => refetch(),
  });

  const updateMemberRole = api.organization.updateMemberRole.useMutation({
    onSuccess: () => refetch(),
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      await inviteUser.mutateAsync({
        organizationId,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
    } finally {
      setIsInviting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="animate-pulse">
          <div className="mb-4 h-8 w-1/3 rounded bg-gray-200"></div>
          <div className="mb-8 h-4 w-2/3 rounded bg-gray-200"></div>
          <div className="space-y-4">
            <div className="h-16 rounded bg-gray-200"></div>
            <div className="h-16 rounded bg-gray-200"></div>
            <div className="h-16 rounded bg-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="py-12 text-center">
          <h2 className="text-2xl font-semibold text-gray-900">
            Organization not found
          </h2>
          <p className="mt-2 text-gray-600">
            {"The organization you're looking for doesn't exist or you don't have access to it."}
          </p>
        </div>
      </div>
    );
  }

  const isAdmin = organization.userRole === OrganizationRole.ADMIN;

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Organization Header */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {organization.name}
              </h1>
              {organization.description && (
                <p className="mt-1 text-gray-600">{organization.description}</p>
              )}
              <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                <span>{organization.memberships.length} members</span>
                <span>•</span>
                <span>
                  Created by{" "}
                  {organization.createdBy.name ?? organization.createdBy.email}
                </span>
                <span>•</span>
                <span className="capitalize">
                  Your role: {organization.userRole.toLowerCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expense Categories */}
      <div className="mb-6">
        <ExpenseCategoryManagement
          organizationId={organizationId}
          userRole={organization.userRole}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Members */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Members</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {organization.memberships.map((membership) => (
                <div
                  key={membership.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                      {(membership.user.name ?? membership.user.email)
                        ?.charAt(0)
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {membership.user.name ?? membership.user.email}
                      </div>
                      {membership.user.name && (
                        <div className="text-sm text-gray-500">
                          {membership.user.email}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        membership.role === OrganizationRole.ADMIN
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {membership.role.toLowerCase()}
                    </span>
                    {isAdmin &&
                      membership.user.id !== organization.createdById && (
                        <div className="flex space-x-1">
                          <select
                            value={membership.role}
                            onChange={(e) =>
                              updateMemberRole.mutate({
                                organizationId,
                                userId: membership.user.id,
                                role: e.target.value as OrganizationRole,
                              })
                            }
                            className="rounded border border-gray-300 px-2 py-1 text-xs"
                          >
                            <option value={OrganizationRole.MEMBER}>
                              Member
                            </option>
                            <option value={OrganizationRole.ADMIN}>
                              Admin
                            </option>
                          </select>
                          <button
                            onClick={() =>
                              removeMember.mutate({
                                organizationId,
                                userId: membership.user.id,
                              })
                            }
                            className="px-2 py-1 text-xs text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Invite Users */}
        {isAdmin && (
          <div>
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Invite Users
                </h2>
              </div>
              <form onSubmit={handleInvite} className="space-y-4 px-6 py-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="role"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Role
                  </label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as OrganizationRole)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value={OrganizationRole.MEMBER}>Member</option>
                    <option value={OrganizationRole.ADMIN}>Admin</option>
                  </select>
                </div>
                {inviteUser.error && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-600">
                    {inviteUser.error.message}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={!inviteEmail.trim() || isInviting}
                  className="w-full rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isInviting ? "Sending..." : "Send Invitation"}
                </button>
              </form>
            </div>

            {/* Pending Invitations */}
            {organization.invitations.length > 0 && (
              <div className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Pending Invitations
                  </h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {organization.invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between px-6 py-4"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {invitation.email}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">
                          {invitation.role.toLowerCase()} • Expires{" "}
                          {new Date(invitation.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          // TODO: Implement cancel invitation
                        }}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
