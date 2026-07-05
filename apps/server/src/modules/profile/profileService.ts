import { prisma } from '@aniquizz/database';
import { GAME_CONFIG } from '@aniquizz/shared';
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