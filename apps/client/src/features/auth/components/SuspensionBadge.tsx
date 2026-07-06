import { useEffect, useState } from "react";
import { Ban, MicOff } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { formatRemaining, isSanctionActive } from "@/lib/suspension";

/**
 * Header indicator shown to a player who is currently banned or muted.
 * Ticks every second (live countdown) and periodically refreshes the profile
 * so a sanction applied mid-session appears without a manual reload.
 */
export function SuspensionBadge() {
  const { profile, refreshProfile } = useAuth();
  const [, force] = useState(0);

  useEffect(() => {
    const tick = setInterval(() => force((n) => n + 1), 1000);
    const refresh = setInterval(() => void refreshProfile(), 30_000);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [refreshProfile]);

  if (!profile) return null;

  const banned = isSanctionActive(profile.bannedUntil);
  const muted = isSanctionActive(profile.mutedUntil);
  if (!banned && !muted) return null;

  if (banned) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-red-300"
        title="Vous êtes banni : vous ne pouvez pas rejoindre de partie."
      >
        <Ban className="h-4 w-4" />
        <span className="text-xs font-semibold">
          Banni · {formatRemaining(profile.bannedUntil)}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-amber-300"
      title="Vous êtes réduit au silence : le chat est désactivé."
    >
      <MicOff className="h-4 w-4" />
      <span className="text-xs font-semibold">
        Muet · {formatRemaining(profile.mutedUntil)}
      </span>
    </div>
  );
}
