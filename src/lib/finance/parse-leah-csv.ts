import "server-only";

/** Appendix A categories (Roosevelt Part 04 §2.2). */
export const APPENDIX_A_CATEGORIES = new Set([
  "PAYOUT_SHOPIFY",
  "PAYOUT_STRIPE",
  "PAYOUT_TIKTOK",
  "OTHER_INCOME",
  "REFUND_RECEIVED",
  "COGS_SUPPLIER",
  "PACKAGING",
  "INBOUND_FREIGHT",
  "CUSTOMS_DUTY",
  "FULFILMENT_PICKPACK",
  "POSTAGE_LABELS",
  "INTERNATIONAL_SHIPPING",
  "ADS_META",
  "ADS_TIKTOK",
  "ADS_GOOGLE",
  "AFFILIATE_COMMISSION",
  "CREATOR_GIFTING",
  "CONTENT_PRODUCTION",
  "SOFTWARE_SHOPIFY",
  "SOFTWARE_KLAVIYO",
  "SOFTWARE_GHL",
  "SOFTWARE_N8N",
  "SOFTWARE_AI",
  "SOFTWARE_OTHER",
  "TEAM_PAY",
  "CONTRACTOR",
  "DNA_BLOODWORK_TESTS",
  "COACH_DELIVERY",
  "PAYMENT_FEES",
  "LOAN_REPAYMENT",
  "BANK_FEES",
  "FX_FEES",
  "CUSTOMER_REFUND",
  "CHARGEBACK",
  "VAT",
  "CORPORATION_TAX",
  "ACCOUNTANCY_LEGAL",
  "INSURANCE",
  "OTHER_ADMIN",
  "INTERNAL_TRANSFER",
  "UNCATEGORISED",
]);

const APPENDIX_A_ACCOUNTS = new Set([
  "REVOLUT_GBP",
  "REVOLUT_AED",
  "REVOLUT_EUR",
  "REVOLUT_USD",
  "STRIPE",
  "SHOPIFY_PAYMENTS",
  "PAYPAL",
  "OTHER",
]);

const ROW_TYPES = new Set(["BALANCE", "IN", "OUT", "DUE"]);

/** Legacy simple-template categories (still accepted). */
const LEGACY_CATEGORIES = new Set([
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

const PERSONAL_NAME_RE =
  /\b(mr|mrs|ms|miss)\.?\s+[a-z]+|\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/;

export type FinanceRow = {
  rowNumber: number;
  date: string;
  rowType: "BALANCE" | "IN" | "OUT" | "DUE" | "LEGACY";
  category: string;
  subcategory?: string;
  description: string;
  amountPence: number;
  currency: string;
  account?: string;
  businessLine: "supplements" | "coaching" | "training" | "shared";
  counterparty?: string;
  reference?: string;
  status?: string;
  dueDate?: string;
  approvedBy?: string;
  notes?: string;
  isTeamPay: boolean;
};

export type FinanceParseResult =
  | { ok: true; rows: FinanceRow[]; batchId: string; flags: string[] }
  | { ok: false; errors: Array<{ row: number; reason: string }> };

/**
 * Leah daily finance CSV.
 * Prefers Appendix A columns; falls back to the legacy simple template.
 */
export function parseLeahFinanceCsv(csv: string): FinanceParseResult {
  const lines = csv
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return { ok: false, errors: [{ row: 1, reason: "CSV has no data rows" }] };
  }

  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const isAppendixA = header.includes("row_type");

  if (isAppendixA) {
    return parseAppendixA(lines, header);
  }
  return parseLegacy(lines, header);
}

function parseAppendixA(
  lines: string[],
  header: string[],
): FinanceParseResult {
  const required = [
    "date",
    "row_type",
    "account",
    "amount",
    "currency",
    "status",
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
  const flags: string[] = [];
  const rows: FinanceRow[] = [];
  const batchId = `leah-${Date.now()}`;
  const seenRefs = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1;
    const cols = splitCsvLine(lines[i]);
    const get = (name: string) => cols[header.indexOf(name)]?.trim() ?? "";

    const date = get("date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push({ row: rowNumber, reason: "Date must be YYYY-MM-DD" });
      continue;
    }

    const rowType = get("row_type").toUpperCase();
    if (!ROW_TYPES.has(rowType)) {
      errors.push({
        row: rowNumber,
        reason: `row_type must be BALANCE|IN|OUT|DUE (got "${get("row_type")}")`,
      });
      continue;
    }

    const account = get("account").toUpperCase();
    if (!APPENDIX_A_ACCOUNTS.has(account)) {
      errors.push({
        row: rowNumber,
        reason: `Unknown account "${get("account")}"`,
      });
      continue;
    }

    const amount = Number(get("amount"));
    if (!Number.isFinite(amount) || amount < 0) {
      errors.push({
        row: rowNumber,
        reason: "Amount must be a positive number (2 decimals, no symbol)",
      });
      continue;
    }

    const currency = (get("currency") || "GBP").toUpperCase();
    if (!["GBP", "AED", "EUR", "USD"].includes(currency)) {
      errors.push({ row: rowNumber, reason: `Invalid currency "${currency}"` });
      continue;
    }

    let businessLine = get("business_line").toLowerCase();
    if (rowType !== "BALANCE") {
      if (
        !["supplements", "coaching", "training", "shared"].includes(businessLine)
      ) {
        errors.push({
          row: rowNumber,
          reason: `Invalid business_line "${get("business_line")}"`,
        });
        continue;
      }
    } else {
      businessLine = businessLine || "shared";
    }

    const category = get("category").toUpperCase();
    if (rowType !== "BALANCE") {
      if (!APPENDIX_A_CATEGORIES.has(category)) {
        errors.push({
          row: rowNumber,
          reason: `Unknown category "${get("category")}"`,
        });
        continue;
      }
    }

    const counterparty = get("counterparty");
    const notes = get("notes");
    if (PERSONAL_NAME_RE.test(counterparty) || PERSONAL_NAME_RE.test(notes)) {
      errors.push({
        row: rowNumber,
        reason: "Personal names are not allowed in counterparty or notes",
      });
      continue;
    }

    if (rowType !== "BALANCE" && !counterparty) {
      errors.push({
        row: rowNumber,
        reason: "counterparty required for IN/OUT/DUE",
      });
      continue;
    }

    const reference = get("reference");
    if ((rowType === "IN" || rowType === "OUT") && !reference) {
      errors.push({
        row: rowNumber,
        reason: "reference required for IN/OUT",
      });
      continue;
    }
    if (reference) {
      if (seenRefs.has(reference)) {
        flags.push(`Row ${rowNumber}: duplicate reference ${reference}`);
      }
      seenRefs.add(reference);
    }

    const status = get("status").toUpperCase();
    const dueDate = get("due_date") || undefined;
    if (rowType === "DUE" && !dueDate) {
      errors.push({ row: rowNumber, reason: "due_date required for DUE rows" });
      continue;
    }

    const approvedBy = get("approved_by").toUpperCase() || undefined;
    if (
      (rowType === "OUT" || rowType === "DUE") &&
      amount > 50 &&
      (!approvedBy || approvedBy === "LEAH") &&
      category &&
      !category.startsWith("TEAM") &&
      category !== "CONTRACTOR"
    ) {
      flags.push(
        `Row ${rowNumber}: OUT/DUE >£50 without Kane approval (${category})`,
      );
    }

    rows.push({
      rowNumber,
      date,
      rowType: rowType as FinanceRow["rowType"],
      category: category || "BALANCE",
      description:
        [counterparty, notes].filter(Boolean).join(" — ") ||
        `${rowType} ${account}`,
      amountPence: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      account,
      businessLine: (["supplements", "coaching", "training", "shared"].includes(
        businessLine,
      )
        ? businessLine
        : "shared") as FinanceRow["businessLine"],
      counterparty: counterparty || undefined,
      reference: reference || undefined,
      status,
      dueDate,
      approvedBy,
      notes: notes || undefined,
      isTeamPay: category === "TEAM_PAY" || category === "CONTRACTOR",
    });
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, rows, batchId, flags };
}

function parseLegacy(lines: string[], header: string[]): FinanceParseResult {
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
    if (!LEGACY_CATEGORIES.has(category) && !APPENDIX_A_CATEGORIES.has(category)) {
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
      errors.push({ row: rowNumber, reason: "Date must be YYYY-MM-DD" });
      continue;
    }

    rows.push({
      rowNumber,
      date,
      rowType: "LEGACY",
      category,
      subcategory: get("subcategory") || undefined,
      description: get("description"),
      amountPence: Math.round(amount * 100),
      currency: (get("currency") || "gbp").toLowerCase(),
      account: get("account") || undefined,
      businessLine: businessLine as FinanceRow["businessLine"],
      isTeamPay: category === "TEAM" || category === "PAYROLL" || category === "TEAM_PAY",
    });
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, rows, batchId, flags: ["legacy_template"] };
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
