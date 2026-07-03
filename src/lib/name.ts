/** First word of a full name, trimmed. Empty string if there's nothing usable. */
export function firstNameOf(fullName: string): string {
  return fullName.trim().split(" ")[0] ?? "";
}
