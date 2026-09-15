import { GAME_CONFIG, toClientRoomSettings } from '@aniquizz/shared';
import { toPlaybackUrl } from '../../../lib/mediaPlaybackUrl';
import { logger } from '../../../utils/logger';
import type { MatchEngineHost } from './matchEngineHost';

export async function startMatch(host: MatchEngineHost): Promise<boolean> {
  host.resetMatchState();
  host.startedAt = new Date();
  host.room.status = 'playing';
  host.currentRoundIndex = -1;
  host.phase = 'intro';

  const introStartedAt = Date.now();

  // Send everyone to the game screen immediately, then build the playlist while
  // the intro countdown plays. The DB/AniList work is thus hidden behind the
  // countdown instead of blocking the lobby. `firstVideo` is intentionally null
  // here (unused for preload; the client loads the clip at `round_start`).
  host.channel.emit('game_started', {
    roomId: host.room.id,
    settings: toClientRoomSettings(host.room.settings),
    players: host.room.toPublicPlayers(),
    introDuration: GAME_CONFIG.TIMERS.INTRO_DELAY,
    firstVideo: null,
  });

  let built;
  try {
    built = await host.deps.builder.build(host.room.settings, [...host.room.players.values()], {
      excludePriorMatchSongIds: host.room.getPriorMatchSongIds(),
    });
  } catch (e) {
    logger.error(`[MatchEngine ${host.room.id}] Playlist build crashed`, 'Game', e);
    return abortStart(host, 'Erreur technique lors de la préparation.');
  }

  if (!built.playlist.length) {
    const settings = host.room.settings;
    let message = 'Aucun son trouvé pour ces paramètres.';
    if (built.abortReason === 'watched_empty') {
      message =
        settings.watchedMode === 'intersection'
          ? "Mode Commun impossible : au moins un joueur n'a pas de liste AniList utilisable."
          : 'Aucune liste AniList disponible. Liez votre compte AniList ou changez la source musicale.';
    } else if (built.abortReason === 'playlist_missing' || built.abortReason === 'playlist_empty') {
      message = "Cette playlist n'est plus disponible ou n'a aucun son jouable.";
    }
    logger.error(
      `[MatchEngine ${host.room.id}] Empty playlist (${built.abortReason ?? 'unknown'}).`,
      'Game',
    );
    return abortStart(host, message);
  }

  host.playlist = built.playlist;
  host.room.registerMatchPlaylistSongIds(host.playlist.map((item) => item.id));

  logger.info(
    `[MatchEngine ${host.room.id}] Match start — ${host.playlist.length} songs, ${host.room.players.size} players.`,
    'Game',
  );

  const first = host.playlist[0];
  if (first) {
    host.channel.emit('game:preload', {
      videoKey: toPlaybackUrl(first.videoKey),
      videoStartTime: first.videoStartTime,
    });
  }

  if (built.fallbackUsed) {
    setTimeout(() => {
      const message =
        host.room.settings.soundSelection === 'playlist'
          ? "Liste insuffisante : des sons du pack complètent la partie (vous l'avez autorisé)."
          : "Liste AniList insuffisante : des sons aléatoires complètent la partie (vous l'avez autorisé).";
      host.channel.emit('game:fallback_notification', { message });
    }, 1000);
  }

  if (built.difficultyRelaxed) {
    setTimeout(
      () => {
        host.channel.emit('game:fallback_notification', {
          message:
            'Pool trop petit sur la difficulté choisie : des sons plus durs complètent la partie.',
        });
      },
      built.fallbackUsed ? 2500 : 1000,
    );
  }

  const remaining = Math.max(0, GAME_CONFIG.TIMERS.INTRO_DELAY - (Date.now() - introStartedAt));
  host.introTimer = setTimeout(() => beginRound1Ready(host), remaining);
  return true;
}

/**
 * Round-1 only: show the game UI with a short "À vous !" beat before audio and
 * the guess timer start. Later rounds call `startRound()` directly from reveal.
 */
export function beginRound1Ready(host: MatchEngineHost): void {
  host.introTimer = null;
  if (host.currentRoundIndex >= 0) {
    host.startRound();
    return;
  }

  const first = host.playlist[0];
  if (!first) {
    void host.finish();
    return;
  }

  const readyMs = GAME_CONFIG.TIMERS.ROUND1_READY_DELAY;
  const serverNow = Date.now();
  const startsAt = serverNow + readyMs;

  host.phase = 'ready';
  host.readyStartsAt = startsAt;
  host.channel.emit('game:ready', {
    serverNow,
    startsAt,
    durationSeconds: first.guessDuration,
  });

  host.readyTimer = setTimeout(() => {
    host.readyTimer = null;
    host.readyStartsAt = null;
    host.startRound();
  }, readyMs);
}

/** Bail out after `game_started` was already sent: send players back to the
 *  lobby (cancel) and reset the room so a retry can start cleanly. */
export function abortStart(host: MatchEngineHost, message: string): boolean {
  host.room.status = 'waiting';
  host.channel.emit('error', { message });
  host.channel.emit('game_cancelled', { reason: message });
  return false;
}
