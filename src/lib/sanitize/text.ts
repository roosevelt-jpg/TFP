const isControlChar = (code: number) => code < 0x20 || code === 0x7f;

export function cleanText(value: string, maxLen: number): string {
  let out = "";
  for (const char of value) {
    if (!isControlChar(char.charCodeAt(0))) out += char;
  }
  return out.replace(/\s+/g, " ").trim().slice(0, maxLen);
}

export function cleanMultiline(value: string, maxLen: number): string {
  let out = "";
  for (const char of value.replace(/\r\n?/g, "\n")) {
    const code = char.charCodeAt(0);
    if (char === "\n" || !isControlChar(code)) out += char;
  }
  return out
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLen);
}
