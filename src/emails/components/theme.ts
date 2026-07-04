// Email clients need literal hex. Flat white, brand red preserved. Light-first
// so force-inverting clients (Gmail app) don't mangle a dark design; a black
// logo keeps contrast on white.
export const email = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  panel: "#FFFFFF",
  hairline: "#E7E2D8",
  border: "#D8D1C4",
  text: "#1A1815",
  muted: "#6B6560",
  dim: "#938C84",
  dimmer: "#A8A199",
  red: "#D8231C",
  serif: "Georgia, 'Times New Roman', serif",
  sans: "Arial, Helvetica, sans-serif",
} as const;
