import { Prisma } from "@/generated/prisma/client";

export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

// Narrower than isUniqueViolation: only the random codes worth regenerating.
// A conflict on any other field is a real error, not something to retry.
export function isGeneratedCodeCollision(error: unknown): boolean {
  if (!isUniqueViolation(error)) return false;
  const target =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? error.meta?.target
      : undefined;
  const fields = Array.isArray(target) ? target : [target];
  return fields.some((f) => f === "ref" || f === "pdfToken");
}
