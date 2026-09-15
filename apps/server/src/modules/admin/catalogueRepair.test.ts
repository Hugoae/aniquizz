import { describe, expect, it } from 'vitest';
import { catalogueRepairSortRank, collectCatalogueRepairReasons } from './catalogueRepair';

describe('collectCatalogueRepairReasons', () => {
  it('flags ERROR songs first and does not also tag missing video', () => {
    expect(
      collectCatalogueRepairReasons({
        downloadStatus: 'ERROR',
        isLocked: true,
        animeLocked: false,
        franchiseLocked: false,
      }),
    ).toEqual(['error']);
  });

  it('flags PENDING / PROCESSING / SKIPPED as missing video', () => {
    expect(
      collectCatalogueRepairReasons({
        downloadStatus: 'PENDING',
        isLocked: true,
        animeLocked: false,
        franchiseLocked: false,
      }),
    ).toEqual(['missing_video']);
  });

  it('flags an unlocked song under a locked parent as forgotten lock', () => {
    expect(
      collectCatalogueRepairReasons({
        downloadStatus: 'COMPLETED',
        isLocked: false,
        animeLocked: true,
        franchiseLocked: false,
      }),
    ).toEqual(['forgotten_lock']);
  });

  it('can combine ERROR with forgotten lock', () => {
    expect(
      collectCatalogueRepairReasons({
        downloadStatus: 'ERROR',
        isLocked: false,
        animeLocked: false,
        franchiseLocked: true,
      }),
    ).toEqual(['error', 'forgotten_lock']);
  });

  it('skips healthy completed locked songs', () => {
    expect(
      collectCatalogueRepairReasons({
        downloadStatus: 'COMPLETED',
        isLocked: true,
        animeLocked: true,
        franchiseLocked: true,
      }),
    ).toEqual([]);
  });
});

describe('catalogueRepairSortRank', () => {
  it('ranks error above missing video above forgotten lock', () => {
    expect(catalogueRepairSortRank(['error'])).toBe(0);
    expect(catalogueRepairSortRank(['missing_video'])).toBe(1);
    expect(catalogueRepairSortRank(['forgotten_lock'])).toBe(2);
    expect(catalogueRepairSortRank(['forgotten_lock', 'error'])).toBe(0);
  });
});
