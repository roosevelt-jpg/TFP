import "server-only";

import { db } from "@/db";
import {
  listSeedableThresholdIds,
  thresholdDefaultFor,
} from "@/lib/alerts/rules-config";

/**
 * Create missing AlertThreshold rows from rules-config defaults.
 * Covers every Part 03 rule id + numeric helper keys (CT1_HOURS, M3_OVER, …).
 * Does not overwrite Kane-edited values.
 */
export async function ensureAlertThresholds() {
  let created = 0;
  const ids = listSeedableThresholdIds();
  for (const ruleId of ids) {
    const def = thresholdDefaultFor(ruleId);
    if (!def) continue;
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
  return { created, total: ids.length };
}
