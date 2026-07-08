import { useEffect, useRef, useState } from 'react';
import { Grid2X2, Columns2, Send } from 'lucide-react';
import type { AnimeSuggestion } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from '@/features/hub/components/config/ConfigPrimitives';
import type { InputMode } from './types';

const SUGGESTION_LIST_ID = 'answer-suggestions';

interface AnswerInputProps {
  responseType: 'typing' | 'qcm' | 'mix';
  inputMode: InputMode;
  answer: string;
  setAnswer: (val: string) => void;
  submittedAnswer: string | null;
  suggestions: AnimeSuggestion[];
  choices: string[];
  onAction: (val: string) => void;
  onSwitchCarre: () => void;
  onSwitchDuo: () => void;
  /** Round-1 ready beat: show the field but block interaction until audio starts. */
  disabled?: boolean;
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

/** Guessing-phase answer entry (typing/QCM/duo). Reveal info lives elsewhere. */
export function AnswerInput({
  responseType,
  inputMode,
  answer,
  setAnswer,
  submittedAnswer,
  suggestions,
  choices,
  onAction,
  onSwitchCarre,
  onSwitchDuo,
  disabled = false,
}: AnswerInputProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
    if (suggestions.length > 0 && !disabled) setPanelOpen(true);
    if (suggestions.length === 0) setPanelOpen(false);
  }, [suggestions, disabled]);

  const showTyping = inputMode === 'typing' || (disabled && choices.length === 0);
  const showChoices = !showTyping && choices.length > 0;
  const showPanel = panelOpen && suggestions.length > 0 && !disabled;

  const pickSuggestion = (item: AnimeSuggestion) => {
    setAnswer(item.label);
    onAction(item.label);
    setPanelOpen(false);
  };

  return (
    <div className={cn('relative flex w-full flex-col items-center gap-3', disabled && 'pointer-events-none opacity-60')}>
      {submittedAnswer && (
        <div className="flex animate-fade-in items-center gap-2 rounded-md border border-primary/30 bg-primary/20 px-4 py-1.5 shadow-lg backdrop-blur-sm">
          <span className="text-xs font-bold uppercase text-primary">Votre réponse :</span>
          <span className="text-sm font-bold text-foreground">{submittedAnswer}</span>
        </div>
      )}

      {responseType === 'mix' && inputMode === 'typing' && !submittedAnswer && !disabled && (
        <div className="mb-2 flex animate-fade-in items-center gap-4">
          <Button variant="secondary" size="sm" onClick={onSwitchCarre} className="gap-2 hover:bg-primary/20 hover:text-primary">
            <Grid2X2 className="h-4 w-4" /> Carré (2 pts)
          </Button>
          <Button variant="secondary" size="sm" onClick={onSwitchDuo} className="gap-2 hover:bg-primary/20 hover:text-primary">
            <Columns2 className="h-4 w-4" /> Duo (1 pt)
          </Button>
        </div>
      )}

      {showTyping && (
        <div className="relative z-50 flex w-full animate-slide-up items-center gap-3">
          {showPanel && (
            <div
              id={SUGGESTION_LIST_ID}
              role="listbox"
              aria-label="Suggestions d'animes"
              className="custom-scrollbar absolute bottom-full left-0 z-50 mb-2 flex max-h-60 w-full flex-col overflow-hidden overflow-y-auto rounded-xl border border-primary/20 bg-card shadow-2xl"
            >
              {suggestions.map((suggestion, idx) => (
                <button
                  key={`${suggestion.label}-${idx}`}
                  id={`answer-suggestion-${idx}`}
                  role="option"
                  aria-selected={idx === activeIndex}
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between border-b border-border/50 px-4 py-3 text-left text-sm font-medium transition-colors last:border-0',
                    idx === activeIndex ? 'border-l-4 border-l-primary bg-primary/20 text-primary' : 'hover:bg-primary/20 hover:text-primary',
                    FOCUS_RING,
                  )}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => pickSuggestion(suggestion)}
                >
                  <SuggestionLabel label={suggestion.label} highlight={suggestion.highlight} />
                  {idx === activeIndex && (
                    <span className="ml-2 shrink-0 rounded-sm border border-current px-1 font-mono text-[10px] opacity-60">
                      ENTRÉE
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <Input
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              if (e.target.value.trim().length >= 2) setPanelOpen(true);
            }}
            placeholder={disabled ? 'À vous dans un instant…' : submittedAnswer ? 'Changer votre réponse…' : "Nom de l'anime…"}
            aria-label="Votre réponse"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={SUGGESTION_LIST_ID}
            aria-activedescendant={showPanel ? `answer-suggestion-${activeIndex}` : undefined}
            autoComplete="off"
            className={cn(
              'h-14 flex-1 rounded-lg border-primary/20 bg-card/50 pl-4 text-lg backdrop-blur-sm focus-visible:ring-primary/50',
              submittedAnswer && 'border-primary/50 bg-primary/5',
            )}
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
                  pickSuggestion(suggestions[activeIndex]);
                } else {
                  onAction(answer);
                }
              }
            }}
          />
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-accent/10 px-2 py-1 text-sm font-bold text-accent">+5 pts</span>
            <Button
              variant="glow"
              size="lg"
              onClick={() => onAction(answer)}
              disabled={disabled || !answer}
              aria-label="Valider la réponse"
              className="h-14 w-14 rounded-lg p-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {showChoices && (
        <div className="grid w-full animate-slide-up grid-cols-2 gap-3">
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
              onClick={() => onAction(choice)}
            >
              {choice}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
