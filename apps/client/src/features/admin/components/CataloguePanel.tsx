import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  adminApi,
  AdminApiError,
  type CatalogueAnime,
  type CatalogueFranchiseGroup,
  type CatalogueSong,
  type CatalogueTree as CatalogueTreeData,
  type SongDifficulty,
  type SongStatus,
} from '@/lib/adminApi';
import {
  AnimeEditDialog,
  FranchiseEditDialog,
  SongEditDialog,
  VideoPreviewDialog,
} from './catalogue/EditDialogs';
import { CatalogueRepairQueue } from './catalogue/CatalogueRepairQueue';
import { CatalogueToolbar } from './catalogue/CatalogueToolbar';
import { CatalogueTree } from './catalogue/CatalogueTree';

const errMsg = (e: unknown) => (e instanceof AdminApiError ? e.message : 'Erreur.');

type Confirm =
  | { kind: 'song'; id: number; label: string }
  | { kind: 'anime'; id: number; label: string }
  | { kind: 'franchise'; id: number; label: string }
  | null;

export function CataloguePanel({
  canManage,
  focusSongId,
  onOpenSong,
  onClearFocus,
}: {
  canManage: boolean;
  focusSongId?: number | null;
  onOpenSong: (songId: number) => void;
  onClearFocus?: () => void;
}) {
  const [tree, setTree] = useState<CatalogueTreeData | null>(null);
  const [loading, setLoading] = useState(false);
  const loadAbortRef = useRef<AbortController | null>(null);
  const loadRef = useRef<() => Promise<void>>(async () => {});

  const [rawQuery, setRawQuery] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SongStatus | ''>('');
  const [difficulty, setDifficulty] = useState<SongDifficulty | ''>('');
  const [locked, setLocked] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(1);

  const topRef = useRef<HTMLDivElement>(null);
  const goToPage = (next: number) => {
    setPage(next);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const [expandedF, setExpandedF] = useState<Set<string>>(new Set());
  const [expandedA, setExpandedA] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [songDialog, setSongDialog] = useState<{ song?: CatalogueSong; animeId: number } | null>(
    null,
  );
  const [animeDialog, setAnimeDialog] = useState<{
    anime?: CatalogueAnime;
    franchiseId: number | null;
  } | null>(null);
  const [franchiseDialog, setFranchiseDialog] = useState<{
    franchise?: CatalogueFranchiseGroup;
  } | null>(null);
  const [preview, setPreview] = useState<CatalogueSong | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  // Debounce search input — only bump page when the committed query actually changes.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = rawQuery.trim();
      setQuery((prev) => {
        if (prev !== next) setPage(1);
        return next;
      });
    }, 300);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const load = useCallback(async () => {
    loadAbortRef.current?.abort();
    const ac = new AbortController();
    loadAbortRef.current = ac;
    setLoading(true);
    try {
      const data = await adminApi.catalogueTree({
        query: focusSongId ? undefined : query || undefined,
        status: focusSongId ? undefined : status || undefined,
        difficulty: focusSongId ? undefined : difficulty || undefined,
        locked: focusSongId ? undefined : locked === '' ? undefined : locked === 'true',
        page: focusSongId ? 1 : page,
        songId: focusSongId || undefined,
        signal: ac.signal,
      });
      if (ac.signal.aborted) return;
      setTree(data);
    } catch (e) {
      if (
        ac.signal.aborted ||
        (e instanceof DOMException && e.name === 'AbortError') ||
        (e instanceof Error && e.name === 'AbortError')
      ) {
        return;
      }
      toast.error(errMsg(e));
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [query, status, difficulty, locked, page, focusSongId]);

  loadRef.current = load;

  useEffect(() => {
    void load();
    return () => {
      loadAbortRef.current?.abort();
    };
  }, [load]);

  useEffect(() => {
    if (!focusSongId || !tree) return;
    const id = `admin-song-${focusSongId}`;
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    return () => window.clearTimeout(t);
  }, [focusSongId, tree]);

  const searching = query.length > 0 || Boolean(focusSongId);

  const groupKey = (g: CatalogueFranchiseGroup) => (g.id === null ? 'orphan' : String(g.id));
  const isFOpen = (g: CatalogueFranchiseGroup) => searching || expandedF.has(groupKey(g));
  const isAOpen = (id: number) => searching || expandedA.has(id);

  const toggleF = (g: CatalogueFranchiseGroup) =>
    setExpandedF((prev) => {
      const next = new Set(prev);
      const k = groupKey(g);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const toggleA = (id: number) =>
    setExpandedA((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Optimistic local patch of a single song (used by inline quick edits).
  const patchSongLocal = (id: number, partial: Partial<CatalogueSong>) =>
    setTree((prev) =>
      prev
        ? {
            ...prev,
            groups: prev.groups.map((g) => ({
              ...g,
              animes: g.animes.map((a) => ({
                ...a,
                songs: a.songs.map((s) => (s.id === id ? { ...s, ...partial } : s)),
              })),
            })),
          }
        : prev,
    );

  const quickPatch = useCallback(async (song: CatalogueSong, partial: Partial<CatalogueSong>) => {
    patchSongLocal(song.id, partial);
    try {
      await adminApi.updateSong(song.id, partial);
    } catch (e) {
      toast.error(errMsg(e));
      void loadRef.current();
    }
  }, []);

  const handleToggleSelect = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handlePreview = useCallback((song: CatalogueSong) => setPreview(song), []);
  const handleEditSong = useCallback(
    (song: CatalogueSong, animeId: number) => setSongDialog({ song, animeId }),
    [],
  );
  const handleDeleteSong = useCallback(
    (song: CatalogueSong) => setConfirm({ kind: 'song', id: song.id, label: song.title }),
    [],
  );

  const bulkApply = async (data: {
    difficulty?: SongDifficulty;
    downloadStatus?: SongStatus;
    isLocked?: boolean;
  }) => {
    const ids = [...selected];
    if (!ids.length) return;
    try {
      const { count } = await adminApi.bulkUpdateSongs(ids, data);
      toast.success(`${count} son(s) mis à jour.`);
      setSelected(new Set());
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const doDelete = async () => {
    if (!confirm) return;
    try {
      if (confirm.kind === 'song') await adminApi.deleteSong(confirm.id);
      else if (confirm.kind === 'anime') await adminApi.deleteAnime(confirm.id);
      else await adminApi.deleteFranchise(confirm.id);
      toast.success('Supprimé.');
      setConfirm(null);
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const counts = tree?.counts;
  const coverage =
    counts && counts.songs > 0 ? Math.round((counts.completedSongs / counts.songs) * 100) : 0;
  const pagination = tree?.pagination;

  const confirmText = useMemo(() => {
    if (!confirm) return '';
    if (confirm.kind === 'franchise')
      return `Supprimer la franchise « ${confirm.label} » ? Ses animes seront détachés (non supprimés).`;
    if (confirm.kind === 'anime')
      return `Supprimer l'anime « ${confirm.label} » ? Tous ses sons seront supprimés.`;
    return `Supprimer le son « ${confirm.label} » ?`;
  }, [confirm]);

  return (
    <div className="space-y-4">
      <CatalogueRepairQueue onOpenSong={onOpenSong} />

      <CatalogueToolbar
        rawQuery={rawQuery}
        setRawQuery={setRawQuery}
        focusSongId={focusSongId}
        onClearFocus={onClearFocus}
        status={status}
        setStatus={setStatus}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        locked={locked}
        setLocked={setLocked}
        setPage={setPage}
        canManage={canManage}
        onCreateFranchise={() => setFranchiseDialog({})}
        counts={counts}
        coverage={coverage}
        selectedCount={selected.size}
        onBulkApply={(data) => void bulkApply(data)}
        onClearSelection={() => setSelected(new Set())}
      />

      <CatalogueTree
        tree={tree}
        loading={loading}
        topRef={topRef}
        canManage={canManage}
        selected={selected}
        focusSongId={focusSongId}
        groupKey={groupKey}
        isFOpen={isFOpen}
        isAOpen={isAOpen}
        toggleF={toggleF}
        toggleA={toggleA}
        setAnimeDialog={setAnimeDialog}
        setFranchiseDialog={setFranchiseDialog}
        setSongDialog={setSongDialog}
        setConfirm={setConfirm}
        handleToggleSelect={handleToggleSelect}
        quickPatch={quickPatch}
        handlePreview={handlePreview}
        handleEditSong={handleEditSong}
        handleDeleteSong={handleDeleteSong}
      />
      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => goToPage(Math.max(1, page - 1))}
          >
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= pagination.totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Dialogs */}
      {songDialog && (
        <SongEditDialog
          open
          onOpenChange={(v) => !v && setSongDialog(null)}
          song={songDialog.song}
          animeId={songDialog.animeId}
          onSaved={load}
        />
      )}
      {animeDialog && (
        <AnimeEditDialog
          open
          onOpenChange={(v) => !v && setAnimeDialog(null)}
          anime={animeDialog.anime}
          franchiseId={animeDialog.franchiseId}
          onSaved={load}
        />
      )}
      {franchiseDialog && (
        <FranchiseEditDialog
          open
          onOpenChange={(v) => !v && setFranchiseDialog(null)}
          franchise={franchiseDialog.franchise}
          onSaved={load}
        />
      )}
      <VideoPreviewDialog song={preview} onOpenChange={(v) => !v && setPreview(null)} />

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>{confirmText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => void doDelete()}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
