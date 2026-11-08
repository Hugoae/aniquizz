// Single Socket.io subscription for a match. Owns the game reducer and translates
// the typed server contract into reducer actions. UI concerns (video, input,
// dialogs, animations) stay in the page; this hook is the state boundary.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { notifyModerationBan } from '@/lib/suspension';
import { socket } from '@/lib/socket';
import { subscribeWhenSocketReady } from '@/lib/socketReady';
import type {
  AnsweredPayload,
  AnswerType,
  GamePlayer,
  GameStartedPayload,
  GameSyncState,
  GameReadyPayload,
  PlayersUpdatePayload,
  PreloadVideoPayload,
  RoundRevealPayload,
  RoundStartPayload,
  DuoChoicesPayload,
  SpeedLeaderboardPayload,
  TimeAttackBudgetPayload,
  RaceBoardPayload,
  RaceLaneDonePayload,
  VictoryData,
  VoteUpdatePayload,
  GameOverPayload,
  VideoMode,
} from '@aniquizz/shared';
import { normalizeVideoMode, GAME_CONFIG } from '@aniquizz/shared';
import { createInitialState, gameReducer, type GameState } from '../state/gameReducer';
import { playerDisplayName } from '../utils/ranking';
import { GAME_COPY, playerDisconnectedToast, playerLeftMatchToast } from '../copy/gameCopy';

interface UseGameSocketOptions {
  roomId: string;
  currentUserId?: string;
  initialPlayers?: GamePlayer[];
  initialTotalRounds: number;
  initialFirstVideo?: string | null;
  /** Lobby-selected mode — fallback when the server payload omits videoMode. */
  initialVideoMode?: VideoMode;
  /** When true, fetches the player's AniList/MAL watched ids for in-game hints. */
  watchedListLinked?: boolean;
  /** Solo skip-round recovery must never run in multiplayer. */
  isSolo?: boolean;
  onCancelled?: () => void;
  onClosed?: (reason?: string) => void;
}

export interface GameActions {
  answer: (value: string, answerType: AnswerType, revealAfterAnswer?: boolean) => void;
  votePause: () => void;
  voteSkip: () => void;
  skipRound: () => void;
  returnToLobby: () => void;
  cancel: () => void;
  requestSync: () => void;
  useDuo: () => void;
}

export interface UseGameSocketResult {
  state: GameState;
  myWatchedIds: number[];
  actions: GameActions;
}

export function useGameSocket({
  roomId,
  currentUserId,
  initialPlayers = [],
  initialTotalRounds,
  initialFirstVideo = null,
  initialVideoMode,
  watchedListLinked,
  isSolo = false,
  onCancelled,
  onClosed,
}: UseGameSocketOptions): UseGameSocketResult {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => {
    const init = createInitialState(initialTotalRounds, initialPlayers);
    init.nextVideoKey = initialFirstVideo;
    return init;
  });

  const [myWatchedIds, setMyWatchedIds] = useState<number[]>([]);

  const clientVideoModeRef = useRef<VideoMode>(normalizeVideoMode(initialVideoMode));
  const resumeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef(state.phase);
  const onCancelledRef = useRef(onCancelled);
  const onClosedRef = useRef(onClosed);
  const currentUserIdRef = useRef(currentUserId);
  const isSoloRef = useRef(isSolo);
  // Sync "latest value" refs after commit (not during render) for socket listeners.
  useLayoutEffect(() => {
    clientVideoModeRef.current = normalizeVideoMode(initialVideoMode ?? clientVideoModeRef.current);
    phaseRef.current = state.phase;
    onCancelledRef.current = onCancelled;
    onClosedRef.current = onClosed;
    currentUserIdRef.current = currentUserId;
    isSoloRef.current = isSolo;
  });

  // Track connection state across PLAYERS_UPDATE payloads so we can announce when
  // someone drops or leaves. Seeded from the initial roster (all assumed present).
  interface PresenceEntry {
    connected: boolean;
    inGame: boolean;
    username: string;
    isBot: boolean;
  }
  const [initialConnState] = useState(
    () =>
      new Map<string, PresenceEntry>(
        initialPlayers.map((p) => {
          const ext = p as GamePlayer & { name?: string };
          return [
            String(p.id),
            {
              connected: ext.isConnected !== false,
              inGame: ext.isInGame !== false,
              username: playerDisplayName(ext),
              isBot: ext.isBot === true,
            },
          ];
        }),
      ),
  );
  const connStateRef = useRef(initialConnState);

  // --- Personal watched list (autocomplete now runs server-side per keystroke) ---
  useEffect(() => {
    const onMyWatched = (ids: number[]) => setMyWatchedIds(ids);
    socket.on('my_watched_list', onMyWatched);
    if (watchedListLinked) socket.emit('get_my_watched');
    return () => {
      socket.off('my_watched_list', onMyWatched);
    };
  }, [watchedListLinked]);

  // --- Match event subscription ---
  useEffect(() => {
    if (!roomId) return;

    const stopReady = subscribeWhenSocketReady(socket, () => {
      socket.emit('get_game_state', { roomId });
    });

    const clearResumeTimer = () => {
      if (resumeTimerRef.current) {
        clearInterval(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
    };

    // Compare the incoming roster against the last known presence to surface
    // drop/leave toasts. Disconnected players stay in the roster (greyed out) so
    // they can reconnect during the grace window; a removed id means a hard leave.
    const announcePresenceChanges = (incoming: GamePlayer[]) => {
      const prev = connStateRef.current;
      const next = new Map<string, PresenceEntry>();
      const seen = new Set<string>();

      for (const player of incoming) {
        const id = String(player.id);
        seen.add(id);
        const connected = player.isConnected !== false;
        const inGame = player.isInGame !== false;
        const isBot = player.isBot === true;
        const label = playerDisplayName(player);
        next.set(id, { connected, inGame, username: label, isBot });
        const before = prev.get(id);
        if (id === String(currentUserIdRef.current) || isBot) continue;

        if (before?.connected === true && !connected) {
          toast.warning(playerDisconnectedToast(label));
        } else if (before?.inGame === true && !inGame) {
          // Returned to the lobby or otherwise left the active match roster.
          toast.info(playerLeftMatchToast(label));
        }
      }

      // Hard leave (`leave_room`) — only toast if they hadn't already left the match.
      for (const [id, before] of prev) {
        if (
          !seen.has(id) &&
          id !== String(currentUserIdRef.current) &&
          !before.isBot &&
          before.inGame
        ) {
          toast.info(playerLeftMatchToast(before.username));
        }
      }

      connStateRef.current = next;
    };

    const handlers = {
      game_state_sync: (s: GameSyncState) =>
        dispatch({ type: 'SYNC', state: s, myUserId: currentUserIdRef.current }),
      game_started: (p: GameStartedPayload) =>
        dispatch({ type: 'GAME_STARTED', payload: p, clientVideoMode: clientVideoModeRef.current }),
      'game:ready': (p: GameReadyPayload) => dispatch({ type: 'GAME_READY', payload: p }),
      round_start: (p: RoundStartPayload) =>
        dispatch({ type: 'ROUND_START', payload: p, clientVideoMode: clientVideoModeRef.current }),
      'game:duo': (p: DuoChoicesPayload) => dispatch({ type: 'DUO_CHOICES', choices: p.choices }),
      'game:answered': (p: AnsweredPayload) => dispatch({ type: 'ANSWERED', userId: p.userId }),
      'speed:leaderboard': (p: SpeedLeaderboardPayload) =>
        dispatch({ type: 'SPEED_LEADERBOARD', payload: p }),
      'timeAttack:budget': (p: TimeAttackBudgetPayload) =>
        dispatch({ type: 'TIME_ATTACK_BUDGET', payload: p }),
      'race:board': (p: RaceBoardPayload) => dispatch({ type: 'RACE_BOARD', payload: p }),
      'race:lane_done': (p: RaceLaneDonePayload) =>
        dispatch({ type: 'RACE_LANE_DONE', foundCount: p.foundCount }),
      round_reveal: (p: RoundRevealPayload) =>
        dispatch({ type: 'ROUND_REVEAL', payload: p, myUserId: currentUserIdRef.current }),
      'game:preload': (p: PreloadVideoPayload) =>
        dispatch({ type: 'PRELOAD', videoKey: p.videoKey, videoStartTime: p.videoStartTime }),
      update_players: (p: PlayersUpdatePayload) => {
        announcePresenceChanges(p.players);
        dispatch({ type: 'PLAYERS_UPDATE', payload: p });
      },
      game_over: (p: GameOverPayload) =>
        dispatch({
          type: 'GAME_OVER',
          victoryData: p.victoryData,
          roundHistoryByUserId: p.roundHistoryByUserId,
          matchSettings: p.matchSettings,
          myUserId: currentUserIdRef.current,
        }),
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
        toast.warning(GAME_COPY.toasts.playlistInfo, { description: p.message, duration: 6000 });
      },
      game_cancelled: (p?: { reason?: string }) => {
        toast.error(p?.reason || GAME_COPY.toasts.cancelledHost);
        onCancelledRef.current?.();
      },
      room_closed: (p?: { reason?: string }) => {
        const reason = p?.reason || GAME_COPY.toasts.roomClosed;
        if (!notifyModerationBan(reason)) {
          toast.error(reason);
        }
        onClosedRef.current?.(p?.reason);
      },
      error: (p: { message: string }) => {
        if (notifyModerationBan(p.message)) return;
        toast.error(p.message || GAME_COPY.toasts.genericError);
      },
    };

    socket.on('game_state_sync', handlers.game_state_sync);
    socket.on('game_started', handlers.game_started);
    socket.on('game:ready', handlers['game:ready']);
    socket.on('round_start', handlers.round_start);
    socket.on('game:duo', handlers['game:duo']);
    socket.on('game:answered', handlers['game:answered']);
    socket.on('speed:leaderboard', handlers['speed:leaderboard']);
    socket.on('timeAttack:budget', handlers['timeAttack:budget']);
    socket.on('race:board', handlers['race:board']);
    socket.on('race:lane_done', handlers['race:lane_done']);
    socket.on('round_reveal', handlers.round_reveal);
    socket.on('game:preload', handlers['game:preload']);
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
      stopReady();
      clearResumeTimer();
      socket.off('game_state_sync', handlers.game_state_sync);
      socket.off('game_started', handlers.game_started);
      socket.off('game:ready', handlers['game:ready']);
      socket.off('round_start', handlers.round_start);
      socket.off('game:duo', handlers['game:duo']);
      socket.off('game:answered', handlers['game:answered']);
      socket.off('speed:leaderboard', handlers['speed:leaderboard']);
      socket.off('timeAttack:budget', handlers['timeAttack:budget']);
      socket.off('race:board', handlers['race:board']);
      socket.off('race:lane_done', handlers['race:lane_done']);
      socket.off('round_reveal', handlers.round_reveal);
      socket.off('game:preload', handlers['game:preload']);
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
  }, [roomId]);

  // Recover from dropped round_reveal (reconnect, Render restart, etc.).
  useEffect(() => {
    if (!roomId || state.phase !== 'guessing' || state.isGamePaused || state.laneDone) return;

    const tailMs = GAME_CONFIG.TIMERS.GUESS_START_BUFFER + GAME_CONFIG.TIMERS.GUESS_END_GRACE;
    const staleAt = state.phaseEndsAt - tailMs + 1500;
    const delay = staleAt - Date.now();

    const nudgeServer = () => {
      if (phaseRef.current !== 'guessing') return;
      socket.emit('get_game_state', { roomId });
      skipTimer = window.setTimeout(() => {
        if (phaseRef.current === 'guessing' && isSoloRef.current) {
          socket.emit('game:skip_round', { roomId });
        }
      }, 800) as unknown as number;
    };

    let skipTimer: number | undefined;
    let recoveryTimer: number | undefined;

    if (delay <= 0) {
      nudgeServer();
    } else {
      recoveryTimer = window.setTimeout(nudgeServer, delay) as unknown as number;
    }

    return () => {
      window.clearTimeout(recoveryTimer);
      if (skipTimer) window.clearTimeout(skipTimer);
    };
  }, [roomId, state.phase, state.phaseEndsAt, state.isGamePaused, state.laneDone]);

  const answer = useCallback(
    (value: string, answerType: AnswerType, revealAfterAnswer?: boolean) => {
      socket.emit('game:answer', { roomId, answer: value, answerType, revealAfterAnswer });
    },
    [roomId],
  );
  const votePause = useCallback(() => socket.emit('vote_pause', { roomId }), [roomId]);
  const voteSkip = useCallback(() => socket.emit('vote_skip', { roomId }), [roomId]);
  const skipRound = useCallback(() => socket.emit('game:skip_round', { roomId }), [roomId]);
  const returnToLobby = useCallback(
    () => socket.emit('game:return_to_lobby', { roomId }),
    [roomId],
  );
  const cancel = useCallback(() => socket.emit('game:cancel', { roomId }), [roomId]);
  const requestSync = useCallback(() => socket.emit('get_game_state', { roomId }), [roomId]);
  const useDuo = useCallback(() => socket.emit('game:use_duo', { roomId }), [roomId]);

  const actions = useMemo(
    () => ({ answer, votePause, voteSkip, skipRound, returnToLobby, cancel, requestSync, useDuo }),
    [answer, votePause, voteSkip, skipRound, returnToLobby, cancel, requestSync, useDuo],
  );

  return {
    state,
    myWatchedIds,
    actions,
  };
}
