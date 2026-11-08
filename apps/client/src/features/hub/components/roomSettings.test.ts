import { describe, expect, it } from 'vitest';
import { buildLobbySettingChips } from '@/features/hub/components/roomSettings';

describe('buildLobbySettingChips', () => {
  it('includes video display chip', () => {
    const chips = buildLobbySettingChips({
      soundCount: 20,
      guessDuration: 15,
      difficulty: ['medium'],
      precision: 'franchise',
      responseType: 'typing',
      soundSelection: 'random',
      videoMode: 'blurred',
    });

    expect(chips.find((c) => c.key === 'video')).toMatchObject({
      label: 'Vidéo',
      value: 'Vidéo floutée',
    });
  });

  it('shows the selected playlist names on the source chip', () => {
    const chips = buildLobbySettingChips({
      soundCount: 20,
      guessDuration: 15,
      difficulty: ['easy'],
      precision: 'franchise',
      responseType: 'typing',
      soundSelection: 'playlist',
      videoMode: 'hidden',
      playlistName: 'Shonen ∩ Années 2010',
    });

    expect(chips.find((c) => c.key === 'source')).toMatchObject({
      label: 'Source',
      value: 'Shonen ∩ Années 2010',
    });
  });

  it('marks an unsaved test match', () => {
    const chips = buildLobbySettingChips({
      soundCount: 20,
      guessDuration: 15,
      difficulty: ['medium'],
      precision: 'franchise',
      responseType: 'typing',
      soundSelection: 'random',
      testMatch: true,
    });

    expect(chips[0]).toMatchObject({ key: 'test', label: 'Test', value: 'Non enregistrée' });
  });

  it('shows Chrono minutes for time-attack', () => {
    const chips = buildLobbySettingChips({
      soundCount: 60,
      guessDuration: 15,
      gameType: 'timeAttack',
      timeBudgetSeconds: 180,
      difficulty: ['medium'],
      precision: 'franchise',
      responseType: 'typing',
      soundSelection: 'random',
      videoMode: 'hidden',
    });

    expect(chips.find((c) => c.key === 'time')).toMatchObject({
      label: 'Chrono',
      value: '3 min',
    });
  });
});
