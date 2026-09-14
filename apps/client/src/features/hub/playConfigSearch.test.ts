import { describe, expect, it } from 'vitest';
import {
  parsePlayConfigSearch,
  playCreatePath,
  resolveLobbySettingsAction,
  resolvePlayConfigIntent,
} from './playConfigSearch';

describe('parsePlayConfigSearch', () => {
  it('reads intent and roomId from the query string', () => {
    expect(parsePlayConfigSearch('?intent=solo')).toEqual({ intent: 'solo', roomId: null });
    expect(parsePlayConfigSearch('intent=edit&roomId=A3K9ZQ')).toEqual({
      intent: 'edit',
      roomId: 'A3K9ZQ',
    });
    expect(parsePlayConfigSearch('')).toEqual({ intent: null, roomId: null });
    expect(parsePlayConfigSearch('?intent=nope')).toEqual({ intent: null, roomId: null });
  });
});

describe('resolvePlayConfigIntent', () => {
  it('prefers the URL so a refresh does not fall back to create', () => {
    expect(resolvePlayConfigIntent('?intent=solo', 'create')).toBe('solo');
    expect(resolvePlayConfigIntent('', 'solo')).toBe('solo');
    expect(resolvePlayConfigIntent('')).toBe('create');
  });
});

describe('playCreatePath', () => {
  it('puts edit room identity in the URL', () => {
    expect(playCreatePath('solo')).toBe('/play/create?intent=solo');
    expect(playCreatePath('create')).toBe('/play/create?intent=create');
    expect(playCreatePath('edit', 'A3K9ZQ')).toBe('/play/create?intent=edit&roomId=A3K9ZQ');
    expect(playCreatePath('edit')).toBe('/play/create?intent=edit');
  });
});

describe('resolveLobbySettingsAction', () => {
  it('updates only an explicit edit with a room id', () => {
    expect(resolveLobbySettingsAction('edit', 'A3K9ZQ')).toBe('update');
    expect(resolveLobbySettingsAction('edit', '')).toBe('missing-room');
    expect(resolveLobbySettingsAction('create', 'A3K9ZQ')).toBe('create');
    expect(resolveLobbySettingsAction('create', '')).toBe('create');
    expect(resolveLobbySettingsAction('solo', '')).toBe('create');
  });
});
