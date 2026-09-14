import { describe, expect, it } from 'vitest';
import { toClientRoomSettings, type RoomSettings } from './game';

const settings = (overrides: Partial<RoomSettings> = {}): RoomSettings => ({
  name: 'Salon',
  roomName: 'Salon',
  mode: 'multiplayer',
  gameType: 'standard',
  responseType: 'mix',
  soundCount: 10,
  soundTypes: ['opening'],
  difficulty: ['medium'],
  guessDuration: 15,
  soundSelection: 'random',
  precision: 'franchise',
  isPrivate: true,
  password: 'secret-room',
  maxPlayers: 8,
  ...overrides,
});

describe('toClientRoomSettings', () => {
  it('strips the join password for guests', () => {
    const client = toClientRoomSettings(settings());
    expect(client.password).toBe('');
    expect(client.isPrivate).toBe(true);
    expect(client.name).toBe('Salon');
  });

  it('keeps the password for the host', () => {
    expect(toClientRoomSettings(settings(), { includePassword: true }).password).toBe(
      'secret-room',
    );
  });

  it('does not allocate when there is nothing to strip', () => {
    const open = settings({ isPrivate: false, password: '' });
    expect(toClientRoomSettings(open)).toBe(open);
  });
});
