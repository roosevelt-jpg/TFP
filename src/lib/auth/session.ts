import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";
import type { StaffRole } from "@/generated/prisma/client";

export type AdminSession = {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: StaffRole;
    twoFactorEnabled: boolean;
  };
  session: {
    id: string;
    token: string;
  };
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });
  if (!result?.user) return null;

  const role = (result.user as { role?: StaffRole }).role ?? "viewer";
  return {
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      image: result.user.image ?? null,
      role,
      twoFactorEnabled: Boolean(
        (result.user as { twoFactorEnabled?: boolean }).twoFactorEnabled,
      ),
    },
    session: {
      id: result.session.id,
      token: result.session.token,
    },
  };
}

export async function requireAdminSession(
  allowed: StaffRole[] = ["kane", "leah", "lemoni", "indigo", "asim", "viewer"],
  options?: { skipProfileGate?: boolean },
): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  // Production requires 2FA unless staging sets ADMIN_REQUIRE_2FA=false.
  // Local/dev skips unless ADMIN_REQUIRE_2FA=true.
  const require2fa =
    process.env.ADMIN_REQUIRE_2FA === "true" ||
    (process.env.NODE_ENV === "production" &&
      process.env.ADMIN_REQUIRE_2FA !== "false");
  if (require2fa && !session.user.twoFactorEnabled) {
    redirect("/admin/setup-2fa");
  }
  if (!allowed.includes(session.user.role)) redirect("/admin/login?error=role");

  if (!options?.skipProfileGate && session.user.role !== "kane") {
    const { db } = await import("@/db");
    const profile = await db.staffProfile.findUnique({
      where: { userId: session.user.id },
      select: { completedAt: true },
    });
    if (!profile?.completedAt) {
      redirect("/admin/complete-profile");
    }
  }

  return session;
}
