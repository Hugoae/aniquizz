import { describe, expect, it } from 'vitest';
import { buildUserSearchWhere, isProfileIdQuery } from './adminUserSearch';

describe('isProfileIdQuery', () => {
  it('accepts a standard UUID (including the admin_dev fixture)', () => {
    expect(isProfileIdQuery('00000000-0000-4000-8000-000000000001')).toBe(true);
    expect(isProfileIdQuery('  550e8400-e29b-41d4-a716-446655440000  ')).toBe(true);
  });

  it('rejects username-like and truncated values', () => {
    expect(isProfileIdQuery('admin_dev')).toBe(false);
    expect(isProfileIdQuery('00000000-0000-4000-8000')).toBe(false);
    expect(isProfileIdQuery('')).toBe(false);
  });
});

describe('buildUserSearchWhere', () => {
  it('matches username and email for a text query', () => {
    expect(buildUserSearchWhere('Kirikou')).toEqual({
      OR: [
        { username: { contains: 'Kirikou', mode: 'insensitive' } },
        { email: { contains: 'Kirikou', mode: 'insensitive' } },
      ],
    });
  });

  it('matches the profile id when the query is a UUID', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    expect(buildUserSearchWhere(id)).toEqual({
      id: { equals: id, mode: 'insensitive' },
    });
  });
});
