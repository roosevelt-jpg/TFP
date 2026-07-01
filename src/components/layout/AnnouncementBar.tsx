type AnnouncementBarProps = {
  children: React.ReactNode;
};

export function AnnouncementBar({ children }: AnnouncementBarProps) {
  return (
    <div className="border-hairline text-muted border-b px-(--gutter) py-[11px] text-center text-[0.78rem]">
      <span
        aria-hidden
        className="bg-red mr-2 inline-block size-1.5 rounded-full align-middle"
      />
      {children}
    </div>
  );
}
