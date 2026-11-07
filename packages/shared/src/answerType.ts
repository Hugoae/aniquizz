// Clamp a client-claimed answer type to what the room actually allows.

import type { AnswerType, ResponseType } from './game';

/**
 * Server-authoritative answer type. Never trust the client's claim beyond the
 * room's response mode.
 *
 * - `typing` room → always typing (no choices exist).
 * - `qcm` room → claimed duo scores as duo; never typing. The 50/50 is not sent.
 * - `mix` room → honour the claim (typing / qcm / duo). The correct title is
 *   always one of the four QCM labels, so treating "string matches a button" as a
 *   cheat made every honest Mix type-in score as QCM (2 pts instead of 5).
 *   A client that already knows the answer can still claim typing (5) instead of
 *   QCM (2). That inflation is bounded and is a product decision — do not
 *   reintroduce the clamp. Button clicks already send `qcm` / `duo`.
 *   The Duo pair is not on `round_start`; spending it forces this round to duo.
 */
export function resolveEffectiveAnswerType(
  claimed: AnswerType,
  responseType: ResponseType | undefined,
): AnswerType {
  const mode: ResponseType = responseType ?? 'mix';
  if (mode === 'typing') return 'typing';
  if (mode === 'qcm') return claimed === 'duo' ? 'duo' : 'qcm';

  if (claimed === 'duo') return 'duo';
  if (claimed === 'qcm') return 'qcm';
  return 'typing';
}
