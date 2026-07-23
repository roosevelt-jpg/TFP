import type { GhlCustomField } from "@/lib/clients/ghl";
import {
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  SEX_OPTIONS,
} from "@/lib/validation/waitlist/options";

// GHL custom field IDs for the namespaced "Waitlist …" fields (created in the
// Sub-Account, separate from the product's own fields). Dropdowns take the
// human label; numbers/text take the value as a string.
const FIELD_IDS = {
  goal: "WdeC9AyvSGSAgz3JWjTv",
  level: "hCnCqTrCqBC5UTf8tcI4",
  sex: "bN2MybcVHGFn2Ofy4tuK",
  age: "DYr79AowCy3c1niIvbX0",
  heightCm: "Zb8I5b30beHNEi8mCNGM",
  weightKg: "kOBegxTkeEdeJqxdNKFw",
  goalWeightKg: "SDQyNXBTYBYXbkkNZyih",
  diet: "re9sigEgn0z8VGAbYePy",
  injuries: "L5Xd3RpPfNQqKPHdHsvv",
} as const;

const labelOf = (
  options: readonly { value: string; label: string }[],
  value: string,
) => options.find((o) => o.value === value)?.label ?? value;

export type WaitlistProfile = {
  goal?: string | null;
  level?: string | null;
  sex?: string | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  goalWeightKg?: number | null;
  diet?: string | null;
  injuries?: string | null;
};

// Build the GHL customFields array from a waitlist profile. Dropdown fields get
// the human-readable label (matching each field's options in GHL); every field
// is optional now, so each is omitted when absent — we never write empty values
// and a minimal resubmit never blanks a field GHL already has.
export function toGhlCustomFields(p: WaitlistProfile): GhlCustomField[] {
  const fields: GhlCustomField[] = [];

  if (p.goal) {
    fields.push({
      id: FIELD_IDS.goal,
      field_value: labelOf(GOAL_OPTIONS, p.goal),
    });
  }
  if (p.level) {
    fields.push({
      id: FIELD_IDS.level,
      field_value: labelOf(LEVEL_OPTIONS, p.level),
    });
  }
  if (p.sex) {
    fields.push({
      id: FIELD_IDS.sex,
      field_value: labelOf(SEX_OPTIONS, p.sex),
    });
  }
  if (p.age != null) {
    fields.push({ id: FIELD_IDS.age, field_value: String(p.age) });
  }
  if (p.heightCm != null) {
    fields.push({ id: FIELD_IDS.heightCm, field_value: String(p.heightCm) });
  }
  if (p.weightKg != null) {
    fields.push({ id: FIELD_IDS.weightKg, field_value: String(p.weightKg) });
  }
  if (p.goalWeightKg != null) {
    fields.push({
      id: FIELD_IDS.goalWeightKg,
      field_value: String(p.goalWeightKg),
    });
  }
  if (p.diet) fields.push({ id: FIELD_IDS.diet, field_value: p.diet });
  if (p.injuries) {
    fields.push({ id: FIELD_IDS.injuries, field_value: p.injuries });
  }

  return fields;
}
