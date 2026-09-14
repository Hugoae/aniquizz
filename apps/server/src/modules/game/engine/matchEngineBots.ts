import type { AnswerType, ResponseType } from '@aniquizz/shared';
import type { PlaylistItem, RoomPlayer } from './types';

/** A plausible-but-wrong answer for a bot (a decoy choice, else a placeholder). */
export function pickWrongAnswer(item: PlaylistItem): string {
  const valid = new Set(item.validAnswers.map((a) => a.toLowerCase()));
  const decoy = item.choices.find((c) => !valid.has(c.toLowerCase()));
  return decoy ?? '—';
}

/** Schedule each bot's single answer for the current guessing round. */
export function scheduleBotAnswers(opts: {
  players: Iterable<RoomPlayer>;
  item: PlaylistItem;
  responseType: ResponseType | undefined;
  handleAnswer: (userId: string, answer: string, answerType: AnswerType) => void;
}): ReturnType<typeof setTimeout>[] {
  const { players, item, responseType, handleAnswer } = opts;
  const botAnswerType: AnswerType = responseType === 'typing' ? 'typing' : 'qcm';
  const maxDelay = Math.max(200, item.guessDuration * 1000 - 400);
  const timers: ReturnType<typeof setTimeout>[] = [];

  for (const p of players) {
    if (!p.isBot || !p.botConfig) continue;
    const cfg = p.botConfig;
    const lo = Math.min(cfg.minDelayMs, maxDelay);
    const hi = Math.min(Math.max(cfg.maxDelayMs, cfg.minDelayMs), maxDelay);
    const delay = lo + Math.random() * Math.max(0, hi - lo);

    const willBeCorrect = Math.random() < cfg.accuracy;
    const answer = willBeCorrect ? (item.validAnswers[0] ?? item.anime) : pickWrongAnswer(item);

    const botId = p.userId;
    timers.push(
      setTimeout(() => {
        handleAnswer(botId, answer, botAnswerType);
      }, delay),
    );
  }

  return timers;
}
