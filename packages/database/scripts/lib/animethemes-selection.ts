export interface SelectableAnime {
  id: number;
  name: string;
  popularity?: number | null;
  isLocked?: boolean;
}

export type AnimeThemesSelectionConfig =
  | { mode: 'unlocked' }
  | { mode: 'all' }
  | { mode: 'ids'; targetIds: number[] }
  | { mode: 'top'; topLimit: number };

export interface AnimeThemesSelectionResult {
  selectedIds: number[];
  missingIds: number[];
}

const isTruthy = (value: string | undefined): boolean =>
  ['1', 'true', 'yes'].includes(value?.trim().toLowerCase() ?? '');

const parsePositiveInteger = (value: string, name: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
};

const parseTargetIds = (value: string): number[] => {
  const rawIds = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (rawIds.length === 0) {
    throw new Error('ANIMETHEMES_TARGET_IDS must contain at least one AniList id.');
  }

  const ids = rawIds.map((item) =>
    parsePositiveInteger(item, `Invalid ANIMETHEMES_TARGET_IDS value "${item}"`),
  );
  return [...new Set(ids)];
};

/**
 * Resolve the AnimeThemes fetch scope from environment variables.
 *
 * Scope precedence is deliberately explicit:
 * - TOP_LIMIT: live AniList popularity ranking, including locked rows.
 * - TARGET_IDS: exact AniList ids, including locked rows.
 * - INCLUDE_LOCKED: every input anime.
 * - no selector: historical unlocked-only behavior.
 */
export function parseAnimeThemesSelectionConfig(
  env: NodeJS.ProcessEnv,
): AnimeThemesSelectionConfig {
  const topRaw = env.ANIMETHEMES_TOP_LIMIT?.trim();
  const idsRaw = env.ANIMETHEMES_TARGET_IDS?.trim();

  if (topRaw && idsRaw) {
    throw new Error(
      'ANIMETHEMES_TOP_LIMIT and ANIMETHEMES_TARGET_IDS cannot be combined.',
    );
  }
  if (topRaw) {
    return {
      mode: 'top',
      topLimit: parsePositiveInteger(topRaw, 'ANIMETHEMES_TOP_LIMIT'),
    };
  }
  if (idsRaw) {
    return { mode: 'ids', targetIds: parseTargetIds(idsRaw) };
  }
  if (isTruthy(env.ANIMETHEMES_INCLUDE_LOCKED)) {
    return { mode: 'all' };
  }
  return { mode: 'unlocked' };
}

/**
 * Select anime without mutating their lock state. Top and exact-id modes are
 * intentional backfill tools, so they may enrich locked anime while step 3
 * continues to preserve the anime metadata and existing locked songs.
 */
export function resolveAnimeThemeSelection(
  anime: SelectableAnime[],
  config: AnimeThemesSelectionConfig,
  liveTopIds?: number[],
): AnimeThemesSelectionResult {
  const byId = new Map(anime.map((item) => [item.id, item]));

  if (config.mode === 'unlocked') {
    return {
      selectedIds: anime.filter((item) => !item.isLocked).map((item) => item.id),
      missingIds: [],
    };
  }
  if (config.mode === 'all') {
    return { selectedIds: anime.map((item) => item.id), missingIds: [] };
  }

  const requestedIds =
    config.mode === 'ids'
      ? config.targetIds
      : (() => {
          if (!liveTopIds) {
            throw new Error('Top selection requires a live AniList ranking.');
          }
          return liveTopIds.slice(0, config.topLimit);
        })();

  return {
    selectedIds: requestedIds.filter((id) => byId.has(id)),
    missingIds: requestedIds.filter((id) => !byId.has(id)),
  };
}
