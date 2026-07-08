import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  avatar?: string;
  username?: string;
  className?: string;
  fallbackClassName?: string;
}

export function UserAvatar({ avatar, username, className, fallbackClassName }: UserAvatarProps) {
  const initials = username ? username.substring(0, 2).toUpperCase() : '??';

  // Only uploaded images (Supabase URLs) are shown; otherwise we fall back to
  // the user's initials on a dark background (no generated character).
  const uploadedSrc = avatar?.startsWith('http') ? avatar : undefined;

  return (
    <Avatar className={cn("border border-primary/20", className)}>
      <AvatarImage src={uploadedSrc} className="object-cover" />
      <AvatarFallback className={cn('bg-secondary font-semibold text-secondary-foreground', fallbackClassName)}>{initials}</AvatarFallback>
    </Avatar>
  );
}