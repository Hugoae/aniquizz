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
});
