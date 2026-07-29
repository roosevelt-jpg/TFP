import "server-only";

import QRCode from "qrcode";

export type QrPath = { size: number; d: string };

// Returns the module path and grid size rather than an SVG string, so callers
// render real JSX instead of injecting markup. qrcode emits a background rect
// and a stroked path; only the second carries the code.
export async function qrPath(text: string): Promise<QrPath | null> {
  const svg = await QRCode.toString(text, {
    type: "svg",
    margin: 2,
  }).catch(() => null);

  if (!svg) return null;

  const size = Number(svg.match(/viewBox="0 0 (\d+)/)?.[1]);
  const d = svg.match(/<path stroke="[^"]*" d="([^"]+)"/)?.[1];

  return size && d ? { size, d } : null;
}
