import { describe, expect, it } from "vitest";

import { cleanMultiline, cleanText } from "@/lib/sanitize/text";

describe("cleanText", () => {
  it("strips control characters that could smuggle into headers or the DB", () => {
    expect(cleanText("Jane\u0000\u0007\u001b\u007f Doe", 80)).toBe("Jane Doe");
  });

  it("collapses all whitespace runs to single spaces and trims", () => {
    expect(cleanText("  Jane \t\n  Doe  ", 80)).toBe("Jane Doe");
  });

  it("slices to the max length", () => {
    expect(cleanText("a".repeat(100), 80)).toHaveLength(80);
  });

  it("keeps emoji and non-ASCII names intact", () => {
    expect(cleanText("Zoë 💪", 80)).toBe("Zoë 💪");
  });
});

describe("cleanMultiline", () => {
  it("normalises CRLF to LF and keeps newlines", () => {
    expect(cleanMultiline("line one\r\nline two", 300)).toBe(
      "line one\nline two",
    );
  });

  it("collapses runs of blank lines to one blank line", () => {
    expect(cleanMultiline("a\n\n\n\n\nb", 300)).toBe("a\n\nb");
  });

  it("collapses intra-line whitespace without touching line breaks", () => {
    expect(cleanMultiline("a   b\t c\nd", 300)).toBe("a b c\nd");
  });

  it("trims first, then caps length - a mid-word cap keeps its space", () => {
    expect(cleanMultiline("  knee pain ", 5)).toBe("knee ");
  });
});
