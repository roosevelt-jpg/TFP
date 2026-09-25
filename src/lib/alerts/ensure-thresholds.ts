import "server-only";

import { db } from "@/db";
import { DEFAULT_ALERT_THRESHOLDS } from "@/lib/alerts/rules-config";

/**
 * Create missing AlertThreshold rows from rules-config defaults.
 * Does not overwrite Kane-edited values.
 */
export async function ensureAlertThresholds() {
  let created = 0;
  for (const [ruleId, def] of Object.entries(DEFAULT_ALERT_THRESHOLDS)) {
    const existing = await db.alertThreshold.findUnique({ where: { ruleId } });
    if (existing) continue;
    await db.alertThreshold.create({
      data: {
        ruleId,
        label: def.label,
        value: def.value,
        unit: def.unit,
        enabled: true,
      },
    });
    created += 1;
  }
  return { created, total: Object.keys(DEFAULT_ALERT_THRESHOLDS).length };
}
