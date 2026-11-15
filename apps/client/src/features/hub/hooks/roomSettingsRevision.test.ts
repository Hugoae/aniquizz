import { describe, expect, it } from 'vitest';
import { acceptRoomSettingsRevision } from './roomSettingsRevision';

describe('acceptRoomSettingsRevision', () => {
  it('keeps a newer save when an older join arrives afterwards', () => {
    expect(acceptRoomSettingsRevision(2, 1)).toBe(false);
    expect(acceptRoomSettingsRevision(2, 2)).toBe(true);
    expect(acceptRoomSettingsRevision(2, 3)).toBe(true);
  });

  it('accepts a snapshot that has no revision', () => {
    expect(acceptRoomSettingsRevision(4, undefined)).toBe(true);
  });
});
