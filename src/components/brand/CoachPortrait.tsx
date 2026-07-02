import Image from "next/image";

type CoachPortraitProps = {
  src: string;
  alt: string;
  name: string;
  caption: string;
};

export function CoachPortrait({ src, alt, name, caption }: CoachPortraitProps) {
  return (
    <div className="border-hairline relative overflow-hidden rounded-md border">
      <Image
        src={src}
        alt={alt}
        width={1000}
        height={667}
        sizes="(max-width: 780px) 100vw, 560px"
        className="block aspect-4/3 w-full object-cover object-[42%_24%] filter-[grayscale(0.15)_contrast(1.04)]"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,rgba(10,10,10,0.92),transparent)] p-[18px]">
        <div className="font-display text-[1.4rem]">{name}</div>
        <div className="text-dim text-[0.74rem] font-semibold tracking-[0.12em] uppercase">
          {caption}
        </div>
      </div>
    </div>
  );
}
