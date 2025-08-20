"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "~/trpc/react";
import Link from "next/link";

export function OrganizationSwitcher({
  organizationId,
}: {
  organizationId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: organizations, isLoading } =
    api.organization.getMyOrganizations.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200"></div>
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
      </div>
    );
  }

  if (!organizations?.length) {
    return <div className="text-sm text-gray-500">No organizations</div>;
  }

  const selectedOrg = organizations.find((org) => org.id === organizationId) ?? organizations[0]!;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
          {selectedOrg.name.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium">{selectedOrg.name}</span>
        <span className="text-xs text-gray-500 capitalize">
          {selectedOrg.role.toLowerCase()}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-10 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <div className="px-3 py-2 text-xs font-medium tracking-wide text-gray-500 uppercase">
            Your Organizations
          </div>
          {organizations.map((org) => (
            <Link
              key={org.id}
              href={`/app/organizations/${org.id}`}
              onClick={() => {
                setIsOpen(false);
              }}
              className={`flex w-full items-center space-x-3 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                org.id === selectedOrg.id
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700"
              }`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  org.id === selectedOrg.id
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {org.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-medium">{org.name}</div>
                <div className="text-xs text-gray-500 capitalize">
                  {org.role.toLowerCase()}
                </div>
              </div>
              {org.id === selectedOrg.id && (
                <svg
                  className="h-4 w-4 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </Link>
          ))}
          <div className="mt-1 border-t border-gray-100 pt-1">
            <Link
              href="/app/organizations/new"
              className="flex w-full items-center space-x-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-gray-300">
                <svg
                  className="h-3 w-3 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <span>Create organization</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
