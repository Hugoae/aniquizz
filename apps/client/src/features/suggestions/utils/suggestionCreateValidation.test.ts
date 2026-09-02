import { describe, expect, it } from 'vitest';
import { getSuggestionCreateValidationMessage } from './suggestionCreateValidation';

describe('getSuggestionCreateValidationMessage', () => {
  it('requires a longer title and body before publish', () => {
    expect(
      getSuggestionCreateValidationMessage({
        category: 'IMPROVEMENT',
        title: 'Hey',
        body: 'Too short',
        hasSelectedSong: false,
        proposedValue: '',
      }),
    ).toMatch(/titre/i);

    expect(
      getSuggestionCreateValidationMessage({
        category: 'IMPROVEMENT',
        title: 'Un titre clair',
        body: 'Too short',
        hasSelectedSong: false,
        proposedValue: '',
      }),
    ).toMatch(/détails/i);
  });

  it('requires a selected song and proposed value for corrections', () => {
    expect(
      getSuggestionCreateValidationMessage({
        category: 'CORRECTION',
        title: 'Corriger ce titre',
        body: 'Le nom affiché dans le catalogue est incorrect.',
        hasSelectedSong: false,
        proposedValue: '',
      }),
    ).toMatch(/son/i);

    expect(
      getSuggestionCreateValidationMessage({
        category: 'CORRECTION',
        title: 'Corriger ce titre',
        body: 'Le nom affiché dans le catalogue est incorrect.',
        hasSelectedSong: true,
        proposedValue: '',
      }),
    ).toMatch(/valeur/i);
  });

  it('accepts a complete improvement draft', () => {
    expect(
      getSuggestionCreateValidationMessage({
        category: 'IMPROVEMENT',
        title: 'Ajouter un filtre',
        body: 'Un filtre par année rendrait la librairie plus facile à parcourir.',
        hasSelectedSong: false,
        proposedValue: '',
      }),
    ).toBeNull();
  });
});
