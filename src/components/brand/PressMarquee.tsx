import Image from "next/image";

import { cn } from "@/lib/cn";
import type { PressLogo } from "@/content/press-logos";

type PressMarqueeProps = {
  logos: PressLogo[];
  label?: string;
  speedSeconds?: number;
  className?: string;
};

export function PressMarquee({
  logos,
  label = "As featured in",
  speedSeconds = 42,
  className,
}: PressMarqueeProps) {
  return (
    <section
      aria-label={label}
      className={cn("border-hairline overflow-hidden border-y py-6", className)}
    >
      <p className="text-dim mb-4 text-center text-[0.62rem] tracking-[0.22em] uppercase">
        {label}
      </p>
      <div className="relative mask-[linear-gradient(90deg,transparent,#000_9%,#000_91%,transparent)] [-webkit-mask-image:linear-gradient(90deg,transparent,#000_9%,#000_91%,transparent)]">
        <div
          className="flex w-max items-center gap-[clamp(46px,6.5vw,84px)] opacity-72 hover:paused motion-safe:animate-[marquee_var(--marquee-duration)_linear_infinite]"
          style={
            { "--marquee-duration": `${speedSeconds}s` } as React.CSSProperties
          }
        >
          {logos.map((logo) => (
            <PressLogoImage key={logo.src} logo={logo} />
          ))}
          {logos.map((logo) => (
            <PressLogoImage key={`dup-${logo.src}`} logo={logo} hidden />
          ))}
        </div>
      </div>
    </section>
  );
}

function PressLogoImage({
  logo,
  hidden,
}: {
  logo: PressLogo;
  hidden?: boolean;
}) {
  return (
    <Image
      src={logo.src}
      alt={hidden ? "" : logo.alt}
      aria-hidden={hidden}
      width={148}
      height={25}
      className="h-[25px] w-auto max-w-[148px] object-contain"
    />
  );
}
