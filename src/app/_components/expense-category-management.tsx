"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { OrganizationRole } from "@prisma/client";

interface ExpenseCategoryManagementProps {
  organizationId: string;
  userRole: OrganizationRole;
}

export function ExpenseCategoryManagement({
  organizationId,
  userRole,
}: ExpenseCategoryManagementProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  const {
    data: categories,
    isLoading,
    refetch,
  } = api.expenseCategory.getByOrganization.useQuery({
    organizationId,
  });

  const createCategory = api.expenseCategory.create.useMutation({
    onSuccess: () => {
      setNewCategoryName("");
      setNewCategoryDescription("");
      setIsCreating(false);
      void refetch();
    },
  });

  const updateCategory = api.expenseCategory.update.useMutation({
    onSuccess: () => {
      setEditingCategory(null);
      void refetch();
    },
  });

  const deleteCategory = api.expenseCategory.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const isAdmin = userRole === OrganizationRole.ADMIN;

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    await createCategory.mutateAsync({
      organizationId,
      name: newCategoryName.trim(),
      description: newCategoryDescription.trim() || undefined,
    });
  };

  const handleUpdateCategory = async (
    categoryId: string,
    name: string,
    description: string,
  ) => {
    await updateCategory.mutateAsync({
      id: categoryId,
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this category? This action cannot be undone.",
      )
    ) {
      await deleteCategory.mutateAsync({ id: categoryId });
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Expense Categories
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
          Expense Categories
        </h2>
        {isAdmin && (
          <button
            onClick={() => setIsCreating(true)}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Category
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-200">
        {/* Create Category Form */}
        {isCreating && isAdmin && (
          <div className="px-6 py-4">
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label
                  htmlFor="categoryName"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Category Name
                </label>
                <input
                  type="text"
                  id="categoryName"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Travel, Office Supplies"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="categoryDescription"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Description (Optional)
                </label>
                <textarea
                  id="categoryDescription"
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of this category"
                />
              </div>
              {createCategory.error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-600">
                  {createCategory.error.message}
                </div>
              )}
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={!newCategoryName.trim() || createCategory.isPending}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createCategory.isPending ? "Creating..." : "Create Category"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setNewCategoryName("");
                    setNewCategoryDescription("");
                  }}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Categories List */}
        {categories && categories.length > 0 ? (
          categories.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              isAdmin={isAdmin}
              isEditing={editingCategory === category.id}
              onEdit={() => setEditingCategory(category.id)}
              onCancelEdit={() => setEditingCategory(null)}
              onUpdate={handleUpdateCategory}
              onDelete={handleDeleteCategory}
              isUpdating={updateCategory.isPending}
              isDeleting={deleteCategory.isPending}
              updateError={updateCategory.error?.message}
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
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No expense categories
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isAdmin
                  ? "Get started by creating your first expense category."
                  : "No expense categories have been created yet."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface CategoryItemProps {
  category: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  isAdmin: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (id: string, name: string, description: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
  updateError?: string;
}

function CategoryItem({
  category,
  isAdmin,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
  updateError,
}: CategoryItemProps) {
  const [editName, setEditName] = useState(category.name);
  const [editDescription, setEditDescription] = useState(
    category.description ?? "",
  );

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    await onUpdate(category.id, editName, editDescription);
  };

  if (isEditing) {
    return (
      <div className="px-6 py-4">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Category Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description (Optional)
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {updateError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-600">
              {updateError}
            </div>
          )}
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={!editName.trim() || isUpdating}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdating ? "Updating..." : "Update Category"}
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex-1">
        <div className="font-medium text-gray-900">{category.name}</div>
        {category.description && (
          <div className="mt-1 text-sm text-gray-500">{category.description}</div>
        )}
        <div className="mt-1 text-xs text-gray-400">
          Created {new Date(category.createdAt).toLocaleDateString()}
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
            onClick={() => onDelete(category.id)}
            disabled={isDeleting}
            className="text-sm text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}
