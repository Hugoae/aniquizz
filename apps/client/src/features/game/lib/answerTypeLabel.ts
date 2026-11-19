import { pick } from '@/lib/i18n/text';

/** Shared answer-type names stay French. The player UI reads this instead. */
export function answerTypeDisplayLabel(type: string | null | undefined): string {
  if (type === 'qcm') return pick('Carré', 'Square');
  if (type === 'duo') return pick('Duo', 'Duo');
  if (type === 'typing') return pick('Typing', 'Typing');
  if (type === 'mix') return pick('Mix', 'Mix');
  return type ?? '';
}
