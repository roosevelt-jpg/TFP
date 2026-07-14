import Image from "next/image";

import { cn } from "@/lib/cn";

type InstagramGlyphProps = {
  size?: number;
  className?: string;
};

export function InstagramGlyph({ size = 18, className }: InstagramGlyphProps) {
  return (
    <Image
      src="/assets/instagram.svg"
      alt="Instagram"
      width={size}
      height={size}
      className={cn("block", className)}
    />
  );
}
