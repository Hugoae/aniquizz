import { useState } from 'react';
import {
  CheckCircle2,
  ChevronUp,
  CircleDot,
  Clock3,
  Lightbulb,
  MessageSquareText,
  Music2,
  PenLine,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { LibraryDifficulty, SuggestionCategory, SuggestionItem, SuggestionStatus } from '@aniquizz/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from '@/features/hub/components/config/ConfigPrimitives';
import { libraryDifficultyLabel } from '@/features/library/lib/libraryStyles';
import {
  SUGGESTION_CATEGORY_LABELS,
  SUGGESTION_CORRECTION_LABELS,
  SUGGESTION_STATUS_LABELS,
  SUGGESTIONS_COPY,
} from '@/features/suggestions/copy/suggestionsCopy';

const categoryIcons: Record<SuggestionCategory, typeof Lightbulb> = {
  IMPROVEMENT: Lightbulb,
  SONG_REQUEST: Music2,
  CORRECTION: PenLine,
  OTHER: MessageSquareText,
};

const statusIcons: Record<SuggestionStatus, typeof CircleDot> = {
  OPEN: CircleDot,
  PLANNED: Clock3,
  DONE: CheckCircle2,
  REJECTED: XCircle,
};

const statusClasses: Record<SuggestionStatus, string> = {
  OPEN: 'border-primary/30 bg-primary/10 text-primary',
  PLANNED: 'border-warning/30 bg-warning/10 text-warning',
  DONE: 'border-success/30 bg-success/10 text-success',
  REJECTED: 'border-destructive/30 bg-destructive/10 text-destructive',
};

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

interface SuggestionCardProps {
  suggestion: SuggestionItem;
  canDelete?: boolean;
  voting?: boolean;
  onVote: (suggestion: SuggestionItem) => void;
  onDelete?: (suggestion: SuggestionItem) => void;
}

export function SuggestionCard({
  suggestion,
  canDelete = false,
  voting = false,
  onVote,
  onDelete,
}: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const CategoryIcon = categoryIcons[suggestion.category];
  const StatusIcon = statusIcons[suggestion.status];
  const canVote = suggestion.status === 'OPEN';
  const longBody = suggestion.body.length > 300;

  return (
    <article className="glass-card group overflow-hidden border border-border/70 transition-colors hover:border-primary/25">
      <div className="flex">
        <div className="flex w-16 shrink-0 flex-col items-center border-r border-border/60 bg-secondary/25 py-5 sm:w-20">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canVote || voting}
            onClick={() => onVote(suggestion)}
            aria-pressed={suggestion.myVote}
            aria-label={suggestion.myVote ? SUGGESTIONS_COPY.unvote : SUGGESTIONS_COPY.vote}
            className={cn(
              'h-10 w-10 rounded-xl border p-0',
              FOCUS_RING,
              suggestion.myVote
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary',
            )}
          >
            <ChevronUp
              className={cn('h-5 w-5', suggestion.myVote && 'fill-current')}
              aria-hidden="true"
            />
          </Button>
          <span className="mt-1.5 font-mono text-sm font-black tabular-nums">
            {suggestion.voteCount}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {SUGGESTIONS_COPY.votes}
          </span>
        </div>

        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5 border-border bg-secondary/40">
              <CategoryIcon className="h-3 w-3" aria-hidden="true" />
              {SUGGESTION_CATEGORY_LABELS[suggestion.category]}
            </Badge>
            <Badge variant="outline" className={cn('gap-1.5', statusClasses[suggestion.status])}>
              <StatusIcon className="h-3 w-3" aria-hidden="true" />
              {SUGGESTION_STATUS_LABELS[suggestion.status]}
            </Badge>
          </div>

          <h2 className="stage-text text-lg font-bold leading-snug text-foreground sm:text-xl">
            {suggestion.title}
          </h2>
          <p
            className={cn(
              'mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground',
              longBody && !expanded && 'line-clamp-4',
            )}
          >
            {suggestion.body}
          </p>
          {longBody ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className={cn('mt-1 text-xs font-semibold text-primary hover:underline', FOCUS_RING)}
            >
              {expanded ? SUGGESTIONS_COPY.readLess : SUGGESTIONS_COPY.readMore}
            </button>
          ) : null}

          {suggestion.song ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-aqua/60 bg-aqua/5 px-3 py-2 text-xs">
              <Music2 className="h-4 w-4 text-aqua" aria-hidden="true" />
              <span className="font-bold text-foreground">{suggestion.song.title}</span>
              <span className="text-muted-foreground">
                {suggestion.song.animeName} · {suggestion.song.artist}
              </span>
              {suggestion.correctionField ? (
                <span className="font-semibold text-aqua">
                  {SUGGESTION_CORRECTION_LABELS[suggestion.correctionField]} →{' '}
                  {suggestion.correctionField === 'DIFFICULTY' && suggestion.proposedValue
                    ? libraryDifficultyLabel(suggestion.proposedValue as LibraryDifficulty)
                    : suggestion.proposedValue}
                </span>
              ) : null}
            </div>
          ) : null}

          {suggestion.adminReply ? (
            <div className="mt-4 border-l-2 border-primary bg-primary/5 px-4 py-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
                {SUGGESTIONS_COPY.teamReply}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{suggestion.adminReply}</p>
            </div>
          ) : null}

          <footer className="mt-4 flex items-center justify-between gap-3 border-t border-border/50 pt-3">
            <div className="flex min-w-0 items-center gap-2">
              <UserAvatar
                avatar={suggestion.author?.avatar}
                username={suggestion.author?.username ?? SUGGESTIONS_COPY.anonymousAuthor}
                className="h-6 w-6"
              />
              <span className="truncate text-xs font-semibold">
                {suggestion.author?.username ?? SUGGESTIONS_COPY.anonymousAuthor}
              </span>
              <span className="text-xs text-muted-foreground">
                · {dateFormatter.format(new Date(suggestion.createdAt))}
              </span>
            </div>
            {canDelete && onDelete && !suggestion.locked ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(suggestion)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{SUGGESTIONS_COPY.delete}</span>
              </Button>
            ) : null}
          </footer>
        </div>
      </div>
    </article>
  );
}
