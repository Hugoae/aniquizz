import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, Save, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  adminApi,
  AdminApiError,
  type AdminThematicPlaylist,
  type PlaylistRecipePreview,
} from '@/lib/adminApi';
import { PLAYLIST_CATEGORY_LABELS } from '@/features/hub/components/config/playlistsCopy';

const controlClass =
  'h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

const emptyDraft = {
  slug: '',
  name: '',
  description: '',
  category: 'theme',
  sortOrder: 0,
  recipeText: '{\n  "tags": ["Shounen"]\n}',
};

type PlaylistDraft = typeof emptyDraft;

export function PlaylistsPanel() {
  const [rows, setRows] = useState<AdminThematicPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [preview, setPreview] = useState<PlaylistRecipePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const loadGeneration = useRef(0);

  const patchDraft = <K extends keyof PlaylistDraft>(key: K, value: PlaylistDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    try {
      const result = await adminApi.listPlaylists();
      if (generation !== loadGeneration.current) return;
      setRows(result.playlists);
    } catch (error) {
      if (generation !== loadGeneration.current) return;
      toast.error(error instanceof AdminApiError ? error.message : 'Chargement impossible.');
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      loadGeneration.current += 1;
    };
  }, [load]);

  const select = (row: AdminThematicPlaylist) => {
    setSelectedId(row.id);
    setDraft({
      slug: row.slug,
      name: row.name,
      description: row.description,
      category: row.category,
      sortOrder: row.sortOrder,
      recipeText: JSON.stringify(row.recipe ?? {}, null, 2),
    });
    setPreview(null);
  };

  const parseRecipe = (): unknown | null => {
    try {
      return JSON.parse(draft.recipeText) as unknown;
    } catch {
      toast.error('JSON de recette invalide.');
      return null;
    }
  };

  const payload = (recipe: unknown) => ({
    slug: draft.slug.trim(),
    name: draft.name.trim(),
    description: draft.description.trim(),
    category: draft.category,
    sortOrder: Number(draft.sortOrder) || 0,
    recipe,
  });

  const runPreview = async () => {
    const recipe = parseRecipe();
    if (!recipe) return;
    setBusy(true);
    try {
      setPreview(await adminApi.previewPlaylistRecipe(recipe));
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : 'Prévisualisation impossible.');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const recipe = parseRecipe();
    if (!recipe || !draft.slug || !draft.name) {
      toast.error('Slug et nom requis.');
      return;
    }
    setBusy(true);
    try {
      const row = selectedId
        ? await adminApi.updatePlaylist(selectedId, payload(recipe))
        : await adminApi.createPlaylist(payload(recipe));
      toast.success('Playlist enregistrée.');
      setSelectedId(row.id);
      await load();
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const result = await adminApi.publishPlaylist(selectedId);
      toast.success(`Snapshot publié (${result.snapshotCount} sons).`);
      await load();
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : 'Publication impossible.');
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const result = await adminApi.refreshPlaylist(selectedId);
      toast.success(`Snapshot rafraîchi (${result.snapshotCount} sons).`);
      await load();
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : 'Rafraîchissement impossible.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      await adminApi.deletePlaylist(selectedId);
      toast.success('Playlist supprimée.');
      setSelectedId(null);
      setDraft(emptyDraft);
      await load();
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : 'Suppression impossible.');
    } finally {
      setBusy(false);
    }
  };

  const seed = async () => {
    setBusy(true);
    try {
      const result = await adminApi.seedPlaylists(true);
      toast.success(`${result.seeded.length} packs staff publiés.`);
      await load();
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : 'Seed impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-3">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => void seed()} disabled={busy}>
            Seed packs
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setSelectedId(null);
              setDraft(emptyDraft);
              setPreview(null);
            }}
          >
            Nouveau
          </Button>
        </div>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <ul className="space-y-1">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => select(row)}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-left text-sm',
                    selectedId === row.id ? 'border-primary bg-primary/10' : 'border-border/60',
                  )}
                >
                  <div className="font-medium">{row.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {row.snapshotCount} sons · {row.isPublished ? 'publié' : 'brouillon'}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Slug" value={draft.slug} onChange={(e) => patchDraft('slug', e.target.value)} />
          <Input placeholder="Nom" value={draft.name} onChange={(e) => patchDraft('name', e.target.value)} />
          <Input
            placeholder="Description"
            value={draft.description}
            onChange={(e) => patchDraft('description', e.target.value)}
            className="sm:col-span-2"
          />
          <select
            className={controlClass}
            value={draft.category}
            onChange={(e) => patchDraft('category', e.target.value)}
          >
            {Object.entries(PLAYLIST_CATEGORY_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <Input
            type="number"
            placeholder="Ordre"
            value={draft.sortOrder}
            onChange={(e) => patchDraft('sortOrder', Number(e.target.value))}
          />
        </div>
        <label className="block text-xs font-medium text-muted-foreground">
          Recette JSON (genres / tags / yearMin / yearMax / formats / includeSongIds / excludeSongIds)
          <textarea
            className={cn(controlClass, 'mt-1 min-h-[180px] w-full py-2 font-mono text-xs')}
            value={draft.recipeText}
            onChange={(e) => patchDraft('recipeText', e.target.value)}
          />
        </label>
        <p className="text-[11px] text-muted-foreground">
          L&apos;année est celle de l&apos;entrée du son (`seasonYear`), pas l&apos;origine de la franchise.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void runPreview()} disabled={busy}>
            Prévisualiser
          </Button>
          <Button onClick={() => void save()} disabled={busy} className="gap-2">
            <Save className="h-4 w-4" /> Enregistrer
          </Button>
          <Button variant="outline" onClick={() => void publish()} disabled={busy || !selectedId} className="gap-2">
            <Upload className="h-4 w-4" /> Publier
          </Button>
          <Button variant="outline" onClick={() => void refresh()} disabled={busy || !selectedId}>
            Rafraîchir snapshot
          </Button>
          <Button variant="destructive" onClick={() => void remove()} disabled={busy || !selectedId} className="gap-2">
            <Trash2 className="h-4 w-4" /> Supprimer
          </Button>
        </div>
        {preview && (
          <div className="rounded-xl border border-border/60 bg-card/40 p-3 text-sm">
            <p>
              <b>{preview.songCount}</b> sons jouables (OP {preview.typeBreakdown.OP} · ED {preview.typeBreakdown.ED})
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Années :{' '}
              {preview.yearBreakdown.slice(0, 12).map((y) => `${y.year} (${y.count})`).join(', ') || '—'}
              {preview.yearBreakdown.length > 12 ? '…' : ''}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
