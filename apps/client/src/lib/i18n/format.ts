import i18n from '@/lib/i18n';

/** Grouped digits follow the active language (1 000 in French, 1,000 in English). */
export function formatAppNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(i18n.language, options).format(value);
}

export function formatAppDate(value: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(i18n.language, options).format(value);
}

export function formatAppDateTime(value: Date): string {
  return formatAppDate(value, { dateStyle: 'medium', timeStyle: 'short' });
}
