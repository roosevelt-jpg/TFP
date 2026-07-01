import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "The Formula Programme",
  description: "An 8-week fitness programme by Kane Mousah.",
};

type RootLayoutProps = Readonly<{ children: React.ReactNode }>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
