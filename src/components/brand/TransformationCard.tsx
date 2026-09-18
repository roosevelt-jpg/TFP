import Image from "next/image";

type TransformationCardProps = {
  name: string;
  image: string;
  quote: string;
  priority?: boolean;
};

export function TransformationCard({
  name,
  image,
  quote,
  priority,
}: TransformationCardProps) {
  return (
    <figure
      data-landing-card
      className="border-hairline-strong flex h-full flex-col overflow-hidden rounded-sm border"
    >
      <div className="border-hairline-strong border-b p-1.5">
        <Image
          src={image}
          alt={`${name} before and after The Formula programme`}
          width={1080}
          height={900}
          sizes="(max-width: 767px) 85vw, (max-width: 1179px) 45vw, 30vw"
          priority={priority}
          className="block h-auto w-full rounded-xs"
        />
      </div>
      <figcaption className="flex flex-1 flex-col gap-2 p-3">
        <blockquote className="text-muted flex-1 text-[0.82rem] leading-[1.4]">
          {quote}
        </blockquote>
        <div className="flex items-center gap-1.5">
          <span aria-hidden className="bg-red size-1 rounded-full" />
          <span className="text-[0.66rem] font-semibold tracking-[0.14em] uppercase">
            {name}
          </span>
        </div>
      </figcaption>
    </figure>
  );
}
