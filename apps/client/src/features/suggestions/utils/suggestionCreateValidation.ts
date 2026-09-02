import type { SuggestionCategory } from '@aniquizz/shared';
import { SUGGESTIONS_COPY } from '@/features/suggestions/copy/suggestionsCopy';

export interface SuggestionCreateDraft {
  category: SuggestionCategory;
  title: string;
  body: string;
  hasSelectedSong: boolean;
  proposedValue: string;
}

export const getSuggestionCreateValidationMessage = (
  draft: SuggestionCreateDraft,
): string | null => {
  if (draft.title.trim().length < 4) return SUGGESTIONS_COPY.titleTooShort;
  if (draft.body.trim().length < 10) return SUGGESTIONS_COPY.bodyTooShort;
  if (draft.category === 'CORRECTION' && !draft.hasSelectedSong) {
    return SUGGESTIONS_COPY.songRequired;
  }
  if (draft.category === 'CORRECTION' && !draft.proposedValue.trim()) {
    return SUGGESTIONS_COPY.proposedRequired;
  }
  return null;
};
