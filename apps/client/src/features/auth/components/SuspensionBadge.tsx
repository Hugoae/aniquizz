import { useEffect, useState } from "react";
import { Ban, MicOff } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { formatRemaining, isSanctionActive } from "@/lib/suspension";

/**
 * Header indicator shown to a player who is currently banned or muted.
 * Ticks every second for the live countdown; sanction changes arrive via
 * `profile:sanction_updated` (AuthContext) without waiting for a profile poll.
 */
export function SuspensionBadge() {
  const { profile } = useAuth();
  const [, force] = useState(0);

  useEffect(() => {
    const tick = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(tick);
  }, []);

  if (!profile) return null;

  const banned = isSanctionActive(profile.bannedUntil);
  const muted = isSanctionActive(profile.mutedUntil);
  if (!banned && !muted) return null;

  if (banned) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/15 px-3 py-1.5 text-destructive"
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
      className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/15 px-3 py-1.5 text-warning"
      title="Vous êtes réduit au silence : le chat est désactivé."
    >
      <MicOff className="h-4 w-4" />
      <span className="text-xs font-semibold">
        Muet · {formatRemaining(profile.mutedUntil)}
      </span>
    </div>
  );
}
