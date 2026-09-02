import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { SuggestionSongOption } from '@aniquizz/shared';
import { SuggestionSongCombobox } from './SuggestionSongCombobox';

const songs: SuggestionSongOption[] = [
  {
    id: 1,
    title: 'Blue Bird',
    artist: 'Ikimono-gakari',
    songType: 'OP',
    sequence: 3,
    difficulty: 'EASY',
    animeName: 'Naruto Shippuden',
    coverImage: null,
  },
  {
    id: 2,
    title: 'Silhouette',
    artist: 'KANA-BOON',
    songType: 'OP',
    sequence: 16,
    difficulty: 'MEDIUM',
    animeName: 'Naruto Shippuden',
    coverImage: null,
  },
];

function ComboboxHarness({ onSelect }: { onSelect: (song: SuggestionSongOption) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  return (
    <SuggestionSongCombobox
      query="naruto"
      onQueryChange={() => undefined}
      songs={songs}
      selectedSong={null}
      onSelect={onSelect}
      onClear={() => undefined}
      loading={false}
      loadingMore={false}
      hasMore={false}
      onLoadMore={() => undefined}
      error={null}
      activeIndex={activeIndex}
      onActiveIndexChange={setActiveIndex}
      panelOpen={panelOpen}
      onPanelOpenChange={setPanelOpen}
    />
  );
}

describe('SuggestionSongCombobox', () => {
  it('exposes combobox and listbox roles', () => {
    render(<ComboboxHarness onSelect={() => undefined} />);
    expect(screen.getByRole('combobox', { name: /rechercher un son/i })).toBeInTheDocument();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('selects the highlighted option with the keyboard', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ComboboxHarness onSelect={onSelect} />);
    screen.getByRole('combobox').focus();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith(songs[1]);
  });
});
