import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/db", () => ({ db: { purchase: { findUnique } } }));

const { findPurchaseByPdfToken } = await import(
  "@/data/payments/queries/find-purchase-by-pdf-token"
);

// 32 random bytes, base64url.
const VALID = "J5_MzAA_lpWX_k9qcVW05ZIOz9sn7UnjolidlZ603N0";

beforeEach(() => vi.clearAllMocks());

describe("findPurchaseByPdfToken", () => {
  it("resolves a paid purchase with a stamped file", async () => {
    findUnique.mockResolvedValue({
      ref: "FP-ABC12345",
      status: "paid",
      pdfReadyAt: new Date(),
    });

    await expect(findPurchaseByPdfToken(VALID)).resolves.toEqual({
      ref: "FP-ABC12345",
      ready: true,
    });
  });

  it("reports a purchase whose file is not stamped yet", async () => {
    findUnique.mockResolvedValue({
      ref: "FP-ABC12345",
      status: "paid",
      pdfReadyAt: null,
    });

    await expect(findPurchaseByPdfToken(VALID)).resolves.toMatchObject({
      ready: false,
    });
  });

  // Anything not shaped like one of our tokens cannot match, so it never
  // reaches the database.
  describe("rejects malformed tokens without querying", () => {
    const malformed = [
      ["empty", ""],
      ["too short", "abc"],
      ["too long", `${VALID}extra`],
      ["sql-ish", "' OR 1=1 --"],
      ["path traversal", "../../master.pdf"],
      ["url encoded", "%2e%2e%2fmaster"],
    ];

    for (const [label, token] of malformed) {
      it(label, async () => {
        await expect(findPurchaseByPdfToken(token)).resolves.toBeNull();
        expect(findUnique).not.toHaveBeenCalled();
      });
    }
  });

  // A refunded purchase stops resolving, and looks identical to a token that
  // never existed.
  it("refuses a purchase that is not paid", async () => {
    findUnique.mockResolvedValue({
      ref: "FP-ABC12345",
      status: "refunded",
      pdfReadyAt: new Date(),
    });

    await expect(findPurchaseByPdfToken(VALID)).resolves.toBeNull();
  });

  it("returns null for an unknown token", async () => {
    findUnique.mockResolvedValue(null);

    await expect(findPurchaseByPdfToken(VALID)).resolves.toBeNull();
  });

  // Only what the route needs. Anything more is data the endpoint could leak.
  it("selects nothing beyond the reference and readiness", async () => {
    findUnique.mockResolvedValue({
      ref: "FP-ABC12345",
      status: "paid",
      pdfReadyAt: new Date(),
    });

    await findPurchaseByPdfToken(VALID);

    expect(findUnique.mock.calls[0]?.[0].select).toEqual({
      ref: true,
      status: true,
      pdfReadyAt: true,
    });
  });
});
