/** Inclusive HTTP byte range derived from a `Range` header. */

export interface HttpByteRange {
  offset: number;
  length: number;
}

/**
 * Parse `Range` for a known object size. Returns null when the header is
 * missing, malformed, or unsatisfiable — caller should then send the full body.
 */
export function parseHttpByteRange(header: string | null, size: number): HttpByteRange | null {
  if (!header || size <= 0) return null;
  const trimmed = header.trim();

  const suffix = /^bytes=-(\d+)$/i.exec(trimmed);
  if (suffix) {
    const suffixLen = Number(suffix[1]);
    if (!Number.isInteger(suffixLen) || suffixLen <= 0) return null;
    const length = Math.min(suffixLen, size);
    return { offset: size - length, length };
  }

  const abs = /^bytes=(\d+)-(\d+)?$/i.exec(trimmed);
  if (!abs) return null;
  const start = Number(abs[1]);
  if (!Number.isInteger(start) || start < 0 || start >= size) return null;
  const end = abs[2] === undefined ? size - 1 : Number(abs[2]);
  if (!Number.isInteger(end) || end < start) return null;
  const last = Math.min(end, size - 1);
  return { offset: start, length: last - start + 1 };
}

export function isFullObjectRange(range: HttpByteRange, size: number): boolean {
  return range.offset === 0 && range.length === size;
}
