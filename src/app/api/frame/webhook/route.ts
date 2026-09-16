import { NextResponse } from "next/server";

import { runComplianceCheck } from "@/lib/content/compliance";
import { db } from "@/db";

/** Frame.io V4 webhook — version ready / comment events. */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    type?: string;
    resource?: { id?: string; name?: string };
    data?: { text?: string; version_id?: string };
  };

  await db.auditLog.create({
    data: {
      actor: "frame.io",
      action: `frame.webhook.${body.type ?? "unknown"}`,
      meta: body as object,
    },
  });

  if (body.type?.includes("comment") && body.data?.text) {
    // Comments attach to the newest asset with matching hub id when present.
    if (body.resource?.id) {
      await db.contentAsset.updateMany({
        where: { hubAssetId: body.resource.id },
        data: {
          brief: body.data.text,
          state: "review",
        },
      });
    }
  }

  if (body.type?.includes("version") || body.type?.includes("ready")) {
    const assets = await db.contentAsset.findMany({
      where: { state: { in: ["editing", "review"] } },
      take: 20,
      orderBy: { updatedAt: "desc" },
    });

    for (const asset of assets) {
      const cards = await db.postCard.findMany({ where: { assetId: asset.id } });
      for (const card of cards) {
        const check = runComplianceCheck({ caption: card.caption });
        await db.postCard.update({
          where: { id: card.id },
          data: {
            compliancePass: check.pass,
            complianceResult: check.result,
            status: check.pass ? "awaiting_kane" : "rejected",
          },
        });
      }
      await db.contentAsset.update({
        where: { id: asset.id },
        data: { state: "awaiting_kane" },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
