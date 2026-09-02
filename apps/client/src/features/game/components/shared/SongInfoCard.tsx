import { ExternalLink, Calendar, Music2, User, Star, Check, HelpCircle, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SongLikeButton } from '@/features/likes/components/SongLikeButton';
import {
  formatRevealEpisodeRange,
  formatRevealFormat,
  formatRevealSeasonYear,
  isRevealAccentColor,
  revealAccentStyle,
} from '@/features/game/lib/revealMeta';

// Decorative genre tags cycle through the token palette (no raw colors).
const TAG_TONES = [
  'bg-primary/10 text-primary border-primary/20',
  'bg-accent/10 text-accent border-accent/20',
  'bg-aqua/10 text-aqua border-aqua/20',
  'bg-info/10 text-info border-info/20',
  'bg-success/10 text-success border-success/20',
  'bg-warning/10 text-warning border-warning/20',
];

interface SongInfoCardProps {
  animeName: string;
  songTitle: string;
  artist: string;
  type: string;
  difficulty: string;
  franchise?: string;
  year?: number;
  season?: string | null;
  format?: string | null;
  episodeRange?: string | null;
  coverColor?: string | null;
  coverImage?: string;
  siteUrl?: string;
  isRevealed: boolean;
  tags?: string[];
  isWatched?: boolean;
  /** Catalogue song id — enables the like button at reveal. */
  songId?: number;
  showLikeButton?: boolean;
  /** `card` = tall side panel; `band` = compact horizontal strip under the video. */
  variant?: 'card' | 'band';
}

function MetaPills({
  diffColor,
  diffLabel,
  formattedType,
  seasonYearLabel,
  formatLabel,
  episodeLabel,
  compact,
}: {
  diffColor: string;
  diffLabel: string;
  formattedType: string;
  seasonYearLabel: string | null;
  formatLabel: string | null;
  episodeLabel: string | null;
  compact?: boolean;
}) {
  const pill = compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]';
  const typePill = compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';

  return (
    <>
      <span className={cn('rounded border font-bold uppercase tracking-wider shadow-sm', pill, diffColor)}>{diffLabel}</span>
      <span className={cn('rounded border border-border bg-secondary/50 font-black text-foreground shadow-sm', typePill)}>{formattedType}</span>
      {episodeLabel && (
        <span className={cn('rounded border border-border/60 bg-secondary/30 font-bold text-secondary-foreground', pill)}>
          {episodeLabel}
        </span>
      )}
      {formatLabel && (
        <span className={cn('flex items-center gap-1 rounded border border-border/60 bg-secondary/30 font-bold text-secondary-foreground', pill)}>
          <Film className={compact ? 'h-3 w-3' : 'h-3 w-3'} aria-hidden="true" />
          {formatLabel}
        </span>
      )}
      {seasonYearLabel && (
        <span className={cn('flex items-center gap-1 rounded border border-border/60 bg-secondary/30 font-bold text-secondary-foreground', pill)}>
          <Calendar className="h-3 w-3" aria-hidden="true" />
          {seasonYearLabel}
        </span>
      )}
    </>
  );
}

export function SongInfoCard({
  animeName,
  songTitle,
  artist,
  type,
  difficulty,
  franchise,
  year,
  season,
  format,
  episodeRange,
  coverColor,
  coverImage,
  siteUrl,
  isRevealed,
  tags,
  isWatched,
  songId,
  showLikeButton = false,
  variant = 'card',
}: SongInfoCardProps) {
  if (!isRevealed) {
    return (
      <div className="glass-card flex h-full min-h-[200px] w-full max-w-[640px] flex-col items-center justify-center gap-4 border-dashed p-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-primary/30 text-primary/60">
          <HelpCircle className="h-10 w-10" aria-hidden="true" />
        </div>
        <div>
          <p className="text-lg font-black uppercase tracking-tight text-foreground/80">Quel est cet anime ?</p>
          <p className="mt-1 text-sm text-muted-foreground">Les infos apparaîtront à la révélation.</p>
        </div>
      </div>
    );
  }

  const diffColor =
    difficulty === 'easy'
      ? 'text-success border-success/30 bg-success/10'
      : difficulty === 'hard'
        ? 'text-destructive border-destructive/30 bg-destructive/10'
        : 'text-info border-info/30 bg-info/10';

  const diffLabel = difficulty ? difficulty.toUpperCase() : 'NORMAL';
  const formattedType = type.replace(/(\d+)$/, ' $1');
  const seasonYearLabel = formatRevealSeasonYear(season, year);
  const formatLabel = formatRevealFormat(format);
  const episodeLabel = formatRevealEpisodeRange(episodeRange);
  const accentStyle = revealAccentStyle(coverColor);
  const accent = isRevealAccentColor(coverColor) ? coverColor : null;

  const metaPills = (
    <MetaPills
      diffColor={diffColor}
      diffLabel={diffLabel}
      formattedType={formattedType}
      seasonYearLabel={seasonYearLabel}
      formatLabel={formatLabel}
      episodeLabel={episodeLabel}
      compact={variant === 'band'}
    />
  );

  if (variant === 'band') {
    return (
      <div
        className="group relative flex w-full animate-scale-in overflow-hidden rounded-xl border border-border bg-card shadow-xl transition-all duration-300 hover:border-primary/30"
        style={accentStyle}
      >
        {coverImage && (
          <div className="relative w-[104px] shrink-0 overflow-hidden">
            {accent && <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/40 to-transparent mix-blend-multiply" style={{ backgroundColor: `${accent}22` }} />}
            <img src={coverImage} alt={animeName} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            {isWatched && (
              <div className="absolute left-1 top-1 z-20 flex items-center gap-1 rounded bg-success px-1.5 py-0.5 text-success-foreground shadow">
                <Check className="h-3 w-3 stroke-[4]" />
                <span className="text-[9px] font-black leading-none">VU</span>
              </div>
            )}
            {showLikeButton && songId != null && (
              <div className="absolute bottom-1.5 right-1.5 z-30">
                <SongLikeButton songId={songId} size="md" className="shadow-lg" />
              </div>
            )}
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-3">
          {franchise && (
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-warning">
              <Star className="h-3 w-3 shrink-0 fill-warning/50" />
              <span className="truncate">{franchise}</span>
            </div>
          )}

          <a
            href={siteUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="line-clamp-1 text-lg font-black leading-tight text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
            title="Voir sur AniList"
          >
            {animeName}
            <ExternalLink className="relative -top-0.5 ml-1.5 inline h-3 w-3 opacity-50" />
          </a>

          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Music2 className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate font-semibold text-foreground/90">{songTitle}</span>
            <span className="shrink-0 text-muted-foreground">·</span>
            <span className="truncate text-muted-foreground">{artist}</span>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {metaPills}
            {tags?.slice(0, 3).map((tag, i) => (
              <span key={tag} className={cn('hidden rounded border px-1.5 py-0.5 text-[9px] font-medium sm:inline', TAG_TONES[i % TAG_TONES.length])}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative flex h-full min-h-[200px] w-full max-w-[640px] animate-in slide-in-from-right-4 overflow-hidden rounded-xl border border-border bg-card shadow-2xl transition-all duration-500 hover:border-primary/30"
      style={accentStyle}
    >
      <div className="relative flex min-w-0 flex-1 flex-col p-4">
        {franchise && (
          <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-warning">
            <Star className="h-3 w-3 shrink-0 fill-warning/50" />
            <span className="truncate">{franchise}</span>
          </div>
        )}

        <a
          href={siteUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 block line-clamp-2 text-xl font-black leading-tight text-foreground underline-offset-4 transition-all hover:text-primary hover:underline"
          title="Voir sur AniList"
          style={accent ? { textShadow: `0 0 24px ${accent}33` } : undefined}
        >
          {animeName}
          <ExternalLink className="relative -top-0.5 ml-1.5 inline h-3.5 w-3.5 opacity-50" />
        </a>

        <div className="mb-2 flex flex-col gap-1 border-l-2 pl-2" style={accent ? { borderColor: `${accent}88` } : undefined}>
          <div className="flex items-center gap-2 truncate text-base font-bold text-foreground/90">
            <Music2 className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{songTitle}</span>
          </div>
          <div className="flex items-center gap-2 truncate text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{artist}</span>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2.5">
          {metaPills}
        </div>

        {tags && tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.slice(0, 6).map((tag, i) => (
              <span key={tag} className={cn('whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-medium', TAG_TONES[i % TAG_TONES.length])}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="relative h-full w-[200px] shrink-0">
        <div className="absolute inset-0 z-10 w-10 bg-gradient-to-r from-card to-transparent" />
        {accent && (
          <div
            className="pointer-events-none absolute inset-0 z-[5]"
            style={{ background: `linear-gradient(135deg, ${accent}33 0%, transparent 55%)` }}
            aria-hidden="true"
          />
        )}
        <img src={coverImage || '/placeholder.png'} alt={animeName} className="h-full w-full object-cover" loading="lazy" decoding="async" />

        {isWatched && (
          <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-md border border-success/60 bg-success px-2 py-1 text-success-foreground shadow-lg">
            <Check className="h-3 w-3 stroke-[4]" />
            <span className="text-[10px] font-black leading-none">VU</span>
          </div>
        )}

        {showLikeButton && songId != null && (
          <div className="absolute bottom-2 right-2 z-30">
            <SongLikeButton songId={songId} size="lg" className="shadow-lg" />
          </div>
        )}
      </div>
    </div>
  );
}
