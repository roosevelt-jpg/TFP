import { connection } from "next/server";
import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { searchAdmin } from "@/lib/admin/search";

export async function GET(request: Request) {
  await connection();
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const results = await searchAdmin(q);

  return NextResponse.json(
    { q, results },
    { headers: { "Cache-Control": "no-store" } },
  );
}
