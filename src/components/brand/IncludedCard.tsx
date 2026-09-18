type IncludedCardProps = {
  index: string;
  title: string;
  children: React.ReactNode;
  badge?: string;
};

export function IncludedCard({
  index,
  title,
  children,
  badge,
}: IncludedCardProps) {
  return (
    <div
      data-landing-card
      className="bg-bg border-hairline h-full rounded-xs border p-5"
    >
      <div className="text-dim mb-1.5 flex items-center justify-between text-[0.62rem] font-semibold tracking-[0.12em] uppercase">
        <span>{index}</span>
        {badge && <span className="text-red">{badge}</span>}
      </div>
      <h3 className="text-h3 mb-1 font-semibold">{title}</h3>
      <p className="text-muted text-[0.82rem] leading-[1.4]">{children}</p>
    </div>
  );
}
