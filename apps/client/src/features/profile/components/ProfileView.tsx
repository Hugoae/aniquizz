import { Trophy, Check, Target, Flame, Zap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ProfilePokedexSection } from './ProfilePokedexSection';
import { StatCard } from './StatCard';
import type { AdminProfileStats, Role } from '@/lib/adminApi';

const getAvatarSrc = (avatar: string): string | undefined =>
  avatar.startsWith('http') ? avatar : undefined;

export interface ProfileViewProps {
  username: string;
  avatar: string;
  role: Role;
  anilistUsername?: string | null;
  malUsername?: string | null;
  presenceLabel?: string;
  presenceColor?: string;
  presenceOnline?: boolean;
  stats: AdminProfileStats;
  /** Extra content rendered under the identity block (sanctions, room…). */
  headerExtra?: React.ReactNode;
}

/**
 * Read-only rendering of a player's profile, mirroring the profile page layout.
 * Used by the admin panel to preview any user without the edit controls.
 */
export function ProfileView({
  username,
  avatar,
  role,
  anilistUsername,
  malUsername,
  presenceLabel = 'Hors ligne',
  presenceColor = 'bg-muted-foreground/40',
  presenceOnline = false,
  stats,
  headerExtra,
}: ProfileViewProps) {
  const s = stats.stats;
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-elevated">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />
        <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
          <div className="relative shrink-0">
            <Avatar className="relative h-28 w-28 border-4 border-background">
              <AvatarImage src={getAvatarSrc(avatar)} className="object-cover" />
              <AvatarFallback className="bg-secondary text-3xl font-bold text-secondary-foreground">
                {username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 space-y-2 py-1">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <h1 className="text-3xl font-black tracking-tight">{username}</h1>
              {role === 'ADMIN' && (
                <span className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded-sm border border-destructive/50">
                  ADMIN
                </span>
              )}
              {role === 'MODERATOR' && (
                <span className="text-xs bg-info/20 text-info px-2 py-1 rounded-sm border border-info/50">
                  MODÉRATEUR
                </span>
              )}
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground">
              <span
                className={cn(
                  'inline-block w-2 h-2 rounded-full',
                  presenceColor,
                  presenceOnline && 'animate-pulse',
                )}
              />
              <span>{presenceLabel}</span>
            </div>

            {anilistUsername && (
              <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-aqua mt-2 bg-aqua/10 px-3 py-1 rounded-md w-fit mx-auto sm:mx-0">
                <img
                  src="/logos/anilist.svg"
                  alt="AniList"
                  width={16}
                  height={16}
                  loading="lazy"
                  className="w-4 h-4"
                />
                <span>
                  AniList : <b>{anilistUsername}</b>
                </span>
              </div>
            )}

            {malUsername && (
              <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-primary mt-2 bg-primary/10 px-3 py-1 rounded-md w-fit mx-auto sm:mx-0">
                <img src="/logos/mal.png" alt="MyAnimeList" className="h-4 w-4 rounded-sm" />
                <span>
                  MyAnimeList : <b>{malUsername}</b>
                </span>
              </div>
            )}

            {headerExtra && <div className="pt-2">{headerExtra}</div>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold">Statistiques</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Trophy}
            label="Taux de victoire"
            value={`${s.winRate}%`}
            color="text-accent"
          />
          <StatCard
            icon={Check}
            label="Taux de bon guess"
            value={`${s.accuracy}%`}
            color="text-success"
          />
          <StatCard icon={Target} label="Parties jouées" value={s.gamesPlayed} color="text-info" />
          <StatCard icon={Flame} label="Best Streak" value={s.maxStreak} color="text-warning" />
        </div>
      </div>

      <ProfilePokedexSection
        discoveredSongs={stats.discoveredSongs}
        progressPercent={stats.progressPercent}
        totalSongs={stats.totalSongs}
      />
    </div>
  );
}
