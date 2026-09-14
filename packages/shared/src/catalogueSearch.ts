import type { LibrarySongType } from './library';

export interface CatalogueSearchTokens {
  /** Remaining free-text after OP/ED/INSERT tokens are stripped. */
  text: string;
  songType: LibrarySongType | null;
  sequence: number | null;
}

/**
 * Labels shown in the library (`OP1`, `ED5`). Last type token wins.
 * Standalone "in" is never INSERT — only `in1` / `insert`.
 */
const TYPE_TOKEN_RE =
  /\b(?:openings?|endings?|inserts?|op|ed)(?:[\s._-]*(\d{1,2}))?\b|\bin(\d{1,2})\b/gi;

const songTypeFromMatch = (raw: string): LibrarySongType => {
  const lower = raw.trim().toLowerCase();
  if (lower.startsWith('ending')) return 'ED';
  if (lower.startsWith('opening')) return 'OP';
  if (lower.startsWith('insert') || /^in\d/.test(lower)) return 'INSERT';
  if (lower.startsWith('ed')) return 'ED';
  return 'OP';
};

/** Parse `bleach ED5`, `naruto op 1`, `ED3` into anime text + type/sequence filters. */
export function parseCatalogueSearchQuery(raw: string): CatalogueSearchTokens {
  let songType: LibrarySongType | null = null;
  let sequence: number | null = null;
  const tokenRe = new RegExp(TYPE_TOKEN_RE.source, 'gi');
  const text = raw
    .replace(tokenRe, (match, typeSeq: string | undefined, inSeq: string | undefined) => {
      songType = songTypeFromMatch(match);
      const seqRaw = typeSeq ?? inSeq;
      sequence = seqRaw ? Number.parseInt(seqRaw, 10) : null;
      if (sequence != null && !Number.isFinite(sequence)) sequence = null;
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
  return { text, songType, sequence };
}

/**
 * Combine a UI type filter with a type token from the query.
 * `null` = no type constraint. `[]` = impossible (e.g. library OP + query ED5).
 */
export function resolveCatalogueSongTypes(
  selected: readonly LibrarySongType[] | undefined,
  parsed: LibrarySongType | null,
): LibrarySongType[] | null {
  if (!parsed) return selected?.length ? [...selected] : null;
  if (!selected?.length) return [parsed];
  return selected.includes(parsed) ? [parsed] : [];
}
