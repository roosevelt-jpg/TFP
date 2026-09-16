import { NextResponse } from "next/server";

import { runCtoAgent } from "@/lib/cto/agent";
import { requireAdminSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  await requireAdminSession(["kane"]);
  const body = (await request.json()) as { prompt?: string };
  const result = await runCtoAgent(
    body.prompt ?? "Review open alerts and draft any Meta pauses needed.",
  );
  return NextResponse.json(result);
}
