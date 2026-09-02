import type { LeaderboardMetric } from '@aniquizz/shared';
import { LEADERBOARD_METRICS } from '@aniquizz/shared';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LEADERBOARD_COPY } from '@/features/leaderboard/copy/leaderboardCopy';
import { LEADERBOARD_METRIC_UI } from '@/features/leaderboard/lib/leaderboardMetricUi';
import { cn } from '@/lib/utils';

interface LeaderboardTabsProps {
  metric: LeaderboardMetric;
  onMetricChange: (metric: LeaderboardMetric) => void;
}

export function LeaderboardTabs({ metric, onMetricChange }: LeaderboardTabsProps) {
  return (
    <Tabs value={metric} onValueChange={(value) => onMetricChange(value as LeaderboardMetric)}>
      <TabsList
        aria-label={LEADERBOARD_COPY.tabsAria}
        className="relative z-10 flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto bg-muted/70 p-1"
      >
        {LEADERBOARD_METRICS.map((key) => {
          const { icon: Icon, color } = LEADERBOARD_METRIC_UI[key];
          return (
            <TabsTrigger
              key={key}
              value={key}
              className={cn(
                'shrink-0 gap-1.5 px-3 py-2 text-xs font-semibold md:text-sm',
                'data-[state=active]:text-foreground',
              )}
            >
              <Icon className={cn('h-3.5 w-3.5', color)} aria-hidden="true" />
              {LEADERBOARD_COPY.metrics[key].label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
