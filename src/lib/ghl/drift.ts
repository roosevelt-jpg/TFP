import { PURCHASE_TAGS, PURCHASE_TAGS_TO_ADD, TAGS } from "./membership-tags";

// Set by hand when the client grants someone free access. Reconcile must never
// touch a contact carrying it, or a comped member loses access overnight.
export const COMP_TAG = "comp";

export type MemberState = {
  tags: string[];
  // False once the subscription is canceled or the purchase was refunded.
  entitled: boolean;
};

export type Drift = {
  add: string[];
  // Tags we believe are wrong but will not remove. A human decides, because
  // the coach hand-tags contacts and we cannot tell her edits from our bugs.
  suspect: string[];
  exempt: boolean;
};

const EXPECTED = [...PURCHASE_TAGS, ...PURCHASE_TAGS_TO_ADD];

// Add-only. Anything a paying member is missing gets restored; anything extra
// is reported and left alone. The asymmetry is deliberate: a missing tag is
// always our bug, an unexpected one might be her deciding something.
export function findDrift(member: MemberState): Drift {
  const held = new Set(member.tags);

  if (held.has(COMP_TAG)) {
    return { add: [], suspect: [], exempt: true };
  }

  if (!member.entitled) {
    // programme-active is the access switch. Holding it without a live
    // subscription is the one drift that costs money, so it is always worth
    // waking someone for, but removing it could revoke access she granted.
    return {
      add: [],
      suspect: held.has(TAGS.programmeActive) ? [TAGS.programmeActive] : [],
      exempt: false,
    };
  }

  return {
    add: EXPECTED.filter((tag) => !held.has(tag)),
    suspect: held.has(TAGS.cancelled) ? [TAGS.cancelled] : [],
    exempt: false,
  };
}
