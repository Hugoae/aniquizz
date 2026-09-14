// Clamp a client-claimed answer type to what the room actually allows.
// Mix typing is only honoured when the submitted string is not an offered QCM/Duo label.

import type { AnswerType, ResponseType } from './game';
import { normalizeString } from './utils';

export function answerMatchesOfferedChoice(answer: string, offered: readonly string[]): boolean {
  if (!answer || offered.length === 0) return false;
  const normalized = normalizeString(answer);
  if (!normalized) return false;
  return offered.some((choice) => normalizeString(choice) === normalized);
}

/**
 * Server-authoritative answer type. Never trust the client's claim for scoring.
 *
 * - `typing` room → always typing (no choices exist).
 * - `qcm` room → duo (lifeline) or qcm; never typing.
 * - `mix` room → claimed qcm/duo kept; claimed typing is clamped to qcm when
 *   the string matches an offered choice/duo label (clicking a button then
 *   claiming typing used to award 5 pts).
 */
export function resolveEffectiveAnswerType(
  claimed: AnswerType,
  responseType: ResponseType | undefined,
  answer: string,
  offered: { choices?: readonly string[]; duo?: readonly string[] } = {},
): AnswerType {
  const mode: ResponseType = responseType ?? 'mix';
  if (mode === 'typing') return 'typing';
  if (mode === 'qcm') return claimed === 'duo' ? 'duo' : 'qcm';

  if (claimed === 'duo') return 'duo';
  if (claimed === 'qcm') return 'qcm';

  const labels = [...(offered.choices ?? []), ...(offered.duo ?? [])];
  if (answerMatchesOfferedChoice(answer, labels)) return 'qcm';
  return 'typing';
}
