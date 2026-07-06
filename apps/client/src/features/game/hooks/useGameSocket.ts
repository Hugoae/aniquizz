// Single Socket.io subscription for a match. Owns the game reducer and translates
// the typed server contract into reducer actions. UI concerns (video, input,
// dialogs, animations) stay in the page; this hook is the state boundary.

import { useEffect, useReducer, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { socket } from '@/lib/socket';
import type {
  AnimeListEntry,
  AnsweredPayload,
  AnswerType,
  GamePlayer,
  GameStartedPayload,
  GameSyncState,
  PlayersUpdatePayload,
  RoundRevealPayload,
  RoundStartPayload,
  VictoryData,
  VoteUpdatePayload,
} from '@aniquizz/shared';
import {
  createInitialState,
  gameReducer,
  type GameState,
} from '../state/gameReducer';

interface UseGameSocketOptions {
  roomId: string;
  currentUserId?: string;
  initialPlayers?: GamePlayer[];
  initialTotalRounds: number;
  initialFirstVideo?: string | null;
  anilistUsername?: string | null;
  onCancelled?: () => void;
  onClosed?: () => void;
}

export interface GameActions {
  answer: (value: string, answerType: AnswerType) => void;
  votePause: () => void;
  voteSkip: () => void;
  skipRound: () => void;
  returnToLobby: () => void;
  cancel: () => void;
  requestSync: () => void;
}

export interface UseGameSocketResult {
  state: GameState;
  animeList: AnimeListEntry[];
  myWatchedIds: number[];
  actions: GameActions;
}

export function useGameSocket({
  roomId,
  currentUserId,
  initialPlayers = [],
  initialTotalRounds,
  initialFirstVideo = null,
  anilistUsername,
  onCancelled,
  onClosed,
}: UseGameSocketOptions): UseGameSocketResult {
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    () => {
      const init = createInitialState(initialTotalRounds, initialPlayers);
      init.nextVideoKey = initialFirstVideo;
      return init;
    },
  );

  const [animeList, setAnimeList] = useState<AnimeListEntry[]>([]);
  const [myWatchedIds, setMyWatchedIds] = useState<number[]>([]);

  const resumeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCancelledRef = useRef(onCancelled);
  onCancelledRef.current = onCancelled;
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;

  // --- Anime autocomplete list + personal watched list ---
  useEffect(() => {
    const onAnimeList = (list: AnimeListEntry[]) => setAnimeList(list);
    const onMyWatched = (ids: number[]) => setMyWatchedIds(ids);
    socket.on('anime_list', onAnimeList);
    socket.on('my_watched_list', onMyWatched);
    socket.emit('get_anime_list');
    if (anilistUsername) socket.emit('get_my_watched', { username: anilistUsername });
    return () => {
      socket.off('anime_list', onAnimeList);
      socket.off('my_watched_list', onMyWatched);
    };
  }, [anilistUsername]);

  // --- Match event subscription ---
  useEffect(() => {
    if (!roomId) return;

    socket.emit('get_game_state', { roomId });

    const clearResumeTimer = () => {
      if (resumeTimerRef.current) {
        clearInterval(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
    };

    const handlers = {
      game_state_sync: (s: GameSyncState) => dispatch({ type: 'SYNC', state: s }),
      game_started: (p: GameStartedPayload) => dispatch({ type: 'GAME_STARTED', payload: p }),
      round_start: (p: RoundStartPayload) => dispatch({ type: 'ROUND_START', payload: p }),
      'game:answered': (p: AnsweredPayload) => dispatch({ type: 'ANSWERED', userId: p.userId }),
      round_reveal: (p: RoundRevealPayload) =>
        dispatch({ type: 'ROUND_REVEAL', payload: p, myUserId: currentUserId }),
      update_players: (p: PlayersUpdatePayload) => dispatch({ type: 'PLAYERS_UPDATE', payload: p }),
      game_over: (p: { victoryData: VictoryData }) =>
        dispatch({ type: 'GAME_OVER', victoryData: p.victoryData }),
      vote_update: (p: VoteUpdatePayload) => dispatch({ type: 'VOTE_UPDATE', payload: p }),
      game_paused: (p: { isPaused: boolean }) => dispatch({ type: 'PAUSED', isPaused: p.isPaused }),
      game_resuming: (p: { duration: number }) => {
        clearResumeTimer();
        let remaining = p.duration;
        dispatch({ type: 'RESUME_SET', value: remaining });
        resumeTimerRef.current = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            clearResumeTimer();
            dispatch({ type: 'RESUME_SET', value: null });
          } else {
            dispatch({ type: 'RESUME_SET', value: remaining });
          }
        }, 1000);
      },
      'game:fallback_notification': (p: { message: string }) => {
        toast.warning('Info Playlist', { description: p.message, duration: 6000 });
      },
      game_cancelled: (p?: { reason?: string }) => {
        toast.error(p?.reason || "Partie annulée par l'hôte.");
        onCancelledRef.current?.();
      },
      room_closed: (p?: { reason?: string }) => {
        toast.error(p?.reason || 'Salon fermé.');
        onClosedRef.current?.();
      },
      error: (p: { message: string }) => {
        toast.error(p.message || 'Erreur');
      },
    };

    socket.on('game_state_sync', handlers.game_state_sync);
    socket.on('game_started', handlers.game_started);
    socket.on('round_start', handlers.round_start);
    socket.on('game:answered', handlers['game:answered']);
    socket.on('round_reveal', handlers.round_reveal);
    socket.on('update_players', handlers.update_players);
    socket.on('game_over', handlers.game_over);
    socket.on('vote_update', handlers.vote_update);
    socket.on('game_paused', handlers.game_paused);
    socket.on('game_resuming', handlers.game_resuming);
    socket.on('game:fallback_notification', handlers['game:fallback_notification']);
    socket.on('game_cancelled', handlers.game_cancelled);
    socket.on('room_closed', handlers.room_closed);
    socket.on('error', handlers.error);

    return () => {
      clearResumeTimer();
      socket.off('game_state_sync', handlers.game_state_sync);
      socket.off('game_started', handlers.game_started);
      socket.off('round_start', handlers.round_start);
      socket.off('game:answered', handlers['game:answered']);
      socket.off('round_reveal', handlers.round_reveal);
      socket.off('update_players', handlers.update_players);
      socket.off('game_over', handlers.game_over);
      socket.off('vote_update', handlers.vote_update);
      socket.off('game_paused', handlers.game_paused);
      socket.off('game_resuming', handlers.game_resuming);
      socket.off('game:fallback_notification', handlers['game:fallback_notification']);
      socket.off('game_cancelled', handlers.game_cancelled);
      socket.off('room_closed', handlers.room_closed);
      socket.off('error', handlers.error);
    };
  }, [roomId, currentUserId]);

  const answer = useCallback(
    (value: string, answerType: AnswerType) => {
      socket.emit('game:answer', { roomId, answer: value, answerType });
    },
    [roomId],
  );
  const votePause = useCallback(() => socket.emit('vote_pause', { roomId }), [roomId]);
  const voteSkip = useCallback(() => socket.emit('vote_skip', { roomId }), [roomId]);
  const skipRound = useCallback(() => socket.emit('game:skip_round', { roomId }), [roomId]);
  const returnToLobby = useCallback(() => socket.emit('game:return_to_lobby', { roomId }), [roomId]);
  const cancel = useCallback(() => socket.emit('game:cancel', { roomId }), [roomId]);
  const requestSync = useCallback(() => socket.emit('get_game_state', { roomId }), [roomId]);

  return {
    state,
    animeList,
    myWatchedIds,
    actions: { answer, votePause, voteSkip, skipRound, returnToLobby, cancel, requestSync },
  };
}
