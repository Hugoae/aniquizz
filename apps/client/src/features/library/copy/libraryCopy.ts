import i18n from '@/lib/i18n';
import { formatAppNumber } from '@/lib/i18n/format';
import { extendLive, liveStrings, tx } from '@/lib/i18n/text';

/**
 * Quoted on purpose. The static prerender reads these French fields from this file.
 * The live screen uses the getters below.
 */
export const LIBRARY_HERO_FR = {
  heroTitle: 'Librairie musicale',
  heroSubtitle:
    'Explorez openings, endings et inserts. Écoutez les extraits et retrouvez vos découvertes en partie.',
};

const flat = [
  'heroEyebrow',
  'heroTitle',
  'heroSubtitle',
  'searchPlaceholder',
  'filterSectionSearch',
  'filterToggle',
  'filterToggleShow',
  'filterToggleHide',
  'filterActiveBadge',
  'filterSectionTypes',
  'filterSectionDifficulty',
  'filterSectionDiscovered',
  'filterSectionSort',
  'filterSectionView',
  'filterSort',
  'filterDiscovered',
  'filterDiscoveredAll',
  'filterDiscoveredHeard',
  'filterDiscoveredUnheard',
  'filterDiscoveredHeardShort',
  'filterDiscoveredUnheardShort',
  'filterDiscoveredLoginHint',
  'filterSectionLiked',
  'filterLikedAll',
  'filterLikedOnly',
  'filterLikedExclude',
  'filterLikedLoginHint',
  'likedBadge',
  'viewFranchise',
  'viewAnime',
  'viewSongs',
  'sortFranchise',
  'sortFranchiseDesc',
  'sortPopularity',
  'sortTitle',
  'sortAnime',
  'sortLikes',
  'sortLikedRecent',
  'searchModeHint',
  'songsViewHint',
  'typeOp',
  'typeEd',
  'typeInsert',
  'typeOpShort',
  'typeEdShort',
  'typeInsertShort',
  'diffEasy',
  'diffMedium',
  'diffHard',
  'discoveredBadge',
  'playPreview',
  'previewPause',
  'previewClose',
  'openAnilist',
  'playCta',
  'playCtaHint',
  'emptyTitle',
  'emptyHint',
  'emptyLikedTitle',
  'emptyLikedHint',
  'emptyPersonalHint',
  'loadError',
  'networkError',
  'retry',
  'backHome',
  'filtersAria',
  'pagePrev',
  'pageNext',
  'videoUnavailable',
  'statSongs',
  'statAnimes',
  'statFranchises',
] as const;

const countOpts = (count: number) => ({ count, formatted: formatAppNumber(count) });

export const LIBRARY_COPY = extendLive(liveStrings('library', '', flat), {
  metaPopularity: (compact: string) => tx('library', 'metaPopularity', { compact }),
  metaLikes: (count: number) => tx('library', 'metaLikes', countOpts(count)),
  metaLikesAria: (count: number) =>
    count === 0 ? tx('library', 'metaLikesNone') : tx('library', 'metaLikesAria', countOpts(count)),
  animeSongCount: (count: number) => tx('library', 'animeSongCount', countOpts(count)),
  nestedSeeAll: (hidden: number) => tx('library', 'nestedSeeAll', countOpts(hidden)),
  statLiked: (count: number) =>
    count === 0 ? tx('library', 'statLikedNone') : tx('library', 'statLiked', countOpts(count)),
  resultsCount: (count: number) =>
    count === 0 ? tx('library', 'resultsNone') : tx('library', 'results', countOpts(count)),
  expandAnime: (name: string) => tx('library', 'expandAnime', { name }),
  collapseAnime: (name: string) => tx('library', 'collapseAnime', { name }),
  franchiseSongs: (songs: number, animes: number) => {
    const english = i18n.language.startsWith('en');
    return tx('library', 'franchiseSongs', {
      songs: formatAppNumber(songs),
      animes: formatAppNumber(animes),
      songsSuffix: songs > 1 ? 's' : '',
      animesSuffix: !english && animes > 1 ? 's' : '',
    });
  },
});

function option<T extends string>(value: T, labelKey: string) {
  return {
    value,
    get label() {
      return tx('library', labelKey);
    },
  };
}

export const LIBRARY_SONG_TYPE_OPTIONS = [
  option('OP', 'typeOp'),
  option('ED', 'typeEd'),
  option('INSERT', 'typeInsert'),
] as const;

export const LIBRARY_VIEW_OPTIONS = [
  option('franchise', 'viewFranchise'),
  option('anime', 'viewAnime'),
  option('songs', 'viewSongs'),
] as const;

export const LIBRARY_SORT_OPTIONS = [
  option('franchise', 'sortFranchise'),
  option('franchise_desc', 'sortFranchiseDesc'),
  option('anime', 'sortAnime'),
  option('popularity', 'sortPopularity'),
  option('title', 'sortTitle'),
  option('likes', 'sortLikes'),
  option('liked_recent', 'sortLikedRecent'),
] as const;
