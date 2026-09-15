import type { DownloadStatus } from '@aniquizz/database';

/** Why a song sits in the staff repair queue. Ordered by severity when sorting. */
export type CatalogueRepairReason = 'error' | 'missing_video' | 'forgotten_lock';

const REASON_RANK: Record<CatalogueRepairReason, number> = {
  error: 0,
  missing_video: 1,
  forgotten_lock: 2,
};

export function collectCatalogueRepairReasons(song: {
  downloadStatus: DownloadStatus;
  isLocked: boolean;
  animeLocked: boolean;
  franchiseLocked: boolean;
}): CatalogueRepairReason[] {
  const reasons: CatalogueRepairReason[] = [];
  if (song.downloadStatus === 'ERROR') reasons.push('error');
  else if (
    song.downloadStatus === 'PENDING' ||
    song.downloadStatus === 'PROCESSING' ||
    song.downloadStatus === 'SKIPPED'
  ) {
    reasons.push('missing_video');
  }
  if (!song.isLocked && (song.animeLocked || song.franchiseLocked)) {
    reasons.push('forgotten_lock');
  }
  return reasons;
}

export function catalogueRepairSortRank(reasons: CatalogueRepairReason[]): number {
  if (reasons.length === 0) return 99;
  return Math.min(...reasons.map((r) => REASON_RANK[r]));
}
