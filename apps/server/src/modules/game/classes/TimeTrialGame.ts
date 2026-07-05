import { GameCore } from './GameCore';
import { isAnswerCorrect, GAME_CONFIG } from '@aniquizz/shared';
import { logger } from '../../../utils/logger';
import { saveGameHistory } from '../gameService';

export class TimeTrialGame extends GameCore {
    private timeRemaining: number = 0;
    private maxTime: number = GAME_CONFIG.TIME_TRIAL.MAX_TIME;
    private gameLoopInterval: NodeJS.Timeout | null = null;

    // Timestamp de départ (début effectif de survie, après l'intro)
    private gameStartTime: number = 0;

    // Historique de la session (affiché côté client)
    private sessionHistory: any[] = [];

    constructor(id: string, io: any, hostId: string, settings: any) {
        super(id, io, hostId, settings);
    }

    public async startGame() {
        // Reset state propre au mode
        this.timeRemaining = this.settings.startingTime || 30;
        this.sessionHistory = [];
        this.gameStartTime = 0;

        // Le client TimeTrial dépend de timer_sync pour afficher immédiatement
        this.io.to(this.id).emit('timer_sync', {
            time: this.timeRemaining,
            maxTime: this.maxTime
        });

        // ⚠️ IMPORTANT : ne PAS setter this.status = 'playing' ici.
        // GameCore.startGame() a un guard `if (status === 'playing') return;`
        // et c'est aussi lui qui génère la playlist + émet game_started.
        await super.startGame();

        // Si GameCore n'a pas pu démarrer (playlist vide/erreur), on ne lance pas les timers.
        if (this.status !== 'playing') return;

        // Démarrage du chrono de survie après l'intro (doit matcher GameCore.TIMERS.INTRO_DELAY / introDuration)
        const INTRO_MS = GAME_CONFIG.TIMERS?.INTRO_DELAY ?? 3000;

        setTimeout(() => {
            // On s'assure que la partie est toujours en cours et qu'on ne double-start pas.
            if (this.status === 'playing' && this.gameStartTime === 0) {
                this.gameStartTime = Date.now();
                logger.info(`[TimeTrialGame] [${this.id}] Démarrage Chrono Survie. StartTime=${this.gameStartTime}`, 'Game');
                this.startGameLoop();
            }
        }, INTRO_MS);
    }

    private startGameLoop() {
        if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);

        this.gameLoopInterval = setInterval(() => {
            if (this.status !== 'playing') return;

            this.timeRemaining--;

            this.io.to(this.id).emit('timer_sync', {
                time: this.timeRemaining,
                maxTime: this.maxTime
            });

            if (this.timeRemaining <= 0) {
                if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
                this.handleGameOver("Time's Up");
            }
        }, 1000);
    }

    protected async startRound() {
        this.isRoundLoading = true;
        this.currentRoundIndex++;

        if (this.currentRoundIndex >= this.playlist.length) {
            this.handleGameOver("Playlist Completed");
            return;
        }

        const song = this.playlist[this.currentRoundIndex];
        this.isRoundEnded = false;

        this.io.to(this.id).emit('round_start', {
            round: this.currentRoundIndex + 1,
            totalRounds: this.playlist.length,
            videoKey: song.videoKey,
            videoStartTime: song.videoStartTime,
            duration: 9999,
            startBuffer: this.startBuffer,
            history: this.sessionHistory,
            choices: [],
            duo: []
        });

        this.isRoundLoading = false;
    }

    handleAnswer(playerId: string, answer: string, mode: string) {
        if (this.status !== 'playing') return;

        const player = this.players.get(playerId);
        const currentSong = this.playlist[this.currentRoundIndex];

        if (!player || !currentSong) return;

        const isCorrect = isAnswerCorrect(answer, currentSong.validAnswers);

        if (isCorrect) {
            const bonus = GAME_CONFIG.TIME_TRIAL.BONUS_TIME;
            this.addTime(bonus);

            player.score += 1;
            player.roundPoints = 1;
            player.isCorrect = true;
            player.currentAnswer = answer;
            player.streak = (player.streak || 0) + 1;

            this.addToHistory(currentSong, 'success');

            this.io.to(this.id).emit('answer_result', {
                playerId,
                isCorrect: true,
                bonus: bonus,
                time: this.timeRemaining,
                maxTime: this.maxTime
            });

            this.emitLobbyUpdate();
            void this.startRound();
        } else {
            player.streak = 0;
            this.emitLobbyUpdate();

            this.io.to(this.id).emit('answer_result', {
                playerId,
                isCorrect: false,
                bonus: 0
            });
        }
    }

    public voteSkip(playerId: string) {
        if (this.status !== 'playing') return;

        const player = this.players.get(playerId);
        if (player) player.streak = 0;

        const currentSong = this.playlist[this.currentRoundIndex];
        const penalty = GAME_CONFIG.TIME_TRIAL.PENALTY_SKIP;

        this.removeTime(penalty);

        // Si le removeTime a terminé la partie, on stop là.
        if (this.status !== 'playing') return;

        this.addToHistory(currentSong, 'skip');

        this.io.to(this.id).emit('answer_result', {
            playerId,
            isCorrect: false,
            isSkip: true,
            penalty: penalty,
            time: this.timeRemaining,
            maxTime: this.maxTime
        });

        this.emitLobbyUpdate();
        void this.startRound();
    }

    private addToHistory(song: any, status: 'success' | 'skip') {
        if (!song) return;
        this.sessionHistory.unshift({
            id: song.id,
            anime: song.anime,
            title: song.title,
            type: song.type,
            cover: song.cover,
            status: status
        });
    }

    public getSyncState() {
        const baseState = super.getSyncState();
        return { ...baseState, history: this.sessionHistory };
    }

    private addTime(seconds: number) {
        this.timeRemaining = Math.min(this.timeRemaining + seconds, this.maxTime);
    }

    private removeTime(seconds: number) {
        this.timeRemaining = Math.max(0, this.timeRemaining - seconds);
        if (this.timeRemaining <= 0) {
            this.handleGameOver("Time's Up");
        }
    }

    private handleGameOver(reason: string) {
        this.cleanupTimers();
        this.timeRemaining = 0;
        logger.info(`[TimeTrialGame] [${this.id}] Fin de partie : ${reason}`, 'Game');
        this.checkVictory();
    }

    checkVictory() {
        const player = Array.from(this.players.values())[0];
        if (!player) return;

        const endTime = Date.now();
        const survivalTime = this.gameStartTime > 0 ? (endTime - this.gameStartTime) / 1000 : 0;

        const initialTime = this.settings.startingTime || 30;

        // Détermination difficulté (robuste)
        let diffKey: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM';
        let diffLabel = 'MOYEN';

        const difficultySetting = Array.isArray(this.settings.difficulty)
            ? this.settings.difficulty
            : [this.settings.difficulty];

        if (difficultySetting.includes('hard')) { diffKey = 'HARD'; diffLabel = 'DIFFICILE'; }
        else if (difficultySetting.includes('medium')) { diffKey = 'MEDIUM'; diffLabel = 'MOYEN'; }
        else if (difficultySetting.includes('easy')) { diffKey = 'EASY'; diffLabel = 'FACILE'; }

        // Objectif: temps initial * multiplicateur (défini dans constants)
        // NOTE: dead mode kept until Phase 4. TIME_TRIAL is keyed by time, not
        // difficulty, so this lookup is undefined at runtime -> multiplier 1.6.
        const timeTrialGoals = GAME_CONFIG.VICTORY_CONDITIONS?.TIME_TRIAL as unknown as
            | Record<string, number>
            | undefined;
        const multiplier = timeTrialGoals?.[diffKey] ?? 1.6;
        const targetTime = initialTime * multiplier;

        const isVictory = survivalTime >= targetTime;

        logger.info(
            `[TimeTrialGame] RESULTS -> StartTime: ${this.gameStartTime}, Now: ${endTime}, Survie: ${survivalTime}s. Target: ${targetTime}s (Diff: ${diffLabel} x${multiplier})`,
            'Game'
        );

        saveGameHistory(Array.from(this.players.values()), this.playlist, isVictory ? [String(player.id)] : [])
            .catch(err => logger.error(`[TimeTrialGame] Erreur save stats`, "Game", err));

        this.status = 'finished';

        this.io.to(this.id).emit('game_over', {
            victoryData: {
                isVictory,
                survivalTime,
                targetTime,
                difficultyLabel: diffLabel,
                totalFound: player.score,
                historyCount: this.sessionHistory.length
            }
        });
    }

    protected cleanupTimers() {
        super.cleanupTimers();
        if (this.gameLoopInterval) { clearInterval(this.gameLoopInterval); this.gameLoopInterval = null; }
    }

    stopGame() {
        this.cleanupTimers();
        super.stopGame();
    }

    onRoundEnd() {}
}
