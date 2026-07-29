import "server-only";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export type Licence = {
  name: string;
  email: string;
  orderRef: string;
};

// Attribution, not protection. A determined person can strip this; what it buys
// is a leaked copy tracing back to the purchase it came from. Written into both
// the page footer and the document metadata so removing one leaves the other.
export async function watermarkPdf(
  master: Uint8Array,
  licence: Licence,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(master);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const line = `Licensed to ${licence.name} · ${licence.email} · Order ${licence.orderRef}`;
  const size = 7;
  const width = font.widthOfTextAtSize(line, size);

  for (const page of pdf.getPages()) {
    const { width: pageWidth } = page.getSize();
    page.drawText(line, {
      x: Math.max(12, (pageWidth - width) / 2),
      y: 14,
      size,
      font,
      color: rgb(0.45, 0.45, 0.45),
      opacity: 0.75,
    });
  }

  pdf.setTitle("The Formula Programme");
  pdf.setAuthor("The Formula Performance");
  pdf.setSubject(`Licensed to ${licence.email} · Order ${licence.orderRef}`);
  pdf.setKeywords([licence.orderRef, licence.email]);
  pdf.setCreator("The Formula Performance");

  return pdf.save();
}
