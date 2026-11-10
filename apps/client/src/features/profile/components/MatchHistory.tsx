import {
  History,
  Trophy,
  Zap,
  Users,
  Clock,
  X,
  Calendar,
  RotateCcw,
  Medal,
  Keyboard,
  Grid2X2,
  Shuffle,
} from 'lucide-react';
import {
  speedBonusFromStoredMode,
  gameTypeFromStoredMode,
  getMedalMeta,
  type MatchHistoryEntry,
  type MatchReplayConfig,
} from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DAILY_COPY } from '@/features/daily/copy/dailyCopy';
import { formatDailyClock } from '@/features/daily/lib/dailyRecap';
import { PROFILE_COPY } from '@/features/profile/copy/profileCopy';
import { GameModeBadge } from '@/features/hub/components/GameModeBadge';
import { MODE_CHROME } from '@/features/hub/components/modeChrome';
import { DailyTracks } from '@/features/daily/components/DailyTracks';
import { RankPill } from '@/features/game/components/shared/RankPill';

const DIFFICULTY_CHIPS = [
  { id: 'easy', label: 'Facile', className: 'bg-success/15 text-success' },
  { id: 'medium', label: 'Moyen', className: 'bg-warning/15 text-warning' },
  { id: 'hard', label: 'Difficile', className: 'bg-destructive/15 text-destructive' },
] as const;

const RESPONSE_CHIPS = {
  Typing: { label: 'Typing', Icon: Keyboard },
  QCM: { label: 'QCM', Icon: Grid2X2 },
  Mix: { label: 'Mix', Icon: Shuffle },
} as const;

/** The profile shows the latest games only, so each card can stay readable. */
const HISTORY_PREVIEW = 5;

function ResponseChip({ chip }: { chip: (typeof RESPONSE_CHIPS)[keyof typeof RESPONSE_CHIPS] }) {
  const Icon = chip.Icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-info/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-info">
      <Icon className="h-3 w-3" aria-hidden />
      {chip.label}
    </span>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  const h = Math.floor(min / 60);
  if (min < 60) return `il y a ${min} min`;
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'hier';
  if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatDuration(ms: number | null): string | null {
  if (!ms || ms <= 0) return null;
  const min = Math.round(ms / 60_000);
  return min < 1 ? '<1 min' : `${min} min`;
}

function resultTone(won: boolean) {
  return won
    ? { text: 'text-success', bar: 'bg-success', label: 'Victoire', Icon: Trophy }
    : { text: 'text-destructive', bar: 'bg-destructive', label: 'Défaite', Icon: X };
}

/** 1er, then 2e, 3e, 4e… The square pill carries the podium color. */
function PlaceLine({ rank, total }: { rank: number; total?: number }) {
  const suffix = rank === 1 ? 'er' : 'e';
  const spoken = total != null ? `${rank}${suffix} sur ${total}` : `${rank}${suffix}`;
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={spoken}>
      <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <RankPill rank={rank} size="sm" />
      {total != null ? (
        <span className="font-mono text-sm font-semibold text-muted-foreground">/ {total}</span>
      ) : null}
    </span>
  );
}

function AccuracyBar({ correct, total }: { correct: number; total: number }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div className="w-full max-w-[11rem]">
      <div className="mb-1 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
        <span>
          {correct}/{total}
        </span>
        <span>{pct}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-secondary"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={Math.max(total, 1)}
        aria-valuenow={correct}
        aria-label={`${correct} bonnes réponses sur ${total}`}
      >
        <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DailyHistoryRow({ entry }: { entry: MatchHistoryEntry }) {
  const tone = resultTone(entry.isWinner);
  const Icon = tone.Icon;

  return (
    <li className="relative overflow-hidden rounded-xl border border-border/40 bg-background/40 p-4">
      <span className={cn('absolute inset-y-0 left-0 w-1', tone.bar)} aria-hidden />
      <div className="space-y-3 pl-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <p className={cn('inline-flex items-center gap-2 text-base font-black', tone.text)}>
              <Icon className="h-4 w-4" aria-hidden />
              {tone.label}
            </p>
            {entry.rank != null ? <PlaceLine rank={entry.rank} /> : null}
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(entry.playedAt)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              MODE_CHROME.daily.solid,
            )}
          >
            <Calendar className="h-3 w-3" aria-hidden />
            {DAILY_COPY.title}
          </span>
          {entry.challengeNumber != null && (
            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
              #{entry.challengeNumber}
            </span>
          )}
          {entry.answerMode && (
            <span className="rounded-md bg-info/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-info">
              {entry.answerMode}
            </span>
          )}
        </div>

        {entry.tracks && entry.tracks.length > 0 ? (
          <DailyTracks tracks={entry.tracks} size="sm" className="justify-start" />
        ) : null}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
          {entry.xpEarned > 0 && (
            <span className="inline-flex items-center gap-1 text-accent">
              <Zap className="h-3 w-3" /> +{entry.xpEarned}
            </span>
          )}
          {entry.totalResponseMs != null && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {formatDailyClock(entry.totalResponseMs)}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function HistoryRow({
  entry,
  onReplay,
}: {
  entry: MatchHistoryEntry;
  onReplay?: (replay: MatchReplayConfig) => void;
}) {
  if (entry.kind === 'daily') return <DailyHistoryRow entry={entry} />;

  const tone = resultTone(entry.isWinner);
  const Icon = tone.Icon;
  const duration = formatDuration(entry.durationMs);
  const gameType = gameTypeFromStoredMode(entry.mode);
  const multi = entry.playerCount > 1 && entry.rank != null;
  const scoreLabel = gameType === 'timeAttack' ? (entry.score === 1 ? 'trouvé' : 'trouvés') : 'pts';
  const medal = entry.playerCount <= 1 ? getMedalMeta(entry.medal ?? null) : null;
  const response =
    gameType === 'standard' && entry.answerMode && entry.answerMode in RESPONSE_CHIPS
      ? RESPONSE_CHIPS[entry.answerMode as keyof typeof RESPONSE_CHIPS]
      : null;
  const difficulties = DIFFICULTY_CHIPS.filter((chip) => entry.difficulties?.includes(chip.id));

  return (
    <li className="relative overflow-hidden rounded-xl border border-border/40 bg-background/40 p-4">
      <span className={cn('absolute inset-y-0 left-0 w-1', tone.bar)} aria-hidden />
      <div className="space-y-3 pl-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <p className={cn('inline-flex items-center gap-2 text-base font-black', tone.text)}>
              <Icon className="h-4 w-4" aria-hidden />
              {tone.label}
              {medal ? (
                <Medal className={cn('h-4 w-4', medal.textClass)} aria-label={medal.label} />
              ) : null}
            </p>
            {multi && entry.rank != null ? (
              <PlaceLine rank={entry.rank} total={entry.playerCount} />
            ) : null}
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(entry.playedAt)}</span>
        </div>

        <div className="flex items-end justify-between gap-4">
          <p className="font-mono text-3xl font-black tabular-nums leading-none text-foreground">
            {entry.score.toLocaleString('fr-FR')}
            <span className="ml-1.5 text-sm font-semibold text-muted-foreground">{scoreLabel}</span>
          </p>
          <AccuracyBar correct={entry.correctCount} total={entry.totalRounds} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <GameModeBadge
            compact
            gameType={gameType}
            speedBonusEnabled={speedBonusFromStoredMode(entry.mode)}
            className="shadow-none"
          />
          {response ? <ResponseChip chip={response} /> : null}
          {difficulties.map((chip) => (
            <span
              key={chip.id}
              className={cn(
                'rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                chip.className,
              )}
            >
              {chip.label}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
            {entry.xpEarned > 0 && (
              <span className="inline-flex items-center gap-1 text-accent">
                <Zap className="h-3 w-3" /> +{entry.xpEarned}
              </span>
            )}
            {duration && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {duration}
              </span>
            )}
          </div>
          {entry.replay && onReplay ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => onReplay(entry.replay as MatchReplayConfig)}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Rejouer
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function MatchHistory({
  entries,
  redacted = false,
  onReplay,
}: {
  entries: MatchHistoryEntry[];
  redacted?: boolean;
  /** Opens a solo game with the saved rules. Hidden when the match has no snapshot. */
  onReplay?: (replay: MatchReplayConfig) => void;
}) {
  const visible = entries.slice(0, HISTORY_PREVIEW);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <History className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">{PROFILE_COPY.historyTitle}</h2>
      </div>

      <div className="glass-card rounded-xl bg-card/40 p-2">
        {redacted ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground/60">
            <History className="h-8 w-8 opacity-40" />
            {PROFILE_COPY.historyPrivate}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground/60">
            <History className="h-8 w-8 opacity-40" />
            {PROFILE_COPY.historyEmpty}
          </div>
        ) : (
          <ul className="space-y-2">
            {visible.map((entry) => (
              <HistoryRow key={entry.id} entry={entry} onReplay={onReplay} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
