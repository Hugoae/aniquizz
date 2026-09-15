import { Columns2, Keyboard, LayoutGrid } from 'lucide-react';
import { ANSWER_TYPE_LABELS, type AnswerType } from '@aniquizz/shared';

const ICONS = {
  typing: Keyboard,
  qcm: LayoutGrid,
  duo: Columns2,
} as const;

interface RevealAnswerTypeIconProps {
  answerType: AnswerType | null | undefined;
}

/** Reveal-only: how the player submitted. Never `mix` — callers pass the effective type. */
export function RevealAnswerTypeIcon({ answerType }: RevealAnswerTypeIconProps) {
  if (answerType !== 'typing' && answerType !== 'qcm' && answerType !== 'duo') {
    return null;
  }

  const Icon = ICONS[answerType];
  const label = ANSWER_TYPE_LABELS[answerType];

  return (
    <span className="inline-flex items-center justify-center" title={label}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
