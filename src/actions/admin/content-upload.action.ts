"use server";

import * as z from "zod";

import { createApprovalRequest } from "@/lib/admin/approvals";
import { runComplianceCheck } from "@/lib/content/compliance";
import {
  enrichComplianceFromMedia,
  mergeComplianceEnrichment,
} from "@/lib/content/compliance-enrich";
import {
  frameMetaToComplianceBag,
  uploadFrameAsset,
} from "@/lib/content/frame-client";
import { loadPostCardFlags } from "@/lib/content/load-flags";
import { putContentMedia } from "@/lib/content/media-storage";
import {
  qcResultsToAssetTags,
  runAutomatedQcChecks,
} from "@/lib/content/qc-checks";
import { ContentState } from "@/lib/content/states";
import { requireAdminSession } from "@/lib/auth/session";
import { actionClient } from "@/lib/safe-action";
import {
  getKaneTelegramChatId,
  sendTelegramMessage,
} from "@/lib/telegram/client";
import { db } from "@/db";
import type { Prisma } from "@/generated/prisma/client";

const schema = z.object({
  title: z.string().min(2).max(200),
  uploader: z.string().min(1).max(80),
  caption: z.string().max(2200).optional(),
  platform: z.enum(["instagram", "tiktok", "youtube_shorts", "youtube"]),
  account: z.string().min(1).max(80),
  creatorLicence: z.boolean().default(true),
  publicConsent: z.boolean().default(false),
  /** Optional media — base64 without data: prefix. */
  mediaBase64: z.string().min(32).optional(),
  mediaContentType: z
    .string()
    .regex(/^(image|video)\//i, "Image or video only")
    .optional(),
  mediaFileName: z.string().min(1).max(160).optional(),
});

function captionSnippet(caption: string | undefined, max = 140) {
  const t = (caption ?? "").trim();
  if (!t) return "(no caption)";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export const uploadContentAssetAction = actionClient
  .metadata({ actionName: "admin.uploadContentAsset" })
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane", "lemoni"]);

    let mediaUrl: string | null = null;
    let mimeType: string | null = null;
    let byteSize: number | null = null;
    let hubAssetId: string | null = null;
    let assetTags: Prisma.InputJsonValue | undefined;

    if (parsedInput.mediaBase64) {
      const contentType =
        parsedInput.mediaContentType?.toLowerCase() ?? "application/octet-stream";
      if (!/^(image|video)\//i.test(contentType)) {
        throw new Error("Media must be an image or video");
      }
      const bytes = Buffer.from(parsedInput.mediaBase64, "base64");
      const stored = await putContentMedia({
        bytes,
        fileName: parsedInput.mediaFileName ?? "upload.bin",
        contentType,
      });
      mediaUrl = stored.url;
      mimeType = contentType;
      byteSize = stored.byteSize;

      const frame = await uploadFrameAsset({
        name: parsedInput.mediaFileName ?? parsedInput.title,
        sourceUrl: stored.url,
      });
      if (frame) {
        hubAssetId = frame.id;
        assetTags = frameMetaToComplianceBag(frame) as Prisma.InputJsonValue;
      }
    }

    const enrichment = await enrichComplianceFromMedia({
      mediaUrl,
      mimeType,
      existingTags: assetTags,
      caption: parsedInput.caption,
    });
    if (enrichment.source !== "none") {
      assetTags = mergeComplianceEnrichment(
        assetTags,
        enrichment,
      ) as Prisma.InputJsonValue;
    }

    if (!parsedInput.creatorLicence || !parsedInput.publicConsent) {
      const asset = await db.contentAsset.create({
        data: {
          title: parsedInput.title,
          uploader: parsedInput.uploader,
          state: ContentState.tagged,
          creatorLicence: parsedInput.creatorLicence,
          publicConsent: parsedInput.publicConsent,
          mediaUrl,
          mimeType,
          byteSize,
          hubAssetId,
          tags: assetTags,
        },
      });
      const missing = [
        !parsedInput.publicConsent ? "public consent" : null,
        !parsedInput.creatorLicence ? "creator licence" : null,
      ]
        .filter(Boolean)
        .join(" and ");
      return {
        id: asset.id,
        state: asset.state,
        mediaUrl,
        note: `${missing} missing — cannot move past TAGGED / cannot approve`,
      };
    }

    const check = runComplianceCheck({
      caption: parsedInput.caption,
      ocr: enrichment.ocr ?? enrichment.onScreenText,
      transcript: enrichment.transcript,
      assetMeta: assetTags,
    });

    const qc = runAutomatedQcChecks({
      caption: parsedInput.caption,
      transcript: enrichment.transcript,
      ocr: enrichment.ocr ?? enrichment.onScreenText,
      assetMeta: assetTags,
      compliancePass: check.pass,
      complianceResult: check.result,
      platform: parsedInput.platform,
    });
    assetTags = {
      ...(typeof assetTags === "object" &&
      assetTags &&
      !Array.isArray(assetTags)
        ? (assetTags as Record<string, unknown>)
        : {}),
      ...qcResultsToAssetTags(qc),
    } as Prisma.InputJsonValue;

    const pipelinePass = check.pass && qc.pass;
    // Part 07: pass → READY then AWAITING_KANE (Kane card created); fail → CHANGES
    const assetState = pipelinePass
      ? ContentState.awaitingKane
      : ContentState.changesRequested;
    const asset = await db.contentAsset.create({
      data: {
        title: parsedInput.title,
        uploader: parsedInput.uploader,
        state: pipelinePass ? ContentState.ready : ContentState.changesRequested,
        creatorLicence: true,
        publicConsent: true,
        mediaUrl,
        mimeType,
        byteSize,
        hubAssetId,
        tags: assetTags,
      },
    });

    const postCard = await db.postCard.create({
      data: {
        assetId: asset.id,
        platform: parsedInput.platform,
        account: parsedInput.account,
        caption: parsedInput.caption,
        coverUrl: mediaUrl,
        compliancePass: check.pass,
        complianceResult: check.result,
        status: pipelinePass
          ? ContentState.awaitingKane
          : ContentState.changesRequested,
        scheduledAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      },
    });

    if (pipelinePass) {
      await db.contentAsset.update({
        where: { id: asset.id },
        data: { state: assetState },
      });

      const { telegramBlock } = await loadPostCardFlags(postCard.id);

      const approval = await createApprovalRequest({
        action: `Schedule post: ${parsedInput.title} → ${parsedInput.platform}`,
        objectIds: { postCardId: postCard.id },
        reach: `${parsedInput.platform} · ${parsedInput.account}`,
        reversible: true,
        specialistVerdict: `Compliance: ${check.result}`,
        createdBy: session.user.email,
      });

      await db.postCard.update({
        where: { id: postCard.id },
        data: { approvalId: approval.id },
      });

      const kaneChatId = await getKaneTelegramChatId();
      if (kaneChatId) {
        await sendTelegramMessage({
          chatId: kaneChatId,
          text: [
            `<b>Post card ready</b>`,
            `TITLE: ${parsedInput.title}`,
            `PLATFORM: ${parsedInput.platform} · ${parsedInput.account}`,
            `CAPTION: ${captionSnippet(parsedInput.caption)}`,
            `COMPLIANCE: ${check.pass ? "PASS" : "FAIL"} — ${check.result}`,
            telegramBlock,
            mediaUrl ? `MEDIA: ${mediaUrl}` : "MEDIA: (none)",
            `SLOT: ${postCard.scheduledAt?.toISOString() ?? "unset"}`,
            `CARD: ${postCard.id}`,
          ].join("\n"),
          replyMarkup: {
            inline_keyboard: [
              [
                { text: "Approve", callback_data: `approve:${approval.id}` },
                { text: "Reject", callback_data: `reject:${approval.id}` },
              ],
            ],
          },
        });
      }
    }

    await db.auditLog.create({
      data: {
        actor: session.user.email,
        action: "content.upload",
        entityType: "ContentAsset",
        entityId: asset.id,
        meta: {
          state: pipelinePass ? assetState : ContentState.changesRequested,
          compliance: check.result,
          mediaUrl,
          hubAssetId,
          postCardId: postCard.id,
        },
      },
    });

    return {
      id: asset.id,
      postCardId: postCard.id,
      state: pipelinePass ? assetState : ContentState.changesRequested,
      compliance: check,
      mediaUrl,
      hubAssetId,
    };
  });
