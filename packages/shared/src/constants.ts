// packages/shared/src/constants.ts
// Game configuration constants shared by the client and the server.
// Human-readable labels remain French (user-facing UI).

export const GAME_CONFIG = {
  // --- SCORING ---
  SCORING: {
    TYPING: 5,
    MIX: 5,
    QCM: 2,
    DUO: 1,
    DEFAULT: 0,
  },

  // --- VICTORY CONDITIONS ---
  VICTORY_CONDITIONS: {
    MULTI: {
      // Lobbies with at least this many players crown a top-3 podium.
      PODIUM_THRESHOLD: 5,
    },
  },

  // --- MEDALS (performance grade, replaces letter ranks) ---
  // Mastery ratio (earned score / best obtainable score) required per song
  // difficulty, per medal tier. Easier songs demand a higher ratio for the same
  // medal; harder songs are more lenient. Platinum keeps a small margin (not a
  // strict 100%). For a mixed-difficulty match the effective threshold is the
  // mean across the songs actually played (see effectiveMedalThresholds).
  MEDALS: {
    THRESHOLDS: {
      easy: { bronze: 0.55, silver: 0.65, gold: 0.8, platinum: 0.95 },
      medium: { bronze: 0.5, silver: 0.58, gold: 0.7, platinum: 0.9 },
      hard: { bronze: 0.45, silver: 0.5, gold: 0.62, platinum: 0.8 },
    },
    // Highest → lowest, used to resolve a medal from an accuracy.
    TIERS: ['platinum', 'gold', 'silver', 'bronze'] as const,
    // Display metadata (labels are user-facing FR).
    META: {
      bronze: { label: 'Bronze', textClass: 'text-medal-bronze', borderClass: 'border-medal-bronze' },
      silver: { label: 'Argent', textClass: 'text-silver', borderClass: 'border-silver' },
      gold: { label: 'Or', textClass: 'text-warning', borderClass: 'border-warning' },
      platinum: { label: 'Platine', textClass: 'text-accent', borderClass: 'border-accent' },
    },
  },

  // --- TIMERS (ms) ---
  TIMERS: {
    // Pre-first-round countdown. The playlist is built during this window so the
    // lobby never blocks; kept generous so the DB/AniList work stays hidden.
    INTRO_DELAY: 5000,
    /** Beat between the intro loader and round 1: UI visible, timer frozen, no audio. */
    ROUND1_READY_DELAY: 500,
    RESUME_COUNTDOWN: 3000,
    GAME_LOOP_TICK: 100,
    ROUND_DURATION: 30000,
    GUESS_REVEAL: 10000,
    /** Load head-start added before the guess clock (absorbs video buffering). */
    GUESS_START_BUFFER: 250,
    /** Extra time after the chosen guess duration so the countdown visibly
     *  reaches and lingers on 0 before the round cuts (softer, less abrupt).
     *  Combined with GUESS_START_BUFFER this keeps the "0" on screen ~0.5s. */
    GUESS_END_GRACE: 250,
  },

  // --- SPELLING TOLERANCE (fuzzy) ---
  FUZZY: {
    /** Min similarity (1 − dist/maxLen) to accept a typo in `isAnswerCorrect`. */
    ANSWER_SIMILARITY: 0.8,
    /** Min normalized answer length before typo tolerance applies. */
    MIN_LENGTH_FOR_FUZZY: 4,
    /** Max suggestions returned by `getFuzzySuggestions`. */
    SUGGESTION_LIMIT: 5,
    /** Min query length before any suggestion is shown. */
    SUGGESTION_MIN_QUERY_LENGTH: 2,
    /** Min query length before Levenshtein fallback is used in suggestions. */
    SUGGESTION_MIN_QUERY_FOR_FUZZY: 3,
    /** Max edit-distance ratio (of target length) for suggestion fuzzy. */
    SUGGESTION_DISTANCE_RATIO: 0.3,
    /** Client-side catalogue size above which search runs in a Web Worker. */
    SUGGESTION_WORKER_THRESHOLD: 2000,
  },

  // --- XP / LEVELING ---
  LEVELING: {
    /** Base XP for a single correct answer, before the difficulty weight. */
    XP_PER_CORRECT: 12,
    /** Difficulty multiplier applied to each correct answer's base XP. */
    DIFFICULTY_WEIGHT: { easy: 0.75, medium: 1.0, hard: 1.25 } as const,
    /** Participation XP granted per round the player took part in (anti-farm). */
    XP_PER_ROUND: 3,
    /** Placement bonuses (multiplayer), only when the player scored > 0. */
    PLACEMENT: { FIRST: 40, SECOND: 25, THIRD: 12, TOP_HALF: 6 },
    /** Solo bonus when the victory objective is reached. */
    SOLO_WIN_BONUS: 25,
    /** Solo matches award slightly less XP than multiplayer. */
    SOLO_MULTIPLIER: 0.8,
    /** Consecutive won matches from which the win-streak bonus kicks in. */
    WIN_STREAK_MIN: 3,
    /** Flat XP multiplier bonus while on a qualifying win streak (+5%). */
    WIN_STREAK_BONUS: 0.05,
    /** Minimum XP awarded to a player who played at least one round. */
    MIN_XP: 5,
    /** Level curve base: XP to go from level L to L+1 is CURVE_BASE * L. */
    CURVE_BASE: 100,
    /** Hard level cap. XP keeps accumulating but the level stops here. */
    MAX_LEVEL: 100,
  },

  // --- LIMITS ---
  LIMITS: {
    MAX_PLAYERS_PER_LOBBY: 50,
    CHAT_HISTORY: 50,
    MAX_USERNAME_LENGTH: 16,
    MAX_CHAT_LENGTH: 200,
  },

  // --- SCORE GRADES ---
  RANKS: [
    { label: 'S+', percent: 1.0, color: 'gold' },
    { label: 'S', percent: 0.9, color: 'yellow' },
    { label: 'A', percent: 0.8, color: 'green' },
    { label: 'B', percent: 0.6, color: 'blue' },
    { label: 'C', percent: 0.4, color: 'orange' },
    { label: 'D', percent: 0.0, color: 'red' },
  ],
};
