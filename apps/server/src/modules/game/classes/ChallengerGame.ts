import { StandardGame } from './StandardGame';
import { isAnswerCorrect, GAME_CONFIG } from '@aniquizz/shared';
import { logger } from '../../../utils/logger';

export class ChallengerGame extends StandardGame {
    // Stocke l'ordre d'arrivée des gagnants (Index 0 = 1er, Index 1 = 2ème...)
    private roundWinners: string[] = [];
    
    // Compte les erreurs par joueur pour le round en cours
    private roundAttempts: Map<string, number> = new Map();

    /**
     * Override du StartGame pour vérifier le nombre de joueurs (Serveur Side Security)
     */
    public async startGame() {
        if (this.players.size < 2) {
            logger.warn(`[ChallengerGame] Tentative de lancement avec ${this.players.size} joueurs (min 2). Annulé.`, 'Game');
            // On pourrait envoyer une notif socket ici si besoin
            return;
        }
        await super.startGame();
    }

    /**
     * Surcharge du démarrage du round pour réinitialiser les compteurs
     */
    protected async startRound() {
        // Reset des états Challenger pour le nouveau round
        this.roundWinners = [];
        this.roundAttempts.clear();
        
        // On réinitialise l'état "attempts" sur les objets joueurs pour que le client sache qu'il a ses 3 coeurs
        this.players.forEach(p => {
            (p as any).attempts = 0;
            (p as any).rank = null; // Reset du rang visuel
            (p as any).timeTaken = undefined; // Reset du temps
        });

        // Appel de la logique standard (Timer, Playlist, Event 'round_start')
        super.startRound();
    }

    /**
     * Surcharge de la gestion des réponses
     */
    handleAnswer(playerId: string, answer: string, mode: string) {
        const player = this.players.get(playerId);
        const currentSong = this.playlist[this.currentRoundIndex];

        if (!player || !currentSong) return;

        // ✅ SÉCURITÉ : Si le joueur a déjà trouvé, on ignore toute nouvelle entrée.
        if (player.isCorrect) return;

        // ✅ LOGIQUE TEMPS (Ajouté pour Challenger)
        const now = Date.now();
        const timeTaken = Math.max(0, (now - this.roundStartTime) / 1000);

        // 1. Vérification des Vies (Serveur Authoritatif)
        const attempts = this.roundAttempts.get(playerId) || 0;
        // ⚠️ NOTE: Assure-toi d'avoir renommé RUSH en CHALLENGER dans @aniquizz/shared/src/config.ts
        const maxLives = GAME_CONFIG.CHALLENGER?.MAX_LIVES || 3;

        if (attempts >= maxLives) {
            // Le joueur est mort pour ce round, on ignore son input
            return;
        }

        // 2. Vérification de la réponse
        const isCorrect = isAnswerCorrect(answer, currentSong.validAnswers);

        // Log DEBUG
        logger.debug(`[ChallengerGame] [${this.id}] "${player.username}" answered: "${answer}" -> ${isCorrect ? '✅ CORRECT' : '❌ WRONG'} (${attempts + 1}/${maxLives} essais) - ${timeTaken.toFixed(2)}s`, 'Game');

        if (isCorrect) {
            // --- GESTION DU PODIUM ---
            
            // Si le joueur avait déjà trouvé (spam?), on ignore (double check)
            if (this.roundWinners.includes(playerId)) return;

            this.roundWinners.push(playerId);
            const rankIndex = this.roundWinners.length - 1; // 0 = 1er

            // Calcul des points (Base + Bonus)
            // ⚠️ NOTE: Assure-toi d'avoir renommé RUSH en CHALLENGER dans GAME_CONFIG.SCORING
            let points = GAME_CONFIG.SCORING?.CHALLENGER?.BASE || 5;
            
            if (rankIndex === 0) points += (GAME_CONFIG.SCORING?.CHALLENGER?.BONUS_GOLD || 3);
            else if (rankIndex === 1) points += (GAME_CONFIG.SCORING?.CHALLENGER?.BONUS_SILVER || 2);
            else if (rankIndex === 2) points += (GAME_CONFIG.SCORING?.CHALLENGER?.BONUS_BRONZE || 1);

            // Mise à jour du Joueur
            player.isCorrect = true;
            player.currentAnswer = answer;
            player.roundPoints = points;
            
            // On stocke le rang et le temps
            (player as any).rank = rankIndex + 1; // 1, 2, 3...
            (player as any).timeTaken = timeTaken; // ✅ Stockage du temps pour l'affichage

        } else {
            // --- GESTION DE L'ERREUR ---
            
            const newAttempts = attempts + 1;
            this.roundAttempts.set(playerId, newAttempts);
            
            // Mise à jour temporaire pour le client (feedback visuel immédiat)
            player.currentAnswer = answer;
            player.isCorrect = false;
            player.roundPoints = 0;
            
            // On stocke le nombre d'essais pour que le client mette à jour les cœurs
            (player as any).attempts = newAttempts;

            if (newAttempts >= maxLives) {
                logger.debug(`[ChallengerGame] [${this.id}] "${player.username}" est éliminé du round.`, 'Game');
            }
        }

        // 3. Diffusion de l'état
        this.io.to(this.id).emit('update_players', { players: Array.from(this.players.values()) });
    }
}