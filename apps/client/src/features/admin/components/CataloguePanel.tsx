import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Film,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  adminApi,
  AdminApiError,
  type CatalogueAnime,
  type CatalogueFranchiseGroup,
  type CatalogueSong,
  type CatalogueTree,
  type SongDifficulty,
  type SongStatus,
} from "@/lib/adminApi";
import {
  AnimeEditDialog,
  FranchiseEditDialog,
  SongEditDialog,
  VideoPreviewDialog,
} from "./catalogue/EditDialogs";
import { CatalogueSongRow } from "./catalogue/CatalogueSongRow";
import { VirtualScroll } from "@/components/ui/VirtualScroll";

const errMsg = (e: unknown) => (e instanceof AdminApiError ? e.message : "Erreur.");

const DIFFICULTIES: SongDifficulty[] = ["EASY", "MEDIUM", "HARD"];
const STATUSES: SongStatus[] = ["PENDING", "PROCESSING", "COMPLETED", "ERROR", "SKIPPED"];

const selectCls = "rounded border border-border bg-background px-2 py-1 text-xs";

type Confirm =
  | { kind: "song"; id: number; label: string }
  | { kind: "anime"; id: number; label: string }
  | { kind: "franchise"; id: number; label: string }
  | null;

export function CataloguePanel({ canManage }: { canManage: boolean }) {
  const [tree, setTree] = useState<CatalogueTree | null>(null);
  const [loading, setLoading] = useState(false);

  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SongStatus | "">("");
  const [difficulty, setDifficulty] = useState<SongDifficulty | "">("");
  const [locked, setLocked] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);

  const topRef = useRef<HTMLDivElement>(null);
  const goToPage = (next: number) => {
    setPage(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  // Debounce search input.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(rawQuery.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.catalogueTree({
        query: query || undefined,
        status: status || undefined,
        difficulty: difficulty || undefined,
        locked: locked === "" ? undefined : locked === "true",
        page,
      });
      setTree(data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [query, status, difficulty, locked, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const searching = query.length > 0;

  const groupKey = (g: CatalogueFranchiseGroup) => (g.id === null ? "orphan" : String(g.id));
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
      void load();
    }
  }, [load]);

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
    (song: CatalogueSong) => setConfirm({ kind: "song", id: song.id, label: song.title }),
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
      if (confirm.kind === "song") await adminApi.deleteSong(confirm.id);
      else if (confirm.kind === "anime") await adminApi.deleteAnime(confirm.id);
      else await adminApi.deleteFranchise(confirm.id);
      toast.success("Supprimé.");
      setConfirm(null);
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const counts = tree?.counts;
  const coverage = counts && counts.songs > 0 ? Math.round((counts.completedSongs / counts.songs) * 100) : 0;
  const pagination = tree?.pagination;

  const confirmText = useMemo(() => {
    if (!confirm) return "";
    if (confirm.kind === "franchise")
      return `Supprimer la franchise « ${confirm.label} » ? Ses animes seront détachés (non supprimés).`;
    if (confirm.kind === "anime")
      return `Supprimer l'anime « ${confirm.label} » ? Tous ses sons seront supprimés.`;
    return `Supprimer le son « ${confirm.label} » ?`;
  }, [confirm]);

  return (
    <div className="space-y-4">
      {/* Header / filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Rechercher franchise, anime, son ou artiste…"
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
          className="max-w-sm"
        />
        <select
          className={selectCls + " py-2"}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as SongStatus | "");
            setPage(1);
          }}
        >
          <option value="">Tous statuts</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className={selectCls + " py-2"}
          value={difficulty}
          onChange={(e) => {
            setDifficulty(e.target.value as SongDifficulty | "");
            setPage(1);
          }}
        >
          <option value="">Toutes difficultés</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          className={selectCls + " py-2"}
          value={locked}
          onChange={(e) => {
            setLocked(e.target.value as "" | "true" | "false");
            setPage(1);
          }}
        >
          <option value="">Verrou : tous</option>
          <option value="true">Franchises verrouillées</option>
          <option value="false">Franchises non verrouillées</option>
        </select>
        {canManage && (
          <Button className="ml-auto gap-1" onClick={() => setFranchiseDialog({})}>
            <Plus className="h-4 w-4" /> Nouvelle franchise
          </Button>
        )}
      </div>

      {/* Counters */}
      {counts && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>{counts.franchises} franchises</span>
          <span>· {counts.animes} animes</span>
          <span>· {counts.songs} sons</span>
          <span>
            · {counts.completedSongs} prêts (<span className="text-success">{coverage}%</span>)
          </span>
        </div>
      )}

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm backdrop-blur">
          <span className="font-medium">{selected.size} son(s) sélectionné(s)</span>
          <select
            className={selectCls}
            defaultValue=""
            onChange={(e) => e.target.value && void bulkApply({ difficulty: e.target.value as SongDifficulty })}
          >
            <option value="">Difficulté…</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            className={selectCls}
            defaultValue=""
            onChange={(e) => e.target.value && void bulkApply({ downloadStatus: e.target.value as SongStatus })}
          >
            <option value="">Statut…</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={() => void bulkApply({ isLocked: true })}>
            <Lock className="mr-1 h-3.5 w-3.5" /> Verrouiller
          </Button>
          <Button size="sm" variant="outline" onClick={() => void bulkApply({ isLocked: false })}>
            <LockOpen className="mr-1 h-3.5 w-3.5" /> Déverrouiller
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>
            <X className="mr-1 h-3.5 w-3.5" /> Effacer
          </Button>
        </div>
      )}

      {/* Tree */}
      <div ref={topRef} className="scroll-mt-24" />
      {loading && !tree && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {tree && !tree.groups.length && (
        <p className="p-6 text-center text-sm text-muted-foreground">Aucun résultat.</p>
      )}

      <div className="space-y-2">
        {tree?.groups.map((g) => (
          <div key={groupKey(g)} className="glass-card overflow-hidden">
            {/* Franchise header */}
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() => toggleF(g)}
                aria-expanded={isFOpen(g)}
                aria-label={`${isFOpen(g) ? 'Réduire' : 'Développer'} la franchise ${g.name}`}
                className="text-muted-foreground"
              >
                {isFOpen(g) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <span className="font-semibold">{g.name}</span>
              {g.isLocked && <Lock className="h-3.5 w-3.5 text-warning" />}
              <Badge className="bg-secondary">{g.animes.length} animes</Badge>
              {g.genres.slice(0, 3).map((gen) => (
                <Badge key={gen} className="bg-secondary/50 text-muted-foreground">
                  {gen}
                </Badge>
              ))}
              {canManage && g.id !== null && (
                <div className="ml-auto flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setAnimeDialog({ franchiseId: g.id })}>
                    <Plus className="h-3.5 w-3.5" /> Anime
                  </Button>
                  <Button size="sm" variant="ghost" aria-label={`Modifier la franchise ${g.name}`} onClick={() => setFranchiseDialog({ franchise: g })}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    aria-label={`Supprimer la franchise ${g.name}`}
                    onClick={() => setConfirm({ kind: "franchise", id: g.id!, label: g.name })}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              )}
            </div>

            {/* Animes */}
            {isFOpen(g) && (
              <div className="border-t border-border/50">
                {g.animes.map((a) => (
                  <div key={a.id} className="border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2 bg-secondary/20 px-3 py-2 pl-8">
                      <button
                        type="button"
                        onClick={() => toggleA(a.id)}
                        aria-expanded={isAOpen(a.id)}
                        aria-label={`${isAOpen(a.id) ? 'Réduire' : 'Développer'} ${a.name}`}
                        className="text-muted-foreground"
                      >
                        {isAOpen(a.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      {a.coverImage ? (
                        <img src={a.coverImage} alt={`Couverture de ${a.name}`} className="h-8 w-6 rounded object-cover" loading="lazy" decoding="async" width={24} height={32} />
                      ) : (
                        <div className="flex h-8 w-6 items-center justify-center rounded bg-secondary/50">
                          <Film className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-medium">{a.name}</span>
                      {a.seasonYear && (
                        <span className="text-xs text-muted-foreground">{a.seasonYear}</span>
                      )}
                      {a.isLocked && <Lock className="h-3 w-3 text-warning" />}
                      <Badge className="bg-secondary">{a.songs.length} sons</Badge>
                      {canManage && (
                        <div className="ml-auto flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSongDialog({ animeId: a.id })}
                          >
                            <Plus className="h-3.5 w-3.5" /> Son
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Modifier ${a.name}`}
                            onClick={() => setAnimeDialog({ anime: a, franchiseId: a.franchiseId })}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            aria-label={`Supprimer ${a.name}`}
                            onClick={() => setConfirm({ kind: "anime", id: a.id, label: a.name })}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Songs */}
                    {isAOpen(a.id) && a.songs.length > 0 && (
                      <div className="overflow-x-auto pl-12">
                        <div className="flex items-center border-t border-border/50 px-2 py-1 text-xs font-medium text-muted-foreground">
                          <div className="w-10 shrink-0" />
                          <div className="min-w-0 flex-1">Son</div>
                          <div className="w-28 shrink-0">Diff.</div>
                          <div className="w-36 shrink-0">Statut</div>
                          <div className="w-12 shrink-0">Lock</div>
                          <div className="w-32 shrink-0 text-right">Actions</div>
                        </div>
                        <VirtualScroll
                          items={a.songs}
                          estimateSize={56}
                          maxHeight={420}
                          threshold={24}
                          getKey={(s) => s.id}
                          renderItem={(s) => (
                            <CatalogueSongRow
                              song={s}
                              animeId={a.id}
                              canManage={canManage}
                              selected={selected.has(s.id)}
                              onToggleSelect={handleToggleSelect}
                              onQuickPatch={quickPatch}
                              onPreview={handlePreview}
                              onEdit={handleEditSong}
                              onDelete={handleDeleteSong}
                            />
                          )}
                        />
                      </div>
                    )}
                  </div>
                ))}
                {!g.animes.length && (
                  <p className="px-8 py-3 text-xs text-muted-foreground">Aucun anime.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
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
