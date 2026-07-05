import { GameCore } from './GameCore';
import { isAnswerCorrect, GAME_CONFIG } from '@aniquizz/shared'; // Ajout de GAME_CONFIG
import { saveGameHistory } from '../gameService'; 
import { logger } from '../../../utils/logger';

export class StandardGame extends GameCore {
  
  handleAnswer(playerId: string, answer: string, mode: string) {
    const player = this.players.get(playerId);
    const currentSong = this.playlist[this.currentRoundIndex];

    if (!player || !currentSong) return;
    
    // ✅ LOGIQUE TEMPS : On calcule le temps écoulé depuis le début du round
    const now = Date.now();
    // On s'assure de ne pas avoir de temps négatif (si lag ou synchro)
    const timeTaken = Math.max(0, (now - this.roundStartTime) / 1000);

    const isCorrect = isAnswerCorrect(answer, currentSong.validAnswers);

    // Log DEBUG
    logger.debug(`[StandardGame] [${this.id}] "${player.username}" answered: "${answer}" -> ${isCorrect ? '✅ CORRECT' : '❌ WRONG'} (${timeTaken.toFixed(2)}s)`, 'Game');

    if (isCorrect) {
        let points = 0;
        switch (mode) {
            case 'typing': points = GAME_CONFIG.SCORING.TYPING; break;
            case 'carre': points = GAME_CONFIG.SCORING.QCM; break; 
            case 'duo': points = GAME_CONFIG.SCORING.DUO; break;   
            default: points = 5; 
        }

        player.isCorrect = true;
        player.currentAnswer = answer;
        player.roundPoints = points;
        
        // ✅ STOCKAGE DU TEMPS : On l'ajoute à l'objet joueur (typé as any car prop dynamique)
        (player as any).timeTaken = timeTaken;
        
    } else {
        // Mauvaise réponse
        player.currentAnswer = answer;
        player.isCorrect = false;
        player.roundPoints = 0; 
        // Pas de timeTaken si faux, ou alors on peut le mettre si tu veux afficher "Raté en 2s"
    }

    this.io.to(this.id).emit('update_players', { players: Array.from(this.players.values()) });
  }

  onRoundEnd() {
    this.players.forEach(p => {
        // Si le joueur n'a pas répondu du tout, on initialise
        if (p.isCorrect === undefined || p.isCorrect === null) {
            p.isCorrect = false;
            p.currentAnswer = null; 
            p.roundPoints = 0;
        }

        // 1. Ajout des points au score global
        p.score += (p.roundPoints || 0);

        // 2. Gestion du Streak
        if (p.isCorrect === true) {
            p.streak = (p.streak || 0) + 1; 
        } else {
            p.streak = 0; 
        }

        // 3. TRACKING DES STATS DE PRÉCISION
        p.matchTotalCount = (p.matchTotalCount || 0) + 1; 
        
        if (p.isCorrect === true) {
            p.matchCorrectCount = (p.matchCorrectCount || 0) + 1; 
        } else {
            p.matchCorrectCount = (p.matchCorrectCount || 0); 
        }
    });
  }

  checkVictory() {
      // 1. Calcul des points Max Possibles
      const totalRounds = this.playlist.length;
      let maxPointsPerRound = 5; // Par défaut (Typing)
      
      if (this.settings.responseType === 'qcm') maxPointsPerRound = GAME_CONFIG.SCORING.QCM;
      else if (this.settings.responseType === 'duo') maxPointsPerRound = GAME_CONFIG.SCORING.DUO;
      
      const maxPossibleScore = totalRounds * maxPointsPerRound;

      // 2. Tri des joueurs
      const rankedPlayers = Array.from(this.players.values())
        .sort((a, b) => b.score - a.score);

      // 3. Détermination des gagnants (Solo vs Multi)
      const winnerIds: string[] = [];
      let winnerCount = 1;
      let soloTargetScore = 0;
      let soloDifficultyLabel = "Normal";

      // MODE SOLO
      if (this.settings.maxPlayers === 1 || this.players.size === 1) {
          // Calcul du pourcentage requis
          let requiredRatio = GAME_CONFIG.VICTORY_CONDITIONS.SOLO.HARD; // Défaut 50%
          soloDifficultyLabel = "Difficile";

          if (this.settings.precision === 'exact') {
              requiredRatio = GAME_CONFIG.VICTORY_CONDITIONS.SOLO.EXACT; // 50% si Nom Exact
              soloDifficultyLabel = "Exact";
          } else {
              // On regarde la difficulté (array). On prend la plus simple si "Mixed", ou la valeur si unique.
              const diffs = this.settings.difficulty || [];
              if (diffs.includes('easy')) {
                  requiredRatio = GAME_CONFIG.VICTORY_CONDITIONS.SOLO.EASY; // 60%
                  soloDifficultyLabel = "Facile";
              } else if (diffs.includes('medium')) {
                  requiredRatio = GAME_CONFIG.VICTORY_CONDITIONS.SOLO.MEDIUM; // 55%
                  soloDifficultyLabel = "Moyen";
              }
          }

          soloTargetScore = Math.ceil(maxPossibleScore * requiredRatio);
          const player = rankedPlayers[0];

          if (player && player.score >= soloTargetScore) {
              winnerIds.push(String(player.id));
          }
      } 
      // MODE MULTI
      else {
          if (this.players.size >= GAME_CONFIG.VICTORY_CONDITIONS.MULTI.PODIUM_THRESHOLD) {
              winnerCount = 3; // Top 3 gagne
          }
          
          // On prend les N premiers (si score > 0 pour éviter les AFK complets gagnants)
          for (let i = 0; i < Math.min(winnerCount, rankedPlayers.length); i++) {
              if (rankedPlayers[i].score > 0) {
                  winnerIds.push(String(rankedPlayers[i].id));
              }
          }
      }

      logger.info(`[StandardGame] [${this.id}] Fin de partie. Mode: ${this.players.size === 1 ? 'Solo' : 'Multi'}. Gagnants: ${winnerIds.length}`, 'Game');

      // 4. Sauvegarde
      void saveGameHistory(Array.from(this.players.values()), this.playlist, winnerIds);

      this.status = 'finished';
      
      // 5. Envoi au client
      this.io.to(this.id).emit('game_over', { 
          victoryData: {
              winner: winnerIds.length > 0 ? rankedPlayers[0] : null,
              winnerIds: winnerIds,
              rankings: rankedPlayers,
              totalMaxScore: maxPossibleScore,
              soloTargetScore: soloTargetScore,
              soloDifficulty: soloDifficultyLabel,
              multiWinnerCount: winnerCount
          }
      });
  }
}