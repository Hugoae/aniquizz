import { describe, expect, it } from 'vitest';
import { parseAdminRoomId, parseAdminTab } from './adminNavigation';

describe('parseAdminRoomId', () => {
  it('keeps a room code and drops anything else', () => {
    expect(parseAdminRoomId('Ab12')).toBe('Ab12');
    expect(parseAdminRoomId('  ab  ')).toBe('ab');
    expect(parseAdminRoomId(null)).toBeNull();
    expect(parseAdminRoomId('')).toBeNull();
    expect(parseAdminRoomId('has-dash')).toBeNull();
    expect(parseAdminRoomId('a'.repeat(17))).toBeNull();
  });
});

describe('parseAdminTab', () => {
  it('falls back to users for unknown or staff-only tabs', () => {
    expect(parseAdminTab(null, { canManage: true, isDev: true })).toBe('users');
    expect(parseAdminTab('nope', { canManage: true, isDev: true })).toBe('users');
    expect(parseAdminTab('playlists', { canManage: false, isDev: true })).toBe('users');
    expect(parseAdminTab('dev', { canManage: true, isDev: false })).toBe('users');
  });

  it('keeps allowlisted tabs the role can open', () => {
    expect(parseAdminTab('rooms', { canManage: false, isDev: false })).toBe('rooms');
    expect(parseAdminTab('audit', { canManage: false, isDev: false })).toBe('audit');
    expect(parseAdminTab('catalogue', { canManage: false, isDev: false })).toBe('catalogue');
    expect(parseAdminTab('daily', { canManage: true, isDev: false })).toBe('daily');
    expect(parseAdminTab('dev', { canManage: true, isDev: true })).toBe('dev');
  });
});
