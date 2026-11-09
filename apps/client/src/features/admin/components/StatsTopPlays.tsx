import type { ReactNode } from 'react';
import { Film, Music2, Star, Trophy, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StatsOverview } from '@/lib/adminApi';
import { DIFFICULTY_LABELS } from './statsPanelFormat';

const FORMAT_LABELS: Record<string, string> = {
  TV: 'TV',
  TV_SHORT: 'Court',
  MOVIE: 'Film',
  SPECIAL: 'Spécial',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Clip',
};

const TYPE_LABELS: Record<string, string> = {
  OP: 'Opening',
  ED: 'Ending',
  INSERT: 'Insert',
};

const DIFFICULTY_CHIP: Record<string, string> = {
  EASY: 'border-success/40 bg-success/15 text-success',
  MEDIUM: 'border-warning/40 bg-warning/15 text-warning',
  HARD: 'border-destructive/40 bg-destructive/15 text-destructive',
};

const TYPE_CHIP: Record<string, string> = {
  OP: 'border-primary/40 bg-primary/15 text-primary',
  ED: 'border-accent/40 bg-accent/15 text-accent',
  INSERT: 'border-info/40 bg-info/15 text-info',
};

function animeMeta(anime: StatsOverview['activity']['topAnimes'][number]): string {
  const format = anime.format ? (FORMAT_LABELS[anime.format] ?? anime.format) : null;
  return [anime.year, format, anime.studio]
    .filter((part) => part != null && part !== '')
    .join(' · ');
}

function songTypeLabel(songType: string, sequence: number): string {
  const name = TYPE_LABELS[songType] ?? songType;
  return sequence > 1 ? `${name} ${sequence}` : name;
}

function rowStripe(index: number): string {
  return index % 2 === 0 ? 'bg-secondary/45' : 'bg-background/80';
}

function Cover({ src, name, tall }: { src: string | null; name: string; tall?: boolean }) {
  const frame = tall ? 'h-20 w-14' : 'h-14 w-10';
  if (!src) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md border border-border bg-secondary/40',
          frame,
        )}
      >
        <Film className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`Couverture de ${name}`}
      className={cn('shrink-0 rounded-md border border-border object-cover', frame)}
      loading="lazy"
      decoding="async"
    />
  );
}

function PlayCount({ count }: { count: number }) {
  const unit = count > 1 ? 'écoutes' : 'écoute';
  return (
    <div className="flex shrink-0 flex-col items-end leading-none">
      <span className="text-lg font-bold tabular-nums tracking-tight">
        {count.toLocaleString('fr-FR')}
      </span>
      <span className="mt-1 text-[10px] font-medium tracking-wide text-muted-foreground">
        {unit}
      </span>
    </div>
  );
}

function Rank({ index }: { index: number }) {
  return (
    <span
      className={cn(
        'w-5 shrink-0 text-center text-xs font-bold tabular-nums',
        index === 0 ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      {index + 1}
    </span>
  );
}

function TopCard({
  icon: Icon,
  title,
  empty,
  children,
}: {
  icon: LucideIcon;
  title: string;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <section className="glass-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 pb-2 pt-4 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" aria-hidden />
        {title}
      </div>
      {empty ? (
        <p className="px-4 pb-4 text-xs text-muted-foreground">Aucune écoute sur la période.</p>
      ) : (
        <ol>{children}</ol>
      )}
    </section>
  );
}

function Chip({ className, children }: { className: string; children: string }) {
  return (
    <span
      className={cn(
        'rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatsTopPlays({ activity }: { activity: StatsOverview['activity'] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <TopCard icon={Trophy} title="Top animes joués" empty={activity.topAnimes.length === 0}>
        {activity.topAnimes.map((anime, index) => {
          const meta = animeMeta(anime);
          return (
            <li
              key={`${anime.name}-${index}`}
              className={cn('flex items-center gap-3 px-4 py-2.5', rowStripe(index))}
            >
              <Rank index={index} />
              <Cover src={anime.cover} name={anime.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{anime.name}</div>
                {meta && <div className="truncate text-xs text-muted-foreground">{meta}</div>}
              </div>
              <PlayCount count={anime.count} />
            </li>
          );
        })}
      </TopCard>

      <TopCard icon={Music2} title="Top sons joués" empty={activity.topSongs.length === 0}>
        {activity.topSongs.map((song, index) => (
          <li
            key={`${song.title}-${song.anime}-${index}`}
            className={cn('flex items-center gap-3 px-4 py-2.5', rowStripe(index))}
          >
            <Rank index={index} />
            <Cover src={song.cover} name={song.anime} tall />
            <div className="min-w-0 flex-1 space-y-0.5">
              {song.franchise && (
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-warning">
                  <Star className="h-3 w-3 shrink-0 fill-warning/50" aria-hidden />
                  <span className="truncate">{song.franchise}</span>
                </div>
              )}
              <div className="truncate text-sm font-semibold leading-tight">{song.anime}</div>
              <div className="flex min-w-0 items-center gap-1.5 text-xs">
                <Music2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                <span className="truncate font-medium">{song.title}</span>
              </div>
              <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{song.artist}</span>
              </div>
              <div className="flex flex-wrap gap-1 pt-0.5">
                <Chip className={TYPE_CHIP[song.songType] ?? 'border-border text-muted-foreground'}>
                  {songTypeLabel(song.songType, song.sequence)}
                </Chip>
                <Chip
                  className={
                    DIFFICULTY_CHIP[song.difficulty] ?? 'border-border text-muted-foreground'
                  }
                >
                  {DIFFICULTY_LABELS[song.difficulty] ?? song.difficulty}
                </Chip>
              </div>
            </div>
            <PlayCount count={song.count} />
          </li>
        ))}
      </TopCard>
    </div>
  );
}
