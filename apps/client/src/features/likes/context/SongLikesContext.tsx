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

interface SongLikesContextValue {
  ready: boolean;
  likedIds: ReadonlySet<number>;
  likedCount: number;
  isLiked: (songId: number) => boolean;
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
  // Lazy gate: the provider wraps the whole app, but /library/likes/ids is only
  // fetched when a like-aware surface (library, reveal card, profile) mounts.
  const [wanted, setWanted] = useState(false);
  // Bumped on every optimistic toggle so an in-flight ids fetch never clobbers it.
  const toggleVersionRef = useRef(0);

  const requestLikedIds = useCallback(() => setWanted(true), []);

  useEffect(() => {
    if (!user) {
      setLikedIds(new Set());
      setReady(true);
      return;
    }
    if (!wanted) {
      setReady(false);
      return;
    }

    let cancelled = false;
    setReady(false);

    const load = async () => {
      try {
        let version = toggleVersionRef.current;
        let payload = await libraryApi.likedIds();
        // A toggle raced the fetch: the list is stale, fetch again before applying.
        while (!cancelled && version !== toggleVersionRef.current) {
          version = toggleVersionRef.current;
          payload = await libraryApi.likedIds();
        }
        if (!cancelled) setLikedIds(new Set(payload.songIds));
      } catch {
        if (!cancelled) setLikedIds(new Set());
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, wanted]);

  const toggleLike = useCallback(
    async (songId: number): Promise<boolean> => {
      if (!user) {
        setShowAuthModal(true);
        return false;
      }

      setWanted(true);
      toggleVersionRef.current += 1;
      const wasLiked = likedIds.has(songId);
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(songId);
        else next.add(songId);
        return next;
      });

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

        if (result.liked) {
          toast.success(LIKES_COPY.likeAddedToast);
        } else {
          toast.success(LIKES_COPY.likeRemovedToast, {
            duration: 5000,
            action: {
              label: LIKES_COPY.likeRemovedUndo,
              onClick: () => {
                void (async () => {
                  toggleVersionRef.current += 1;
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
                  } catch (e) {
                    setLikedIds((prev) => {
                      const next = new Set(prev);
                      next.delete(songId);
                      return next;
                    });
                    const message =
                      e instanceof LibraryApiError ? e.message : LIKES_COPY.likeErrorToast;
                    toast.error(message);
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
        const message = e instanceof LibraryApiError ? e.message : LIKES_COPY.likeErrorToast;
        toast.error(message);
        return wasLiked;
      }
    },
    [likedIds, setShowAuthModal, user],
  );

  const value = useMemo<SongLikesContextValue>(
    () => ({
      ready,
      likedIds,
      likedCount: likedIds.size,
      isLiked: (songId: number) => likedIds.has(songId),
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
