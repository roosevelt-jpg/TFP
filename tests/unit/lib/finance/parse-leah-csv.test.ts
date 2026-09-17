import { describe, expect, it } from "vitest";

import { parseLeahFinanceCsv } from "@/lib/finance/parse-leah-csv";

const APPENDIX = `date,row_type,account,business_line,category,counterparty,amount,currency,reference,status,due_date,approved_by,notes
2026-09-15,BALANCE,REVOLUT_GBP,,,,100.00,GBP,,CLEARED,,,
2026-09-15,IN,STRIPE,TRAINING,PAYOUT_STRIPE,CUSTOMER,149.00,GBP,po_1,CLEARED,,,
2026-09-15,OUT,REVOLUT_GBP,SUPPLEMENTS,ADS_META,Meta,50.00,GBP,inv-1,CLEARED,,KANE,ads
2026-09-15,DUE,REVOLUT_GBP,SHARED,SOFTWARE_GHL,GoHighLevel,97.00,GBP,ghl-1,DUE,2026-09-20,,
`;

describe("parseLeahFinanceCsv Appendix A", () => {
  it("parses Appendix A rows", () => {
    const result = parseLeahFinanceCsv(APPENDIX);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(4);
    expect(result.rows[0]!.rowType).toBe("BALANCE");
    expect(result.rows[1]!.category).toBe("PAYOUT_STRIPE");
    expect(result.rows[3]!.rowType).toBe("DUE");
  });

  it("rejects personal names", () => {
    const bad = `date,row_type,account,business_line,category,counterparty,amount,currency,reference,status,due_date,approved_by,notes
2026-09-15,OUT,REVOLUT_GBP,SHARED,SOFTWARE_OTHER,John Smith,10.00,GBP,ref1,CLEARED,,KANE,
`;
    const result = parseLeahFinanceCsv(bad);
    expect(result.ok).toBe(false);
  });

  it("still accepts legacy template", () => {
    const legacy = `date,category,description,amount,currency,business_line
2026-09-15,ADS,Meta ads,100,gbp,supplements
`;
    const result = parseLeahFinanceCsv(legacy);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0]!.rowType).toBe("LEGACY");
    expect(result.flags).toContain("legacy_template");
  });
});
