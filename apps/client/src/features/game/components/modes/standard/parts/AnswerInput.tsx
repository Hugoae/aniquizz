import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Grid2X2, Columns2, Send } from 'lucide-react';
import { GAME_CONFIG, type Precision } from '@aniquizz/shared';
import { normalizePrecision } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from '@/features/hub/components/config/ConfigPrimitives';
import { useAnimeSearch } from '@/features/game/hooks/useAnimeSearch';
import { useSuggestionPanelPosition } from '@/features/game/hooks/useSuggestionPanelPosition';
import type { InputMode } from './types';

const SUGGESTION_LIST_ID = 'answer-suggestions';
const MIN_SUBMIT_LENGTH = GAME_CONFIG.FUZZY.SUGGESTION_MIN_QUERY_LENGTH;

interface AnswerInputProps {
  responseType: 'typing' | 'qcm' | 'mix';
  inputMode: InputMode;
  submittedAnswer: string | null;
  choices: string[];
  onAction: (val: string) => void;
  onSwitchCarre: () => void;
  onSwitchDuo: () => void;
  precision?: Precision;
  /** Bumped each round — clears the local typing draft. */
  roundKey: number;
  /** Round-1 ready beat: show the field but block interaction until audio starts. */
  disabled?: boolean;
  /** Custom badge next to send. Undefined = "+5 pts". null = hidden. */
  pointsBadge?: string | null;
}

function SuggestionLabel({
  label,
  highlight,
}: {
  label: string;
  highlight: { start: number; end: number } | null;
}) {
  if (!highlight || highlight.start >= highlight.end) {
    return <span>{label}</span>;
  }
  return (
    <span>
      {label.slice(0, highlight.start)}
      <mark className="rounded-sm bg-primary/25 px-0.5 text-primary">{label.slice(highlight.start, highlight.end)}</mark>
      {label.slice(highlight.end)}
    </span>
  );
}

/** Guessing-phase answer entry (typing/QCM/duo). Autocomplete is isolated here so keystrokes do not re-render the full game tree. */
function AnswerInputInner({
  responseType,
  inputMode,
  submittedAnswer,
  choices,
  onAction,
  onSwitchCarre,
  onSwitchDuo,
  precision = 'franchise',
  roundKey,
  disabled = false,
  pointsBadge,
}: AnswerInputProps) {
  const [draft, setDraft] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const inputRowRef = useRef<HTMLDivElement>(null);

  const showTyping = inputMode === 'typing' || (disabled && choices.length === 0);
  const canType = showTyping && !disabled;

  const { suggestions, isSearching } = useAnimeSearch({
    query: draft,
    precision: normalizePrecision(precision),
    enabled: canType,
  });

  const queryReady = draft.trim().length >= MIN_SUBMIT_LENGTH;
  const showPanel = panelOpen && queryReady && canType;
  const panelPosition = useSuggestionPanelPosition(inputRowRef, showPanel);

  const submitAnswer = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed.length < MIN_SUBMIT_LENGTH) return;
      setDraft('');
      setPanelOpen(false);
      setActiveIndex(0);
      onAction(trimmed);
    },
    [onAction],
  );

  useEffect(() => {
    setDraft('');
    setPanelOpen(false);
    setActiveIndex(0);
  }, [roundKey]);

  useEffect(() => {
    setActiveIndex(0);
  }, [suggestions]);

  const showChoices = !showTyping && choices.length > 0;
  const showMixSwitchers =
    responseType === 'mix' && inputMode === 'typing' && !submittedAnswer && !disabled;

  const suggestionPanel =
    showPanel && panelPosition
      ? createPortal(
          <div
            id={SUGGESTION_LIST_ID}
            role="listbox"
            aria-label="Suggestions d'animes"
            className="custom-scrollbar fixed z-[200] flex flex-col overflow-hidden overflow-y-auto rounded-xl border border-primary/20 bg-card shadow-2xl"
            style={{
              left: panelPosition.left,
              width: panelPosition.width,
              maxHeight: panelPosition.maxHeight,
              bottom: panelPosition.bottom,
            }}
          >
            {isSearching && suggestions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">Recherche…</div>
            ) : suggestions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">Aucune suggestion</div>
            ) : (
              suggestions.map((suggestion, idx) => (
                <button
                  key={`${suggestion.label}-${idx}`}
                  id={`answer-suggestion-${idx}`}
                  role="option"
                  aria-selected={idx === activeIndex}
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between border-b border-border/50 px-4 py-3 text-left text-sm font-medium transition-colors last:border-0',
                    idx === activeIndex
                      ? 'border-l-4 border-l-primary bg-primary/20 text-primary'
                      : 'hover:bg-primary/20 hover:text-primary',
                    FOCUS_RING,
                  )}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => submitAnswer(suggestion.label)}
                >
                  <SuggestionLabel label={suggestion.label} highlight={suggestion.highlight} />
                  {idx === activeIndex && (
                    <span className="ml-2 shrink-0 rounded-sm border border-current px-1 font-mono text-[10px] opacity-60">
                      ENTRÉE
                    </span>
                  )}
                </button>
              ))
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={cn('relative flex w-full flex-col items-center gap-3', disabled && 'pointer-events-none opacity-60')}>
      {submittedAnswer && (
        <div className="flex animate-fade-in items-center gap-2 rounded-md border border-primary/30 bg-primary/20 px-4 py-1.5 shadow-lg">
          <span className="text-xs font-bold uppercase text-primary">Votre réponse :</span>
          <span className="text-sm font-bold text-foreground">{submittedAnswer}</span>
        </div>
      )}

      {showMixSwitchers && (
        <div className="mb-2 flex animate-fade-in items-center gap-4">
          <Button variant="secondary" size="sm" onClick={onSwitchCarre} className="gap-2 hover:bg-primary/20 hover:text-primary">
            <Grid2X2 className="h-4 w-4" /> Carré (2 pts)
          </Button>
          <Button variant="secondary" size="sm" onClick={onSwitchDuo} className="gap-2 hover:bg-primary/20 hover:text-primary">
            <Columns2 className="h-4 w-4" /> Duo (1 pt)
          </Button>
        </div>
      )}

      {canType && !showMixSwitchers && (
        <div className="mb-2 h-9 shrink-0" aria-hidden="true" />
      )}

      {canType && (
        <div ref={inputRowRef} className="relative z-50 flex w-full items-center gap-3">
          {suggestionPanel}

          <Input
            value={draft}
            onChange={(e) => {
              const next = e.target.value;
              setDraft(next);
              if (next.trim().length >= MIN_SUBMIT_LENGTH) setPanelOpen(true);
              else setPanelOpen(false);
            }}
            onFocus={() => {
              if (draft.trim().length >= MIN_SUBMIT_LENGTH) setPanelOpen(true);
            }}
            placeholder={submittedAnswer ? 'Modifier votre réponse…' : 'Nom de l\'anime…'}
            aria-label="Votre réponse"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={SUGGESTION_LIST_ID}
            aria-activedescendant={showPanel ? `answer-suggestion-${activeIndex}` : undefined}
            autoComplete="off"
            className="h-14 flex-1 rounded-lg border-primary/20 bg-card/90 pl-4 text-lg focus-visible:ring-primary/50"
            autoFocus={!disabled}
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setPanelOpen(false);
                return;
              }
              if (e.key === 'ArrowDown') {
                if (suggestions.length > 0) {
                  e.preventDefault();
                  setPanelOpen(true);
                  setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
                }
                return;
              }
              if (e.key === 'ArrowUp' && showPanel) {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
                return;
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                if (showPanel && suggestions[activeIndex]) {
                  submitAnswer(suggestions[activeIndex].label);
                } else if (draft.trim().length >= MIN_SUBMIT_LENGTH) {
                  submitAnswer(draft);
                }
              }
            }}
          />
          <div className="flex items-center gap-2">
            {pointsBadge !== null && (
              <span className="rounded-md bg-accent/10 px-2 py-1 text-sm font-bold text-accent">
                {pointsBadge ?? '+5 pts'}
              </span>
            )}
            <Button
              variant="glow"
              size="lg"
              onClick={() => submitAnswer(draft)}
              disabled={disabled || draft.trim().length < MIN_SUBMIT_LENGTH}
              aria-label="Valider la réponse"
              className="h-14 w-14 rounded-lg p-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {showChoices && (
        <div className="grid w-full grid-cols-2 gap-3">
          {choices.map((choice) => (
            <Button
              key={choice}
              type="button"
              variant="outline"
              aria-pressed={submittedAnswer === choice}
              className={cn(
                'h-14 whitespace-normal rounded-lg border-2 px-2 text-md font-semibold leading-tight transition-all',
                submittedAnswer === choice
                  ? 'border-primary bg-primary text-primary-foreground shadow-lg'
                  : 'hover:border-primary/50 hover:bg-primary/10',
              )}
              disabled={disabled}
              onClick={() => submitAnswer(choice)}
            >
              {choice}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export const AnswerInput = memo(AnswerInputInner);
