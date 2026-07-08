import type { TypedServer, TypedSocket } from '../core/socketTypes';
import { prisma } from '@aniquizz/database';
import { logger } from '../utils/logger';
import type { GameManager } from './game/gameManager';

// --- CONFIGURATION CACHE STATS ---
const STATS_CACHE_DURATION = 10 * 60 * 1000; // 10 Minutes
let cachedStats: { animes: number; users: number; songs: number } | null = null;
let lastCacheUpdate = 0;

/**
 * Récupère les stats globales avec un système de cache pour protéger la BDD.
 */
const getGlobalStats = async () => {
    const now = Date.now();

    // 1. Si le cache est valide, on le sert direct
    if (cachedStats && (now - lastCacheUpdate < STATS_CACHE_DURATION)) {
        return cachedStats;
    }

    try {
        // 2. Sinon, on fait les 3 requêtes en parallèle (plus rapide)
        const [animesCount, usersCount, songsCount] = await Promise.all([
            prisma.anime.count(),
            prisma.profile.count(),
            prisma.song.count({
                where: { downloadStatus: 'COMPLETED' } // On ne compte que les sons jouables
            })
        ]);

        cachedStats = {
            animes: animesCount,
            users: usersCount,
            songs: songsCount
        };
        lastCacheUpdate = now;

        logger.info(`[System] Cache Stats Globales mis à jour (Animes: ${animesCount}, Users: ${usersCount}, Songs: ${songsCount})`, 'Database');
        
        return cachedStats;

    } catch (error) {
        logger.error("Erreur récupération stats globales", "Database", error);
        // En cas d'erreur, on renvoie des 0 ou le vieux cache s'il existe
        return cachedStats || { animes: 0, users: 0, songs: 0 };
    }
};

/** Count distinct authenticated users currently connected (live, never cached). */
const countOnlineUsers = (io: TypedServer): number => {
    const users = new Set<string>();
    for (const [, s] of io.of('/').sockets) {
        const uid = s.data?.userId;
        if (uid) users.add(uid);
    }
    return users.size;
};

export const registerGeneralHandlers = (io: TypedServer, socket: TypedSocket, gameManager: GameManager) => {

  const sendHomeStats = async () => {
      const stats = await getGlobalStats();
      socket.emit('home_stats', {
          ...stats,
          online: countOnlineUsers(io),
          inMultiplayer: gameManager.countMultiplayerPlayers(),
      });
  };

  // Écoute de la demande du client
  socket.on('get_home_stats', sendHomeStats);
};