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
    <figure className="border-hairline-strong flex h-full flex-col overflow-hidden rounded-sm border">
      <div className="border-hairline-strong border-b p-2.5">
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
      <figcaption className="flex flex-1 flex-col gap-4 p-5">
        <blockquote className="text-muted flex-1 leading-[1.55]">
          {quote}
        </blockquote>
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="bg-red size-1.5 rounded-full" />
          <span className="text-[0.78rem] font-semibold tracking-[0.14em] uppercase">
            {name}
          </span>
        </div>
      </figcaption>
    </figure>
  );
}
