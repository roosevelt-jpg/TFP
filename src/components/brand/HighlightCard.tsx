type HighlightCardProps = {
  kicker: string;
  title: React.ReactNode;
  children: React.ReactNode;
  bullets?: string[];
  aside?: React.ReactNode;
};

export function HighlightCard({
  kicker,
  title,
  children,
  bullets,
  aside,
}: HighlightCardProps) {
  return (
    <div className="bg-bg border-hairline rounded-xs border p-[clamp(24px,4vw,38px)]">
      <div className="grid items-center gap-[clamp(24px,4vw,46px)] min-[780px]:grid-cols-2">
        <div>
          <span className="text-dim border-hairline-strong inline-block rounded-full border px-[11px] py-1.5 text-[0.64rem] font-semibold tracking-label uppercase">
            {kicker}
          </span>
          <h3 className="font-display mt-[18px] text-[clamp(1.6rem,3.6vw,2.1rem)] leading-[1.08] font-medium tracking-[-0.01em]">
            {title}
          </h3>
          <p className="text-muted mt-3.5 max-w-[46ch] leading-[1.65]">
            {children}
          </p>
          {bullets && bullets.length > 0 && (
            <ul className="mt-5 flex list-none flex-wrap gap-x-[18px] gap-y-[9px] p-0">
              {bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-center gap-2 text-[0.92rem]"
                >
                  <span aria-hidden className="bg-red size-[5px] shrink-0" />
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </div>
        {aside && (
          <div className="justify-self-center text-center">{aside}</div>
        )}
      </div>
    </div>
  );
}
