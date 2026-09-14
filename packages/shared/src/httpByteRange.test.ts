import { describe, expect, it } from 'vitest';
import { isFullObjectRange, parseHttpByteRange } from './httpByteRange';

const SIZE = 1_000;

describe('parseHttpByteRange', () => {
  it('returns null without a Range header', () => {
    expect(parseHttpByteRange(null, SIZE)).toBeNull();
    expect(parseHttpByteRange('', SIZE)).toBeNull();
  });

  it('parses an open-ended first-byte range as the full object', () => {
    expect(parseHttpByteRange('bytes=0-', SIZE)).toEqual({ offset: 0, length: SIZE });
    expect(isFullObjectRange({ offset: 0, length: SIZE }, SIZE)).toBe(true);
  });

  it('parses a Safari-style two-byte probe', () => {
    expect(parseHttpByteRange('bytes=0-1', SIZE)).toEqual({ offset: 0, length: 2 });
    expect(isFullObjectRange({ offset: 0, length: 2 }, SIZE)).toBe(false);
  });

  it('parses a suffix range', () => {
    expect(parseHttpByteRange('bytes=-100', SIZE)).toEqual({ offset: 900, length: 100 });
  });

  it('rejects unsatisfiable or malformed headers', () => {
    expect(parseHttpByteRange('bytes=1000-1001', SIZE)).toBeNull();
    expect(parseHttpByteRange('bytes=50-40', SIZE)).toBeNull();
    expect(parseHttpByteRange('items=0-1', SIZE)).toBeNull();
  });
});
