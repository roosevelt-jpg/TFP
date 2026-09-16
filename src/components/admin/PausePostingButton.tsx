"use client";

import { useTransition } from "react";

import { pauseAllPostingAction } from "@/actions/admin/content-ops.action";

export function PausePostingButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="cmd-btn cmd-btn-danger"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await pauseAllPostingAction({});
        })
      }
    >
      Pause all posting
    </button>
  );
}
