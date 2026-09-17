import "server-only";

import { db } from "@/db";

export async function getCmsMap(namespace: string): Promise<Record<string, string>> {
  const rows = await db.cmsDocument.findMany({ where: { namespace } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function getCmsValue(
  namespace: string,
  key: string,
  fallback: string,
): Promise<string> {
  const row = await db.cmsDocument.findUnique({
    where: { namespace_key: { namespace, key } },
  });
  return row?.value ?? fallback;
}

export async function upsertCmsValue(input: {
  namespace: string;
  key: string;
  value: string;
  updatedBy: string;
}) {
  const existing = await db.cmsDocument.findUnique({
    where: {
      namespace_key: { namespace: input.namespace, key: input.key },
    },
  });

  if (existing) {
    return db.cmsDocument.update({
      where: { id: existing.id },
      data: {
        value: input.value,
        version: existing.version + 1,
        updatedBy: input.updatedBy,
      },
    });
  }

  return db.cmsDocument.create({
    data: {
      namespace: input.namespace,
      key: input.key,
      value: input.value,
      updatedBy: input.updatedBy,
    },
  });
}

export {
  LANDING_CMS_NAMESPACE,
  ADMIN_CMS_NAMESPACE,
  BRAND_CMS_NAMESPACE,
} from "@/lib/cms/namespaces";
