import { auth } from "~/server/auth";
import { OrganizationDashboard } from "~/app/_components/organization-dashboard";

interface OrganizationPageProps {
  params: {
    id: string;
  };
}

export default function OrganizationPage({
  params,
}: OrganizationPageProps) {
  return <OrganizationDashboard organizationId={params.id} />;
}
