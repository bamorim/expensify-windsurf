import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { CreateOrganizationForm } from "~/app/_components/create-organization-form";

export default async function NewOrganizationPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Create Organization
          </h1>
          <p className="mt-2 text-gray-600">
            Set up a new organization to manage expenses with your team.
          </p>
        </div>

        <CreateOrganizationForm />
      </div>
    </div>
  );
}
