import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from '@/features/hub/components/config/ConfigPrimitives';
import {
  adminApi,
  AdminApiError,
  type DailyAdminList,
  type DailySongSearchHit,
} from '@/lib/adminApi';
import { DailyAdminRoundCard } from './daily/DailyAdminRoundCard';
import { DAILY_ADMIN_COPY, dailyAdminWarningLabel } from './daily/dailyAdminCopy';
import { dailyAttemptLabel, formatDailyAdminDate } from './daily/dailyAdminFormat';

const errMsg = (error: unknown) =>
  error instanceof AdminApiError ? error.message : DAILY_ADMIN_COPY.loadError;

export function DailyAdminPanel() {
  const [data, setData] = useState<DailyAdminList | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewRoundId, setPreviewRoundId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    | { kind: 'regenerate'; date: string }
    | { kind: 'void'; challengeId: string; roundId: string }
    | null
  >(null);
  const loadGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    try {
      const result = await adminApi.listDaily();
      if (generation !== loadGeneration.current) return;
      setData(result);
      setSelectedId((current) => {
        if (current && result.challenges.some((row) => row.id === current)) return current;
        return result.challenges[0]?.id ?? null;
      });
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPreviewRoundId(null);
  }, [selectedId]);

  const run = async (
    action: () => Promise<DailyAdminList>,
    success: string = DAILY_ADMIN_COPY.saved,
  ) => {
    setBusy(true);
    try {
      setData(await action());
      toast.success(success);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusy(false);
    }
  };

  const challenge =
    data?.challenges.find((row) => row.id === selectedId) ?? data?.challenges[0] ?? null;
  const excludeIds =
    challenge?.rounds.map((round) => round.songId).filter((id): id is number => id != null) ?? [];

  if (loading && !data) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">
            <span className="gradient-text">{DAILY_ADMIN_COPY.title}</span>
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {DAILY_ADMIN_COPY.subtitle}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          {DAILY_ADMIN_COPY.refresh}
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {data?.challenges.map((row) => {
          const active = row.id === challenge?.id;
          const isToday = row.challengeDate === data.today;
          return (
            <button
              key={row.id}
              type="button"
              className={cn(
                'shrink-0 rounded-xl border px-3 py-2 text-left transition-colors',
                FOCUS_RING,
                active
                  ? 'border-primary/50 bg-primary/10 shadow-[inset_3px_0_0_0_hsl(var(--primary))]'
                  : 'border-border/50 bg-secondary/20 hover:border-primary/30',
              )}
              onClick={() => setSelectedId(row.id)}
            >
              <p className="font-mono text-xs text-muted-foreground">#{row.challengeNumber}</p>
              <p className="text-sm font-medium capitalize">
                {isToday
                  ? DAILY_ADMIN_COPY.today
                  : formatDailyAdminDate(row.challengeDate).split(' ')[0]}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {row.challengeDate.slice(8, 10)}/{row.challengeDate.slice(5, 7)}
              </p>
            </button>
          );
        })}
      </div>

      {challenge && (
        <section className="space-y-4">
          <div className="glass-card flex flex-wrap items-start justify-between gap-3 p-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-lg capitalize">
                  {formatDailyAdminDate(challenge.challengeDate)}
                </p>
                <Badge variant="outline">#{challenge.challengeNumber}</Badge>
                {challenge.challengeDate === data?.today && (
                  <Badge className="bg-primary/15 text-primary">{DAILY_ADMIN_COPY.today}</Badge>
                )}
                {challenge.status === 'ready' ? (
                  <Badge className="bg-success/15 text-success">{DAILY_ADMIN_COPY.ready}</Badge>
                ) : challenge.status === 'cancelled' ? (
                  <Badge variant="outline" className="border-destructive/40 text-destructive">
                    {DAILY_ADMIN_COPY.cancelled}
                  </Badge>
                ) : (
                  <Badge variant="outline">{DAILY_ADMIN_COPY.draft}</Badge>
                )}
                <Badge variant="outline">
                  {dailyAttemptLabel(challenge.attemptCount, DAILY_ADMIN_COPY)}
                </Badge>
              </div>
              {challenge.locked && challenge.canVoid && (
                <p className="text-xs text-warning">{DAILY_ADMIN_COPY.liveHint}</p>
              )}
              {challenge.warnings.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {challenge.warnings.map((warning, index) => (
                    <Badge
                      key={`${warning.code}-${index}`}
                      variant="outline"
                      className="border-warning/40 text-warning"
                    >
                      {dailyAdminWarningLabel(warning.code, warning.message)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {challenge.status !== 'ready' && !challenge.locked && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run(() => adminApi.setDailyStatus(challenge.id, 'ready'))}
                >
                  {DAILY_ADMIN_COPY.markReady}
                </Button>
              )}
              {!challenge.locked && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfirm({ kind: 'regenerate', date: challenge.challengeDate })}
                >
                  {DAILY_ADMIN_COPY.regenerate}
                </Button>
              )}
            </div>
          </div>

          <ol className="space-y-3">
            {challenge.rounds.map((round, index) => (
              <DailyAdminRoundCard
                key={round.id}
                round={round}
                index={index}
                total={challenge.rounds.length}
                excludeIds={excludeIds.filter((id) => id !== round.songId)}
                editable={!challenge.locked}
                canVoid={challenge.canVoid}
                busy={busy}
                onReplace={(song: DailySongSearchHit) =>
                  void run(() => adminApi.replaceDailyRound(challenge.id, round.id, song.id))
                }
                onShuffle={() =>
                  void run(() => adminApi.regenerateDailyRound(challenge.id, round.id))
                }
                onReshuffleClip={() =>
                  void run(
                    () => adminApi.reshuffleDailyRoundClip(challenge.id, round.id),
                    DAILY_ADMIN_COPY.clipReshuffled,
                  )
                }
                onMove={(direction) => {
                  const ids = challenge.rounds.map((item) => item.id);
                  const swap = index + direction;
                  [ids[index], ids[swap]] = [ids[swap]!, ids[index]!];
                  void run(() => adminApi.reorderDailyRounds(challenge.id, ids));
                }}
                onVoid={() =>
                  setConfirm({ kind: 'void', challengeId: challenge.id, roundId: round.id })
                }
                onRestore={() => void run(() => adminApi.restoreDailyRound(challenge.id, round.id))}
                preview={previewRoundId === round.id}
                onTogglePreview={() =>
                  setPreviewRoundId((current) => (current === round.id ? null : round.id))
                }
                onClosePreview={() => setPreviewRoundId(null)}
              />
            ))}
          </ol>
        </section>
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === 'void' ? DAILY_ADMIN_COPY.voidTitle : DAILY_ADMIN_COPY.regenerate}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'void'
                ? DAILY_ADMIN_COPY.voidBody
                : DAILY_ADMIN_COPY.regenerateConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{DAILY_ADMIN_COPY.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const next = confirm;
                setConfirm(null);
                if (!next) return;
                if (next.kind === 'regenerate') {
                  void run(() => adminApi.regenerateDaily(next.date));
                  return;
                }
                void run(() => adminApi.voidDailyRound(next.challengeId, next.roundId));
              }}
            >
              {DAILY_ADMIN_COPY.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
