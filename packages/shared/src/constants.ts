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
      bronze: { label: 'Bronze', color: '#CD7F32' },
      silver: { label: 'Argent', color: '#C0C0C0' },
      gold: { label: 'Or', color: '#FFD700' },
      platinum: { label: 'Platine', color: '#67E8F9' },
    },
  },

  // --- TIMERS (ms) ---
  TIMERS: {
    INTRO_DELAY: 3000,
    RESUME_COUNTDOWN: 3000,
    GAME_LOOP_TICK: 100,
    ROUND_DURATION: 30000,
    GUESS_REVEAL: 10000,
  },

  // --- SPELLING TOLERANCE (fuzzy) ---
  FUZZY: {
    THRESHOLD_RATIO: 0.6,
    MIN_LENGTH_TOLERANCE: 4,
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

  // --- DECADES ---
  DECADES: ['1970', '1980', '1990', '2000', '2010', '2020'],

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

  // --- COLLECTION RANKS (labels are user-facing FR) ---
  COLLECTION_RANKS: [
    { threshold: 100, label: 'Encyclopédie', color: 'text-yellow-400' },
    { threshold: 80, label: 'Maître Otaku', color: 'text-purple-400' },
    { threshold: 50, label: 'Passionné', color: 'text-pink-400' },
    { threshold: 20, label: 'Amateur', color: 'text-blue-400' },
    { threshold: 0, label: 'Novice', color: 'text-gray-400' },
  ],

  // --- PLAYLISTS (names/count are user-facing FR) ---
  PLAYLISTS: [
    {
      id: 'top-50',
      name: 'Top 50 Popular',
      count: 'Les incontournables',
      color: '#EAB308',
      icon: '🏆',
      dbValues: [],
    },
    {
      id: 'decades',
      name: 'Décennies',
      count: '80s, 90s, 2000s...',
      color: '#A855F7',
      icon: '📅',
      dbValues: [],
    },
    {
      id: 'action',
      name: 'Action & Aventure',
      count: 'Combats & Épopées',
      color: '#F97316',
      icon: '⚔️',
      dbValues: ['Action', 'Adventure'],
    },
    {
      id: 'fantasy',
      name: 'Fantasy & Magic',
      count: 'Magie & Mondes',
      color: '#9C27B0',
      icon: '🔮',
      dbValues: ['Fantasy', 'Magic', 'Mahou Shoujo', 'Supernatural', 'Isekai'],
    },
    {
      id: 'romance',
      name: 'Romance & Drama',
      count: 'Amour & Émotion',
      color: '#E91E63',
      icon: '💌',
      dbValues: ['Romance', 'Drama', 'Shoujo'],
    },
    {
      id: 'scifi',
      name: 'Sci-Fi & Mecha',
      count: 'Futur & Robots',
      color: '#06B6D4',
      icon: '🤖',
      dbValues: ['Sci-Fi', 'Mecha', 'Space', 'Cyberpunk'],
    },
    {
      id: 'dark',
      name: 'Dark & Psy',
      count: 'Horreur & Thriller',
      color: '#64748B',
      icon: '👻',
      dbValues: ['Horror', 'Psychological', 'Thriller', 'Mystery', 'Dark Fantasy'],
    },
    {
      id: 'chill',
      name: 'Chill / SoL',
      count: 'Détente & Quotidien',
      color: '#84CC16',
      icon: '🍃',
      dbValues: ['Slice of Life', 'Iyashikei', 'Josei'],
    },
    {
      id: 'comedy',
      name: 'Comédie',
      count: 'Rire & Fun',
      color: '#FACC15',
      icon: '😂',
      dbValues: ['Comedy', 'Parody', 'Gag Humor'],
    },
  ],
};
