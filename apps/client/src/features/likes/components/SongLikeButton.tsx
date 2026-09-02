import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from '@/features/hub/components/config/ConfigPrimitives';
import { useSongLikes } from '@/features/likes/context/SongLikesContext';
import { LIKES_COPY } from '@/features/likes/copy/likesCopy';

interface SongLikeButtonProps {
  songId: number;
  /** Server hint — synced on load; optimistic updates override locally. */
  initialLiked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Stop row click handlers in library lists. */
  stopPropagation?: boolean;
}

export function SongLikeButton({
  songId,
  initialLiked = false,
  size = 'md',
  className,
  stopPropagation = false,
}: SongLikeButtonProps) {
  const { isLiked, toggleLike, ready } = useSongLikes();
  const liked = ready ? isLiked(songId) : initialLiked;

  const iconSize =
    size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  const buttonSize =
    size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-9 w-9';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-pressed={liked}
      aria-label={liked ? LIKES_COPY.unlikeAria : LIKES_COPY.likeAria}
      title={liked ? LIKES_COPY.unlikeAria : LIKES_COPY.likeAria}
      className={cn(
        buttonSize,
        'shrink-0 rounded-full border border-primary/35 bg-card/90 p-0 text-primary hover:bg-primary/15 hover:text-primary',
        FOCUS_RING,
        className,
      )}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        void toggleLike(songId);
      }}
    >
      <Heart
        className={cn(iconSize, 'scale-110 stroke-[2.25]', liked ? 'fill-primary' : 'fill-none')}
        aria-hidden="true"
      />
    </Button>
  );
}
