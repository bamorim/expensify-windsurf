import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "~/server/auth";
import { OrganizationSwitcher } from "~/app/_components/organization-switcher";

export default async function OrganizationsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{
    id: string;
  }>;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/app"
                className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
              >
                ExpenseApp
              </Link>
              <div className="h-4 w-px bg-gray-300" />
              <OrganizationSwitcher organizationId={id} />
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
      <main>{children}</main>
    </div>
  );
}
