import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { adminApi, type CatalogueAnime } from '@/lib/adminApi';
import { errMsg, numOrNull, toList } from './editDialogFields';
import { EditDialogRow as Row } from './EditDialogRow';

// --- Anime ------------------------------------------------------------------

interface AnimeForm {
  name: string;
  altNames: string;
  studio: string;
  siteUrl: string;
  coverImage: string;
  seasonYear: string;
  format: string;
  status: string;
  tags: string;
  popularity: string;
  franchiseId: string;
  isLocked: boolean;
}

const animeToForm = (a: CatalogueAnime | undefined, franchiseId: number | null): AnimeForm => ({
  name: a?.name ?? '',
  altNames: (a?.altNames ?? []).join(', '),
  studio: a?.studio ?? '',
  siteUrl: a?.siteUrl ?? '',
  coverImage: a?.coverImage ?? '',
  seasonYear: a?.seasonYear != null ? String(a.seasonYear) : '',
  format: a?.format ?? '',
  status: a?.status ?? '',
  tags: (a?.tags ?? []).join(', '),
  popularity: String(a?.popularity ?? 0),
  franchiseId: a
    ? a.franchiseId != null
      ? String(a.franchiseId)
      : ''
    : franchiseId != null
      ? String(franchiseId)
      : '',
  isLocked: a?.isLocked ?? false,
});

export function AnimeEditDialog({
  open,
  onOpenChange,
  anime,
  franchiseId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  anime?: CatalogueAnime;
  franchiseId: number | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AnimeForm>(() => animeToForm(anime, franchiseId));
  const [busy, setBusy] = useState(false);
  const isEdit = !!anime;

  useEffect(() => {
    if (open) setForm(animeToForm(anime, franchiseId));
  }, [open, anime, franchiseId]);

  const set = <K extends keyof AnimeForm>(k: K, v: AnimeForm[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Nom requis.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        altNames: toList(form.altNames),
        studio: form.studio.trim() || null,
        siteUrl: form.siteUrl.trim() || null,
        coverImage: form.coverImage.trim() || null,
        seasonYear: numOrNull(form.seasonYear),
        format: form.format.trim() || null,
        status: form.status.trim() || null,
        tags: toList(form.tags),
        popularity: Number(form.popularity) || 0,
        franchiseId: numOrNull(form.franchiseId),
        isLocked: form.isLocked,
      };
      if (isEdit) {
        await adminApi.updateAnime(anime!.id, payload);
        toast.success('Anime mis à jour.');
      } else {
        await adminApi.createAnime(payload);
        toast.success('Anime créé.');
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Éditer l'anime #${anime!.id}` : 'Nouvel anime'}</DialogTitle>
          <DialogDescription>Métadonnées de l'anime.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[65vh] gap-3 overflow-y-auto px-1 sm:grid-cols-2">
          <Row label="Nom">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Row>
          <Row label="Franchise ID (déplacer)">
            <Input
              type="number"
              value={form.franchiseId}
              onChange={(e) => set('franchiseId', e.target.value)}
            />
          </Row>
          <Row label="Noms alternatifs (virgules)">
            <Input value={form.altNames} onChange={(e) => set('altNames', e.target.value)} />
          </Row>
          <Row label="Studio">
            <Input value={form.studio} onChange={(e) => set('studio', e.target.value)} />
          </Row>
          <Row label="Site URL">
            <Input value={form.siteUrl} onChange={(e) => set('siteUrl', e.target.value)} />
          </Row>
          <Row label="Cover image URL">
            <Input value={form.coverImage} onChange={(e) => set('coverImage', e.target.value)} />
          </Row>
          <Row label="Année">
            <Input
              type="number"
              value={form.seasonYear}
              onChange={(e) => set('seasonYear', e.target.value)}
            />
          </Row>
          <Row label="Format">
            <Input value={form.format} onChange={(e) => set('format', e.target.value)} />
          </Row>
          <Row label="Statut (AniList)">
            <Input value={form.status} onChange={(e) => set('status', e.target.value)} />
          </Row>
          <Row label="Popularité">
            <Input
              type="number"
              value={form.popularity}
              onChange={(e) => set('popularity', e.target.value)}
            />
          </Row>
          <Row label="Tags (virgules)">
            <Input value={form.tags} onChange={(e) => set('tags', e.target.value)} />
          </Row>
          <div className="flex items-center gap-2 pt-5">
            <Switch checked={form.isLocked} onCheckedChange={(v) => set('isLocked', v)} />
            <Label className="text-sm">Verrouillé</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
