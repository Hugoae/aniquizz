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
  
  // La logique unique pour gérer URL vs DiceBear
  const getAvatarSrc = (src?: string) => {
    if (!src) return undefined;
    if (src.startsWith('http')) return src; // C'est une image uploadée (Supabase)
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${src}`; // C'est un avatar par défaut
  };

  return (
    <Avatar className={cn("border border-primary/20", className)}>
      <AvatarImage src={getAvatarSrc(avatar)} className="object-cover" />
      <AvatarFallback className={fallbackClassName}>{initials}</AvatarFallback>
    </Avatar>
  );
}