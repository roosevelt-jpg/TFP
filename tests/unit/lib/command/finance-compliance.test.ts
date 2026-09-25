import { describe, expect, it } from "vitest";

import { parseLeahFinanceCsv } from "@/lib/finance/parse-leah-csv";
import { runComplianceCheck } from "@/lib/content/compliance";

describe("parseLeahFinanceCsv", () => {
  it("rejects unknown categories with row numbers", () => {
    const csv = [
      "date,category,description,amount,currency,business_line",
      "2026-09-15,BANANAS,Bad row,10,gbp,shared",
    ].join("\n");
    const result = parseLeahFinanceCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.row).toBe(2);
      expect(result.errors[0]?.reason).toMatch(/category/i);
    }
  });

  it("parses valid rows", () => {
    const csv = [
      "date,category,description,amount,currency,business_line",
      "2026-09-15,COGS,Supplier invoice,-82.4,gbp,supplements",
    ].join("\n");
    const result = parseLeahFinanceCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[0]?.amountPence).toBe(-8240);
    }
  });
});

describe("runComplianceCheck", () => {
  it("fails hormone claims with timecode placeholder", () => {
    const result = runComplianceCheck({ caption: "Boost your testosterone naturally" });
    expect(result.pass).toBe(false);
    expect(result.result).toContain("t=0:00");
  });

  it("passes clean captions", () => {
    const result = runComplianceCheck({ caption: "Week 6 check-in — stay consistent" });
    expect(result.pass).toBe(true);
  });

  it("checks OCR/transcript text on asset meta", () => {
    const result = runComplianceCheck({
      assetMeta: { transcript: "Talk about TRT protocols" },
    });
    expect(result.pass).toBe(false);
    expect(result.result).toMatch(/t=0:00/);
  });

  it("uses Gemini timed line markers in FAIL timecode", () => {
    const result = runComplianceCheck({
      ocr: "[0:12] Boost your testosterone naturally",
    });
    expect(result.pass).toBe(false);
    expect(result.result).toMatch(/t=00:12/);
  });
});
