import type { MatchEngineHost } from './matchEngineHost';

const DUO_UNAVAILABLE = "Le joker Duo n'est pas disponible pour cette manche.";

function emitDuoChoices(host: MatchEngineHost, socketId: string, choices: string[]): void {
  host.room.io.to(socketId).emit('game:duo', { choices });
}

/**
 * Mix lifeline. The pair is never on `round_start`; committing here forces
 * this round's answer to score as duo (1 pt) even if the client claims typing.
 */
export function useDuoLifeline(host: MatchEngineHost, userId: string): void {
  const player = host.room.players.get(userId);
  if (!player?.socketId || player.isBot) return;

  const item = host.playlist[host.currentRoundIndex];
  const allowed =
    host.phase === 'guessing' &&
    !host.isRoundEnded &&
    !host.isRoundLoading &&
    host.room.settings.responseType === 'mix' &&
    item != null &&
    item.duo.length >= 2;

  if (!allowed || !item) {
    host.room.io.to(player.socketId).emit('error', { message: DUO_UNAVAILABLE });
    return;
  }

  player.duoCommitted = true;
  if (player.hasAnswered && player.answerType !== 'duo') {
    const timeMs = player.answerTimeMs ?? Math.max(0, Date.now() - host.guessStartAt);
    player.answerType = 'duo';
    player.roundPoints = player.isCorrect
      ? host.deps.scoring.scoreFor('duo', { timeMs, durationMs: item.guessDuration * 1000 })
      : 0;
  }
  emitDuoChoices(host, player.socketId, item.duo);
}

/** Re-send the pair after a refresh. Sync payloads stay free of the duo. */
export function replayDuoLifeline(host: MatchEngineHost, userId: string): void {
  if (host.phase !== 'guessing' || host.isRoundEnded) return;
  const player = host.room.players.get(userId);
  const item = host.playlist[host.currentRoundIndex];
  if (!player?.duoCommitted || !player.socketId || !item || item.duo.length < 2) return;
  emitDuoChoices(host, player.socketId, item.duo);
}
