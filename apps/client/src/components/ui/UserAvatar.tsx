import { isTrustedSupabaseAvatarUrl } from '@aniquizz/shared';
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
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const uploadedSrc =
    avatar && supabaseUrl && isTrustedSupabaseAvatarUrl(avatar, supabaseUrl) ? avatar : undefined;

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
