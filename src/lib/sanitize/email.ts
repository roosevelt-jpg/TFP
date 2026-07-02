export function cleanEmail(value: string): string {
  return value.trim().toLowerCase().slice(0, 120);
}
