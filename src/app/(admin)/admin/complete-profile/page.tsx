import { CompleteProfileForm } from "@/components/admin/CompleteProfileForm";
import { requireAdminSession } from "@/lib/auth/session";
import { db } from "@/db";
import { redirect } from "next/navigation";
import { homePathForRole } from "@/lib/admin/staff";

export default async function CompleteProfilePage() {
  const session = await requireAdminSession(
    ["kane", "leah", "lemoni", "indigo", "asim", "viewer"],
    { skipProfileGate: true },
  );

  if (session.user.role === "kane") {
    redirect(homePathForRole("kane"));
  }

  const profile = await db.staffProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (profile?.completedAt) {
    redirect(homePathForRole(session.user.role));
  }

  return (
    <CompleteProfileForm
      email={session.user.email}
      defaultName={session.user.name}
    />
  );
}
