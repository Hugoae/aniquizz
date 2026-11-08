import { ADMIN_COPY } from '@/features/admin/copy/adminCopy';

/** A match that is still on the clock, including a paused one. */
export function countLiveRooms(rooms: readonly { status: string }[]): number {
  return rooms.filter((room) => room.status === 'playing' || room.status === 'paused').length;
}

export function formatLiveRooms(count: number | null): string {
  if (count === null) return ADMIN_COPY.desk.unavailable;
  if (count <= 0) return ADMIN_COPY.desk.roomsNone;
  if (count === 1) return ADMIN_COPY.desk.roomsOne;
  return ADMIN_COPY.desk.roomsMany(count);
}

export function formatRepair(count: number | null, truncated: boolean): string {
  if (count === null) return ADMIN_COPY.desk.unavailable;
  if (truncated && count > 0) return ADMIN_COPY.desk.repairTruncated(count);
  if (count <= 0) return ADMIN_COPY.desk.repairNone;
  if (count === 1) return ADMIN_COPY.desk.repairOne;
  return ADMIN_COPY.desk.repairMany(count);
}

export function formatOpenSuggestions(count: number | null): string {
  if (count === null) return ADMIN_COPY.desk.unavailable;
  if (count <= 0) return ADMIN_COPY.desk.suggestionsNone;
  if (count === 1) return ADMIN_COPY.desk.suggestionsOne;
  return ADMIN_COPY.desk.suggestionsMany(count);
}
