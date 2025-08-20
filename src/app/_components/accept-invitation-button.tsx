"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

interface AcceptInvitationButtonProps {
  token: string;
}

export function AcceptInvitationButton({ token }: AcceptInvitationButtonProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const router = useRouter();
  const utils = api.useUtils();

  const acceptInvitation = api.organization.acceptInvitation.useMutation({
    onSuccess: (result) => {
      // Navigate to the organization page
      router.push(`/app/organizations/${result.organization.id}`);
      // Invalidate queries to refresh the UI
      void utils.organization.getMyOrganizations.invalidate();
      void utils.organization.getMyInvitations.invalidate();
    },
    onError: (error) => {
      console.error("Failed to accept invitation:", error);
      setIsAccepting(false);
    },
  });

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await acceptInvitation.mutateAsync({ token });
    } catch (error) {
      // Error is handled in onError callback
    }
  };

  return (
    <button
      onClick={handleAccept}
      disabled={isAccepting}
      className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isAccepting ? "Accepting..." : "Accept"}
    </button>
  );
}
