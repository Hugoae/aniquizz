import { normalizeString } from '@aniquizz/shared';

/**
 * Artist credits whose official name contains a comma. Splitting on "," would
 * invent fake people ("Fear" / "and Loathing in Las Vegas"). Keep them atomic.
 * Compare via normalizeString so punctuation/case drift still matches.
 */
export const ATOMIC_ARTIST_CREDITS = [
  'Fear, and Loathing in Las Vegas',
  "Mix Speaker's, Inc.",
  'Run Girls, Run!',
  'Wake Up, Girls!',
  'JO☆STARS ~TOMMY, Coda, JIN~',
  "Kurosawa, Ken'ichi",
  "Tsuchiya, Anna inspi' Nana ~Black Stones~",
  'Kamisama, Boku wa Kizuite shimatta',
] as const;

/**
 * Composite display credits that do not use the pipeline's usual comma
 * delimiter. These are curated because words such as "with", "and", and "X"
 * also occur in atomic group names.
 */
export const ARTIST_CREDIT_OVERRIDES: Readonly<Record<string, readonly string[]>> = {
  'AISHA feat. CHEHON': ['AISHA', 'CHEHON'],
  'AUTRIBE featuring Dirty Old Men': ['AUTRIBE', 'Dirty Old Men'],
  'CHiCO with HoneyWorks': ['CHiCO', 'HoneyWorks'],
  'Daisy X Daisy feat. Another Infinity': ['Daisy X Daisy', 'Another Infinity'],
  'DWB feat.fade': ['DWB', 'fade'],
  'Go Shiina feat. naomi': ['Go Shiina', 'naomi'],
  'Hiroaki Miyakoshi and Shigeru Yamada': ['Hiroaki Miyakoshi', 'Shigeru Yamada'],
  'Kenji Ohtsuki and Fumihiko Kitsutaka': ['Kenji Ohtsuki', 'Fumihiko Kitsutaka'],
  'Kevin Penkin feat. Raj Ramayya': ['Kevin Penkin', 'Raj Ramayya'],
  'KURAMA featuring Hanae': ['KURAMA', 'Hanae'],
  'MATCHY with QUESTION?': ['MATCHY', 'QUESTION?'],
  'Oingo and Boingo': ['Oingo', 'Boingo'],
  'Q-MHz feat. Mitsuhiro Hidaka a.k.a SKY-HI': ['Q-MHz', 'Mitsuhiro Hidaka a.k.a SKY-HI'],
  'Rie Yamaguchi with manzo': ['Rie Yamaguchi', 'manzo'],
  'ROUND TABLE feat. Nino': ['ROUND TABLE', 'Nino'],
  'The Seatbelts feat. Mai Yamane': ['The Seatbelts', 'Mai Yamane'],
  'Team.Nekokan [Neko] featuring. atsuko': ['Team.Nekokan [Neko]', 'atsuko'],
  'Team.Nekokan [Neko] featuring. Junca Amaoto': ['Team.Nekokan [Neko]', 'Junca Amaoto'],
  'Team.Nekokan [Neko] featuring. Rekka Katakiri': [
    'Team.Nekokan [Neko]',
    'Rekka Katakiri',
  ],
  'Toshinobu Kubota feat. Naomi Campbell': ['Toshinobu Kubota', 'Naomi Campbell'],
  'Tsu Terakado ♀ with Houkago Happy Hour': ['Tsu Terakado ♀', 'Houkago Happy Hour'],
  'Velvet.kodhy and Velvet.kodhy and μ and μ': ['Velvet.kodhy', 'μ'],
} as const;

const ATOMIC_ARTIST_NORMALIZED = new Set(
  ATOMIC_ARTIST_CREDITS.map((name) => normalizeString(name)).filter((name) => name.length > 0),
);

const OVERRIDE_BY_NORMALIZED_CREDIT = new Map(
  Object.entries(ARTIST_CREDIT_OVERRIDES).map(([credit, names]) => [
    normalizeString(credit),
    names,
  ]),
);

const UNKNOWN_ARTIST_NORMALIZED = new Set(['unknownartist']);

export function artistNameKey(value: string): string {
  return normalizeString(value) || value.normalize('NFKC').trim().toLocaleLowerCase('und');
}

export function isUnknownArtistCredit(value: string | null | undefined): boolean {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return true;
  const normalized = normalizeString(trimmed);
  return UNKNOWN_ARTIST_NORMALIZED.has(normalized);
}

export function isAtomicArtistCredit(value: string): boolean {
  const normalized = normalizeString(value);
  return normalized.length > 0 && ATOMIC_ARTIST_NORMALIZED.has(normalized);
}

export function hasArtistCreditOverride(value: string | null | undefined): boolean {
  return OVERRIDE_BY_NORMALIZED_CREDIT.has(normalizeString(value ?? ''));
}

/** Trim, drop unknowns, keep first spelling per normalized key. */
export function normalizeArtistNames(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (isUnknownArtistCredit(name)) continue;
    const key = artistNameKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

/**
 * Split a verified display credit into credited people/units.
 * Collaboration delimiter is comma (AnimeThemes join). "&" stays inside the name.
 * Adjacent tokens are rejoined when they form an atomic comma-in-name credit.
 */
export function parseArtistNames(artist: string | null | undefined): string[] {
  const trimmed = (artist ?? '').trim();
  if (isUnknownArtistCredit(trimmed)) return [];
  const override = OVERRIDE_BY_NORMALIZED_CREDIT.get(normalizeString(trimmed));
  if (override) return normalizeArtistNames(override);
  if (isAtomicArtistCredit(trimmed)) return [trimmed];

  const tokens = trimmed
    .split(/\s*,\s*/)
    .map((token) => token.trim())
    .filter((token) => !isUnknownArtistCredit(token));

  if (tokens.length <= 1) return normalizeArtistNames(tokens.length ? tokens : [trimmed]);

  const rejoined: string[] = [];
  let index = 0;
  while (index < tokens.length) {
    let consumed = 1;
    for (let end = tokens.length; end > index + 1; end -= 1) {
      const candidate = tokens.slice(index, end).join(', ');
      if (isAtomicArtistCredit(candidate)) {
        rejoined.push(candidate);
        consumed = end - index;
        break;
      }
    }
    if (consumed === 1) rejoined.push(tokens[index]);
    index += consumed;
  }

  return normalizeArtistNames(rejoined);
}

/** Prefer an explicit structured list; otherwise parse the display credit. */
export function resolveArtistNames(
  artist: string | null | undefined,
  artistNames?: readonly string[] | null,
): string[] {
  if (hasArtistCreditOverride(artist)) return parseArtistNames(artist);
  if (Array.isArray(artistNames) && artistNames.length > 0) {
    const structured = normalizeArtistNames(artistNames);
    if (structured.length > 0) return structured;
  }
  return parseArtistNames(artist);
}
