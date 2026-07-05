// packages/shared/src/constants.ts
// Game configuration constants shared by the client and the server.
// NOTE: Challenger / Time Trial / Battle Royale config is kept until Phase 4
// (dead-mode removal). Human-readable labels remain French (user-facing UI).

export const GAME_CONFIG = {
  // --- SCORING ---
  SCORING: {
    TYPING: 5, // typed answer (input)
    MIX: 5, // mix mode
    QCM: 2, // multiple choice (4 options)
    DUO: 1, // duo mode (50/50)
    DEFAULT: 0,

    // Challenger mode
    CHALLENGER: {
      BASE: 5, // base points on a correct guess
      BONUS_GOLD: 3, // 1st place bonus
      BONUS_SILVER: 2, // 2nd place bonus
      BONUS_BRONZE: 1, // 3rd place bonus
    },
  },

  // --- VICTORY CONDITIONS ---
  VICTORY_CONDITIONS: {
    SOLO: {
      EASY: 0.6,
      MEDIUM: 0.55,
      HARD: 0.5,
      EXACT: 0.5,
    },
    MULTI: {
      PODIUM_THRESHOLD: 5,
    },
    // Time Trial: score goal (number of anime to guess).
    // Shape: { 'INITIAL_TIME': { DIFFICULTY: GOAL } }
    TIME_TRIAL: {
      '15': { EASY: 8, MEDIUM: 5, HARD: 3 }, // very short, intense
      '30': { EASY: 15, MEDIUM: 10, HARD: 5 }, // standard
      '45': { EASY: 23, MEDIUM: 15, HARD: 8 }, // long haul
      '60': { EASY: 30, MEDIUM: 20, HARD: 10 }, // marathon
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

  // --- DECADES ---
  DECADES: ['1970', '1980', '1990', '2000', '2010', '2020'],

  // --- CHALLENGER MODE ---
  CHALLENGER: {
    MAX_LIVES: 3,
  },

  // --- TIME TRIAL MODE ---
  TIME_TRIAL: {
    BONUS_TIME: 5, // +5s on a correct answer
    PENALTY_SKIP: 5, // -5s on skip
    MAX_TIME: 120, // cap

    // Transition timings (3-step sequence)
    FEEDBACK_DURATION: 1500,
    REVEAL_DURATION: 3000,
    RESUME_DELAY: 3000,

    START_OPTIONS: [15, 30, 45, 60], // options available in the lobby
  },

  // --- BATTLE ROYALE ---
  BATTLE_ROYALE: {
    MAX_LIVES: 3,
    HEAL_STREAK: 5,
    TOTAL_ROUNDS: 30,
    GOULAG_ROUND_INDEX: 15,
    PHASES: [
      { min: 1, max: 5, time: 20, diff: 'easy', label: 'Phase 1' },
      { min: 6, max: 10, time: 15, diff: 'easy', label: 'Phase 2' },
      { min: 11, max: 14, time: 15, diff: 'medium', label: 'Phase 3' },
      { min: 15, max: 15, time: 20, diff: 'easy', label: 'Phase 4 : Goulag' },
      { min: 16, max: 20, time: 10, diff: 'medium', label: 'Phase 5' },
      { min: 21, max: 25, time: 10, diff: 'hard', label: 'Phase 6' },
      { min: 26, max: 29, time: 5, diff: 'hard', label: 'Phase 7' },
      { min: 30, max: 30, time: 5, diff: 'hard', label: 'Phase 8 : Mort Subite' },
    ],
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
