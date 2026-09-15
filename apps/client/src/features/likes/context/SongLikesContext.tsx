import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { libraryApi, LibraryApiError } from '@/lib/libraryApi';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthModal } from '@/features/auth/context/AuthModalContext';
import { LIKES_COPY } from '@/features/likes/copy/likesCopy';
import { mergeLikedIdsFromServer } from '@/features/likes/lib/likedIdsSync';

interface SongLikesContextValue {
  ready: boolean;
  likedIds: ReadonlySet<number>;
  likedCount: number;
  isLiked: (songId: number) => boolean;
  hasPendingLike: (songId: number) => boolean;
  toggleLike: (songId: number) => Promise<boolean>;
  /** Marks liked ids as needed; the fetch only runs once a consumer surface mounts. */
  requestLikedIds: () => void;
}

const SongLikesContext = createContext<SongLikesContextValue | null>(null);

export function SongLikesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { setShowAuthModal } = useAuthModal();
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [ready, setReady] = useState(false);
  const [wanted, setWanted] = useState(false);
  const pendingRef = useRef(new Map<number, boolean>());
  const inFlightRef = useRef(0);
  const refetchWhenIdleRef = useRef(false);

  const requestLikedIds = useCallback(() => setWanted(true), []);

  const applyServerIds = useCallback((songIds: number[]) => {
    setLikedIds(mergeLikedIdsFromServer(songIds, pendingRef.current));
  }, []);

  useEffect(() => {
    if (!user) {
      pendingRef.current.clear();
      inFlightRef.current = 0;
      setLikedIds(new Set());
      setReady(true);
      return;
    }
    if (!wanted) {
      setReady(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const payload = await libraryApi.likedIds();
        if (cancelled) return;
        if (inFlightRef.current > 0) {
          refetchWhenIdleRef.current = true;
          applyServerIds(payload.songIds);
          return;
        }
        applyServerIds(payload.songIds);
      } catch {
        if (!cancelled) {
          // Keep the optimistic set — a 401/network blip must not wipe hearts.
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, wanted, applyServerIds]);

  const toggleLike = useCallback(
    async (songId: number): Promise<boolean> => {
      if (!user) {
        setShowAuthModal(true);
        return false;
      }

      setWanted(true);
      const wasLiked = likedIds.has(songId);
      const nextLiked = !wasLiked;
      pendingRef.current.set(songId, nextLiked);
      inFlightRef.current += 1;
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (nextLiked) next.add(songId);
        else next.delete(songId);
        return next;
      });

      const settleInFlight = () => {
        inFlightRef.current = Math.max(0, inFlightRef.current - 1);
        pendingRef.current.delete(songId);
        if (inFlightRef.current === 0 && refetchWhenIdleRef.current) {
          refetchWhenIdleRef.current = false;
          void libraryApi
            .likedIds()
            .then((payload) => applyServerIds(payload.songIds))
            .catch(() => {
              /* keep optimistic set */
            });
        }
      };

      try {
        const result = wasLiked
          ? await libraryApi.unlikeSong(songId)
          : await libraryApi.likeSong(songId);
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (result.liked) next.add(songId);
          else next.delete(songId);
          return next;
        });
        settleInFlight();

        if (result.liked) {
          toast.success(LIKES_COPY.likeAddedToast);
        } else {
          toast.success(LIKES_COPY.likeRemovedToast, {
            duration: 5000,
            action: {
              label: LIKES_COPY.likeRemovedUndo,
              onClick: () => {
                void (async () => {
                  pendingRef.current.set(songId, true);
                  inFlightRef.current += 1;
                  setLikedIds((prev) => new Set(prev).add(songId));
                  try {
                    const restored = await libraryApi.likeSong(songId);
                    setLikedIds((prev) => {
                      const next = new Set(prev);
                      if (restored.liked) next.add(songId);
                      else next.delete(songId);
                      return next;
                    });
                    if (restored.liked) toast.success(LIKES_COPY.likeAddedToast);
                  } catch (err) {
                    setLikedIds((prev) => {
                      const next = new Set(prev);
                      next.delete(songId);
                      return next;
                    });
                    const message =
                      err instanceof LibraryApiError ? err.message : LIKES_COPY.likeErrorToast;
                    toast.error(message);
                  } finally {
                    inFlightRef.current = Math.max(0, inFlightRef.current - 1);
                    pendingRef.current.delete(songId);
                  }
                })();
              },
            },
          });
        }

        return result.liked;
      } catch (e) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(songId);
          else next.delete(songId);
          return next;
        });
        settleInFlight();
        const message = e instanceof LibraryApiError ? e.message : LIKES_COPY.likeErrorToast;
        toast.error(message);
        return wasLiked;
      }
    },
    [applyServerIds, likedIds, setShowAuthModal, user],
  );

  const value = useMemo<SongLikesContextValue>(
    () => ({
      ready,
      likedIds,
      likedCount: likedIds.size,
      isLiked: (songId: number) => likedIds.has(songId),
      hasPendingLike: (songId: number) => pendingRef.current.has(songId),
      toggleLike,
      requestLikedIds,
    }),
    [likedIds, ready, toggleLike, requestLikedIds],
  );

  return <SongLikesContext.Provider value={value}>{children}</SongLikesContext.Provider>;
}

/** Consumer hook — mounting a consumer triggers the lazy liked-ids fetch. */
export function useSongLikes(): SongLikesContextValue {
  const ctx = useContext(SongLikesContext);
  if (!ctx) {
    throw new Error('useSongLikes must be used within SongLikesProvider');
  }
  const { requestLikedIds } = ctx;
  useEffect(() => {
    requestLikedIds();
  }, [requestLikedIds]);
  return ctx;
}

/** Optional hook for surfaces that may render outside the provider (e.g. tests). */
export function useSongLikesOptional(): SongLikesContextValue | null {
  return useContext(SongLikesContext);
}
