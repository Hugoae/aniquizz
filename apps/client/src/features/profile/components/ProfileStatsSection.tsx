import { useMemo } from 'react';
import {
  Trophy, Target, Check, Flame, Zap, Medal,
  TrendingUp, CheckCheck, Users, User, Timer, Clock,
  Gauge, Sparkles, Rocket, Layers, Calendar,
} from 'lucide-react';

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

const fmtAvgTime = (ms: number | null): string => (ms && ms > 0 ? `${(ms / 1000).toFixed(1)}s` : '—');

interface ProfileStatsSectionProps {
  vm: ProfileVM;
}

export function ProfileStatsSection({ vm }: ProfileStatsSectionProps) {
  const statItems: StatItem[] = useMemo(() => [
    // Page 1 — top row
    { id: 'games', icon: Target, label: 'Parties jouées', value: vm.stats.gamesPlayed, color: 'text-primary' },
    { id: 'winrate', icon: Trophy, label: 'Taux de victoire', value: `${vm.stats.winRate}%`, color: 'text-accent' },
    { id: 'accuracy', icon: Check, label: 'Taux de bon guess', value: `${vm.stats.accuracy}%`, color: 'text-success' },
    { id: 'playtime', icon: Clock, label: 'Temps de jeu', value: fmtDuration(vm.playtimeMs), color: 'text-info' },
    // Page 1 — bottom row
    { id: 'best', icon: Medal, label: 'Meilleur score', value: vm.bestScore.toLocaleString('fr-FR'), color: 'text-accent' },
    { id: 'streak', icon: Flame, label: 'Meilleure série', value: vm.stats.maxStreak, color: 'text-warning' },
    { id: 'fastest', icon: Rocket, label: 'Réponse la plus rapide', value: fmtAvgTime(vm.fastestAnswerMs), color: 'text-success' },
    { id: 'avgtime', icon: Timer, label: 'Temps de réponse moy.', value: fmtAvgTime(vm.avgAnswerMs), color: 'text-info' },
    // Page 2
    { id: 'xp', icon: Zap, label: 'XP totale', value: vm.xp.toLocaleString('fr-FR'), color: 'text-primary' },
    { id: 'scoretotal', icon: TrendingUp, label: 'Score total', value: vm.scoreTotal.toLocaleString('fr-FR'), color: 'text-accent' },
    { id: 'correct', icon: CheckCheck, label: 'Bonnes réponses', value: (vm.stats.correctGuesses ?? 0).toLocaleString('fr-FR'), color: 'text-success' },
    { id: 'rounds', icon: Layers, label: 'Rounds joués', value: vm.roundsPlayed.toLocaleString('fr-FR'), color: 'text-warning' },
    { id: 'avgscore', icon: Gauge, label: 'Score moyen / partie', value: vm.stats.gamesPlayed > 0 ? Math.round(vm.scoreTotal / vm.stats.gamesPlayed).toLocaleString('fr-FR') : '—', color: 'text-info' },
    { id: 'avgxp', icon: Sparkles, label: 'XP moyenne / partie', value: vm.avgXpPerGame.toLocaleString('fr-FR'), color: 'text-primary' },
    { id: 'multi', icon: Users, label: 'Parties multi', value: vm.multiCount, color: 'text-accent' },
    { id: 'solo', icon: User, label: 'Parties solo', value: vm.soloCount, color: 'text-warning' },
    {
      id: 'daily-played',
      icon: Calendar,
      label: 'Quiz du jour',
      value: vm.stats.dailyCompletions ?? 0,
      color: 'text-primary',
    },
    {
      id: 'daily-wins',
      icon: Trophy,
      label: 'Victoires du jour',
      value: vm.stats.dailyWins ?? 0,
      color: 'text-accent',
    },
    {
      id: 'daily-winrate',
      icon: Medal,
      label: 'Taux victoire du jour',
      value: `${(vm.stats.dailyCompletions ?? 0) > 0
        ? Math.round(((vm.stats.dailyWins ?? 0) / vm.stats.dailyCompletions) * 100)
        : 0}%`,
      color: 'text-success',
    },
    {
      id: 'daily-streak',
      icon: Flame,
      label: 'Série du jour',
      value: vm.stats.dailyStreak ?? 0,
      color: 'text-warning',
    },
    {
      id: 'daily-best-streak',
      icon: Rocket,
      label: 'Meilleure série du jour',
      value: vm.stats.dailyLongestStreak ?? 0,
      color: 'text-info',
    },
    {
      id: 'daily-perfect',
      icon: Sparkles,
      label: 'Jours parfaits',
      value: vm.stats.dailyPerfectDays ?? 0,
      color: 'text-aqua',
    },
    {
      id: 'daily-avg-rank',
      icon: Medal,
      label: 'Place moyenne du jour',
      value: vm.stats.dailyAvgRank != null
        ? `#${vm.stats.dailyAvgRank.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}`
        : '—',
      color: 'text-accent',
    },
    {
      id: 'daily-avg-time',
      icon: Timer,
      label: 'Temps moyen du jour',
      value: fmtAvgTime(vm.stats.dailyAvgTimeMs ?? null),
      color: 'text-info',
    },
  ], [vm]);

  return (
    <section className="space-y-4 animate-fade-in" style={{ animationDelay: '80ms' }}>
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Statistiques</h2>
      </div>
      <StatsCarousel items={statItems} />
    </section>
  );
}
