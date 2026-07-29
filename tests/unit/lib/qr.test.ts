import { describe, expect, it } from "vitest";

import { qrPath } from "@/lib/qr";
import { COACH_WHATSAPP_URL } from "@/lib/whatsapp";

describe("qrPath", () => {
  // Parsed out of qrcode's SVG so the component can render real JSX rather than
  // injecting markup. A change to that output shape breaks here, not silently
  // on the page.
  it("extracts a square grid and a module path", async () => {
    const qr = await qrPath(COACH_WHATSAPP_URL);

    expect(qr).not.toBeNull();
    expect(qr?.size).toBeGreaterThan(20);
    expect(qr?.d.startsWith("M")).toBe(true);
  });

  // The background rect is a separate path; picking it up would render a solid
  // block instead of a scannable code.
  it("skips the background fill", async () => {
    const qr = await qrPath("https://example.com");

    expect(qr?.d).not.toMatch(/^M0 0h\d+v\d+H0z$/);
  });

  it("encodes different text differently", async () => {
    const [a, b] = await Promise.all([
      qrPath("https://example.com/a"),
      qrPath("https://example.com/b"),
    ]);

    expect(a?.d).not.toBe(b?.d);
  });
});
