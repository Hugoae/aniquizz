import { Sword, Gavel } from 'lucide-react';
import type { UserRole } from '@aniquizz/shared';
import { cn } from '@/lib/utils';

interface RoleBadgeProps {
  role?: UserRole | null;
  /** Square side in pixels (icon scales with it). Defaults to 16. */
  size?: number;
  className?: string;
}

const ROLE_CONFIG = {
  ADMIN: { icon: Sword, className: 'bg-destructive', label: 'Admin' },
  MODERATOR: { icon: Gavel, className: 'bg-info', label: 'Modérateur' },
} as const;

/**
 * Small square staff badge shown next to a username (lists, lobbies…).
 * Renders nothing for regular users. Never used in the header.
 */
export function RoleBadge({ role, size = 16, className }: RoleBadgeProps) {
  if (role !== 'ADMIN' && role !== 'MODERATOR') return null;

  const { icon: Icon, className: bg, label } = ROLE_CONFIG[role];
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn('inline-flex shrink-0 items-center justify-center rounded-[4px] text-white', bg, className)}
      style={{ width: size, height: size }}
    >
      <Icon strokeWidth={2.5} style={{ width: size * 0.62, height: size * 0.62 }} />
    </span>
  );
}
