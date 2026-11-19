import type { AchievementId } from '@aniquizz/shared';
import i18n from '@/lib/i18n';
import { achievementEn } from '@/lib/i18n/locales/en/achievements';

const ACHIEVEMENT_FR: Record<AchievementId, { title: string; detail: string }> = {
  first_match: { title: 'Première partie', detail: 'Terminez une partie.' },
  matches_10: { title: 'Habitué', detail: 'Terminez 10 parties.' },
  matches_50: { title: 'Pilier', detail: 'Terminez 50 parties.' },
  matches_100: { title: 'Inusable', detail: 'Terminez 100 parties.' },
  matches_250: { title: 'Vétéran', detail: 'Terminez 250 parties.' },
  matches_500: { title: 'Légende', detail: 'Terminez 500 parties.' },
  first_win: { title: 'Première victoire', detail: 'Remportez une partie.' },
  wins_10: { title: 'En série', detail: 'Remportez 10 parties.' },
  wins_50: { title: 'Champion', detail: 'Remportez 50 parties.' },
  wins_100: { title: 'Cent victoires', detail: 'Remportez 100 parties.' },
  correct_100: { title: 'Oreille affûtée', detail: 'Trouvez 100 bonnes réponses.' },
  correct_1000: { title: 'Encyclopédie', detail: 'Trouvez 1 000 bonnes réponses.' },
  correct_5000: { title: 'Oreille absolue', detail: 'Trouvez 5 000 bonnes réponses.' },
  streak_5: { title: 'Dans le rythme', detail: 'Enchaînez 5 bonnes réponses.' },
  streak_10: { title: 'En feu', detail: 'Enchaînez 10 bonnes réponses.' },
  streak_25: { title: 'Inarrêtable', detail: 'Enchaînez 25 bonnes réponses.' },
  streak_50: { title: 'Phénomène', detail: 'Enchaînez 50 bonnes réponses.' },
  daily_first: { title: 'Rendez-vous', detail: 'Terminez un quiz du jour.' },
  daily_50: { title: 'Cinquante quiz', detail: 'Terminez 50 quiz du jour.' },
  daily_streak_7: { title: 'Semaine tenue', detail: "Jouez le quiz du jour 7 jours d'affilée." },
  daily_streak_30: { title: 'Mois tenu', detail: "Jouez le quiz du jour 30 jours d'affilée." },
  daily_perfect: { title: 'Sans faute', detail: 'Réussissez un quiz du jour en entier.' },
  daily_perfect_5: { title: 'Cinq sans faute', detail: 'Réussissez 5 quiz du jour en entier.' },
  daily_perfect_15: { title: 'Quinze sans faute', detail: 'Réussissez 15 quiz du jour en entier.' },
  heard_25: { title: 'Curieux', detail: 'Écoutez 25 titres différents.' },
  heard_100: { title: 'Collectionneur', detail: 'Écoutez 100 titres différents.' },
  heard_500: { title: 'Pokédex', detail: 'Écoutez 500 titres différents.' },
  heard_1000: { title: 'Discographie', detail: 'Écoutez 1 000 titres différents.' },
  heard_all: { title: 'Catalogue complet', detail: 'Écoutez tous les titres disponibles.' },
  found_25: { title: 'Vingt-cinq trouvés', detail: 'Trouvez 25 titres différents.' },
  found_100: { title: 'Cent trouvés', detail: 'Trouvez 100 titres différents.' },
  found_500: { title: 'Cinq cents trouvés', detail: 'Trouvez 500 titres différents.' },
  found_1000: { title: 'Mille trouvés', detail: 'Trouvez 1 000 titres différents.' },
  first_medal: { title: 'Première médaille', detail: 'Obtenez une médaille en solo.' },
  medals_10: { title: 'Vitrine', detail: 'Obtenez 10 médailles en solo.' },
  platinum: { title: 'Platine', detail: 'Obtenez une médaille platine.' },
  platinums_5: { title: 'Cinq platines', detail: 'Obtenez 5 médailles platine.' },
  mode_standard: { title: 'Mode Standard', detail: 'Terminez une partie en Standard.' },
  mode_standard_25: { title: 'Habitué du Standard', detail: 'Terminez 25 parties en Standard.' },
  mode_chrono: { title: 'Contre-la-montre', detail: 'Terminez une partie en Contre-la-montre.' },
  mode_chrono_20: { title: 'Sprinteur', detail: 'Terminez 20 parties en Contre-la-montre.' },
  mode_evolving: { title: 'Évolutif', detail: 'Terminez une partie en Évolutif.' },
  mode_evolving_10: { title: 'Oreille progressive', detail: 'Terminez 10 parties en Évolutif.' },
  evolving_snap: {
    title: 'Réflexe',
    detail: 'Trouvez un titre dès la première durée en Évolutif.',
  },
  modes_all: {
    title: 'Les trois modes',
    detail: 'Terminez une partie en Standard, en Contre-la-montre et en Évolutif.',
  },
  multi_1: { title: 'À plusieurs', detail: 'Terminez une partie multijoueur.' },
  multi_10: { title: 'En groupe', detail: 'Terminez 10 parties multijoueur.' },
  multi_25: { title: 'Pilier du salon', detail: 'Terminez 25 parties multijoueur.' },
  multi_win: { title: 'Victoire à plusieurs', detail: 'Remportez une partie multijoueur.' },
  multi_wins_10: { title: 'Salle dominée', detail: 'Remportez 10 parties multijoueur.' },
  first_friend: { title: 'Premier ami', detail: 'Ajoutez un ami.' },
  friends_10: { title: 'Cercle', detail: 'Ajoutez 10 amis.' },
  first_like: { title: 'Premier favori', detail: 'Ajoutez un titre à vos favoris.' },
  likes_25: { title: 'Vingt-cinq favoris', detail: 'Ajoutez 25 titres à vos favoris.' },
  custom_avatar: { title: 'Portrait', detail: 'Importez une photo de profil.' },
  linked_list: { title: 'Liste liée', detail: 'Liez une liste AniList ou MyAnimeList.' },
};

function achievementTable(): Record<AchievementId, { title: string; detail: string }> {
  return i18n.language.startsWith('en') ? achievementEn : ACHIEVEMENT_FR;
}

export const ACHIEVEMENT_COPY: Record<AchievementId, { title: string; detail: string }> =
  Object.fromEntries(
    (Object.keys(ACHIEVEMENT_FR) as AchievementId[]).map((id) => [
      id,
      {
        get title() {
          return achievementTable()[id].title;
        },
        get detail() {
          return achievementTable()[id].detail;
        },
      },
    ]),
  ) as Record<AchievementId, { title: string; detail: string }>;

export function isAchievementId(id: string): id is AchievementId {
  return Object.prototype.hasOwnProperty.call(ACHIEVEMENT_COPY, id);
}
