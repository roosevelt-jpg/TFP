type StatBlockProps = {
  value: string;
  caption: string;
};

export function StatBlock({ value, caption }: StatBlockProps) {
  return (
    <div data-landing-stat>
      <div className="font-display text-[1.7rem]">{value}</div>
      <div className="bg-hairline-strong my-[9px] h-px" />
      <div className="text-dim text-[0.78rem] font-semibold tracking-widest uppercase">
        {caption}
      </div>
    </div>
  );
}
