import "server-only";

export function formatFrom(displayName: string, address: string) {
  if (address.includes("<")) return address;
  return `${displayName} <${address}>`;
}
