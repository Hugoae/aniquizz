import { GameCore } from './GameCore';
import { isAnswerCorrect } from '../../../utils/stringUtils';

export class StandardGame extends GameCore {
  
  handleAnswer(playerId: string, answer: string, mode: string) {
    const player = this.players.get(playerId);
    const currentSong = this.playlist[this.currentRoundIndex];

    // Si déjà répondu ou pas de son, on ignore
    if (!player || !currentSong || player.isCorrect !== null) return;

    const isCorrect = isAnswerCorrect(answer, currentSong.validAnswers);

    if (isCorrect) {
        let points = 0;
        switch (mode) {
            case 'typing': points = 5; break;
            case 'carre': points = 2; break; 
            case 'duo': points = 1; break;   
            default: points = 5; 
        }

        player.isCorrect = true;
        player.currentAnswer = answer;
        player.roundPoints = points;
        
        // ⚠️ CHANGEMENT : On ne touche PAS au streak ici pour éviter le spoil visuel
        // Le streak sera mis à jour dans onRoundEnd()

    } else {
        player.currentAnswer = answer;
        player.isCorrect = false;
        player.roundPoints = 0;
    }

    this.io.to(this.id).emit('update_players', { players: Array.from(this.players.values()) });
  }

  onRoundEnd() {
    this.players.forEach(p => {
        // Si le joueur n'a pas répondu, on met des valeurs par défaut
        if (p.isCorrect === undefined || p.isCorrect === null) {
            p.isCorrect = false;
            p.currentAnswer = null; 
            p.roundPoints = 0;
        }

        // 1. Ajout des points au score global
        p.score += (p.roundPoints || 0);

        // 2. Gestion du Streak (C'est ici que ça doit se passer)
        if (p.isCorrect === true) {
            p.streak = (p.streak || 0) + 1; // ✅ On augmente le streak seulement à la fin
        } else {
            p.streak = 0; // ❌ On reset si faux ou pas répondu
        }
    });
  }

  checkVictory() {
      const rankedPlayers = Array.from(this.players.values())
        .sort((a, b) => b.score - a.score);

      this.status = 'finished';
      this.io.to(this.id).emit('game_over', { 
          victoryData: {
              winner: rankedPlayers[0],
              rankings: rankedPlayers
          }
      });
  }
}