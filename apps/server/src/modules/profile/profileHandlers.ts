import { Server, Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import { getProfileStats } from './profileService';
import { prisma } from '@aniquizz/database';

export const registerProfileHandlers = (io: Server, socket: Socket) => {
    
    // Demande de stats complètes pour la page Profil
    const handleGetStats = async () => {
        try {
            // L'ID utilisateur est stocké dans le socket lors de la connexion (voir SocketManager)
            const userId = socket.data.userId;
            
            if (!userId || userId === 'guest') {
                socket.emit('profile:error', { message: "Non authentifié" });
                return;
            }

            const stats = await getProfileStats(userId);
            socket.emit('profile:stats', stats);
            
        } catch (error) {
            socket.emit('profile:error', { message: "Impossible de charger les statistiques" });
        }
    };

    // Mise à jour simple (Username, Avatar)
    const handleUpdateProfile = async (payload: { username?: string, avatarUrl?: string }) => {
        const userId = socket.data.userId;
        if (!userId) return;

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

    socket.on('profile:get_stats', handleGetStats);
    socket.on('update_profile_data', handleUpdateProfile);
};