type FeatureColumnProps = {
  title: string;
  children: React.ReactNode;
};

export function FeatureColumn({ title, children }: FeatureColumnProps) {
  return (
    <div data-landing-column className="border-hairline border-t py-4">
      <h3 className="font-body mb-1.5 text-[1.02rem] font-semibold">
        {title}
      </h3>
      <p className="text-muted max-w-[38ch] text-[0.92rem] leading-[1.55]">
        {children}
      </p>
    </div>
  );
}
