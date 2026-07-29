import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// A second display face and a red accent stripe on every button is what makes
// an email read as generated rather than written. These crept in once, so the
// customer-facing templates are pinned to one face and no accents.
//
// support-notification is exempt: it goes to the team, where red flags priority.
const DIR = join(process.cwd(), "src/emails");
const CUSTOMER_TEMPLATES = readdirSync(DIR).filter(
  (file) => file.endsWith(".tsx") && file !== "support-notification.tsx",
);

const source = (file: string) => readFileSync(join(DIR, file), "utf8");

describe.each(CUSTOMER_TEMPLATES)("%s", (file) => {
  it("uses a single typeface", () => {
    expect(source(file)).not.toMatch(/email\.serif/);
  });

  it("carries no italics", () => {
    expect(source(file)).not.toMatch(/fontStyle:\s*"italic"/);
  });

  it("carries no red accents", () => {
    expect(source(file)).not.toMatch(/email\.red/);
  });
});

// The theme is the seam: keeping a serif here invites its reuse.
it("offers no serif face to reach for", () => {
  expect(readFileSync(join(DIR, "components/theme.ts"), "utf8")).not.toMatch(
    /serif:/,
  );
});

it("covers every customer-facing template", () => {
  expect(CUSTOMER_TEMPLATES).toEqual([
    "launch-announcement.tsx",
    "purchase-welcome.tsx",
    "support-received.tsx",
    "trial-ending.tsx",
    "waitlist-welcome.tsx",
  ]);
});
