/**
 * CMS values are plain text only — no HTML markup in marketing copy.
 */

export function stripHtmlToPlainText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*p\s*>/gi, "\n")
    .replace(/<\s*\/\s*div\s*>/gi, "\n")
    .replace(/<\s*\/\s*li\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n: string) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Walk JSON string values and plain-text them (FAQ / testimonials blobs). */
export function plainTextJsonStrings(raw: string): string {
  try {
    const parsed: unknown = JSON.parse(raw);
    return JSON.stringify(plainTextDeep(parsed), null, 2);
  } catch {
    return stripHtmlToPlainText(raw);
  }
}

function plainTextDeep(value: unknown): unknown {
  if (typeof value === "string") return stripHtmlToPlainText(value);
  if (Array.isArray(value)) return value.map(plainTextDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = plainTextDeep(v);
    }
    return out;
  }
  return value;
}
