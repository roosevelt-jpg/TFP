import { cn } from "@/lib/cn";

type TestimonialProps = {
  quote: string;
  name: string;
  detail?: string;
  rating?: number;
  featured?: boolean;
};

export function Testimonial({
  quote,
  name,
  detail,
  rating = 5,
  featured = false,
}: TestimonialProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <figure
      className={cn(
        "group bg-bg border-hairline relative flex flex-col gap-[15px] overflow-hidden rounded-xs border p-[26px] transition-[transform,border-color,box-shadow] duration-500 ease-emphasis hover:scale-[1.015] hover:border-hairline-strong hover:shadow-[0_16px_38px_rgba(0,0,0,0.4)]",
        featured && "border-t-red border-t-2",
      )}
    >
      <span
        aria-hidden
        className="ease-shine pointer-events-none absolute inset-y-0 left-0 w-[55%] translate-x-[-220%] bg-[linear-gradient(105deg,transparent,rgba(255,255,255,0.08),transparent)] transition-none duration-900 group-hover:translate-x-[320%] group-hover:transition-transform"
      />
      <div
        role="img"
        aria-label={`${rating} out of 5`}
        className={cn(
          "text-[0.82rem] tracking-[3px]",
          featured ? "text-red" : "text-muted",
        )}
      >
        {"★".repeat(Math.max(0, Math.round(rating)))}
      </div>
      <blockquote
        className={
          featured
            ? "text-[1.08rem] leading-normal"
            : "text-[1.04rem] leading-[1.55]"
        }
      >
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="mt-auto flex items-center gap-3">
        <span
          aria-hidden
          className="bg-surface border-hairline-strong text-muted grid size-10 place-items-center rounded-full border text-[0.85rem] font-semibold"
        >
          {initials}
        </span>
        <span>
          <span className="block text-[0.92rem] font-semibold">{name}</span>
          {detail && (
            <span className="text-dim block text-[0.8rem]">{detail}</span>
          )}
        </span>
      </figcaption>
    </figure>
  );
}
