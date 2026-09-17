type Props = {
  name: string;
  className?: string;
};

const PATHS: Record<string, string> = {
  command:
    '<path d="M3 12l4-8h10l4 8-4 8H7l-4-8z"/><circle cx="12" cy="12" r="2.4"/>',
  money:
    '<line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5.5H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6"/>',
  supplements:
    '<path d="M8 3h8"/><path d="M9 3v6l-5 9a3 3 0 0 0 2.6 4.5h10.8A3 3 0 0 0 20 18l-5-9V3"/><line x1="6.5" y1="14.5" x2="17.5" y2="14.5"/>',
  coaching:
    '<circle cx="12" cy="8" r="3.4"/><path d="M5 21c1-4 4-6 7-6s6 2 7 6"/>',
  training:
    '<path d="M6.5 6.5l11 11"/><path d="M3 3l4 4M17 17l4 4"/><path d="M8 5L5 8M19 16l-3 3"/><path d="M4 20l3-3M20 4l-3 3"/>',
  meta: '<path d="M4 18V9a2 2 0 0 1 2-2h2l2-3h4l2 3h2a2 2 0 0 1 2 2v9"/><path d="M3 18h18"/><path d="M9 13a3 3 0 0 0 6 0"/>',
  email:
    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  whatsapp:
    '<path d="M4 19l1.5-4A7.5 7.5 0 1 1 12 19.5H7l-3 1.5z"/><path d="M9 11h.01M12 11h.01M15 11h.01"/>',
  instagram:
    '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3.5"/><circle cx="17.2" cy="6.8" r="1"/>',
  telegram:
    '<path d="M21 5L3 11.5l6 2L17 8l-6 7 0 3 3-2.5 4 2.5 3-13z"/>',
  fulfilment:
    '<rect x="3" y="8" width="18" height="12" rx="1.5"/><path d="M3 8l3-5h12l3 5"/><line x1="3" y1="13" x2="21" y2="13"/>',
  team: '<circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="18" cy="8" r="2.4"/><path d="M22 20c0-2.6-1.7-4.6-4-5.4"/>',
  clients:
    '<circle cx="9" cy="8" r="3"/><circle cx="16" cy="9" r="2.5"/><path d="M2 20c0-3.5 3-6 7-6"/><path d="M13 20c0-2.8 2-5 5-5.5"/>',
  alerts:
    '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  content:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 9l6 3.5L9 16V9z"/>',
  integrations:
    '<circle cx="6" cy="6" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="12" cy="18" r="2.6"/><path d="M8.2 7.4L10 16M15.8 7.4L14 16M8.6 6h6.8"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.6 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z"/>',
  clock:
    '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  search:
    '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
};

export function AdminIcons({ name, className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: PATHS[name] ?? PATHS.command }}
    />
  );
}
