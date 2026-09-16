import "server-only";

const ALLOWED_CATEGORIES = new Set([
  "COGS",
  "SHIPPING",
  "ADS",
  "SOFTWARE",
  "PAYROLL",
  "TEAM",
  "RENT",
  "TAX",
  "TRANSFER",
  "REVENUE",
  "OTHER",
]);

export type FinanceRow = {
  rowNumber: number;
  date: string;
  category: string;
  subcategory?: string;
  description: string;
  amountPence: number;
  currency: string;
  account?: string;
  businessLine: "supplements" | "coaching" | "training" | "shared";
  isTeamPay: boolean;
};

export type FinanceParseResult =
  | { ok: true; rows: FinanceRow[]; batchId: string }
  | { ok: false; errors: Array<{ row: number; reason: string }> };

/** Leah daily template: date,category,subcategory,description,amount,currency,account,business_line */
export function parseLeahFinanceCsv(csv: string): FinanceParseResult {
  const lines = csv
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return { ok: false, errors: [{ row: 1, reason: "CSV has no data rows" }] };
  }

  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const required = [
    "date",
    "category",
    "description",
    "amount",
    "currency",
    "business_line",
  ];
  for (const col of required) {
    if (!header.includes(col)) {
      return {
        ok: false,
        errors: [{ row: 1, reason: `Missing column: ${col}` }],
      };
    }
  }

  const errors: Array<{ row: number; reason: string }> = [];
  const rows: FinanceRow[] = [];
  const batchId = `leah-${Date.now()}`;

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1;
    const cols = splitCsvLine(lines[i]);
    const get = (name: string) => cols[header.indexOf(name)]?.trim() ?? "";

    const category = get("category").toUpperCase();
    if (!ALLOWED_CATEGORIES.has(category)) {
      errors.push({
        row: rowNumber,
        reason: `Unknown category "${get("category")}"`,
      });
      continue;
    }

    const amount = Number(get("amount"));
    if (!Number.isFinite(amount)) {
      errors.push({ row: rowNumber, reason: "Amount is not a number" });
      continue;
    }

    const businessLine = get("business_line").toLowerCase();
    if (
      !["supplements", "coaching", "training", "shared"].includes(businessLine)
    ) {
      errors.push({
        row: rowNumber,
        reason: `Invalid business_line "${get("business_line")}"`,
      });
      continue;
    }

    const date = get("date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push({
        row: rowNumber,
        reason: "Date must be YYYY-MM-DD",
      });
      continue;
    }

    rows.push({
      rowNumber,
      date,
      category,
      subcategory: get("subcategory") || undefined,
      description: get("description"),
      amountPence: Math.round(amount * 100),
      currency: (get("currency") || "gbp").toLowerCase(),
      account: get("account") || undefined,
      businessLine: businessLine as FinanceRow["businessLine"],
      isTeamPay: category === "TEAM" || category === "PAYROLL",
    });
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, rows, batchId };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}
