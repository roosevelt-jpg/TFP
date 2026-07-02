const isControlChar = (code: number) => code < 0x20 || code === 0x7f;

// Normalizes trusted-after-validation text: drops control chars, collapses
// whitespace, trims, caps length.
export function cleanText(value: string, maxLen: number): string {
  let out = "";
  for (const char of value) {
    if (!isControlChar(char.charCodeAt(0))) out += char;
  }
  return out.replace(/\s+/g, " ").trim().slice(0, maxLen);
}
