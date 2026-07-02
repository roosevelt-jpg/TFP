type FeatureRowProps = {
  title: React.ReactNode;
  children: React.ReactNode;
};

export function FeatureRow({ title, children }: FeatureRowProps) {
  return (
    <div className="border-hairline border-t py-[22px]">
      <h3 className="mb-[7px] text-[1.1rem] font-semibold">{title}</h3>
      <p className="text-muted max-w-[44ch] leading-[1.6]">{children}</p>
    </div>
  );
}
