import { authEn } from '@/lib/i18n/locales/en/auth';
import { commonEn } from '@/lib/i18n/locales/en/common';
import { dailyEn } from '@/lib/i18n/locales/en/daily';
import { gameEn } from '@/lib/i18n/locales/en/game';
import { homeEn } from '@/lib/i18n/locales/en/home';
import { hubEn } from '@/lib/i18n/locales/en/hub';
import { leaderboardEn } from '@/lib/i18n/locales/en/leaderboard';
import { libraryEn } from '@/lib/i18n/locales/en/library';
import { likesEn } from '@/lib/i18n/locales/en/likes';
import { profileEn } from '@/lib/i18n/locales/en/profile';
import { settingsEn } from '@/lib/i18n/locales/en/settings';
import { authFr } from '@/lib/i18n/locales/fr/auth';
import { commonFr } from '@/lib/i18n/locales/fr/common';
import { dailyFr } from '@/lib/i18n/locales/fr/daily';
import { gameFr } from '@/lib/i18n/locales/fr/game';
import { homeFr } from '@/lib/i18n/locales/fr/home';
import { hubFr } from '@/lib/i18n/locales/fr/hub';
import { leaderboardFr } from '@/lib/i18n/locales/fr/leaderboard';
import { libraryFr } from '@/lib/i18n/locales/fr/library';
import { likesFr } from '@/lib/i18n/locales/fr/likes';
import { profileFr } from '@/lib/i18n/locales/fr/profile';
import { settingsFr } from '@/lib/i18n/locales/fr/settings';

export const I18N_NAMESPACES = [
  'common',
  'settings',
  'home',
  'auth',
  'hub',
  'daily',
  'game',
  'library',
  'profile',
  'leaderboard',
  'likes',
] as const;

export const resourcesFr = {
  common: commonFr,
  settings: settingsFr,
  home: homeFr,
  auth: authFr,
  hub: hubFr,
  daily: dailyFr,
  game: gameFr,
  library: libraryFr,
  profile: profileFr,
  leaderboard: leaderboardFr,
  likes: likesFr,
};

export const resourcesEn = {
  common: commonEn,
  settings: settingsEn,
  home: homeEn,
  auth: authEn,
  hub: hubEn,
  daily: dailyEn,
  game: gameEn,
  library: libraryEn,
  profile: profileEn,
  leaderboard: leaderboardEn,
  likes: likesEn,
};
