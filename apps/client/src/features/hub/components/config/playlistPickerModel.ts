import type { ThematicPlaylistSummary } from '@aniquizz/shared';

export const DECADE_PLAYLIST_SLUGS = ['1990s', '2000s', '2010s', '2020s'] as const;

export type DecadePlaylistSlug = (typeof DECADE_PLAYLIST_SLUGS)[number];

/** Genre / tag packs in picker order (Décennie is always pinned above). */
export const PICKER_PACK_SLUG_ORDER = [
  'shonen',
  'seinen',
  'fantasy',
  'romance',
  'sports',
  'slice-of-life',
  'isekai',
  'supernatural',
  'mecha',
  'sci-fi',
] as const;

const HIDDEN_PICKER_SLUGS = new Set(['easy-hits']);

export function isDecadePlaylistSlug(slug: string): slug is DecadePlaylistSlug {
  return (DECADE_PLAYLIST_SLUGS as readonly string[]).includes(slug);
}

/** `2010s` → 2010. Unknown slugs return null. */
export function decadeStartYear(slug: string): number | null {
  const match = /^(\d{4})s$/.exec(slug);
  if (!match) return null;
  return Number(match[1]);
}

export function defaultDecadePack(
  decades: ThematicPlaylistSummary[],
): ThematicPlaylistSummary | undefined {
  return decades.find((pack) => pack.slug === '2010s') ?? decades[0];
}

export type PlaylistPickerRow =
  | { kind: 'pack'; pack: ThematicPlaylistSummary }
  | { kind: 'decade'; packs: ThematicPlaylistSummary[] };

const packOrderIndex = (slug: string): number => {
  const index = (PICKER_PACK_SLUG_ORDER as readonly string[]).indexOf(slug);
  return index === -1 ? PICKER_PACK_SLUG_ORDER.length : index;
};

/** Décennie first (full-width), then staff packs in a fixed order. */
export function pickerRows(playlists: ThematicPlaylistSummary[]): PlaylistPickerRow[] {
  const visible = playlists.filter((pack) => !HIDDEN_PICKER_SLUGS.has(pack.slug));
  const decades = visible
    .filter((pack) => isDecadePlaylistSlug(pack.slug))
    .sort((a, b) => (decadeStartYear(a.slug) ?? 0) - (decadeStartYear(b.slug) ?? 0));
  const rest = visible
    .filter((pack) => !isDecadePlaylistSlug(pack.slug))
    .sort((a, b) => packOrderIndex(a.slug) - packOrderIndex(b.slug) || a.sortOrder - b.sortOrder);

  const rows: PlaylistPickerRow[] = rest.map((pack) => ({ kind: 'pack', pack }));
  if (decades.length === 0) return rows;
  return [{ kind: 'decade', packs: decades }, ...rows];
}

export function effectivePlaylistSelection(
  config: { playlistId?: string | null; decadePlaylistId?: string | null },
  playlists: ThematicPlaylistSummary[],
): { playlistId?: string; decadePlaylistId?: string } {
  const decadeIds = new Set(
    playlists.filter((pack) => isDecadePlaylistSlug(pack.slug)).map((pack) => pack.id),
  );
  let playlistId = config.playlistId ?? undefined;
  let decadePlaylistId = config.decadePlaylistId ?? undefined;
  if (playlistId && decadeIds.has(playlistId)) {
    decadePlaylistId = decadePlaylistId ?? playlistId;
    playlistId = undefined;
  }
  return { playlistId, decadePlaylistId };
}
