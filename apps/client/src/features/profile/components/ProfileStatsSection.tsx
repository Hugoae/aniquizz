import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Trophy,
  Target,
  Check,
  Flame,
  Zap,
  Medal,
  TrendingUp,
  CheckCheck,
  Users,
  User,
  Timer,
  Clock,
  Gauge,
  Sparkles,
  Rocket,
  Layers,
  Calendar,
} from 'lucide-react';
import { formatAppNumber } from '@/lib/i18n/format';
import { pick } from '@/lib/i18n/text';
import { useLocale } from '@/features/i18n/LocaleContext';

import { StatsCarousel, type StatItem } from '@/features/profile/components/StatsCarousel';
import type { ProfileVM } from '@/features/profile/types';

const fmtDuration = (ms: number): string => {
  if (!ms || ms <= 0) return '0 min';
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h} h ${m}` : `${h} h`;
};

const fmtAvgTime = (ms: number | null): string =>
  ms && ms > 0 ? `${(ms / 1000).toFixed(1)}s` : '—';

interface ProfileStatsSectionProps {
  vm: ProfileVM;
}

export function ProfileStatsSection({ vm }: ProfileStatsSectionProps) {
  const { locale } = useLocale();
  const { i18n } = useTranslation();
  const statItems: StatItem[] = useMemo(
    () => [
      // Page 1 — top row
      {
        id: 'games',
        icon: Target,
        label: pick('Parties jouées', 'Games played'),
        value: vm.stats.gamesPlayed,
        color: 'text-primary',
      },
      {
        id: 'winrate',
        icon: Trophy,
        label: pick('Taux de victoire', 'Win rate'),
        value: `${vm.stats.winRate}%`,
        color: 'text-accent',
      },
      {
        id: 'accuracy',
        icon: Check,
        label: pick('Taux de bon guess', 'Correct guess rate'),
        value: `${vm.stats.accuracy}%`,
        color: 'text-success',
      },
      {
        id: 'playtime',
        icon: Clock,
        label: pick('Temps de jeu', 'Play time'),
        value: fmtDuration(vm.playtimeMs),
        color: 'text-info',
      },
      // Page 1 — bottom row
      {
        id: 'best',
        icon: Medal,
        label: pick('Meilleur score', 'Best score'),
        value: formatAppNumber(vm.bestScore),
        color: 'text-accent',
      },
      {
        id: 'streak',
        icon: Flame,
        label: pick('Meilleure série', 'Best streak'),
        value: vm.stats.maxStreak,
        color: 'text-warning',
      },
      {
        id: 'fastest',
        icon: Rocket,
        label: pick('Réponse la plus rapide', 'Fastest answer'),
        value: fmtAvgTime(vm.fastestAnswerMs),
        color: 'text-success',
      },
      {
        id: 'avgtime',
        icon: Timer,
        label: pick('Temps de réponse moy.', 'Avg. response time'),
        value: fmtAvgTime(vm.avgAnswerMs),
        color: 'text-info',
      },
      // Page 2
      {
        id: 'xp',
        icon: Zap,
        label: pick('XP totale', 'Total XP'),
        value: formatAppNumber(vm.xp),
        color: 'text-primary',
      },
      {
        id: 'scoretotal',
        icon: TrendingUp,
        label: pick('Score total', 'Total score'),
        value: formatAppNumber(vm.scoreTotal),
        color: 'text-accent',
      },
      {
        id: 'correct',
        icon: CheckCheck,
        label: pick('Bonnes réponses', 'Correct answers'),
        value: formatAppNumber(vm.stats.correctGuesses ?? 0),
        color: 'text-success',
      },
      {
        id: 'rounds',
        icon: Layers,
        label: pick('Rounds joués', 'Rounds played'),
        value: formatAppNumber(vm.roundsPlayed),
        color: 'text-warning',
      },
      {
        id: 'avgscore',
        icon: Gauge,
        label: pick('Score moyen / partie', 'Avg. score / game'),
        value:
          vm.stats.gamesPlayed > 0
            ? formatAppNumber(Math.round(vm.scoreTotal / vm.stats.gamesPlayed))
            : '—',
        color: 'text-info',
      },
      {
        id: 'avgxp',
        icon: Sparkles,
        label: pick('XP moyenne / partie', 'Avg. XP / game'),
        value: formatAppNumber(vm.avgXpPerGame),
        color: 'text-primary',
      },
      {
        id: 'multi',
        icon: Users,
        label: pick('Parties multi', 'Multiplayer games'),
        value: vm.multiCount,
        color: 'text-accent',
      },
      {
        id: 'solo',
        icon: User,
        label: pick('Parties solo', 'Solo games'),
        value: vm.soloCount,
        color: 'text-warning',
      },
      {
        id: 'daily-played',
        icon: Calendar,
        label: pick('Quiz du jour', 'Daily quiz'),
        value: vm.stats.dailyCompletions ?? 0,
        color: 'text-primary',
      },
      {
        id: 'daily-wins',
        icon: Trophy,
        label: pick('Victoires du jour', 'Daily wins'),
        value: vm.stats.dailyWins ?? 0,
        color: 'text-accent',
      },
      {
        id: 'daily-winrate',
        icon: Medal,
        label: pick('Taux victoire du jour', 'Daily win rate'),
        value: `${
          (vm.stats.dailyCompletions ?? 0) > 0
            ? Math.round(((vm.stats.dailyWins ?? 0) / vm.stats.dailyCompletions) * 100)
            : 0
        }%`,
        color: 'text-success',
      },
      {
        id: 'daily-streak',
        icon: Flame,
        label: pick('Série du jour', 'Daily streak'),
        value: vm.stats.dailyStreak ?? 0,
        color: 'text-warning',
      },
      {
        id: 'daily-best-streak',
        icon: Rocket,
        label: pick('Meilleure série du jour', 'Best daily streak'),
        value: vm.stats.dailyLongestStreak ?? 0,
        color: 'text-info',
      },
      {
        id: 'daily-perfect',
        icon: Sparkles,
        label: pick('Jours parfaits', 'Perfect days'),
        value: vm.stats.dailyPerfectDays ?? 0,
        color: 'text-aqua',
      },
      {
        id: 'daily-avg-rank',
        icon: Medal,
        label: pick('Place moyenne du jour', 'Avg. daily rank'),
        value:
          vm.stats.dailyAvgRank != null
            ? `#${formatAppNumber(vm.stats.dailyAvgRank, { maximumFractionDigits: 1 })}`
            : '—',
        color: 'text-accent',
      },
      {
        id: 'daily-avg-time',
        icon: Timer,
        label: pick('Temps moyen du jour', 'Avg. daily time'),
        value: fmtAvgTime(vm.stats.dailyAvgTimeMs ?? null),
        color: 'text-info',
      },
    ],
    [vm, locale, i18n.language],
  );

  return (
    <section className="space-y-4 animate-fade-in" style={{ animationDelay: '80ms' }}>
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">{pick('Statistiques', 'Statistics')}</h2>
      </div>
      <StatsCarousel items={statItems} />
    </section>
  );
}
