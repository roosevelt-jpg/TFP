import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-gray-500">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/" className="underline underline-offset-4">
        Back to home
      </Link>
    </main>
  );
}
