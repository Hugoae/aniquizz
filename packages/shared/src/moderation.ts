// packages/shared/src/moderation.ts
// Moderation copy shared by server ejection and client navigation.

/** User-facing message when a ban blocks play or ejects from a live room. */
export const MODERATION_BAN_MESSAGE =
  'Vous avez été banni par la modération. Impossible de jouer pour le moment.';

export const isBanSanctionReason = (reason?: string | null): boolean =>
  !!reason && reason.toLowerCase().includes('banni');
