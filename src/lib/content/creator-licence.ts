import "server-only";

import { db } from "@/db";

export type CreatorLicenceResolution = {
  /** Effective licence for the asset (blocks past TAGGED when false for creator content). */
  licensed: boolean;
  affiliateId: string | null;
  affiliateName: string | null;
  source: "register" | "kane_own" | "unsigned" | "unknown_creator";
  note: string;
};

/**
 * Part 07: licence lookup from the affiliate register.
 * Named creator content cannot rely on a checkbox alone — agreementSigned wins.
 * Kane/Lemoni own uploads (no creator name) may use the consent checkboxes.
 */
export async function resolveCreatorLicence(input: {
  creatorName?: string | null;
  creatorEmail?: string | null;
  /** Manual checkbox — only authoritative for Kane-own (no creator named). */
  checkboxClaim?: boolean;
}): Promise<CreatorLicenceResolution> {
  const name = input.creatorName?.trim() || null;
  const email = input.creatorEmail?.trim().toLowerCase() || null;

  if (!name && !email) {
    const ok = Boolean(input.checkboxClaim);
    return {
      licensed: ok,
      affiliateId: null,
      affiliateName: null,
      source: ok ? "kane_own" : "unsigned",
      note: ok
        ? "Kane/own upload — licence checkbox accepted"
        : "Licence checkbox unchecked — cannot leave TAGGED",
    };
  }

  const affiliate = await db.affiliate.findFirst({
    where: {
      OR: [
        ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
        ...(name
          ? [{ name: { equals: name, mode: "insensitive" as const } }]
          : []),
      ],
    },
    select: {
      id: true,
      name: true,
      agreementSigned: true,
    },
  });

  if (!affiliate) {
    return {
      licensed: false,
      affiliateId: null,
      affiliateName: name,
      source: "unknown_creator",
      note: `Creator "${name ?? email}" not on affiliate register — cannot leave TAGGED until registered with signed agreement`,
    };
  }

  if (!affiliate.agreementSigned) {
    return {
      licensed: false,
      affiliateId: affiliate.id,
      affiliateName: affiliate.name,
      source: "unsigned",
      note: `Affiliate "${affiliate.name}" has no signed agreement on register`,
    };
  }

  return {
    licensed: true,
    affiliateId: affiliate.id,
    affiliateName: affiliate.name,
    source: "register",
    note: `Licence confirmed via affiliate register · ${affiliate.name}`,
  };
}
