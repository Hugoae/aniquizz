import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminApi';
import { suggestionsApi } from '@/lib/suggestionsApi';
import { countLiveRooms } from '@/features/admin/adminDesk';

const REFRESH_MS = 15_000;

export interface AdminDeskSnapshot {
  ready: boolean;
  liveRooms: number | null;
  repairCount: number | null;
  repairTruncated: boolean;
  openSuggestions: number | null;
}

const EMPTY: AdminDeskSnapshot = {
  ready: false,
  liveRooms: null,
  repairCount: null,
  repairTruncated: false,
  openSuggestions: null,
};

/**
 * Waiting work for the staff desk. Each source fails on its own so one 403
 * does not blank the other counters. Pauses while the tab is hidden.
 */
export function useAdminDesk(enabled: boolean): AdminDeskSnapshot {
  const [desk, setDesk] = useState<AdminDeskSnapshot>(EMPTY);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const load = async () => {
      if (document.hidden) return;
      const [rooms, repair, suggestions] = await Promise.allSettled([
        adminApi.listRooms(),
        adminApi.catalogueRepair(),
        suggestionsApi.browse({ status: 'OPEN', sort: 'recent', page: 1, pageSize: 1 }),
      ]);
      if (cancelled) return;
      setDesk({
        ready: true,
        liveRooms: rooms.status === 'fulfilled' ? countLiveRooms(rooms.value.rooms) : null,
        repairCount: repair.status === 'fulfilled' ? repair.value.songs.length : null,
        repairTruncated: repair.status === 'fulfilled' ? repair.value.truncated : false,
        openSuggestions:
          suggestions.status === 'fulfilled' ? suggestions.value.pagination.totalItems : null,
      });
    };

    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);

  return desk;
}
