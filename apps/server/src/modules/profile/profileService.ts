import { prisma } from '@aniquizz/database';
import { GAME_CONFIG } from '@aniquizz/shared';
import type { PublicProfile, PresenceStatus } from '@aniquizz/shared';
import { logger } from '../../utils/logger';

export const getProfileStats = async (userId: string) => {
    try {
        // 1. Récupérer le nombre total de sons jouables (dénominateur)
        const totalSongs = await prisma.song.count({
            where: { downloadStatus: 'COMPLETED' } // On ne compte que les sons prêts
        });

        // 2. Récupérer le nombre de sons découverts par le joueur (numérateur)
        // distinct: ['songId'] est important si jamais il y a des doublons historiques
        const discoveredSongs = await prisma.songHistory.count({
            where: { profileId: userId }
        });

        // 3. Calcul du pourcentage
        const progressPercent = totalSongs > 0 
            ? Math.round((discoveredSongs / totalSongs) * 100) 
            : 0;

        // 4. Détermination du rang
        const rankConfig = GAME_CONFIG.COLLECTION_RANKS.find(r => progressPercent >= r.threshold) 
                           || GAME_CONFIG.COLLECTION_RANKS[GAME_CONFIG.COLLECTION_RANKS.length - 1];

        // 5. Récupération des autres stats (si besoin de calculs complexes)
        const profile = await prisma.profile.findUnique({
            where: { id: userId },
            select: {
                gamesPlayed: true,
                gamesWon: true,
                totalGuesses: true,
                correctGuesses: true,
                maxStreak: true
            }
        });

        if (!profile) throw new Error("Profil introuvable");

        const winRate = profile.gamesPlayed > 0 
            ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100) 
            : 0;
            
        const accuracy = profile.totalGuesses > 0 
            ? Math.round((profile.correctGuesses / profile.totalGuesses) * 100) 
            : 0;

        return {
            totalSongs,
            discoveredSongs,
            progressPercent,
            rankLabel: rankConfig.label,
            rankColor: rankConfig.color,
            stats: {
                ...profile,
                winRate,
                accuracy
            }
        };

    } catch (error) {
        logger.error("Erreur calcul stats profil", "ProfileService", error);
        throw error;
    }
};

/** Relationship of a viewer to another profile (drives the public-profile UI). */
const resolveRelation = async (
  viewerId: string,
  targetId: string,
): Promise<PublicProfile['relation']> => {
  if (viewerId === targetId) return 'self';
  const fr = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: viewerId, addresseeId: targetId },
        { requesterId: targetId, addresseeId: viewerId },
      ],
    },
    select: { status: true, requesterId: true },
  });
  if (!fr) return 'none';
  if (fr.status === 'ACCEPTED') return 'friends';
  if (fr.status === 'BLOCKED') return fr.requesterId === viewerId ? 'blocked' : 'none';
  return fr.requesterId === viewerId ? 'outgoing' : 'incoming';
};

/** Public profile card + stats for any user, viewed by `viewerId`. */
export const getPublicProfile = async (
  viewerId: string,
  targetId: string,
  presence: { status: PresenceStatus },
): Promise<PublicProfile> => {
  const profile = await prisma.profile.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      username: true,
      avatar: true,
      level: true,
      xp: true,
      role: true,
      createdAt: true,
      gamesPlayed: true,
      gamesWon: true,
      lastSeenAt: true,
    },
  });
  if (!profile) throw new Error('Profil introuvable');

  const best = await prisma.matchPlayer.aggregate({
    where: { profileId: targetId },
    _max: { score: true },
  });

  const relation = await resolveRelation(viewerId, targetId);

  return {
    id: profile.id,
    username: profile.username,
    avatar: profile.avatar,
    level: profile.level,
    xp: profile.xp,
    role: profile.role,
    createdAt: profile.createdAt.toISOString(),
    gamesPlayed: profile.gamesPlayed,
    gamesWon: profile.gamesWon,
    bestScore: best._max.score ?? 0,
    status: presence.status,
    lastSeenAt: profile.lastSeenAt ? profile.lastSeenAt.toISOString() : null,
    relation,
  };
};