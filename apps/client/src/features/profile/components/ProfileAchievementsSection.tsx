import { useState } from 'react';
import { Award, Lock } from 'lucide-react';
import {
  ACHIEVEMENT_GROUP_ORDER,
  ACHIEVEMENTS,
  EMPTY_ACHIEVEMENT_PROGRESS,
  achievementGoal,
  achievementXp,
  type AchievementProgress,
} from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { ACHIEVEMENT_COPY } from '@/features/profile/copy/achievementCopy';
import { PROFILE_COPY } from '@/features/profile/copy/profileCopy';
import { formatAppNumber } from '@/lib/i18n/format';
import { cn } from '@/lib/utils';

type AchievementFilter = 'all' | 'open' | 'done';

const FILTERS: { id: AchievementFilter; label: string }[] = [
  {
    id: 'all',
    get label() {
      return PROFILE_COPY.achievementsFilterAll;
    },
  },
  {
    id: 'open',
    get label() {
      return PROFILE_COPY.achievementsFilterOpen;
    },
  },
  {
    id: 'done',
    get label() {
      return PROFILE_COPY.achievementsFilterDone;
    },
  },
];

interface ProfileAchievementsSectionProps {
  unlocked?: { id: string; unlockedAt: string }[];
  progress?: AchievementProgress;
}

export function ProfileAchievementsSection({
  unlocked = [],
  progress = EMPTY_ACHIEVEMENT_PROGRESS,
}: ProfileAchievementsSectionProps) {
  const [filter, setFilter] = useState<AchievementFilter>('all');
  const owned = new Map(unlocked.map((item) => [item.id, item.unlockedAt]));
  const done = ACHIEVEMENTS.filter((item) => owned.has(item.id)).length;
  const visible = ACHIEVEMENTS.filter((item) => {
    if (filter === 'done') return owned.has(item.id);
    if (filter === 'open') return !owned.has(item.id);
    return true;
  });
  const groups = ACHIEVEMENT_GROUP_ORDER.map((group) => ({
    group,
    items: visible.filter((item) => item.group === group),
  })).filter((section) => section.items.length > 0);

  return (
    <section className="space-y-5 animate-fade-in" style={{ animationDelay: '240ms' }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-3xl font-black tracking-tight">{PROFILE_COPY.achievementsTitle}</h2>
          <p className="text-lg font-semibold text-primary">
            {PROFILE_COPY.achievementsCount(done, ACHIEVEMENTS.length)}
          </p>
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={PROFILE_COPY.achievementsFilterLabel}
        >
          {FILTERS.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={filter === item.id ? 'default' : 'outline'}
              className="rounded-full"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm leading-6 text-muted-foreground">
          {PROFILE_COPY.achievementsFilterEmpty}
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((section) => (
            <div key={section.group} className="space-y-3">
              <h3 className="text-lg font-bold tracking-normal">
                {PROFILE_COPY.achievementGroups[section.group]}
              </h3>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {section.items.map((item) => {
                  const isUnlocked = owned.has(item.id);
                  const copy = ACHIEVEMENT_COPY[item.id];
                  const current = progress[item.metric] ?? 0;
                  const goal = achievementGoal(item, progress);
                  const ratio = goal > 0 ? Math.min(1, current / goal) : 0;
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        'glass-card p-4',
                        isUnlocked ? 'border-primary/40 bg-primary/10' : 'bg-card/40',
                      )}
                    >
                      <div className="flex gap-3">
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
                            isUnlocked
                              ? 'border-primary/40 bg-primary/15 text-primary'
                              : 'border-border bg-muted/40 text-muted-foreground',
                          )}
                        >
                          {isUnlocked ? (
                            <Award className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Lock className="h-4 w-4" aria-hidden="true" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold leading-6 tracking-normal [font-feature-settings:normal] [word-spacing:0.06em]">
                              {copy.title}
                              <span className="sr-only">
                                {isUnlocked
                                  ? PROFILE_COPY.achievementsUnlockedState
                                  : PROFILE_COPY.achievementsLockedState}
                              </span>
                            </p>
                            <p className="shrink-0 text-sm font-semibold leading-6 tracking-normal text-primary">
                              +{formatAppNumber(achievementXp(item.id))} XP
                            </p>
                          </div>
                          <p className="mt-1 text-sm font-normal leading-6 tracking-normal text-muted-foreground [font-feature-settings:normal] [word-spacing:0.12em]">
                            {copy.detail}
                          </p>
                          <div
                            className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={goal}
                            aria-valuenow={Math.min(current, goal)}
                            aria-label={copy.title}
                          >
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.round(ratio * 100)}%` }}
                            />
                          </div>
                          <p className="mt-1 text-right text-xs tabular-nums leading-5 tracking-normal text-muted-foreground">
                            {formatAppNumber(current)} / {formatAppNumber(goal)}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
