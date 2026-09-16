import { NextResponse } from "next/server";

import { publishPostCard } from "@/lib/content/publish";
import { requireAdminSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  await requireAdminSession(["kane"]);
  const body = (await request.json()) as { postCardId?: string };
  if (!body.postCardId) {
    return NextResponse.json({ error: "postCardId required" }, { status: 400 });
  }
  const result = await publishPostCard(body.postCardId);
  return NextResponse.json(result);
}
