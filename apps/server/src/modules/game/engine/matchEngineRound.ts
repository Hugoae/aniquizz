import {
  generatePeekWindow,
  isSpeedBonusEnabled,
  normalizeVideoMode,
  revealDurationSeconds,
  scoreForAnswer,
  type RoundRevealPayload,
  type SpeedLeaderboardPayload,
} from '@aniquizz/shared';
import { toPlaybackUrl } from '../../../lib/mediaPlaybackUrl';
import { logger } from '../../../utils/logger';
import { scheduleBotAnswers } from './matchEngineBots';
import { toRevealSong } from './matchEngineReveal';
import type { EndRoundKind, MatchEngineHost } from './matchEngineHost';
import type { PlaylistItem, RecordedRound } from './types';
import { START_BUFFER_MS, GUESS_END_GRACE_MS } from './matchEngineTimers';
import {
  isTimeAttackHost,
  keepTimeAttackFrozenIfPaused,
  emitTimeAttackBudget,
  pauseTimeAttackBudget,
  startTimeAttackBudget,
  timeAttackRevealEnabled,
  timeAttackFields,
  timeAttackRemainingMs,
  timeAttackRevealSeconds,
} from './matchEngineBudget';
import { grantSharedTimeAttackStreak } from './timeAttackStreakGrant';
import { noteActivityRound } from './matchActivityLedger';

export function startRound(host: MatchEngineHost): void {
  host.readyStartsAt = null;
  host.clock.clear();
  host.clearBotTimers();
  host.room.touch();
  host.isRoundLoading = true;

  if (isTimeAttackHost(host) && host.budget.isArmed && timeAttackRemainingMs(host) <= 0) {
    host.isRoundLoading = false;
    void host.finish();
    return;
  }

  host.currentRoundIndex++;

  if (host.currentRoundIndex >= host.playlist.length) {
    void host.finish();
    return;
  }

  const item = host.playlist[host.currentRoundIndex];
  noteActivityRound(host, host.currentRoundIndex + 1, item.id);
  host.phase = 'guessing';
  host.isRoundEnded = false;
  host.skipVotes.clear();
  const keepPaused = host.room.status === 'paused';
  if (!keepPaused) {
    host.pauseVotes.clear();
    host.isPausePending = false;
  }

  for (const p of host.room.players.values()) host.resetRoundState(p);

  const required = host.requiredVotes();
  host.channel.emit('vote_update', { type: 'skip', count: 0, required });
  if (!keepPaused) {
    host.channel.emit('vote_update', { type: 'pause', count: 0, required, isPending: false });
  }

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

  if (isTimeAttackHost(host)) startTimeAttackBudget(host);
  keepTimeAttackFrozenIfPaused(host);

  logger.info(
    `[MatchEngine ${host.room.id}] Round ${host.currentRoundIndex + 1}/${host.playlist.length} — ${item.anime}`,
    'GameLoop',
  );

  host.channel.emit('round_start', host.buildRoundStartPayload(item));
}

export function endRound(host: MatchEngineHost, kind: EndRoundKind = 'reveal'): void {
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

  // After the streak moves. A miss stores 0, so the prime does not pay.
  const streakBonusMs = isTimeAttackHost(host) ? grantSharedTimeAttackStreak(host) : 0;

  // The budget is gone (it ran out, or this skip spent the last seconds).
  // Still show this title so it lands in the history, then end the match.
  const closing =
    isTimeAttackHost(host) &&
    (kind === 'finish' || (kind === 'skip' && timeAttackRemainingMs(host) <= 0));

  const skipReveal = isTimeAttackHost(host) && !timeAttackRevealEnabled(host);
  if (skipReveal) {
    if (kind !== 'skip') {
      // No round_reveal here: tell the client how the title ended (cue + history).
      const found = [...host.room.players.values()].some((p) => p.isCorrect === true);
      emitTimeAttackBudget(host, {
        roundResult: { outcome: found ? 'found' : 'missed', song: toRevealSong(item) },
        ...(streakBonusMs > 0 ? { bonusMs: streakBonusMs } : {}),
      });
    }
    // No round_reveal, so the roster (streak) must be pushed here.
    host.room.emitLobbyUpdate();
    if (closing) void host.finish();
    else host.startRound();
    return;
  }

  if (kind === 'finish' && !isTimeAttackHost(host)) {
    void host.finish();
    return;
  }

  const timeAttack = isTimeAttackHost(host);
  if (timeAttack) pauseTimeAttackBudget(host);

  const revealSeconds = timeAttack
    ? timeAttackRevealSeconds()
    : revealDurationSeconds(item.guessDuration);
  const revealMs = revealSeconds * 1000;
  host.clock.start(revealMs, () => {
    if (host.isPausePending || host.room.status === 'paused') {
      if (host.room.status !== 'paused') host.pause();
    } else {
      host.startRound();
    }
  });
  keepTimeAttackFrozenIfPaused(host);

  logger.info(
    `[MatchEngine ${host.room.id}] Round ${host.currentRoundIndex + 1} reveal.`,
    'GameLoop',
  );

  host.emitSpeedLeaderboard();

  const next = host.playlist[host.currentRoundIndex + 1];
  // The next clip URL is playable during the reveal on purpose: the Worker
  // cannot tell a preload GET from playback, and an nbf would break cold-start
  // preload. The head start is only as long as this reveal.
  const payload: RoundRevealPayload = {
    round: host.currentRoundIndex + 1,
    ...(kind === 'skip' ? { skipped: true } : {}),
    song: toRevealSong(item),
    players: host.room.toPublicPlayers(true),
    nextVideo: next ? toPlaybackUrl(next.videoKey) : null,
    nextVideoStartTime: next?.videoStartTime ?? null,
    serverNow: Date.now(),
    endsAt: host.clock.endsAt,
    durationSeconds: revealSeconds,
    ...timeAttackFields(host),
    ...(streakBonusMs > 0 ? { bonusMs: streakBonusMs } : {}),
  };
  host.channel.emit('round_reveal', payload);
}

/** Speed bonus: final top-3 correct times + personalized "you" row (reveal only). */
export function emitSpeedLeaderboard(host: MatchEngineHost): void {
  if (!isSpeedBonusEnabled(host.room.settings)) return;

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

    const payload: SpeedLeaderboardPayload = {
      top,
      you: {
        timeMs: viewer.isCorrect === true ? viewer.answerTimeMs : null,
        isCorrect: viewer.isCorrect,
        projectedPoints: finalPoints,
      },
    };
    host.room.io.to(viewer.socketId).emit('speed:leaderboard', payload);
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
    peekWindow: host.currentPeekWindow ?? undefined,
    videoMode,
    ...timeAttackFields(host),
  };
}
