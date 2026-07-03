import { Lock } from "lucide-react";

export function SecureBadge() {
  return (
    <span className="text-dim inline-flex items-center gap-[7px] text-[0.8rem]">
      <Lock size={13} strokeWidth={2} aria-hidden />
      Secure sign-up
    </span>
  );
}
