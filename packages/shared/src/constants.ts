export const GAME_CONFIG = {
  // --- SYSTÈME DE POINTS ---
  SCORING: {
    TYPING: 5,   // Réponse écrite (Input)
    MIX: 5,      // Mode Mix
    QCM: 2,      // Mode Carré (4 choix)
    DUO: 1,      // Mode Duo (50/50)
    DEFAULT: 0
  },

  // --- TIMERS (en ms) ---
  TIMERS: {
    INTRO_DELAY: 3000,      // Attente avant son
    RESUME_COUNTDOWN: 3000, // Compte à rebours pause
    GAME_LOOP_TICK: 100,    // Fréquence serveur
    ROUND_DURATION: 30000,  // Durée standard
    GUESS_REVEAL: 10000      // Temps affichage réponse
  },

  // --- TOLÉRANCE ORTHOGRAPHE (Fuzzy) ---
  FUZZY: {
    THRESHOLD_RATIO: 0.60, // Précision requise (0.6 = 60%)
    MIN_LENGTH_TOLERANCE: 4 // Pas de faute sur mots < 4 lettres
  },

  // --- BATTLE ROYALE ---
  BATTLE_ROYALE: {
    MAX_LIVES: 3,
    HEAL_STREAK: 5,
    TOTAL_ROUNDS: 30,
    GOULAG_ROUND_INDEX: 15,
    
    // Phases de difficulté progressive
    PHASES: [
      { min: 1, max: 5, time: 20, diff: 'easy', label: "Échauffement" },
      { min: 6, max: 10, time: 15, diff: 'easy', label: "Accélération" },
      { min: 11, max: 14, time: 15, diff: 'medium', label: "Sélection" },
      { min: 15, max: 15, time: 20, diff: 'easy', label: "🚨 LE GOULAG" },
      { min: 16, max: 20, time: 10, diff: 'medium', label: "Sous Pression" },
      { min: 21, max: 25, time: 10, diff: 'hard', label: "La Zone" },
      { min: 26, max: 29, time: 5, diff: 'hard', label: "Panique" },
      { min: 30, max: 30, time: 5, diff: 'hard', label: "MORT SUBITE" }
    ]
  },

  // --- LIMITES ---
  LIMITS: {
    MAX_PLAYERS_PER_LOBBY: 50,
    CHAT_HISTORY: 50,
    MAX_USERNAME_LENGTH: 16,
    MAX_CHAT_LENGTH: 200
  },
  
  // --- GRADES (Ranks) ---
  RANKS: [
    { label: 'S+', percent: 1.00, color: 'gold' },
    { label: 'S', percent: 0.90, color: 'yellow' },
    { label: 'A', percent: 0.80, color: 'green' },
    { label: 'B', percent: 0.60, color: 'blue' },
    { label: 'C', percent: 0.40, color: 'orange' },
    { label: 'D', percent: 0.00, color: 'red' }
  ]
};