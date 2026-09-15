import { readFileSync } from 'node:fs';

/**
 * Read a TS `'...'` / `"..."` string field from `libraryCopy.ts`.
 * Skips whitespace after the colon so multiline `heroSubtitle:` still works.
 */
export function extractTsStringField(src, field) {
  const marker = `${field}:`;
  const at = src.indexOf(marker);
  if (at < 0) {
    throw new Error(`Missing ${field} in library copy`);
  }
  let i = at + marker.length;
  while (i < src.length && /\s/.test(src[i])) i += 1;
  const quote = src[i];
  if (quote !== "'" && quote !== '"') {
    throw new Error(`Expected quoted ${field}`);
  }
  i += 1;
  let out = '';
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\' && i + 1 < src.length) {
      out += src[i + 1];
      i += 2;
      continue;
    }
    if (ch === quote) return out;
    out += ch;
    i += 1;
  }
  throw new Error(`Unterminated ${field} string`);
}

export function extractLibraryHeroCopy(src) {
  return {
    title: extractTsStringField(src, 'heroTitle'),
    subtitle: extractTsStringField(src, 'heroSubtitle'),
  };
}

export function readLibraryHeroCopy(copyPath) {
  return extractLibraryHeroCopy(readFileSync(copyPath, 'utf8'));
}
