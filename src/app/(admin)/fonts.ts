import { Barlow_Condensed, Inter, JetBrains_Mono } from "next/font/google";

export const commandDisplay = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--cmd-font-display-next",
  display: "swap",
});

export const commandBody = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--cmd-font-body-next",
  display: "swap",
});

export const commandMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--cmd-font-mono-next",
  display: "swap",
});
