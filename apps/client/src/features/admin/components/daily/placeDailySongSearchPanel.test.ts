import { describe, expect, it } from 'vitest';
import { placeDailySongSearchPanel } from './placeDailySongSearchPanel';

describe('placeDailySongSearchPanel', () => {
  it('opens below the field when the viewport has room', () => {
    const box = placeDailySongSearchPanel({ top: 120, bottom: 156, left: 40, width: 420 }, 900);
    expect(box.top).toBe(160);
    expect(box.bottom).toBeUndefined();
    expect(box.maxHeight).toBe(360);
    expect(box.left).toBe(40);
    expect(box.width).toBe(420);
  });

  it('opens above the last field so the list stays on screen', () => {
    const box = placeDailySongSearchPanel({ top: 860, bottom: 896, left: 40, width: 420 }, 940);
    expect(box.top).toBeUndefined();
    expect(box.bottom).toBe(84);
    expect(box.maxHeight).toBe(360);
    expect((box.bottom ?? 0) + box.maxHeight).toBeLessThanOrEqual(940 - 12);
  });

  it('caps height to the leftover viewport when opening below', () => {
    const box = placeDailySongSearchPanel({ top: 100, bottom: 136, left: 0, width: 300 }, 320);
    expect(box.top).toBe(140);
    expect(box.bottom).toBeUndefined();
    expect(box.maxHeight).toBe(172);
  });
});
