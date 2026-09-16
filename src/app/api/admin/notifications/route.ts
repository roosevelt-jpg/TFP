import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { getNotificationFeed } from "@/lib/admin/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const feed = await getNotificationFeed();
  return NextResponse.json(feed, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
