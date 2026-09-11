import { describe, expect, it } from 'vitest';
import { serverApiBase } from './env';

describe('serverApiBase', () => {
  it('points at the local Express server outside production', () => {
    expect(serverApiBase()).toBe('http://localhost:3001');
  });
});
