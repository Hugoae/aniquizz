import { describe, expect, it } from 'vitest';
import { AUTH_DELETE_FAILED_MESSAGE } from './deleteAccount';

describe('deleteAccount copy', () => {
  it('points Auth-orphan failures at support without tu', () => {
    expect(AUTH_DELETE_FAILED_MESSAGE).toMatch(/Contactez le support/);
    expect(AUTH_DELETE_FAILED_MESSAGE).not.toMatch(/Contacte le/);
  });
});
