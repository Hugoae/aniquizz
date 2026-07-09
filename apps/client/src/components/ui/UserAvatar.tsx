import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  avatar?: string;
  username?: string;
  className?: string;
  fallbackClassName?: string;
  /** Default lazy — use eager for above-the-fold identity (profile header). */
  loading?: 'lazy' | 'eager';
}

export function UserAvatar({ avatar, username, className, fallbackClassName, loading = 'lazy' }: UserAvatarProps) {
  const initials = username ? username.substring(0, 2).toUpperCase() : '??';

  // Only uploaded images (Supabase URLs) are shown; otherwise we fall back to
  // the user's initials on a dark background (no generated character).
  const uploadedSrc = avatar?.startsWith('http') ? avatar : undefined;

  return (
    <Avatar className={cn("border border-primary/20", className)}>
      <AvatarImage
        src={uploadedSrc}
        alt={username ? `Avatar de ${username}` : 'Avatar'}
        className="object-cover"
        loading={loading}
        decoding="async"
      />
      <AvatarFallback className={cn('bg-secondary font-semibold text-secondary-foreground', fallbackClassName)}>{initials}</AvatarFallback>
    </Avatar>
  );
}