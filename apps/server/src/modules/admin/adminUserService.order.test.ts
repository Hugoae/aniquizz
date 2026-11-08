import { describe, expect, it } from 'vitest';
import { userListOrderBy } from './adminUserService';

describe('userListOrderBy', () => {
  it('keeps never-seen accounts after every real visit', () => {
    expect(userListOrderBy('seen', 'desc')).toEqual({
      lastSeenAt: { sort: 'desc', nulls: 'last' },
    });
    expect(userListOrderBy('seen', 'asc')).toEqual({
      lastSeenAt: { sort: 'asc', nulls: 'last' },
    });
  });
});
