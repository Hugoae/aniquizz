import { Server } from 'socket.io';
import { GamePlayer, GAME_CONFIG } from '@aniquizz/shared';
import { logger } from '../../../utils/logger';
import { getRandomSongs, generateChoices, generateDuo, SongFilters, saveGameHistory } from '../gameService';
import { getUserAnimeIds } from '../../anilist/anilistService'; 
import { prisma } from '@aniquizz/database';

export abstract class GameCore {
  public id: string;
  public io: Server;
  public players: Map<string, GamePlayer>;
  public hostId: string;
  public status: 'waiting' | 'playing' | 'paused' | 'finished';
  public settings: any;

  protected currentRoundIndex: number = -1; 
  protected playlist: any[] = [];
  
  protected roundTimer: NodeJS.Timeout | null = null;
  protected revealTimer: NodeJS.Timeout | null = null;
  protected roundStartTime: number = 0;
  
  protected isRoundEnded: boolean = false;
  protected pauseVotes: Set<string> = new Set();
  protected skipVotes: Set<string> = new Set();
  protected isPausePending: boolean = false;
  protected isRoundLoading: boolean = false;

  protected currentRoundData: any = null;
  protected readonly revealDuration: number = 5;

  protected returnedPlayers: Set<string> = new Set(); 

  constructor(id: string, io: Server, hostId: string, settings: any = {}) {
    this.id = id;
    this.io = io;
    this.hostId = hostId;
    this.players = new Map();
    this.status = 'waiting';
    this.settings = settings;
  }

  // ✅ CORRECTION ICI : checkVictory n'est plus abstrait car on l'a codé plus bas
  abstract handleAnswer(playerId: string, answer: string, mode: string): void;
  abstract onRoundEnd(): void;
  // abstract checkVictory(): void; <--- LIGNE SUPPRIMÉE

  addPlayer(socketId: string, username: string, avatar: string, isReady: boolean = false) {
    const newPlayer: GamePlayer = {
      id: socketId, username, avatar, score: 0, streak: 0, isConnected: true, isReady: isReady
    };
    this.players.set(socketId, newPlayer);
    this.emitLobbyUpdate();
  }

  removePlayer(socketId: string) {
    if (this.players.has(socketId)) {
      this.players.delete(socketId);
      this.returnedPlayers.delete(String(socketId)); 
      
      const remainingIds = Array.from(this.players.keys());
      const allReturned = remainingIds.every(id => this.returnedPlayers.has(String(id)));

      if (this.players.size === 0 || allReturned) {
          this.resetToWaiting();
      } else {
          this.emitLobbyUpdate();
      }
    }
    
    if (this.players.size === 0) {
        this.stopGame();
    }
  }

  stopGame() {
      this.cleanupTimers();
      this.status = 'finished';
      logger.info(`[GameCore] Partie ${this.id} arrêtée (vide).`, 'GameCore');
  }

  public cancelGame() {
      logger.info(`[GameCore] Partie ${this.id} annulée par l'hôte.`, 'GameCore');
      this.resetToWaiting();
      this.io.to(this.id).emit('game_cancelled'); 
      this.emitLobbyUpdate();
  }

  protected resetToWaiting() {
      logger.info(`[GameCore] Reset de la partie ${this.id} vers Waiting.`, 'GameCore');
      this.cleanupTimers();
      
      this.status = 'waiting';
      this.currentRoundIndex = -1;
      this.returnedPlayers.clear();
      
      this.pauseVotes.clear();
      this.skipVotes.clear();
      this.isPausePending = false;
      this.isRoundLoading = false;
      this.isRoundEnded = false;
  }

  protected cleanupTimers() {
      if (this.roundTimer) { clearTimeout(this.roundTimer); this.roundTimer = null; }
      if (this.revealTimer) { clearTimeout(this.revealTimer); this.revealTimer = null; }
  }

  public playerReturnToLobby(playerId: string) {
      this.returnedPlayers.add(String(playerId));
      
      const player = this.players.get(playerId);
      if (player) {
          player.isReady = (String(playerId) === String(this.hostId));
      }

      const allBack = Array.from(this.players.keys()).every(id => this.returnedPlayers.has(String(id)));
      
      if (allBack) {
          this.resetToWaiting();
      }
      
      this.emitLobbyUpdate();
  }

  public hasReturned(playerId: string): boolean {
      return this.returnedPlayers.has(String(playerId));
  }

  public getSyncState() {
      const currentSong = this.currentRoundIndex >= 0 ? this.playlist[this.currentRoundIndex] : null;
      const isIntro = this.status === 'playing' && this.currentRoundIndex === -1;

      return {
          status: this.status,
          currentRound: this.currentRoundIndex + 1,
          totalRounds: this.playlist.length,
          players: Array.from(this.players.values()),
          isIntro: isIntro,
          roundData: (this.status === 'playing' && !this.isRoundEnded && !isIntro && currentSong) ? {
              videoKey: currentSong.videoKey,
              videoStartTime: currentSong.videoStartTime || 0,
              duration: currentSong.guessDuration,
              elapsed: (Date.now() - this.roundStartTime) / 1000, 
              choices: this.currentRoundData?.choices,
              duo: this.currentRoundData?.duo
          } : null,
          revealData: (this.status === 'playing' && this.isRoundEnded && currentSong) ? {
              song: currentSong,
              nextVideo: this.playlist[this.currentRoundIndex + 1]?.videoKey,
              duration: GAME_CONFIG.TIMERS.GUESS_REVEAL / 1000
          } : null,
          introData: isIntro ? { firstVideo: this.playlist[0]?.videoKey } : null
      };
  }

  protected emitLobbyUpdate() {
    const playersList = Array.from(this.players.values()).map(p => ({
        ...p,
        isHost: String(p.id) === String(this.hostId),
        isInGame: (this.status === 'playing' || this.status === 'finished') && !this.returnedPlayers.has(String(p.id))
    }));

    this.io.to(this.id).emit('update_players', { 
        players: playersList, 
        hostId: this.hostId,
        status: this.status 
    });
  }

  public togglePause(playerId: string) {
    if (this.isRoundLoading) return;
    if (this.status !== 'playing' && this.status !== 'paused') return;
    if (this.status === 'paused') { this.resumeGame(); return; }
    if (this.pauseVotes.has(playerId)) this.pauseVotes.delete(playerId); else this.pauseVotes.add(playerId);
    const required = Math.ceil(this.players.size / 2);
    this.isPausePending = this.pauseVotes.size >= required;
    this.io.to(this.id).emit('vote_update', { type: 'pause', count: this.pauseVotes.size, required, isPending: this.isPausePending });
  }

  protected pauseGame() {
    this.cleanupTimers();
    this.status = 'paused';
    this.isPausePending = false;
    this.pauseVotes.clear();
    this.io.to(this.id).emit('game_paused', { isPaused: true });
  }

  protected resumeGame() {
    this.io.to(this.id).emit('game_resuming', { duration: 3 });
    setTimeout(() => {
      this.status = 'playing';
      this.io.to(this.id).emit('game_paused', { isPaused: false });
      if (this.isRoundEnded) { void this.nextRound(); } else { this.endRound(); }
    }, 3000);
  }

  public voteSkip(playerId: string) {
      if (this.status !== 'playing' || this.isRoundLoading) return;
      this.skipVotes.add(playerId);
      const required = Math.ceil(this.players.size / 2);
      this.io.to(this.id).emit('vote_update', { type: 'skip', count: this.skipVotes.size, required });
      
      if (this.skipVotes.size >= required) {
          if (this.isRoundEnded) {
              if (this.revealTimer) clearTimeout(this.revealTimer);
              if (this.isPausePending) {
                  this.pauseGame();
              } else {
                  void this.nextRound();
              }
          } else {
              if (this.roundTimer) clearTimeout(this.roundTimer);
              this.endRound();
          }
      }
  }

  public forceEndRound() { 
      if (!this.isRoundEnded && !this.isRoundLoading) this.endRound(); 
  }

  public async startGame() {
    if (this.status === 'playing') return;
    logger.info(`Démarrage partie ${this.id}`, 'GameCore');

    try {
        this.returnedPlayers.clear();
        this.players.forEach(p => { 
            p.score = 0; 
            p.streak = 0; 
            p.isCorrect = null;
            p.currentAnswer = null;
            p.roundPoints = 0;
            p.isReady = (String(p.id) === String(this.hostId));
        });

        let watchedIds: number[] = [];
        const isWatchedMode = this.settings.soundSelection === 'watched';

        if (isWatchedMode) {
            const playersList = Array.from(this.players.values());
            
            const usernames = playersList.map(p => p.username);
            const dbProfiles = await prisma.profile.findMany({
                where: { username: { in: usernames } },
                select: { username: true, anilistUsername: true }
            });

            const anilistUsernames: string[] = [];
            playersList.forEach(p => {
                if ((p as any).anilistUsername) {
                    anilistUsernames.push((p as any).anilistUsername);
                } else {
                    const profile = dbProfiles.find(dp => dp.username === p.username);
                    if (profile?.anilistUsername) {
                        anilistUsernames.push(profile.anilistUsername);
                    }
                }
            });

            if (anilistUsernames.length > 0) {
                 logger.info(`Récupération listes pour: ${anilistUsernames.join(', ')}`, 'GameCore');
                 const lists = await Promise.all(anilistUsernames.map(async u => await getUserAnimeIds(u)));
                 
                 const validLists = lists.filter(l => l.length > 0);

                 if (this.settings.watchedMode === 'intersection') {
                    if (validLists.length < this.players.size) {
                        watchedIds = []; 
                        logger.info("Mode Intersection : Un ou plusieurs joueurs n'ont pas de liste. Résultat commun vide.", 'GameCore');
                    } else {
                        watchedIds = validLists.reduce((acc, curr) => acc.filter(id => curr.includes(id)), validLists[0]);
                    }
                 } else {
                    const unionSet = new Set<number>(); 
                    validLists.flat().forEach(id => unionSet.add(id)); 
                    watchedIds = Array.from(unionSet);
                 }
            } else {
                watchedIds = [];
                logger.warn("Aucun pseudo AniList trouvé parmi les joueurs.", 'GameCore');
            }
        }
        
        const filters: SongFilters = { 
            difficulty: this.settings.difficulty, 
            types: this.settings.soundTypes, 
            playlist: this.settings.playlist, 
            decade: this.settings.decade, 
            watchedIds: isWatchedMode ? watchedIds : undefined 
        };

        const { songs, fallbackUsed } = await getRandomSongs(this.settings.soundCount || 10, filters);
        
        if (!songs || songs.length === 0) {
            this.io.to(this.id).emit('error', { message: "Aucun son trouvé." });
            return;
        }

        this.playlist = songs.map(item => ({
            id: item.id, 
            anime: item.anime.name, 
            validAnswers: [item.anime.name, ...(item.anime.altNames || []), item.anime.franchise?.name].filter(Boolean) as string[],
            title: item.title, 
            artist: item.artist, 
            type: item.type,
            difficulty: item.difficulty,
            videoKey: item.videoKey, 
            videoStartTime: 0,
            guessDuration: this.settings.guessDuration || 20, 
            cover: item.anime.coverImage, 
            animeId: item.anime.id, 
            franchise: item.anime.franchise?.name,
            tags: item.anime.franchise?.genres || [],
            year: item.anime.seasonYear,
            siteUrl: item.anime.siteUrl || `https://anilist.co/anime/${item.anime.id}`
        }));

        this.status = 'playing';
        this.currentRoundIndex = -1; 

        this.io.to(this.id).emit('game_started', {
            roomId: this.id, settings: this.settings, players: Array.from(this.players.values()),
            introDuration: 3000, firstVideo: this.playlist[0]?.videoKey, firstChoices: [], firstDuoChoices: []
        });

        if (fallbackUsed) {
            setTimeout(() => {
                const message = this.settings.watchedMode === 'intersection' 
                    ? "Pas assez de sons communs (ou un joueur sans liste). Ajout de sons aléatoires."
                    : "Pas assez de sons dans votre liste. Ajout de sons aléatoires.";
                
                this.io.to(this.id).emit('game:fallback_notification', { message });
            }, 1000); 
        }
        
        setTimeout(() => { void this.startRound(); }, 3000);

    } catch (error) {
        logger.error("Start Error", "Game", error);
        this.status = 'waiting'; 
        this.io.to(this.id).emit('error', { message: "Erreur technique." });
    }
  }

  protected async startRound() {
    this.cleanupTimers();

    this.isRoundLoading = true;
    this.currentRoundIndex++; 

    if (this.currentRoundIndex >= this.playlist.length) { this.checkVictory(); return; }

    try {
        const song = this.playlist[this.currentRoundIndex];
        
        this.isRoundEnded = false;
        this.skipVotes.clear(); 
        this.pauseVotes.clear(); 
        this.isPausePending = false;
        
        const requiredVotes = Math.ceil(this.players.size / 2);
        
        this.io.to(this.id).emit('vote_update', { type: 'skip', count: 0, required: requiredVotes });
        this.io.to(this.id).emit('vote_update', { type: 'pause', count: 0, required: requiredVotes, isPending: false });
        
        const precision = this.settings.precision || 'franchise';
        const correctTarget = precision === 'franchise' ? (song.franchise || song.anime) : song.anime;
        const choicesPromise = generateChoices(correctTarget, precision, { playlist: this.settings.playlist, decade: this.settings.decade });
        const duoPromise = generateDuo(correctTarget, choicesPromise);
        const [choices, duo] = await Promise.all([choicesPromise, duoPromise]);

        this.currentRoundData = { choices, duo };

        this.players.forEach(p => { p.currentAnswer = null; p.isCorrect = null; p.roundPoints = 0; });
        this.io.to(this.id).emit('update_players', { players: Array.from(this.players.values()) });

        this.roundStartTime = Date.now();
        this.isRoundLoading = false;

        this.io.to(this.id).emit('round_start', {
          round: this.currentRoundIndex + 1,
          totalRounds: this.playlist.length,
          videoKey: song.videoKey,
          videoStartTime: song.videoStartTime,
          duration: song.guessDuration,
          choices: choices, 
          duo: duo
        });

        this.roundTimer = setTimeout(() => {
            this.endRound();
        }, (song.guessDuration * 1000) + 500);

    } catch (e) {
        logger.error(`Erreur Round ${this.currentRoundIndex}`, "GameCore", e);
        this.isRoundLoading = false;
        this.endRound(); 
    }
  }

  protected endRound() {
    if (this.isRoundLoading) return;
    if (this.isRoundEnded) return;
    
    this.isRoundEnded = true;
    if (this.roundTimer) clearTimeout(this.roundTimer);

    const song = this.playlist[this.currentRoundIndex];
    if (!song) return;

    this.onRoundEnd(); 

    const revealMs = GAME_CONFIG.TIMERS.GUESS_REVEAL;
    const revealSeconds = Math.max(1, Math.round(revealMs / 1000));

    const nextVideo = this.playlist[this.currentRoundIndex + 1]?.videoKey ?? null;

    this.io.to(this.id).emit('round_reveal', {
        song,
        players: Array.from(this.players.values()),
        duration: revealSeconds,
        nextVideo: nextVideo,
    });

    this.revealTimer = setTimeout(() => {
        this.revealTimer = null;
        if (this.isPausePending) { this.pauseGame(); return; }
        void this.nextRound();
    }, revealMs);
  }

  protected async nextRound() {
      void this.startRound();
  }

  checkVictory() {
      const rankedPlayers = Array.from(this.players.values())
        .sort((a, b) => b.score - a.score);

      const winner = rankedPlayers.length > 0 ? rankedPlayers[0] : null;

      saveGameHistory(Array.from(this.players.values()), this.playlist, winner?.id as string)
        .catch(err => logger.error("Erreur saveGameHistory", "GameCore", err));

      this.status = 'finished';
      this.io.to(this.id).emit('game_over', { 
          victoryData: {
              winner: winner,
              rankings: rankedPlayers
          }
      });
  }
}