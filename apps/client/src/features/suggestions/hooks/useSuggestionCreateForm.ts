import { useState } from 'react';
import type {
  SuggestionCategory,
  SuggestionCorrectionField,
  SuggestionCreateInput,
  SuggestionItem,
  SuggestionSongOption,
} from '@aniquizz/shared';
import { toast } from 'sonner';
import { SUGGESTIONS_COPY } from '@/features/suggestions/copy/suggestionsCopy';
import { getSuggestionCreateValidationMessage } from '@/features/suggestions/utils/suggestionCreateValidation';
import { suggestionsApi, SuggestionsApiError } from '@/lib/suggestionsApi';

const initialState = {
  category: 'IMPROVEMENT' as SuggestionCategory,
  title: '',
  body: '',
  correctionField: 'DIFFICULTY' as SuggestionCorrectionField,
  proposedValue: '',
  selectedSong: null as SuggestionSongOption | null,
};

interface UseSuggestionCreateFormOptions {
  onCreated: (suggestion: SuggestionItem) => void;
  onClose: () => void;
}

export function useSuggestionCreateForm({ onCreated, onClose }: UseSuggestionCreateFormOptions) {
  const [category, setCategory] = useState<SuggestionCategory>(initialState.category);
  const [title, setTitle] = useState(initialState.title);
  const [body, setBody] = useState(initialState.body);
  const [correctionField, setCorrectionField] = useState<SuggestionCorrectionField>(
    initialState.correctionField,
  );
  const [proposedValue, setProposedValue] = useState(initialState.proposedValue);
  const [selectedSong, setSelectedSong] = useState<SuggestionSongOption | null>(
    initialState.selectedSong,
  );
  const [saving, setSaving] = useState(false);

  const validationMessage = getSuggestionCreateValidationMessage({
    category,
    title,
    body,
    hasSelectedSong: Boolean(selectedSong),
    proposedValue,
  });

  const reset = () => {
    setCategory(initialState.category);
    setTitle(initialState.title);
    setBody(initialState.body);
    setCorrectionField(initialState.correctionField);
    setProposedValue(initialState.proposedValue);
    setSelectedSong(initialState.selectedSong);
  };

  const submit = async () => {
    if (validationMessage) return;
    const payload: SuggestionCreateInput = {
      category,
      title: title.trim(),
      body: body.trim(),
      ...(category === 'CORRECTION' && selectedSong
        ? {
            songId: selectedSong.id,
            correctionField,
            proposedValue: proposedValue.trim(),
          }
        : {}),
    };
    setSaving(true);
    try {
      const created = await suggestionsApi.create(payload);
      toast.success(SUGGESTIONS_COPY.createSuccess);
      onCreated(created);
      reset();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof SuggestionsApiError ? error.message : SUGGESTIONS_COPY.createError,
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    category,
    setCategory,
    title,
    setTitle,
    body,
    setBody,
    correctionField,
    setCorrectionField,
    proposedValue,
    setProposedValue,
    selectedSong,
    setSelectedSong,
    saving,
    validationMessage,
    valid: validationMessage === null,
    reset,
    submit,
  };
}
