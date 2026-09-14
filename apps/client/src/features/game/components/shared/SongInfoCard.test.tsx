import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SongInfoCard } from './SongInfoCard';
import { LIKES_COPY } from '@/features/likes/copy/likesCopy';

vi.mock('@/features/likes/context/SongLikesContext', () => ({
  useSongLikes: () => ({
    ready: true,
    likedIds: new Set<number>(),
    likedCount: 0,
    isLiked: () => false,
    toggleLike: vi.fn(),
    requestLikedIds: vi.fn(),
  }),
}));

const revealed = {
  animeName: 'Bleach',
  songTitle: 'Velonica',
  artist: 'Aqua Timez',
  type: 'ED5',
  difficulty: 'medium',
  isRevealed: true,
  songId: 4242,
  showLikeButton: true,
};

describe('SongInfoCard likes', () => {
  it('keeps the like control on the compact band even without a cover', () => {
    render(<SongInfoCard {...revealed} variant="band" />);
    expect(screen.getByRole('button', { name: LIKES_COPY.likeAria })).toBeInTheDocument();
  });

  it('still overlays the like control when a cover is present', () => {
    render(
      <SongInfoCard {...revealed} variant="band" coverImage="https://example.com/cover.jpg" />,
    );
    expect(screen.getByRole('button', { name: LIKES_COPY.likeAria })).toBeInTheDocument();
  });
});
