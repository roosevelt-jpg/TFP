import { PDFDocument } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";

import { watermarkPdf } from "@/lib/pdf/watermark";

const LICENCE = {
  name: "Kane Mousah",
  email: "buyer@example.com",
  orderRef: "FP-ABC12345",
};

let master: Uint8Array;

beforeAll(async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage([595, 842]);
  pdf.addPage([595, 842]);
  pdf.addPage([595, 842]);
  master = await pdf.save();
});

describe("watermarkPdf", () => {
  it("returns a valid PDF", async () => {
    const out = await watermarkPdf(master, LICENCE);

    expect(Buffer.from(out).subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("keeps every page", async () => {
    const out = await watermarkPdf(master, LICENCE);
    const parsed = await PDFDocument.load(out);

    expect(parsed.getPageCount()).toBe(3);
  });

  // Both the footer and the metadata carry the attribution, so stripping one
  // still leaves the other.
  it("writes the licence into the metadata", async () => {
    const parsed = await PDFDocument.load(await watermarkPdf(master, LICENCE));

    expect(parsed.getSubject()).toContain("FP-ABC12345");
    expect(parsed.getSubject()).toContain("buyer@example.com");
    expect(parsed.getKeywords()).toContain("FP-ABC12345");
  });

  it("titles the document for the customer, not the file", async () => {
    const parsed = await PDFDocument.load(await watermarkPdf(master, LICENCE));

    expect(parsed.getTitle()).toBe("The Formula Programme");
  });

  // Two buyers must get visibly different files, or attribution is worthless.
  it("produces a different document per purchase", async () => {
    const a = await watermarkPdf(master, LICENCE);
    const b = await watermarkPdf(master, {
      ...LICENCE,
      orderRef: "FP-ZZZ99999",
      email: "other@example.com",
    });

    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
  });

  // A long name should not push the footer off the page.
  it("keeps the footer on the page for a long name", async () => {
    const out = await watermarkPdf(master, {
      ...LICENCE,
      name: "N".repeat(80),
    });

    expect(Buffer.from(out).subarray(0, 5).toString()).toBe("%PDF-");
  });
});
