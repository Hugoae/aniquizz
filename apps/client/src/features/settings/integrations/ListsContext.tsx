import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  resolveActiveListProvider,
  type ListOperation,
  type ListOperationError,
  type ListOperationResult,
  type ListsStatusPayload,
  type WatchedListProvider,
} from '@aniquizz/shared';
import { toast } from 'sonner';
import { useAuth, type Profile } from '@/features/auth/context/AuthContext';
import { SETTINGS_COPY } from '@/features/settings/copy/settingsCopy';
import {
  ListsContext,
  type ListOperationOutcome,
  type ListsContextValue,
  type PendingListOperation,
} from '@/features/settings/integrations/listsContextValue';
import { socket } from '@/lib/socket';
import { subscribeWhenSocketReady } from '@/lib/socketReady';

const providerStatus = (
  provider: WatchedListProvider,
  username: string | null,
  active: WatchedListProvider | null,
  lastSync: string | null,
) => ({
  provider,
  username,
  linked: Boolean(username),
  active: active === provider,
  lastSync,
  animeCount: null,
  state: username ? ('idle' as const) : ('unlinked' as const),
});

const statusFromProfile = (profile: Profile | null): ListsStatusPayload => {
  const anilistUsername = profile?.anilistUsername?.trim() || null;
  const malUsername = profile?.malUsername?.trim() || null;
  const active = resolveActiveListProvider({
    anilistUsername,
    malUsername,
    activeListProvider: profile?.activeListProvider,
  });
  return {
    active,
    anilist: providerStatus('anilist', anilistUsername, active, profile?.anilistLastSync ?? null),
    mal: providerStatus('mal', malUsername, active, profile?.malLastSync ?? null),
  };
};

const successMessage = (operation: ListOperation, provider: WatchedListProvider): string => {
  const label = provider === 'anilist' ? 'AniList' : 'MyAnimeList';
  return SETTINGS_COPY.listOperationSuccess[operation](label);
};

export function ListsProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, patchProfile } = useAuth();
  const userId = user?.id ?? null;
  const [status, setStatus] = useState<ListsStatusPayload>(() => statusFromProfile(profile));
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingListOperation | null>(null);
  const [outcome, setOutcome] = useState<ListOperationOutcome | null>(null);
  const pendingRef = useRef<PendingListOperation | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const receivedSocketStatusRef = useRef(false);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const operationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearStatusTimer = useCallback(() => {
    if (!statusTimerRef.current) return;
    clearTimeout(statusTimerRef.current);
    statusTimerRef.current = null;
  }, []);

  const clearOperationTimer = useCallback(() => {
    if (!operationTimerRef.current) return;
    clearTimeout(operationTimerRef.current);
    operationTimerRef.current = null;
  }, []);

  const finishOperation = useCallback(() => {
    pendingRef.current = null;
    setPending(null);
    clearOperationTimer();
  }, [clearOperationTimer]);

  const refreshStatus = useCallback(() => {
    if (!userId) return;
    if (!socket.connected) {
      setLoading(false);
      return;
    }
    setLoading(true);
    clearStatusTimer();
    socket.emit('lists:get_status');
    statusTimerRef.current = setTimeout(() => setLoading(false), 10_000);
  }, [userId, clearStatusTimer]);

  useEffect(() => {
    receivedSocketStatusRef.current = false;
    finishOperation();
    setOutcome(null);
    clearStatusTimer();
    const currentProfile = profileRef.current;
    setStatus(statusFromProfile(currentProfile?.id === userId ? currentProfile : null));
    setLoading(Boolean(userId));
  }, [userId, finishOperation, clearStatusTimer]);

  useEffect(() => {
    if (!receivedSocketStatusRef.current) {
      setStatus(statusFromProfile(profile?.id === userId ? profile : null));
    }
  }, [userId, profile]);

  useEffect(() => {
    if (!userId) return;

    const onStatus = (payload: ListsStatusPayload) => {
      receivedSocketStatusRef.current = true;
      clearStatusTimer();
      setLoading(false);
      setStatus(payload);
      patchProfile(
        {
          anilistUsername: payload.anilist.username,
          malUsername: payload.mal.username,
          activeListProvider: payload.active,
          anilistLastSync: payload.anilist.lastSync,
          malLastSync: payload.mal.lastSync,
        },
        userId,
      );
    };
    const onResult = (result: ListOperationResult) => {
      if (result.requestId !== pendingRef.current?.requestId) return;
      setStatus(result.status);
      patchProfile(
        {
          anilistUsername: result.status.anilist.username,
          malUsername: result.status.mal.username,
          activeListProvider: result.status.active,
          anilistLastSync: result.status.anilist.lastSync,
          malLastSync: result.status.mal.lastSync,
        },
        userId,
      );
      setOutcome({ requestId: result.requestId, success: true });
      finishOperation();
      toast.success(successMessage(result.operation, result.provider));
    };
    const onError = (error: ListOperationError) => {
      if (error.requestId !== pendingRef.current?.requestId) return;
      setOutcome({ requestId: error.requestId, success: false });
      finishOperation();
      toast.error(error.message);
    };
    const onGlobalError = (error: { message?: string }) => {
      const current = pendingRef.current;
      if (!current) return;
      setOutcome({ requestId: current.requestId, success: false });
      finishOperation();
      toast.error(error.message || SETTINGS_COPY.listGenericError);
    };

    socket.on('lists:status', onStatus);
    socket.on('lists:result', onResult);
    socket.on('lists:error', onError);
    socket.on('error', onGlobalError);
    const onDisconnect = () => {
      if (socket.connected || socket.active) return;
      clearStatusTimer();
      setLoading(false);
    };
    socket.on('disconnect', onDisconnect);
    const stopReady = subscribeWhenSocketReady(socket, () => refreshStatus());
    if (!socket.connected && !socket.active) setLoading(false);

    return () => {
      stopReady();
      socket.off('lists:status', onStatus);
      socket.off('lists:result', onResult);
      socket.off('lists:error', onError);
      socket.off('error', onGlobalError);
      socket.off('disconnect', onDisconnect);
      clearStatusTimer();
      clearOperationTimer();
    };
  }, [userId, patchProfile, refreshStatus, finishOperation, clearStatusTimer, clearOperationTimer]);

  const begin = useCallback(
    (
      operation: ListOperation,
      provider: WatchedListProvider,
      emit: (requestId: string) => void,
    ): string | null => {
      if (pendingRef.current) {
        toast.error(SETTINGS_COPY.listOperationPending);
        return null;
      }
      if (!socket.connected) {
        toast.error(SETTINGS_COPY.listServerOffline);
        return null;
      }
      const requestId =
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const next = { requestId, operation, provider };
      setOutcome(null);
      pendingRef.current = next;
      setPending(next);
      emit(requestId);
      operationTimerRef.current = setTimeout(() => {
        if (pendingRef.current?.requestId !== requestId) return;
        setOutcome({ requestId, success: false });
        finishOperation();
        toast.error(SETTINGS_COPY.listServerTimeout);
        refreshStatus();
      }, 40_000);
      return requestId;
    },
    [finishOperation, refreshStatus],
  );

  const value = useMemo<ListsContextValue>(
    () => ({
      status,
      loading,
      pending,
      outcome,
      refreshStatus,
      link: (provider, username) =>
        begin('link', provider, (requestId) =>
          socket.emit('lists:link', { requestId, provider, username }),
        ),
      setActive: (provider) =>
        begin('set_active', provider, (requestId) =>
          socket.emit('lists:set_active', { requestId, provider }),
        ),
      sync: (provider) =>
        begin('refresh', provider, (requestId) =>
          socket.emit('lists:refresh', { requestId, provider }),
        ),
      unlink: (provider) =>
        begin('unlink', provider, (requestId) =>
          socket.emit('lists:unlink', { requestId, provider }),
        ),
    }),
    [status, loading, pending, outcome, refreshStatus, begin],
  );

  return <ListsContext.Provider value={value}>{children}</ListsContext.Provider>;
}
