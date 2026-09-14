import type { Precision } from './precision';
import { normalizePrecision } from './precision';
import { answerIdentityKey, normalizeString } from './utils';

const UNKNOWN_ARTIST_NORMALIZED = new Set(['unknownartist']);

function isUnknownArtistCredit(value: string): boolean {
  return UNKNOWN_ARTIST_NORMALIZED.has(normalizeString(value));
}

/**
 * Accepted typing answers and the QCM/duo display target for one song.
 * Artist mode never includes the song title or anime names.
 */
export interface RoundAnswerSet {
  correctTarget: string;
  validAnswers: string[];
}

function pushUniqueCredit(raw: string, seen: Set<string>, out: string[]): void {
  const trimmed = raw.trim();
  if (!trimmed || isUnknownArtistCredit(trimmed)) return;
  const key = answerIdentityKey(trimmed);
  if (!key || seen.has(key)) return;
  seen.add(key);
  out.push(trimmed);
}

/**
 * Credited people/groups for one song. Composite collab strings are omitted
 * when `artistNames` already lists the billed units. `artistNames[0]` is first
 * billed (left-hand display token), not a curated lead vocalist.
 */
export function resolveArtistUnits(artist: string, artistNames: readonly string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of artistNames) pushUniqueCredit(name, seen, out);
  if (out.length === 0) {
    pushUniqueCredit(artist, seen, out);
    return out;
  }

  const display = artist.trim();
  const displayKey = answerIdentityKey(display);
  if (displayKey && displayKey === answerIdentityKey(out[0])) {
    out[0] = display;
  }
  return out;
}

/** Stable QCM/duo correct option: first billed unit. */
export function resolveArtistQcmTarget(
  artist: string,
  artistNames: readonly string[] = [],
): string {
  return resolveArtistUnits(artist, artistNames)[0] ?? '';
}

/**
 * Typing answers: billed units first (so bots / Mix align with QCM), then the
 * full display credit when it is a distinct extra form.
 */
export function resolveArtistAcceptedAnswers(
  artist: string,
  artistNames: readonly string[] = [],
): string[] {
  const units = resolveArtistUnits(artist, artistNames);
  const seen = new Set(units.map(answerIdentityKey).filter((key) => key.length > 0));
  const out = [...units];
  pushUniqueCredit(artist, seen, out);
  return out;
}

export function hasPlayableArtistCredit(
  artist: string,
  artistNames: readonly string[] = [],
): boolean {
  return resolveArtistAcceptedAnswers(artist, artistNames).length > 0;
}

/** True when two credits share any accepted identity (collab overlap). */
export function artistCreditsOverlap(left: readonly string[], right: readonly string[]): boolean {
  const leftKeys = new Set(left.map(answerIdentityKey).filter((key) => key.length > 0));
  if (!leftKeys.size) return false;
  return right.some((name) => leftKeys.has(answerIdentityKey(name)));
}

/** Deduped autocomplete / QCM-pool labels: billed units only. */
export function collectArtistSearchLabels(
  rows: ReadonlyArray<{ artist: string; artistNames?: readonly string[] }>,
): string[] {
  const byKey = new Map<string, string>();
  const add = (raw: string) => {
    const trimmed = raw.trim();
    const key = answerIdentityKey(trimmed);
    if (!key || byKey.has(key)) return;
    byKey.set(key, trimmed);
  };
  for (const row of rows) {
    for (const unit of resolveArtistUnits(row.artist, row.artistNames ?? [])) add(unit);
  }
  return [...byKey.values()];
}

export function resolveRoundAnswerSet(input: {
  precision: unknown;
  animeName: string;
  altNames?: readonly string[];
  franchise?: string | null;
  artist: string;
  artistNames?: readonly string[];
}): RoundAnswerSet {
  const precision: Precision = normalizePrecision(input.precision);
  if (precision === 'artist') {
    const artistNames = input.artistNames ?? [];
    return {
      correctTarget: resolveArtistQcmTarget(input.artist, artistNames),
      validAnswers: resolveArtistAcceptedAnswers(input.artist, artistNames),
    };
  }

  const baseAnswers = [input.animeName, ...(input.altNames ?? [])].filter((name): name is string =>
    Boolean(name && name.trim()),
  );
  const franchise = input.franchise?.trim() || null;
  if (precision === 'franchise' && franchise) {
    return {
      correctTarget: franchise,
      validAnswers: [...baseAnswers, franchise],
    };
  }
  return {
    correctTarget: input.animeName,
    validAnswers: baseAnswers,
  };
}
