"use server";

import * as z from "zod";

import { runComplianceCheck } from "@/lib/content/compliance";
import { ContentState } from "@/lib/content/states";
import { requireAdminSession } from "@/lib/auth/session";
import { actionClient } from "@/lib/safe-action";
import { db } from "@/db";

const schema = z.object({
  title: z.string().min(2).max(200),
  uploader: z.string().min(1).max(80),
  caption: z.string().max(2200).optional(),
  platform: z.enum(["instagram", "tiktok", "youtube_shorts", "youtube"]),
  account: z.string().min(1).max(80),
  creatorLicence: z.boolean().default(true),
});

export const uploadContentAssetAction = actionClient
  .metadata({ actionName: "admin.uploadContentAsset" })
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane", "lemoni"]);

    if (!parsedInput.creatorLicence) {
      const asset = await db.contentAsset.create({
        data: {
          title: parsedInput.title,
          uploader: parsedInput.uploader,
          state: ContentState.tagged,
          creatorLicence: false,
        },
      });
      return {
        id: asset.id,
        state: asset.state,
        note: "Creator licence missing — cannot move past TAGGED",
      };
    }

    const check = runComplianceCheck({ caption: parsedInput.caption });
    // Part 07: pass → READY then AWAITING_KANE (Kane card created); fail → CHANGES
    const assetState = check.pass
      ? ContentState.awaitingKane
      : ContentState.changesRequested;
    const asset = await db.contentAsset.create({
      data: {
        title: parsedInput.title,
        uploader: parsedInput.uploader,
        state: check.pass ? ContentState.ready : ContentState.changesRequested,
        creatorLicence: true,
      },
    });

    await db.postCard.create({
      data: {
        assetId: asset.id,
        platform: parsedInput.platform,
        account: parsedInput.account,
        caption: parsedInput.caption,
        compliancePass: check.pass,
        complianceResult: check.result,
        status: check.pass
          ? ContentState.awaitingKane
          : ContentState.changesRequested,
        scheduledAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      },
    });

    if (check.pass) {
      await db.contentAsset.update({
        where: { id: asset.id },
        data: { state: assetState },
      });
    }

    await db.auditLog.create({
      data: {
        actor: session.user.email,
        action: "content.upload",
        entityType: "ContentAsset",
        entityId: asset.id,
        meta: {
          state: check.pass ? assetState : ContentState.changesRequested,
          compliance: check.result,
        },
      },
    });

    return {
      id: asset.id,
      state: check.pass ? assetState : ContentState.changesRequested,
      compliance: check,
    };
  });
