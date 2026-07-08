import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import { logger } from '../../utils/logger';
import { getProfileStats } from './profileService';
import { verifyAnilistUser } from '../anilist/anilistService';
import { prisma } from '@aniquizz/database';
import { requireAuth } from '../../core/guards';

export const registerProfileHandlers = (io: TypedServer, socket: TypedSocket) => {
    
    // Demande de stats complètes pour la page Profil
    const handleGetStats = async () => {
        try {
            // Canonical identity set by socketAuthMiddleware (requireAuth guarantees it).
            const userId = socket.data.userId as string;

            const stats = await getProfileStats(userId);
            socket.emit('profile:stats', stats);
            
        } catch (error) {
            socket.emit('profile:error', { message: "Impossible de charger les statistiques" });
        }
    };

    // Mise à jour simple (Username, Avatar, AniList). All Profile writes go
    // through here so the client never touches the table directly (RLS locked).
    const handleUpdateProfile = async (payload: { username?: string, avatarUrl?: string, anilistUsername?: string | null }) => {
        const userId = socket.data.userId as string;

        try {
            const updateData: any = {};
            if (payload.username) updateData.username = payload.username;
            if (payload.avatarUrl) updateData.avatar = payload.avatarUrl;
            if (payload.anilistUsername !== undefined) {
                const trimmed = typeof payload.anilistUsername === 'string' ? payload.anilistUsername.trim() : null;
                const value = trimmed && trimmed.length > 0 ? trimmed : null;
                // Verify the AniList account exists before linking (unlink = null skips it).
                if (value) {
                    const check = await verifyAnilistUser(value);
                    if (check === 'not_found') {
                        socket.emit('error', { message: "Compte AniList introuvable. Vérifie l'orthographe de ton pseudo." });
                        return;
                    }
                }
                updateData.anilistUsername = value;
            }

            await prisma.profile.update({
                where: { id: userId },
                data: updateData
            });

            socket.emit('user_profile', { success: true });
            logger.info(`Profil mis à jour pour ${userId}`, 'Profile');
        } catch (error) {
            logger.error("Erreur update profil", 'Profile', error);
            socket.emit('error', {
                message: payload.username
                    ? "Ce pseudo est peut-être déjà pris."
                    : "Impossible de mettre à jour le profil.",
            });
        }
    };

    socket.on('profile:get_stats', requireAuth(socket, handleGetStats));
    socket.on('update_profile_data', requireAuth(socket, handleUpdateProfile));
};