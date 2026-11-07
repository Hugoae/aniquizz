import type { Dispatch, RefObject, SetStateAction } from 'react';
import { ChevronDown, ChevronRight, Film, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VirtualScroll } from '@/components/ui/VirtualScroll';
import type {
  CatalogueAnime,
  CatalogueFranchiseGroup,
  CatalogueSong,
  CatalogueTree as CatalogueTreeData,
} from '@/lib/adminApi';
import { CatalogueSongRow } from './CatalogueSongRow';

type Confirm =
  | { kind: 'song'; id: number; label: string }
  | { kind: 'anime'; id: number; label: string }
  | { kind: 'franchise'; id: number; label: string }
  | null;

export function CatalogueTree({
  tree,
  loading,
  topRef,
  canManage,
  selected,
  focusSongId,
  groupKey,
  isFOpen,
  isAOpen,
  toggleF,
  toggleA,
  setAnimeDialog,
  setFranchiseDialog,
  setSongDialog,
  setConfirm,
  handleToggleSelect,
  quickPatch,
  handlePreview,
  handleEditSong,
  handleDeleteSong,
}: {
  tree: CatalogueTreeData | null;
  loading: boolean;
  topRef: RefObject<HTMLDivElement | null>;
  canManage: boolean;
  selected: Set<number>;
  focusSongId?: number | null;
  groupKey: (group: CatalogueFranchiseGroup) => string;
  isFOpen: (group: CatalogueFranchiseGroup) => boolean;
  isAOpen: (id: number) => boolean;
  toggleF: (group: CatalogueFranchiseGroup) => void;
  toggleA: (id: number) => void;
  setAnimeDialog: Dispatch<
    SetStateAction<{ anime?: CatalogueAnime; franchiseId: number | null } | null>
  >;
  setFranchiseDialog: Dispatch<SetStateAction<{ franchise?: CatalogueFranchiseGroup } | null>>;
  setSongDialog: Dispatch<SetStateAction<{ song?: CatalogueSong; animeId: number } | null>>;
  setConfirm: Dispatch<SetStateAction<Confirm>>;
  handleToggleSelect: (id: number) => void;
  quickPatch: (song: CatalogueSong, partial: Partial<CatalogueSong>) => void;
  handlePreview: (song: CatalogueSong) => void;
  handleEditSong: (song: CatalogueSong, animeId: number) => void;
  handleDeleteSong: (song: CatalogueSong) => void;
}) {
  return (
    <>
      {/* Tree */}
      <div ref={topRef} className="scroll-mt-24" />
      {loading && !tree && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {tree && !tree.groups.length && !loading && (
        <p className="p-6 text-center text-sm text-muted-foreground">Aucun résultat.</p>
      )}

      <div className={loading && tree ? 'relative opacity-60 pointer-events-none' : undefined}>
        {loading && tree && (
          <p className="absolute inset-x-0 top-2 z-10 text-center text-xs text-muted-foreground">
            Actualisation…
          </p>
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
                  {isFOpen(g) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
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
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAnimeDialog({ franchiseId: g.id })}
                    >
                      <Plus className="h-3.5 w-3.5" /> Anime
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Modifier la franchise ${g.name}`}
                      onClick={() => setFranchiseDialog({ franchise: g })}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      aria-label={`Supprimer la franchise ${g.name}`}
                      onClick={() => setConfirm({ kind: 'franchise', id: g.id!, label: g.name })}
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
                          <img
                            src={a.coverImage}
                            alt={`Couverture de ${a.name}`}
                            className="h-8 w-6 rounded object-cover"
                            loading="lazy"
                            decoding="async"
                            width={24}
                            height={32}
                          />
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
                              onClick={() =>
                                setAnimeDialog({ anime: a, franchiseId: a.franchiseId })
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              aria-label={`Supprimer ${a.name}`}
                              onClick={() => setConfirm({ kind: 'anime', id: a.id, label: a.name })}
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
                            {canManage && <div className="w-10 shrink-0" />}
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
                                highlighted={focusSongId === s.id}
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
      </div>
    </>
  );
}
