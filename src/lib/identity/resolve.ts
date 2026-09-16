import "server-only";

import { db } from "@/db";

/**
 * Identity resolution: email first, then phone. Never merge on name.
 */
export async function resolvePersonCustomer(input: {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  shopifyId?: string | null;
  stripeId?: string | null;
  ghlId?: string | null;
  igHandle?: string | null;
}) {
  const email = input.email?.trim().toLowerCase();
  const phone = input.phone?.trim();

  if (email) {
    return db.personCustomer.upsert({
      where: { email },
      create: {
        email,
        phone: phone || null,
        name: input.name || null,
        shopifyId: input.shopifyId || null,
        stripeId: input.stripeId || null,
        ghlId: input.ghlId || null,
        igHandle: input.igHandle || null,
      },
      update: {
        phone: phone || undefined,
        name: input.name || undefined,
        shopifyId: input.shopifyId || undefined,
        stripeId: input.stripeId || undefined,
        ghlId: input.ghlId || undefined,
        igHandle: input.igHandle || undefined,
      },
    });
  }

  if (phone) {
    const existing = await db.personCustomer.findFirst({ where: { phone } });
    if (existing) {
      return db.personCustomer.update({
        where: { id: existing.id },
        data: {
          name: input.name || undefined,
          shopifyId: input.shopifyId || undefined,
          stripeId: input.stripeId || undefined,
          ghlId: input.ghlId || undefined,
          igHandle: input.igHandle || undefined,
        },
      });
    }

    // Phone-only create uses a synthetic email key so the unique email
    // constraint still holds — never invent a merge on name.
    const synthetic = `phone:${phone.replace(/\D/g, "")}@identity.tfp.local`;
    return db.personCustomer.create({
      data: {
        email: synthetic,
        phone,
        name: input.name || null,
        shopifyId: input.shopifyId || null,
        stripeId: input.stripeId || null,
        ghlId: input.ghlId || null,
        igHandle: input.igHandle || null,
      },
    });
  }

  throw new Error("Cannot resolve person without email or phone");
}
