import { auth } from "~/server/auth";
import { OrganizationDashboard } from "~/app/_components/organization-dashboard";
import { HydrateClient } from "~/trpc/server";
import { api } from "~/trpc/server";
import { redirect } from "next/navigation";

interface OrganizationPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrganizationPage({
  params,
}: OrganizationPageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session) {
    redirect("/api/auth/signin");
  }

  void api.organization.getById.prefetch({ id });
  void api.policy.getByOrganization.prefetch({ organizationId: id });
  void api.expenseCategory.getByOrganization.prefetch({ organizationId: id });
  return <HydrateClient>
    <OrganizationDashboard organizationId={id} />
  </HydrateClient>;
}
