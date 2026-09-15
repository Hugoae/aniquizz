import { GAME_CONFIG } from '@aniquizz/shared';

export const START_BUFFER_MS = GAME_CONFIG.TIMERS.GUESS_START_BUFFER;
// Extra grace after the chosen guess duration so the countdown visibly reaches
// (and lingers on) 0 instead of cutting the instant time runs out. Answers are
// still accepted during this window; it only softens the round's end.
export const GUESS_END_GRACE_MS = GAME_CONFIG.TIMERS.GUESS_END_GRACE;
