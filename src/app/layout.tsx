import type { Metadata, Viewport } from "next";

import { ConsentBanner } from "@/components/ConsentBanner";
import { MetaPixelPageView } from "@/components/MetaPixelPageView";
import { siteConfig } from "@/config/site";

import { body, display } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0A0A0A",
};

type RootLayoutProps = Readonly<{ children: React.ReactNode }>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
      style={
        {
          "--font-display": `var(--font-display-next), Georgia, serif`,
          "--font-body": `var(--font-body-next), system-ui, sans-serif`,
        } as React.CSSProperties
      }
    >
      <body className="flex min-h-full flex-col font-body">
        {/* Before children: first in tab order, since it's the first thing a
            new visitor must act on (fixed positioning is unaffected). */}
        <ConsentBanner />
        {children}
        {process.env.NEXT_PUBLIC_META_PIXEL_ID ? (
          <MetaPixelPageView />
        ) : null}
      </body>
    </html>
  );
}
