type AnnouncementBarProps = {
  children: React.ReactNode;
  href?: string;
};

export function AnnouncementBar({ children, href }: AnnouncementBarProps) {
  const dot = (
    <span
      aria-hidden
      className="mr-2 inline-block size-1.5 rounded-full bg-white/80 align-middle"
    />
  );

  if (href) {
    return (
      <a
        href={href}
        className="bg-red text-cta-contrast hover:bg-red/90 block px-(--gutter) py-[11px] text-center text-[0.78rem] font-medium"
      >
        {dot}
        {children}
      </a>
    );
  }

  return (
    <div className="bg-red text-cta-contrast px-(--gutter) py-[11px] text-center text-[0.78rem] font-medium">
      {dot}
      {children}
    </div>
  );
}
