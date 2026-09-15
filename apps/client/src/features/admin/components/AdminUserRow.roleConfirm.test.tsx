import { renderWithProviders as render } from '@/test/renderWithProviders';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminUser } from '@/lib/adminApi';
import { AdminUserRow, type AdminUserRowPending } from './AdminUserRow';

const setRole = vi.fn();

vi.mock('@/lib/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/adminApi')>();
  return {
    ...actual,
    adminApi: {
      ...actual.adminApi,
      setRole: (...args: unknown[]) => setRole(...args),
    },
  };
});

vi.mock('@/lib/dailyApi', () => ({
  invalidateDailyToday: vi.fn(),
}));

const USER: AdminUser = {
  id: 'user-1',
  username: 'artus',
  email: 'artus@aniquizz.test',
  avatar: 'default_avatar.png',
  role: 'USER',
  level: 1,
  xp: 0,
  gamesPlayed: 0,
  gamesWon: 0,
  bannedUntil: null,
  mutedUntil: null,
  lastSeenAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  isBot: false,
  presence: 'offline',
  currentRoom: null,
};

describe('AdminUserRow role confirm', () => {
  beforeEach(() => {
    setRole.mockReset();
    setRole.mockResolvedValue({ id: USER.id, role: 'MODERATOR' });
  });

  it('does not PATCH role until the pending confirm action runs', async () => {
    const user = userEvent.setup();
    const onSetPending = vi.fn();
    render(
      <table>
        <tbody>
          <AdminUserRow
            user={USER}
            canManage
            isSelf={false}
            onOpenDetail={() => {}}
            onSetPending={onSetPending}
          />
        </tbody>
      </table>,
    );

    await user.selectOptions(screen.getByRole('combobox', { name: 'Rôle de artus' }), 'MODERATOR');

    expect(setRole).not.toHaveBeenCalled();
    expect(onSetPending).toHaveBeenCalledTimes(1);
    const pending = onSetPending.mock.calls[0]?.[0] as AdminUserRowPending;
    expect(pending.title).toBe('Changer le rôle de artus ?');
    expect(pending.description).toBe('artus passera de USER à MODERATOR.');
    expect(pending.confirmLabel).toBe('Confirmer');

    await pending.action();
    expect(setRole).toHaveBeenCalledWith('user-1', 'MODERATOR');
  });
});
