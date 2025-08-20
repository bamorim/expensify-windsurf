"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { OrganizationRole, PolicyPeriod, PolicyReviewRule } from "@prisma/client";

interface PolicyManagementProps {
  organizationId: string;
  userRole: OrganizationRole;
}

export function PolicyManagement({
  organizationId,
  userRole,
}: PolicyManagementProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [isUserSpecific, setIsUserSpecific] = useState(false);

  const {
    data: policies,
    isLoading: policiesLoading,
    refetch: refetchPolicies,
  } = api.policy.getByOrganization.useQuery({
    organizationId,
  });

  const {
    data: categories,
    isLoading: categoriesLoading,
  } = api.expenseCategory.getByOrganization.useQuery({
    organizationId,
  });

  const {
    data: organization,
    isLoading: membersLoading,
  } = api.organization.getById.useQuery({
    id: organizationId,
  });

  const members = organization?.memberships ?? [];

  const createPolicy = api.policy.create.useMutation({
    onSuccess: () => {
      setIsCreating(false);
      setSelectedCategory("");
      setSelectedUser("");
      setIsUserSpecific(false);
      void refetchPolicies();
    },
  });

  const updatePolicy = api.policy.update.useMutation({
    onSuccess: () => {
      setEditingPolicy(null);
      void refetchPolicies();
    },
  });

  const deletePolicy = api.policy.delete.useMutation({
    onSuccess: () => refetchPolicies(),
  });

  const isAdmin = userRole === OrganizationRole.ADMIN;

  const handleDeletePolicy = async (policyId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this policy? This action cannot be undone.",
      )
    ) {
      await deletePolicy.mutateAsync({ id: policyId });
    }
  };

  if (policiesLoading || categoriesLoading || membersLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Policy Management
          </h2>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-1/3 rounded bg-gray-200"></div>
            <div className="h-4 w-1/2 rounded bg-gray-200"></div>
            <div className="h-4 w-2/3 rounded bg-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Policy Management
        </h2>
        {isAdmin && (
          <button
            onClick={() => setIsCreating(true)}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Policy
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-200">
        {/* Create Policy Form */}
        {isCreating && isAdmin && (
          <PolicyForm
            organizationId={organizationId}
            categories={categories ?? []}
            members={members}
            onSubmit={async (data) => {
              await createPolicy.mutateAsync({
                ...data,
                organizationId,
                maxAmount: parseFloat(data.maxAmount),
                autoApproveThreshold: data.autoApproveThreshold ? parseFloat(data.autoApproveThreshold) : undefined,
              });
            }}
            onCancel={() => setIsCreating(false)}
            isSubmitting={createPolicy.isPending}
            error={createPolicy.error?.message}
          />
        )}

        {/* Policies List */}
        {policies && policies.length > 0 ? (
          policies.map((policy) => (
            <PolicyItem
              key={policy.id}
              policy={policy}
              categories={categories ?? []}
              members={members ?? []}
              isAdmin={isAdmin}
              isEditing={editingPolicy === policy.id}
              onEdit={() => setEditingPolicy(policy.id)}
              onCancelEdit={() => setEditingPolicy(null)}
              onUpdate={async (data) => {
                await updatePolicy.mutateAsync({
                  ...data,
                  organizationId,
                  maxAmount: parseFloat(data.maxAmount),
                  autoApproveThreshold: data.autoApproveThreshold ? parseFloat(data.autoApproveThreshold) : undefined,
                });
              }}
              onDelete={handleDeletePolicy}
              isUpdating={updatePolicy.isPending}
              isDeleting={deletePolicy.isPending}
              updateError={updatePolicy.error?.message}
            />
          ))
        ) : (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No policies
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isAdmin
                  ? "Get started by creating your first policy."
                  : "No policies have been created yet."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface PolicyData {
  name: string;
  description: string;
  categoryId: string;
  maxAmount: string;
  period: PolicyPeriod;
  reviewRule: PolicyReviewRule;
  autoApproveThreshold?: string;
  isUserSpecific: boolean;
  userId?: string;
  id?: string;
}

interface PolicyFormProps {
  organizationId: string;
  categories: Array<{ id: string; name: string }> | undefined;
  members: Array<{ user: { id: string; name: string | null; email: string | null } }>;
  onSubmit: (data: PolicyData) => Promise<unknown>;
  onCancel: () => void;
  isSubmitting: boolean;
  error?: string;
  initialData?: PolicyData;
}

function PolicyForm({
  organizationId,
  categories,
  members,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
  initialData,
}: PolicyFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? "");
  const [maxAmount, setMaxAmount] = useState(initialData?.maxAmount ?? "");
  const [period, setPeriod] = useState<PolicyPeriod>(initialData?.period || PolicyPeriod.DAILY);
  const [reviewRule, setReviewRule] = useState<PolicyReviewRule>(initialData?.reviewRule || PolicyReviewRule.MANUAL_REVIEW);
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(
    initialData?.autoApproveThreshold ?? ""
  );
  const [isUserSpecific, setIsUserSpecific] = useState(initialData?.isUserSpecific ?? false);
  const [userId, setUserId] = useState(initialData?.userId ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId || !maxAmount || parseFloat(maxAmount) <= 0) return;

    const formData: PolicyData = {
      name: name.trim(),
      description: description.trim() || "",
      categoryId,
      maxAmount,
      period,
      reviewRule,
      autoApproveThreshold:
        reviewRule === PolicyReviewRule.CONDITIONAL ? autoApproveThreshold : undefined,
      isUserSpecific,
      userId: isUserSpecific ? userId : undefined,
      ...(initialData?.id && { id: initialData.id }),
    };

    await onSubmit(formData);
  };

  return (
    <div className="px-6 py-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Policy Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Travel Policy"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a category</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Brief description of this policy"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Maximum Amount ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PolicyPeriod)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={PolicyPeriod.DAILY}>Daily</option>
              <option value={PolicyPeriod.WEEKLY}>Weekly</option>
              <option value={PolicyPeriod.MONTHLY}>Monthly</option>
              <option value={PolicyPeriod.YEARLY}>Yearly</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Review Rule
            </label>
            <select
              value={reviewRule}
              onChange={(e) => setReviewRule(e.target.value as PolicyReviewRule)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={PolicyReviewRule.AUTO_APPROVE}>Auto Approve</option>
              <option value={PolicyReviewRule.MANUAL_REVIEW}>Manual Review</option>
              <option value={PolicyReviewRule.CONDITIONAL}>Conditional</option>
            </select>
          </div>
        </div>

        {reviewRule === PolicyReviewRule.CONDITIONAL && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Auto-Approve Threshold ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={autoApproveThreshold}
              onChange={(e) => setAutoApproveThreshold(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Amount below which expenses are auto-approved"
              required
            />
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="userSpecific"
              checked={isUserSpecific}
              onChange={(e) => setIsUserSpecific(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="userSpecific" className="ml-2 text-sm text-gray-700">
              User-specific policy (overrides organization-wide policy)
            </label>
          </div>

          {isUserSpecific && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Select User
              </label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={isUserSpecific}
              >
                <option value="">Select a user</option>
                {members.map((member) => (
                  <option key={member.user.id} value={member.user.id}>
                    {member.user.name ?? member.user.email ?? 'Unknown User'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={!name.trim() || !categoryId || !maxAmount || parseFloat(maxAmount) <= 0 || isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (initialData ? "Updating..." : "Creating...") : (initialData ? "Update Policy" : "Create Policy")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

interface PolicyItemProps {
  policy: any;
  categories: Array<{ id: string; name: string }>;
  members: Array<{ user: { id: string; name: string | null; email: string | null } }>;
  isAdmin: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (data: any) => Promise<any>;
  onDelete: (id: string) => void;
  isUpdating: boolean;
  isDeleting: boolean;
  updateError?: string;
}

function PolicyItem({
  policy,
  categories,
  members,
  isAdmin,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
  updateError,
}: PolicyItemProps) {
  if (isEditing) {
    return (
      <PolicyForm
        organizationId={policy.organizationId}
        categories={categories}
        members={members}
        onSubmit={onUpdate}
        onCancel={onCancelEdit}
        isSubmitting={isUpdating}
        error={updateError}
        initialData={policy}
      />
    );
  }

  const formatPeriod = (period: PolicyPeriod) => {
    return period.toLowerCase().replace('_', ' ');
  };

  const formatReviewRule = (rule: PolicyReviewRule) => {
    switch (rule) {
      case PolicyReviewRule.AUTO_APPROVE:
        return "Auto Approve";
      case PolicyReviewRule.MANUAL_REVIEW:
        return "Manual Review";
      case PolicyReviewRule.CONDITIONAL:
        return "Conditional";
      default:
        return rule;
    }
  };

  return (
    <div className="px-6 py-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-medium text-gray-900">{policy.name}</h3>
            {policy.isUserSpecific && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                User-specific
              </span>
            )}
          </div>
          
          {policy.description && (
            <p className="mt-1 text-sm text-gray-500">{policy.description}</p>
          )}
          
          <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="font-medium">Category:</span> {policy.category?.name}
            </div>
            <div>
              <span className="font-medium">Max Amount:</span> ${Number(policy.maxAmount).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Period:</span> {formatPeriod(policy.period)}
            </div>
            <div>
              <span className="font-medium">Review:</span> {formatReviewRule(policy.reviewRule)}
            </div>
          </div>

          {policy.reviewRule === PolicyReviewRule.CONDITIONAL && policy.autoApproveThreshold && (
            <div className="mt-1 text-sm text-gray-600">
              <span className="font-medium">Auto-approve threshold:</span> ${Number(policy.autoApproveThreshold).toLocaleString()}
            </div>
          )}

          {policy.isUserSpecific && policy.user && (
            <div className="mt-1 text-sm text-gray-600">
              <span className="font-medium">User:</span> {policy.user.name} ({policy.user.email})
            </div>
          )}

          <div className="mt-1 text-xs text-gray-400">
            Created {new Date(policy.createdAt).toLocaleDateString()}
          </div>
        </div>

        {isAdmin && (
          <div className="flex space-x-2">
            <button
              onClick={onEdit}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(policy.id)}
              disabled={isDeleting}
              className="text-sm text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
