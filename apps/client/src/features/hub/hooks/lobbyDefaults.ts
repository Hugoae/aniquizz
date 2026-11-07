import { GameConfig, RoomConfig } from '@aniquizz/shared';

export const defaultConfig: GameConfig = {
  mode: 'solo',
  gameType: 'standard',
  responseType: 'mix',
  soundCount: 20,
  soundTypes: ['opening'],
  difficulty: ['medium'],
  guessDuration: 15,
  soundSelection: 'random',
  precision: 'franchise',
  watchedMode: 'union',
  videoMode: 'hidden',
  songStartMode: 'random',
  speedBonusEnabled: false,
};

export const defaultRoomConfig: RoomConfig = {
  ...defaultConfig,
  mode: 'multiplayer',
  roomName: '',
  isPrivate: false,
  password: '',
  maxPlayers: 16,
};
