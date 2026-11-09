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
    expect(chips.find((c) => c.key === 'streak-prime')).toBeUndefined();
  });

  it('shows the streak prime next to the chrono when it is on', () => {
    const chips = buildLobbySettingChips({
      soundCount: 80,
      guessDuration: 15,
      gameType: 'timeAttack',
      timeBudgetSeconds: 120,
      timeAttackStreakBonus: true,
      timeAttackStreakLength: 5,
      timeAttackStreakBonusSeconds: 5,
      difficulty: ['medium'],
      precision: 'franchise',
      responseType: 'typing',
      soundSelection: 'random',
      videoMode: 'hidden',
    });

    const time = chips.findIndex((c) => c.key === 'time');
    expect(chips[time + 1]).toMatchObject({
      key: 'streak-prime',
      label: 'Prime',
      value: 'tous les 5, +5 s',
    });
  });
});
