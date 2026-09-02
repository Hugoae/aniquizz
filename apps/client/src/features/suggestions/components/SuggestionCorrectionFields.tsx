import type { LibraryDifficulty, SuggestionCorrectionField } from '@aniquizz/shared';
import { Input } from '@/components/ui/input';
import {
  SUGGESTION_CORRECTION_LABELS,
  SUGGESTIONS_COPY,
} from '@/features/suggestions/copy/suggestionsCopy';
import { libraryDifficultyLabel } from '@/features/library/lib/libraryStyles';
import { SUGGESTION_PROPOSED_VALUE_MAX } from '@aniquizz/shared';

const correctionFields: SuggestionCorrectionField[] = ['TITLE', 'ARTIST', 'DIFFICULTY', 'OTHER'];
const difficulties: LibraryDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];
const fieldClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20';

interface SuggestionCorrectionFieldsProps {
  correctionField: SuggestionCorrectionField;
  proposedValue: string;
  onCorrectionFieldChange: (field: SuggestionCorrectionField) => void;
  onProposedValueChange: (value: string) => void;
}

export function SuggestionCorrectionFields({
  correctionField,
  proposedValue,
  onCorrectionFieldChange,
  onProposedValueChange,
}: SuggestionCorrectionFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-2">
        <span className="text-sm font-semibold">{SUGGESTIONS_COPY.correctionFieldLabel}</span>
        <select
          value={correctionField}
          onChange={(event) => {
            onCorrectionFieldChange(event.target.value as SuggestionCorrectionField);
            onProposedValueChange('');
          }}
          className={fieldClass}
        >
          {correctionFields.map((field) => (
            <option key={field} value={field}>
              {SUGGESTION_CORRECTION_LABELS[field]}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2">
        <span className="text-sm font-semibold">{SUGGESTIONS_COPY.proposedValueLabel}</span>
        {correctionField === 'DIFFICULTY' ? (
          <select
            value={proposedValue}
            onChange={(event) => onProposedValueChange(event.target.value)}
            className={fieldClass}
          >
            <option value="">{SUGGESTIONS_COPY.chooseDifficulty}</option>
            {difficulties.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {libraryDifficultyLabel(difficulty)}
              </option>
            ))}
          </select>
        ) : (
          <Input
            value={proposedValue}
            maxLength={SUGGESTION_PROPOSED_VALUE_MAX}
            onChange={(event) => onProposedValueChange(event.target.value)}
            placeholder={SUGGESTIONS_COPY.proposedPlaceholder}
          />
        )}
      </label>
    </div>
  );
}
