// packages/shared/src/poolFilters.ts
// Lobby pool preview: union of checked types × union of checked difficulties. No draw cascade.

import { selectedPoolDifficulties } from './difficulty';

export type PoolSongTypeId = 'opening' | 'ending';

const TYPE_ALIASES: Record<string, PoolSongTypeId> = {
  opening: 'opening',
  openings: 'opening',
  op: 'opening',
  ending: 'ending',
  endings: 'ending',
  ed: 'ending',
};

/** OP/ED checkboxes for pool counts. INSERT is never included from the lobby toggles. */
export function selectedPoolSongTypes(types?: string[]): PoolSongTypeId[] | undefined {
  if (!types?.length) return undefined;
  const picked = new Set<PoolSongTypeId>();
  for (const raw of types) {
    const mapped = TYPE_ALIASES[raw.trim().toLowerCase()];
    if (mapped) picked.add(mapped);
  }
  if (!picked.size) return undefined;
  return (['opening', 'ending'] as const).filter((id) => picked.has(id));
}

/** Filters the Disponible banner (and pool stats) must use: checked boxes only. */
export function resolvePoolQueryFilters(input: { types?: string[]; difficulty?: string[] }): {
  types?: PoolSongTypeId[];
  difficulty?: string[];
} {
  return {
    types: selectedPoolSongTypes(input.types),
    difficulty: selectedPoolDifficulties(input.difficulty),
  };
}
