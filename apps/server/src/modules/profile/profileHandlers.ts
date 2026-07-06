import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import { logger } from '../../utils/logger';
import { getProfileStats } from './profileService';
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

    // Mise à jour simple (Username, Avatar)
    const handleUpdateProfile = async (payload: { username?: string, avatarUrl?: string }) => {
        const userId = socket.data.userId as string;

        try {
            const updateData: any = {};
            if (payload.username) updateData.username = payload.username;
            if (payload.avatarUrl) updateData.avatar = payload.avatarUrl;

            await prisma.profile.update({
                where: { id: userId },
                data: updateData
            });

            socket.emit('user_profile', { success: true });
            logger.info(`Profil mis à jour pour ${userId}`, 'Profile');
        } catch (error) {
            logger.error("Erreur update profil", 'Profile', error);
            socket.emit('error', { message: "Ce pseudo est peut-être déjà pris." });
        }
    };

    socket.on('profile:get_stats', requireAuth(socket, handleGetStats));
    socket.on('update_profile_data', requireAuth(socket, handleUpdateProfile));
};