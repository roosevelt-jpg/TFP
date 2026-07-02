type AnnouncementBarProps = {
  children: React.ReactNode;
};

export function AnnouncementBar({ children }: AnnouncementBarProps) {
  return (
    <div className="bg-red text-cta-contrast px-(--gutter) py-[11px] text-center text-[0.78rem] font-medium">
      <span
        aria-hidden
        className="mr-2 inline-block size-1.5 rounded-full bg-white/80 align-middle"
      />
      {children}
    </div>
  );
}
