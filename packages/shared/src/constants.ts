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
    SOLO: {
      EASY: 0.6,
      MEDIUM: 0.55,
      HARD: 0.5,
      EXACT: 0.5,
    },
    MULTI: {
      PODIUM_THRESHOLD: 5,
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
