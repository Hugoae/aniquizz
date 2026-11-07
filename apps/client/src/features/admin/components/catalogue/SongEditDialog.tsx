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
import {
  adminApi,
  type CatalogueSong,
  type SongDifficulty,
  type SongStatus,
  type SongType,
} from '@/lib/adminApi';
import { ADMIN_COPY } from '@/features/admin/copy/adminCopy';
import { getVideoUrl } from '@/lib/video';
import {
  DIFFICULTIES,
  errMsg,
  numOrNull,
  selectCls,
  SONG_TYPES,
  STATUSES,
  toList,
} from './editDialogFields';
import { EditDialogRow as Row } from './EditDialogRow';

// --- Song -------------------------------------------------------------------

interface SongForm {
  title: string;
  artist: string;
  songType: SongType;
  sequence: string;
  difficulty: SongDifficulty;
  downloadStatus: SongStatus;
  videoKey: string;
  sourceUrl: string;
  duration: string;
  episodeRange: string;
  tags: string;
  animeId: string;
  isLocked: boolean;
}

const songToForm = (s: CatalogueSong | undefined, animeId: number): SongForm => ({
  title: s?.title ?? '',
  artist: s?.artist ?? '',
  songType: s?.songType ?? 'OP',
  sequence: String(s?.sequence ?? 1),
  difficulty: s?.difficulty ?? 'MEDIUM',
  downloadStatus: s?.downloadStatus ?? 'PENDING',
  videoKey: s?.videoKey ?? '',
  sourceUrl: s?.sourceUrl ?? '',
  duration: s?.duration != null ? String(s.duration) : '',
  episodeRange: s?.episodeRange ?? '',
  tags: (s?.tags ?? []).join(', '),
  animeId: String(s?.animeId ?? animeId),
  isLocked: s?.isLocked ?? false,
});

export function SongEditDialog({
  open,
  onOpenChange,
  song,
  animeId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  song?: CatalogueSong;
  animeId: number;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<SongForm>(() => songToForm(song, animeId));
  const [busy, setBusy] = useState(false);
  const isEdit = !!song;

  useEffect(() => {
    if (open) setForm(songToForm(song, animeId));
  }, [open, song, animeId]);

  const set = <K extends keyof SongForm>(k: K, v: SongForm[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.title.trim() || !form.videoKey.trim()) {
      toast.error('Titre et videoKey requis.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: form.title.trim(),
        artist: form.artist.trim(),
        songType: form.songType,
        sequence: Number(form.sequence) || 1,
        difficulty: form.difficulty,
        downloadStatus: form.downloadStatus,
        videoKey: form.videoKey.trim(),
        sourceUrl: form.sourceUrl.trim() || null,
        duration: numOrNull(form.duration),
        episodeRange: form.episodeRange.trim() || null,
        tags: toList(form.tags),
        animeId: Number(form.animeId) || animeId,
        isLocked: form.isLocked,
      };
      if (isEdit) {
        await adminApi.updateSong(song!.id, payload);
        toast.success('Son mis à jour.');
      } else {
        await adminApi.createSong(payload);
        toast.success('Son créé.');
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
          <DialogTitle>{isEdit ? `Éditer le son #${song!.id}` : 'Nouveau son'}</DialogTitle>
          <DialogDescription>Toutes les métadonnées du son.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[65vh] gap-3 overflow-y-auto px-1 sm:grid-cols-2">
          <Row label="Titre">
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} />
          </Row>
          <Row label="Artiste">
            <Input value={form.artist} onChange={(e) => set('artist', e.target.value)} />
          </Row>
          <Row label="Type">
            <select
              className={selectCls}
              value={form.songType}
              onChange={(e) => set('songType', e.target.value as SongType)}
            >
              {SONG_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Row>
          <Row label="Séquence">
            <Input
              type="number"
              min={1}
              value={form.sequence}
              onChange={(e) => set('sequence', e.target.value)}
            />
          </Row>
          <Row label="Difficulté">
            <select
              className={selectCls}
              value={form.difficulty}
              onChange={(e) => set('difficulty', e.target.value as SongDifficulty)}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {ADMIN_COPY.difficulty[d]}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Statut">
            <select
              className={selectCls}
              value={form.downloadStatus}
              onChange={(e) => set('downloadStatus', e.target.value as SongStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ADMIN_COPY.downloadStatus[s]}
                </option>
              ))}
            </select>
          </Row>
          <Row label="videoKey (clé R2)">
            <Input value={form.videoKey} onChange={(e) => set('videoKey', e.target.value)} />
          </Row>
          <Row label="sourceUrl (origine)">
            <Input value={form.sourceUrl} onChange={(e) => set('sourceUrl', e.target.value)} />
          </Row>
          <Row label="Durée (s)">
            <Input
              type="number"
              value={form.duration}
              onChange={(e) => set('duration', e.target.value)}
            />
          </Row>
          <Row label="Épisodes">
            <Input
              value={form.episodeRange}
              onChange={(e) => set('episodeRange', e.target.value)}
            />
          </Row>
          <Row label="Tags (séparés par des virgules)">
            <Input value={form.tags} onChange={(e) => set('tags', e.target.value)} />
          </Row>
          <Row label="Anime ID (déplacer)">
            <Input
              type="number"
              value={form.animeId}
              onChange={(e) => set('animeId', e.target.value)}
            />
          </Row>
          <div className="flex items-center gap-2 pt-5">
            <Switch checked={form.isLocked} onCheckedChange={(v) => set('isLocked', v)} />
            <Label className="text-sm">Verrouillé</Label>
          </div>
        </div>
        <DialogFooter>
          {form.videoKey.trim() && (
            <a
              href={getVideoUrl(form.videoKey.trim())}
              target="_blank"
              rel="noreferrer"
              className="mr-auto text-xs text-primary underline"
            >
              Ouvrir la vidéo
            </a>
          )}
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
