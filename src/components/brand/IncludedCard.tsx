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
    <div className="bg-bg border-hairline h-full rounded-xs border p-[26px]">
      <div className="text-dim mb-3.5 flex items-center justify-between text-[0.72rem] font-semibold tracking-[0.12em] uppercase">
        <span>{index}</span>
        {badge && <span className="text-red">{badge}</span>}
      </div>
      <h3 className="text-h3 mb-2 font-semibold">{title}</h3>
      <p className="text-muted leading-[1.6]">{children}</p>
    </div>
  );
}
