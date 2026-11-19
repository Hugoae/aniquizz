import { useMemo } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';

export interface HomeCopy {
  eyebrow: string;
  titleLead: string;
  titleAccent: string;
  sub: string;
  play: string;
  library: string;
  leaderboard: string;
  ideas: string;
  newsTitle: string;
  newsSeeAll: string;
  songOfDayTitle: string;
  songOfDayPlay: string;
  songOfDayPause: string;
}

function buildHomeCopy(t: TFunction<'home'>): HomeCopy {
  return {
    eyebrow: t('eyebrow'),
    titleLead: t('titleLead'),
    titleAccent: t('titleAccent'),
    sub: t('sub'),
    play: t('play'),
    library: t('library'),
    leaderboard: t('leaderboard'),
    ideas: t('ideas'),
    newsTitle: t('newsTitle'),
    newsSeeAll: t('newsSeeAll'),
    songOfDayTitle: t('songOfDayTitle'),
    songOfDayPlay: t('songOfDayPlay'),
    songOfDayPause: t('songOfDayPause'),
  };
}

export function useHomeCopy(): HomeCopy {
  const { t } = useTranslation('home');
  return useMemo(() => buildHomeCopy(t), [t]);
}

export function homeText(language: 'fr' | 'en' = 'fr'): HomeCopy {
  return buildHomeCopy(i18n.getFixedT(language, 'home'));
}
