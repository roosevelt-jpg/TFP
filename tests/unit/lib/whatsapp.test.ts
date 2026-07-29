import { describe, expect, it } from "vitest";

import { COACH_WHATSAPP_URL } from "@/lib/whatsapp";

// Pinned against the contract Indigo sent on 28 July 2026. A buyer arriving on
// this link is what applies programme-welcome instead of no-wa-optin, so a
// silent drift here means people pay and then hear nothing.
const CONTRACT_URL =
  "https://wa.me/447466396911?text=Hi%2C%20I%27d%20like%20to%20start%20my%20coaching";

describe("COACH_WHATSAPP_URL", () => {
  it("matches the agreed opt-in link exactly", () => {
    expect(COACH_WHATSAPP_URL).toBe(CONTRACT_URL);
  });
});
