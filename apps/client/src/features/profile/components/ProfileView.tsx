import { Trophy, Check, Target, Flame, Music2, Disc, Zap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { StatCard } from "./StatCard";
import type { AdminProfileStats, Role } from "@/lib/adminApi";

const getAvatarSrc = (avatar: string): string | undefined =>
  avatar.startsWith("http") ? avatar : undefined;

export interface ProfileViewProps {
  username: string;
  avatar: string;
  role: Role;
  anilistUsername?: string | null;
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
  presenceLabel = "Hors ligne",
  presenceColor = "bg-white/30",
  presenceOnline = false,
  stats,
  headerExtra,
}: ProfileViewProps) {
  const s = stats.stats;
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative rounded-xl overflow-hidden bg-card border border-white/10 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
        <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-br from-primary to-accent rounded-full blur opacity-50" />
            <Avatar className="h-28 w-28 border-4 border-background relative shadow-xl">
              <AvatarImage src={getAvatarSrc(avatar)} className="object-cover" />
              <AvatarFallback className="bg-secondary text-3xl font-bold text-secondary-foreground">
                {username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 space-y-2 py-1">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <h1 className="text-3xl font-black tracking-tight">{username}</h1>
              {role === "ADMIN" && (
                <span className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded-sm border border-destructive/50">
                  ADMIN
                </span>
              )}
              {role === "MODERATOR" && (
                <span className="text-xs bg-info/20 text-info px-2 py-1 rounded-sm border border-info/50">
                  MODÉRATEUR
                </span>
              )}
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground">
              <span className={cn("inline-block w-2 h-2 rounded-full", presenceColor, presenceOnline && "animate-pulse")} />
              <span>{presenceLabel}</span>
            </div>

            {anilistUsername && (
              <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-aqua mt-2 bg-aqua/10 px-3 py-1 rounded-md w-fit mx-auto sm:mx-0">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/6/61/AniList_logo.svg"
                  alt="AniList"
                  className="w-4 h-4"
                />
                <span>
                  Lié à : <b>{anilistUsername}</b>
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
          <StatCard icon={Trophy} label="Taux de victoire" value={`${s.winRate}%`} color="text-accent" />
          <StatCard icon={Check} label="Taux de bon guess" value={`${s.accuracy}%`} color="text-success" />
          <StatCard icon={Target} label="Parties jouées" value={s.gamesPlayed} color="text-info" />
          <StatCard icon={Flame} label="Best Streak" value={s.maxStreak} color="text-warning" />
        </div>
      </div>

      {/* Pokédex */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Disc className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold">Pokédex Musical</h2>
        </div>
        <div className="bg-card border border-white/10 rounded-xl p-6 shadow-lg relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-4 z-10 relative">
            <div>
              <div className="text-4xl font-black gradient-text">{stats.discoveredSongs}</div>
              <div className="text-sm text-muted-foreground font-medium">Sons uniques découverts</div>
            </div>
          </div>
          <div className="space-y-2 z-10 relative">
            <div className="h-4 bg-secondary/50 rounded-lg overflow-hidden border border-white/5 relative">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.min(stats.progressPercent, 100)}%`,
                  boxShadow: "0 0 15px rgba(168, 85, 247, 0.5)",
                }}
              />
            </div>
            <div className="flex justify-between text-xs font-mono text-muted-foreground">
              <span>0</span>
              <span>Total Disponible: {stats.totalSongs}</span>
            </div>
          </div>
          <div className="absolute top-[-20%] right-[-5%] p-8 opacity-5 pointer-events-none">
            <Music2 className="h-64 w-64" />
          </div>
        </div>
      </div>
    </div>
  );
}
