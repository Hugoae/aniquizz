import type { WatchedListProvider } from '@aniquizz/shared';

export type ListVerifyResult = 'exists' | 'not_found' | 'unverified' | 'unconfigured';

const UNAVAILABLE = 'Le service de liste est momentanément indisponible. Réessayez plus tard.';

/** User-facing reject copy. `null` means the account exists and linking may proceed. */
export const listLinkRejectMessage = (
  provider: WatchedListProvider,
  check: ListVerifyResult,
): string | null => {
  if (check === 'exists') return null;
  if (check === 'unconfigured') {
    return "MyAnimeList n'est pas configuré sur ce serveur.";
  }
  if (check === 'unverified') return UNAVAILABLE;
  if (provider === 'anilist') {
    return "Compte AniList introuvable. Vérifiez l'orthographe de votre pseudo.";
  }
  return "Compte MyAnimeList introuvable. Vérifiez le pseudo de l'URL du profil.";
};
