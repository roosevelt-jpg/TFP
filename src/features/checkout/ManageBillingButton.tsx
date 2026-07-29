"use client";

import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { openBillingPortal } from "@/actions/create-portal-session.action";
import { Spinner } from "@/components/ui/spinner";

export function ManageBillingButton({ sessionId }: { sessionId: string }) {
  const { executeAsync, isPending } = useAction(openBillingPortal);

  async function onClick() {
    const res = await executeAsync({ sessionId });

    if (!res?.data?.url) {
      toast.error(
        res?.serverError ??
          "Couldn’t open billing right now. Please try again.",
      );
      return;
    }

    // Stripe's own domain, so a full navigation rather than a router push.
    window.location.assign(res.data.url);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-busy={isPending}
      className="text-text inline-flex items-center gap-2 underline disabled:opacity-55"
    >
      {isPending && <Spinner />}
      {isPending ? "Opening billing…" : "Manage billing"}
    </button>
  );
}
