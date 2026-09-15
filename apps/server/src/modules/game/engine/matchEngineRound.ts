import {
  generatePeekWindow,
  normalizeVideoMode,
  revealDurationSeconds,
  scoreForAnswer,
  type RoundRevealPayload,
  type SprintLeaderboardPayload,
} from '@aniquizz/shared';
import { toPlaybackUrl } from '../../../lib/mediaPlaybackUrl';
import { logger } from '../../../utils/logger';
import { scheduleBotAnswers } from './matchEngineBots';
import { toRevealSong } from './matchEngineReveal';
import type { MatchEngineHost } from './matchEngineHost';
import type { PlaylistItem, RecordedRound } from './types';
import { START_BUFFER_MS, GUESS_END_GRACE_MS } from './matchEngineTimers';

export function startRound(host: MatchEngineHost): void {
  host.readyStartsAt = null;
  host.clock.clear();
  host.clearBotTimers();
  host.room.touch();
  host.isRoundLoading = true;
  host.currentRoundIndex++;

  if (host.currentRoundIndex >= host.playlist.length) {
    void host.finish();
    return;
  }

  const item = host.playlist[host.currentRoundIndex];
  host.phase = 'guessing';
  host.isRoundEnded = false;
  host.skipVotes.clear();
  host.pauseVotes.clear();
  host.isPausePending = false;

  for (const p of host.room.players.values()) host.resetRoundState(p);

  const required = host.requiredVotes();
  host.channel.emit('vote_update', { type: 'skip', count: 0, required });
  host.channel.emit('vote_update', { type: 'pause', count: 0, required, isPending: false });

  const videoMode = normalizeVideoMode(host.room.settings.videoMode);
  host.currentPeekWindow = videoMode === 'peek' ? generatePeekWindow() : null;

  const guessDurationMs = item.guessDuration * 1000 + START_BUFFER_MS + GUESS_END_GRACE_MS;
  host.guessStartAt = Date.now();
  host.clock.start(guessDurationMs, () => {
    try {
      host.endRound();
    } catch (error) {
      logger.error(`[MatchEngine ${host.room.id}] endRound crashed after timer`, 'GameLoop', error);
    }
  });
  host.botTimers.push(
    ...scheduleBotAnswers({
      players: host.room.players.values(),
      item,
      responseType: host.room.settings.responseType,
      handleAnswer: (userId, answer, answerType) => host.handleAnswer(userId, answer, answerType),
    }),
  );
  host.isRoundLoading = false;

  logger.info(
    `[MatchEngine ${host.room.id}] Round ${host.currentRoundIndex + 1}/${host.playlist.length} — ${item.anime}`,
    'GameLoop',
  );

  host.channel.emit('round_start', host.buildRoundStartPayload(item));
}

export function endRound(host: MatchEngineHost): void {
  if (host.isRoundLoading || host.isRoundEnded) return;

  const item = host.playlist[host.currentRoundIndex];
  if (!item) {
    logger.error(
      `[MatchEngine ${host.room.id}] endRound called with no playlist item (index=${host.currentRoundIndex}).`,
      'GameLoop',
    );
    return;
  }

  host.isRoundEnded = true;
  host.phase = 'reveal';
  host.clock.clear();
  host.clearBotTimers();

  const recorded: RecordedRound = {
    roundNumber: host.currentRoundIndex + 1,
    songId: item.id,
    answers: [],
  };

  const rankedCorrect = [...host.room.players.values()]
    .filter((p) => p.isCorrect === true && p.hasAnswered && p.answerTimeMs != null)
    .sort((a, b) => (a.answerTimeMs ?? 0) - (b.answerTimeMs ?? 0))
    .map((p) => ({ userId: p.userId, timeMs: p.answerTimeMs ?? 0 }));

  const roundBonuses = host.deps.scoring.roundBonus(rankedCorrect);

  for (const p of host.room.players.values()) {
    const bonus = roundBonuses.get(p.userId) ?? 0;
    p.speedBonus = bonus;
    p.speedRank = rankedCorrect.findIndex((r) => r.userId === p.userId);
    p.speedRank = p.speedRank >= 0 ? p.speedRank + 1 : null;
    if (bonus > 0) {
      p.roundPoints = (p.roundPoints || 0) + bonus;
    }

    p.score += p.roundPoints || 0;
    if (p.isCorrect === true) {
      p.streak += 1;
      p.matchCorrectCount += 1;
      p.correctSongIds.add(item.id);
    } else {
      p.streak = 0;
    }
    p.maxStreak = Math.max(p.maxStreak, p.streak);
    p.matchTotalCount += 1;

    if (p.hasAnswered) {
      recorded.answers.push({
        userId: p.userId,
        answer: p.currentAnswer,
        isCorrect: p.isCorrect === true,
        answerType: p.answerType ?? 'typing',
        timeMs: p.answerTimeMs,
        pointsAwarded: p.roundPoints || 0,
        speedRank: p.speedRank,
        speedBonus: p.speedBonus > 0 ? p.speedBonus : undefined,
      });
    }
  }
  host.recordedRounds.push(recorded);

  const revealSeconds = revealDurationSeconds(item.guessDuration);
  const revealMs = revealSeconds * 1000;
  host.clock.start(revealMs, () => {
    if (host.isPausePending) {
      host.pause();
    } else {
      host.startRound();
    }
  });

  logger.info(
    `[MatchEngine ${host.room.id}] Round ${host.currentRoundIndex + 1} reveal.`,
    'GameLoop',
  );

  host.emitSprintLeaderboard();

  const next = host.playlist[host.currentRoundIndex + 1];
  const payload: RoundRevealPayload = {
    round: host.currentRoundIndex + 1,
    song: toRevealSong(item),
    players: host.room.toPublicPlayers(true),
    nextVideo: next ? toPlaybackUrl(next.videoKey) : null,
    nextVideoStartTime: next?.videoStartTime ?? null,
    serverNow: Date.now(),
    endsAt: host.clock.endsAt,
    durationSeconds: revealSeconds,
  };
  host.channel.emit('round_reveal', payload);
}

/** Sprint: final top-3 correct times + personalized "you" row (reveal only). */
export function emitSprintLeaderboard(host: MatchEngineHost): void {
  if (host.room.settings.gameType !== 'sprint') return;

  const rankedCorrect = [...host.room.players.values()]
    .filter((p) => p.isCorrect === true && p.hasAnswered && p.answerTimeMs != null)
    .sort((a, b) => (a.answerTimeMs ?? 0) - (b.answerTimeMs ?? 0))
    .map((p) => ({ userId: p.userId, timeMs: p.answerTimeMs ?? 0 }));

  const top = rankedCorrect.slice(0, 3).map((entry) => {
    const p = host.room.players.get(entry.userId)!;
    return {
      userId: entry.userId,
      username: p.username,
      avatar: p.avatar,
      timeMs: entry.timeMs,
    };
  });

  const basePoints = scoreForAnswer('typing');
  const bonuses = host.deps.scoring.roundBonus(rankedCorrect);

  for (const viewer of host.room.players.values()) {
    if (viewer.isBot || !viewer.socketId) continue;

    const finalPoints =
      viewer.isCorrect === true
        ? basePoints + (bonuses.get(viewer.userId) ?? 0)
        : viewer.hasAnswered
          ? 0
          : null;

    const payload: SprintLeaderboardPayload = {
      top,
      you: {
        timeMs: viewer.isCorrect === true ? viewer.answerTimeMs : null,
        isCorrect: viewer.isCorrect,
        projectedPoints: finalPoints,
      },
    };
    host.room.io.to(viewer.socketId).emit('sprint:leaderboard', payload);
  }
}

export function buildRoundStartPayload(host: MatchEngineHost, item: PlaylistItem) {
  const videoMode = normalizeVideoMode(host.room.settings.videoMode);
  return {
    round: host.currentRoundIndex + 1,
    totalRounds: host.playlist.length,
    videoKey: toPlaybackUrl(item.videoKey),
    videoStartTime: item.videoStartTime,
    startBuffer: START_BUFFER_MS,
    serverNow: Date.now(),
    endsAt: host.clock.endsAt,
    durationSeconds: item.guessDuration,
    choices: item.choices,
    duo: item.duo,
    peekWindow: host.currentPeekWindow ?? undefined,
    videoMode,
  };
}
