import type { Precision, ResponseType, SoundSelection } from '@aniquizz/shared';

export interface ScenarioConfig {
  botCount: number;
  soundCount: number;
  responseType: ResponseType;
  difficulty: string[];
  soundTypes: string[];
  guessDuration: number;
  precision: Precision;
  soundSelection: SoundSelection;
}

export const DEFAULT_CONFIG: ScenarioConfig = {
  botCount: 3,
  soundCount: 5,
  responseType: 'mix',
  difficulty: ['medium'],
  soundTypes: ['opening'],
  guessDuration: 15,
  precision: 'franchise',
  soundSelection: 'random',
};

export const SCENARIO_PRESETS: { key: string; label: string; botCount: number }[] = [
  { key: 'solo', label: 'Solo test (1 bot)', botCount: 1 },
  { key: 'duel', label: 'Duel (2 bots)', botCount: 2 },
  { key: 'full', label: 'Lobby plein (16 bots)', botCount: 16 },
];

export const BOT_PRESETS: {
  key: string;
  label: string;
  accuracy: number;
  delay: [number, number];
}[] = [
  { key: 'perfect', label: 'Parfaits', accuracy: 1, delay: [800, 2500] },
  { key: 'average', label: 'Moyens', accuracy: 0.7, delay: [2000, 8000] },
  { key: 'slow', label: 'Lents / imprécis', accuracy: 0.4, delay: [6000, 14000] },
];

export const DIFFICULTIES = [
  { id: 'easy', label: 'Facile' },
  { id: 'medium', label: 'Moyen' },
  { id: 'hard', label: 'Difficile' },
];

export const SOUND_TYPES = [
  { id: 'opening', label: 'Openings' },
  { id: 'ending', label: 'Endings' },
  { id: 'insert', label: 'Inserts' },
];

export const RESPONSE_TYPES: ResponseType[] = ['mix', 'qcm', 'typing'];
export const SELECTIONS: { id: SoundSelection; label: string }[] = [
  { id: 'random', label: 'Aléatoire' },
  { id: 'watched', label: 'Watched' },
];
