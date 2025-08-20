import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { AcceptInvitationButton } from "~/app/_components/accept-invitation-button";

export default async function AppHomePage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin");
  }

  // Prefetch organizations and invitations for better UX
  void api.organization.getMyOrganizations.prefetch();
  void api.organization.getMyInvitations.prefetch();

  return (
    <HydrateClient>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Expense Management
                </h1>
                <p className="text-sm text-gray-600">
                  Welcome back, {session.user?.name ?? session.user?.email}
                </p>
              </div>
              <Link
                href="/api/auth/signout"
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Sign out
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Pending Invitations */}
          <PendingInvitations />

          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Your Organizations
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Select an organization to manage expenses and team members
                </p>
              </div>
              <Link
                href="/app/organizations/new"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create Organization
              </Link>
            </div>
          </div>

          <OrganizationList />
        </main>
      </div>
    </HydrateClient>
  );
}

function OrganizationList() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <OrganizationCards />
    </div>
  );
}

async function OrganizationCards() {
  const organizations = await api.organization.getMyOrganizations();

  if (organizations.length === 0) {
    return (
      <div className="col-span-full">
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              className="h-12 w-12"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No organizations yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Get started by creating your first organization
          </p>
          <div className="mt-6">
            <Link
              href="/app/organizations/new"
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create Organization
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {organizations.map((org) => (
        <Link
          key={org.id}
          href={`/app/organizations/${org.id}`}
          className="group block rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:border-gray-300 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-sm font-medium text-blue-600">
                {org.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                  {org.name}
                </h3>
                {org.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {org.description}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span>{org.memberCount} members</span>
              <span className="capitalize px-2 py-1 rounded-full text-xs bg-gray-100">
                {org.role.toLowerCase()}
              </span>
            </div>
            <svg
              className="h-5 w-5 text-gray-400 group-hover:text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </Link>
      ))}
    </>
  );
}

function PendingInvitations() {
  return <PendingInvitationsCards />;
}

async function PendingInvitationsCards() {
  const invitations = await api.organization.getMyInvitations();

  if (invitations.length === 0) {
    return null; // Don't show section if no invitations
  }

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Pending Invitations
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          You have been invited to join these organizations
        </p>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {invitations.map((invitation) => (
          <InvitationCard key={invitation.id} invitation={invitation} />
        ))}
      </div>
    </div>
  );
}

function InvitationCard({ invitation }: { invitation: any }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-sm font-medium text-blue-600">
            {invitation.organization.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {invitation.organization.name}
            </h3>
            {invitation.organization.description && (
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                {invitation.organization.description}
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>
          Invited by {invitation.invitedBy.name ?? invitation.invitedBy.email} as{" "}
          <span className="capitalize font-medium">
            {invitation.role.toLowerCase()}
          </span>
        </p>
        <p className="mt-1">
          Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
        </p>
      </div>

      <div className="mt-4 flex space-x-3">
        <AcceptInvitationButton token={invitation.token} />
        <button className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Decline
        </button>
      </div>
    </div>
  );
}
