import { findPurchaseByPdfToken } from "@/data/payments/queries/find-purchase-by-pdf-token";
import { clientIp } from "@/lib/client-ip";
import { logger } from "@/lib/logger";
import { readPurchasePdf } from "@/lib/pdf/storage";
import { checkRateLimit } from "@/lib/rate-limit";

const notFound = () =>
  new Response("Not found", {
    status: 404,
    headers: { "Cache-Control": "private, no-store" },
  });

// The token is a 256-bit random column on the purchase, and the only way to
// reach a copy: the master is never served, and one customer's token cannot
// resolve to another's file.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const ip = await clientIp();
  const limited = await checkRateLimit("download", ip ?? "unknown");

  if (!limited.success) {
    return new Response("Too many requests", {
      status: 429,
      headers: {
        "Retry-After": String(limited.retryAfter),
        "Cache-Control": "private, no-store",
      },
    });
  }

  const { token } = await params;
  const access = await findPurchaseByPdfToken(token);

  if (!access?.ready) return notFound();

  const stream = await readPurchasePdf(access.ref);

  if (!stream) {
    // The row says ready but the object is gone, so redrive needs to restamp.
    logger.error("Purchase PDF is missing from storage", undefined, {
      purchaseRef: access.ref,
    });

    return notFound();
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="The Formula Programme ${access.ref}.pdf"`,
      // Personalised and behind a bearer token, so no shared cache may hold it.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // The token sits in the path, so keep it out of any Referer we cause.
      "Referrer-Policy": "no-referrer",
    },
  });
}
