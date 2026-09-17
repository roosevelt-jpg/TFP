import { connection } from "next/server";
import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { getNotificationFeedSafe } from "@/lib/admin/notifications";

export async function GET() {
  await connection();
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const feed = await getNotificationFeedSafe();
  return NextResponse.json(feed, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
