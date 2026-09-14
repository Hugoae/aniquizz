import { renderWithProviders as render } from '@/test/renderWithProviders';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LobbyPlayerCard, type LobbyPlayer } from './LobbyPlayerCard';
import { HOVER_REVEAL } from '@/features/hub/components/config/ConfigPrimitives';

vi.mock('@/features/friends/AddFriendButton', () => ({
  AddFriendButton: () => null,
}));

const guest: LobbyPlayer = {
  id: 'user-2',
  name: 'Invité',
  avatar: 'player1',
  isReady: true,
  isHost: false,
};

describe('LobbyPlayerCard', () => {
  it('keeps host kick and transfer controls painted without hover', () => {
    render(
      <LobbyPlayerCard
        player={guest}
        isMe={false}
        isSolo={false}
        canManage
        onTransferHost={() => {}}
        onKick={() => {}}
      />,
    );

    const kick = screen.getByRole('button', { name: /exclure invité/i });
    const promote = screen.getByRole('button', { name: /nommer invité hôte/i });
    expect(kick.className).toMatch(/h-9/);
    expect(promote.className).toMatch(/h-9/);
    expect(kick.parentElement?.className).toContain(HOVER_REVEAL.split(' ')[0] ?? 'opacity-100');
    expect(kick.parentElement?.className).toContain('opacity-100');
    expect(kick.parentElement?.className).not.toMatch(/(?:^|\s)opacity-0(?:\s|$)/);
  });
});
