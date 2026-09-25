import { NextResponse } from "next/server";

import {
  runComplianceCheck,
  runOcrTranscriptCompliance,
} from "@/lib/content/compliance";
import {
  frameMetaToComplianceBag,
  getFrameAsset,
} from "@/lib/content/frame-client";
import {
  ContentState,
  mapFrameStatusToContentState,
} from "@/lib/content/states";
import { db } from "@/db";
import type { Prisma } from "@/generated/prisma/client";

function mergeTags(
  existing: unknown,
  enrichment: Record<string, unknown>,
): Prisma.InputJsonValue {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...base, ...enrichment } as Prisma.InputJsonValue;
}

/** Frame.io V4 webhook — version ready / comment / status events. */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    type?: string;
    resource?: { id?: string; name?: string; status?: string };
    data?: {
      text?: string;
      version_id?: string;
      status?: string;
      label?: string;
      account_id?: string;
    };
  };

  await db.auditLog.create({
    data: {
      actor: "frame.io",
      action: `frame.webhook.${body.type ?? "unknown"}`,
      meta: body as object,
    },
  });

  const frameStatus =
    body.data?.status ?? body.data?.label ?? body.resource?.status;
  const mapped = mapFrameStatusToContentState(frameStatus);

  if (body.resource?.id && mapped) {
    await db.contentAsset.updateMany({
      where: { hubAssetId: body.resource.id },
      data: { state: mapped },
    });
  }

  if (body.type?.includes("comment") && body.data?.text) {
    if (body.resource?.id) {
      await db.contentAsset.updateMany({
        where: { hubAssetId: body.resource.id },
        data: {
          brief: body.data.text,
          state: mapped ?? ContentState.inQc,
        },
      });
    }
  }

  if (body.type?.includes("version") || body.type?.includes("ready")) {
    const assets = body.resource?.id
      ? await db.contentAsset.findMany({
          where: { hubAssetId: body.resource.id },
          take: 5,
        })
      : await db.contentAsset.findMany({
          where: {
            state: {
              in: [
                ContentState.inEdit,
                ContentState.inQc,
                ContentState.editing,
                ContentState.review,
                "editing",
                "review",
                "in_edit",
                "in_qc",
              ],
            },
          },
          take: 20,
          orderBy: { updatedAt: "desc" },
        });

    // Best-effort Frame enrichment (transcript / OCR meta) when token is set.
    let frameBag: Record<string, unknown> | null = null;
    if (body.resource?.id) {
      const frameAsset = await getFrameAsset(body.resource.id, {
        accountId: body.data?.account_id,
      });
      if (frameAsset) {
        frameBag = frameMetaToComplianceBag(frameAsset);
      }
    }

    for (const asset of assets) {
      const tags = frameBag
        ? mergeTags(asset.tags, frameBag)
        : (asset.tags as Prisma.InputJsonValue | undefined);

      if (frameBag) {
        await db.contentAsset.update({
          where: { id: asset.id },
          data: { tags },
        });
      }

      const ocrHook = runOcrTranscriptCompliance(tags ?? asset.tags);
      const cards = await db.postCard.findMany({ where: { assetId: asset.id } });
      let anyFail = false;
      for (const card of cards) {
        const check = runComplianceCheck({
          caption: card.caption,
          assetMeta: tags ?? asset.tags,
        });
        // Prefer OCR/transcript FAIL detail when the hook ran and failed.
        const result =
          ocrHook.ran && !ocrHook.pass ? ocrHook.result : check.result;
        const pass = check.pass && ocrHook.pass;
        anyFail = anyFail || !pass;
        await db.postCard.update({
          where: { id: card.id },
          data: {
            compliancePass: pass,
            complianceResult: result,
            status: pass
              ? ContentState.awaitingKane
              : ContentState.changesRequested,
          },
        });
      }
      await db.contentAsset.update({
        where: { id: asset.id },
        data: {
          // Compliance pass → READY; if Kane cards exist, advance to AWAITING_KANE
          state: anyFail
            ? ContentState.changesRequested
            : cards.length > 0
              ? ContentState.awaitingKane
              : ContentState.ready,
        },
      });
    }
  }

  if (
    body.type?.includes("status") &&
    body.resource?.id &&
    mapped === ContentState.changesRequested
  ) {
    await db.contentAsset.updateMany({
      where: { hubAssetId: body.resource.id },
      data: { state: ContentState.changesRequested },
    });
  }

  return NextResponse.json({ ok: true, mapped: mapped ?? null });
}
