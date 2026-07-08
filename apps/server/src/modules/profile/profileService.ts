import { prisma, isBotId } from '@aniquizz/database';
import type { PublicProfile, PresenceStatus, FriendSummary } from '@aniquizz/shared';
import { logger } from '../../utils/logger';

/** Full stats + identity for a user; shared by the personal and public profile. */
const computeRichStats = async (userId: string) => {
    if (isBotId(userId)) throw new Error('Profil introuvable.');
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

        // 4. Récupération des autres stats (si besoin de calculs complexes)
        const profile = await prisma.profile.findUnique({
            where: { id: userId },
            select: {
                username: true,
                avatar: true,
                role: true,
                lastSeenAt: true,
                createdAt: true,
                xp: true,
                level: true,
                gamesPlayed: true,
                gamesWon: true,
                totalGuesses: true,
                correctGuesses: true,
                maxStreak: true
            }
        });

        if (!profile) throw new Error("Profil introuvable");

        // Best single-match score (used to highlight a personal record).
        const best = await prisma.matchPlayer.aggregate({
            where: { profileId: userId },
            _max: { score: true },
        });

        // Last 5 finished matches for the history section.
        const historyRows = await prisma.matchPlayer.findMany({
            where: { profileId: userId, match: { status: 'FINISHED' } },
            select: {
                score: true,
                rank: true,
                isWinner: true,
                correctCount: true,
                xpEarned: true,
                answers: { select: { answerType: true } },
                match: {
                    select: {
                        id: true,
                        mode: true,
                        totalRounds: true,
                        startedAt: true,
                        endedAt: true,
                        _count: { select: { players: true } },
                    },
                },
            },
            orderBy: { match: { startedAt: 'desc' } },
            take: 5,
        });

        // Pre-game answer style, inferred from the answers actually recorded.
        // Only a pure TYPING/QCM match maps to that mode; anything else — including
        // Duo rounds (which only occur inside a Mix game) — is "Mix".
        const resolveAnswerMode = (types: string[]): string | null => {
            const distinct = new Set(types);
            if (distinct.size === 0) return null;
            if (distinct.size === 1 && distinct.has('TYPING')) return 'Typing';
            if (distinct.size === 1 && distinct.has('QCM')) return 'QCM';
            return 'Mix';
        };

        const history = historyRows.map((row) => {
            const m = row.match;
            const start = m.startedAt;
            const end = m.endedAt;
            return {
                id: m.id,
                playedAt: (end ?? start).toISOString(),
                mode: m.mode as string,
                answerMode: resolveAnswerMode(row.answers.map((a) => a.answerType)),
                totalRounds: m.totalRounds,
                score: row.score,
                rank: row.rank,
                isWinner: row.isWinner,
                correctCount: row.correctCount,
                xpEarned: row.xpEarned,
                playerCount: m._count.players,
                durationMs: end ? end.getTime() - start.getTime() : null,
            };
        });

        // Cumulative score/XP + answer time (avg & min) + rounds + multi/solo split + playtime.
        const [scoreAgg, timeAgg, roundsPlayed, finishedMatches] = await Promise.all([
            prisma.matchPlayer.aggregate({ where: { profileId: userId }, _sum: { score: true, xpEarned: true } }),
            prisma.roundAnswer.aggregate({
                where: { matchPlayer: { profileId: userId }, timeMs: { not: null } },
                _avg: { timeMs: true },
                _min: { timeMs: true },
            }),
            prisma.roundAnswer.count({ where: { matchPlayer: { profileId: userId } } }),
            prisma.matchPlayer.findMany({
                where: { profileId: userId, match: { status: 'FINISHED' } },
                select: {
                    match: { select: { startedAt: true, endedAt: true, _count: { select: { players: true } } } },
                },
            }),
        ]);

        let multiCount = 0;
        let soloCount = 0;
        let playtimeMs = 0;
        for (const row of finishedMatches) {
            const m = row.match;
            if (m._count.players > 1) multiCount += 1; else soloCount += 1;
            if (m.endedAt) playtimeMs += m.endedAt.getTime() - m.startedAt.getTime();
        }

        const winRate = profile.gamesPlayed > 0 
            ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100) 
            : 0;
            
        const accuracy = profile.totalGuesses > 0 
            ? Math.round((profile.correctGuesses / profile.totalGuesses) * 100) 
            : 0;

        return {
            username: profile.username,
            avatar: profile.avatar,
            role: profile.role,
            lastSeenAt: profile.lastSeenAt ? profile.lastSeenAt.toISOString() : null,
            totalSongs,
            discoveredSongs,
            progressPercent,
            createdAt: profile.createdAt.toISOString(),
            xp: profile.xp,
            level: profile.level,
            bestScore: best._max.score ?? 0,
            scoreTotal: scoreAgg._sum.score ?? 0,
            avgXpPerGame: profile.gamesPlayed > 0 ? Math.round((scoreAgg._sum.xpEarned ?? 0) / profile.gamesPlayed) : 0,
            avgAnswerMs: timeAgg._avg.timeMs ?? null,
            fastestAnswerMs: timeAgg._min.timeMs ?? null,
            roundsPlayed,
            multiCount,
            soloCount,
            playtimeMs,
            history,
            stats: {
                gamesPlayed: profile.gamesPlayed,
                gamesWon: profile.gamesWon,
                totalGuesses: profile.totalGuesses,
                correctGuesses: profile.correctGuesses,
                maxStreak: profile.maxStreak,
                winRate,
                accuracy
            }
        };

    } catch (error) {
        logger.error("Erreur calcul stats profil", "ProfileService", error);
        throw error;
    }
};

/** Personal profile stats (self view via `profile:get_stats`). */
export const getProfileStats = (userId: string) => computeRichStats(userId);

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
  friends: FriendSummary[] = [],
): Promise<PublicProfile> => {
  if (isBotId(targetId)) throw new Error('Profil introuvable.');

  const [rich, relation] = await Promise.all([
    computeRichStats(targetId),
    resolveRelation(viewerId, targetId),
  ]);

  return {
    ...rich,
    id: targetId,
    status: presence.status,
    friends,
    relation,
  };
};