import { describe, expect, it } from 'vitest';
import type { RoomConfig } from '@aniquizz/shared';
import { getDifficultyBadge } from '@/features/hub/components/roomSettings';
import { buildSoloLobbyRecapGroups, soloLobbyModeBadge } from './soloLobbyRecapGroups';

const baseConfig: RoomConfig = {
  mode: 'solo',
  gameType: 'standard',
  responseType: 'mix',
  soundCount: 20,
  soundTypes: ['opening'],
  difficulty: ['medium'],
  guessDuration: 15,
  soundSelection: 'random',
  precision: 'franchise',
  isPrivate: false,
  password: '',
  maxPlayers: 1,
  roomName: 'Test',
  name: 'Test',
  hostName: 'Host',
  hostAvatar: 'player1',
};

describe('getDifficultyBadge', () => {
  it('uses split gradient for two tiers', () => {
    expect(getDifficultyBadge(['easy', 'medium']).className).toContain('from-success/80 to-warning/80');
    expect(getDifficultyBadge(['medium', 'hard']).className).toContain('from-warning/80 to-destructive/80');
  });

  it('uses triple gradient when all tiers are selected', () => {
    expect(getDifficultyBadge(['easy', 'medium', 'hard']).className).toContain('via-warning/80');
  });
});

describe('buildSoloLobbyRecapGroups', () => {
  it('builds four grouped lines aligned with config sections', () => {
    const groups = buildSoloLobbyRecapGroups(baseConfig);

    expect(groups).toHaveLength(4);
    expect(groups[0]).toMatchObject({ id: 'partie', label: 'Partie' });
    expect(groups[0]?.chips.map((c) => c.value)).toEqual(['20 sons', '15s']);
    expect(groups[1]?.chips.map((c) => c.value)).toEqual(expect.arrayContaining(['Mix', 'Franchise']));
    expect(groups[2]?.chips.map((c) => c.value)).toEqual(expect.arrayContaining(['Openings', 'Moyen', 'Aléatoire']));
    expect(groups[3]).toMatchObject({ id: 'video', label: 'Vidéo' });
    expect(groups[3]?.chips[0]?.value).toBe('Audio seul');
  });

  it('shows blurred video mode label', () => {
    const groups = buildSoloLobbyRecapGroups({ ...baseConfig, videoMode: 'blurred' });
    expect(groups[3]?.chips[0]?.value).toBe('Vidéo floutée');
  });

  it('forces Typing in reponse group for Sprint', () => {
    const groups = buildSoloLobbyRecapGroups({ ...baseConfig, gameType: 'sprint', responseType: 'typing' });
    expect(groups[1]?.chips.find((c) => c.key === 'response-type')?.value).toBe('Typing');
  });
});

describe('soloLobbyModeBadge', () => {
  it('uses GAME_TYPE_LABELS with Solo suffix', () => {
    expect(soloLobbyModeBadge({ gameType: 'standard' })).toBe('Standard · Solo');
    expect(soloLobbyModeBadge({ gameType: 'sprint' })).toBe('Sprint · Solo');
  });
});
