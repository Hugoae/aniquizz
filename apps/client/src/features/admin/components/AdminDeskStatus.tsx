import type { AdminTab } from '@/features/admin/adminNavigation';
import { formatLiveRooms, formatOpenSuggestions, formatRepair } from '@/features/admin/adminDesk';
import { ADMIN_COPY } from '@/features/admin/copy/adminCopy';
import type { AdminDeskSnapshot } from '@/features/admin/useAdminDesk';

export function AdminDeskStatus({
  desk,
  onOpen,
}: {
  desk: AdminDeskSnapshot;
  onOpen: (tab: AdminTab) => void;
}) {
  const items: { tab: AdminTab; label: string }[] = [
    { tab: 'rooms', label: formatLiveRooms(desk.liveRooms) },
    { tab: 'catalogue', label: formatRepair(desk.repairCount, desk.repairTruncated) },
    { tab: 'suggestions', label: formatOpenSuggestions(desk.openSuggestions) },
  ];

  if (!desk.ready) {
    return <p className="mb-4 text-sm text-muted-foreground">{ADMIN_COPY.desk.loading}</p>;
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.tab}
          type="button"
          onClick={() => onOpen(item.tab)}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
