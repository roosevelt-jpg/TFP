type FeatureColumnProps = {
  title: string;
  children: React.ReactNode;
};

export function FeatureColumn({ title, children }: FeatureColumnProps) {
  return (
    <div className="border-hairline border-t py-[22px]">
      <h3 className="font-body mb-[7px] text-[1.1rem] font-semibold">
        {title}
      </h3>
      <p className="text-muted max-w-[38ch] leading-[1.6]">{children}</p>
    </div>
  );
}
