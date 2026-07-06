import { UserPlus, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFriends } from './FriendsContext';

interface Props {
  userId: string;
  /** Icon-only compact rendering (for dense player lists). */
  compact?: boolean;
  className?: string;
}

/**
 * Contextual "add friend" control. Resolves its own relation from the shared
 * friends state and renders nothing for yourself, bots, or existing friends.
 * A request to a user who already invited you auto-accepts (mutual add).
 */
export function AddFriendButton({ userId, compact, className }: Props) {
  const { addById, relationOf } = useFriends();

  if (!userId || userId.startsWith('bot-')) return null;
  const relation = relationOf(userId);
  if (relation === 'self' || relation === 'friends' || relation === 'blocked') return null;

  if (relation === 'outgoing') {
    return compact ? (
      <span className={cn('text-muted-foreground/60', className)} title="Demande envoyée">
        <Clock className="h-4 w-4" />
      </span>
    ) : (
      <Button variant="ghost" size="sm" disabled className={cn('gap-1.5 text-muted-foreground', className)}>
        <Clock className="h-3.5 w-3.5" /> Envoyée
      </Button>
    );
  }

  const label = relation === 'incoming' ? 'Accepter' : 'Ajouter';
  const Icon = relation === 'incoming' ? Check : UserPlus;

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8 text-primary hover:text-primary hover:bg-primary/10', className)}
        title={`${label} en ami`}
        onClick={() => addById(userId)}
      >
        <Icon className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('gap-1.5', className)}
      onClick={() => addById(userId)}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </Button>
  );
}
