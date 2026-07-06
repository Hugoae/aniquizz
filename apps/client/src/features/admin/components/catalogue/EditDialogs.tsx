import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  adminApi,
  AdminApiError,
  type CatalogueAnime,
  type CatalogueFranchiseGroup,
  type CatalogueSong,
  type SongDifficulty,
  type SongStatus,
  type SongType,
} from "@/lib/adminApi";
import { getVideoUrl } from "@/lib/video";

const errMsg = (e: unknown) => (e instanceof AdminApiError ? e.message : "Erreur.");

const SONG_TYPES: SongType[] = ["OP", "ED", "INSERT"];
const DIFFICULTIES: SongDifficulty[] = ["EASY", "MEDIUM", "HARD"];
const STATUSES: SongStatus[] = ["PENDING", "PROCESSING", "COMPLETED", "ERROR", "SKIPPED"];

const toList = (s: string): string[] =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const numOrNull = (s: string): number | null => {
  const n = Number(s);
  return s.trim() === "" || Number.isNaN(n) ? null : n;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

const selectCls = "w-full rounded border border-white/10 bg-background px-2 py-2 text-sm";

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
  title: s?.title ?? "",
  artist: s?.artist ?? "",
  songType: s?.songType ?? "OP",
  sequence: String(s?.sequence ?? 1),
  difficulty: s?.difficulty ?? "MEDIUM",
  downloadStatus: s?.downloadStatus ?? "PENDING",
  videoKey: s?.videoKey ?? "",
  sourceUrl: s?.sourceUrl ?? "",
  duration: s?.duration != null ? String(s.duration) : "",
  episodeRange: s?.episodeRange ?? "",
  tags: (s?.tags ?? []).join(", "),
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
      toast.error("Titre et videoKey requis.");
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
        toast.success("Son mis à jour.");
      } else {
        await adminApi.createSong(payload);
        toast.success("Son créé.");
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
          <DialogTitle>{isEdit ? `Éditer le son #${song!.id}` : "Nouveau son"}</DialogTitle>
          <DialogDescription>Toutes les métadonnées du son.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[65vh] gap-3 overflow-y-auto px-1 sm:grid-cols-2">
          <Row label="Titre">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
          </Row>
          <Row label="Artiste">
            <Input value={form.artist} onChange={(e) => set("artist", e.target.value)} />
          </Row>
          <Row label="Type">
            <select
              className={selectCls}
              value={form.songType}
              onChange={(e) => set("songType", e.target.value as SongType)}
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
              onChange={(e) => set("sequence", e.target.value)}
            />
          </Row>
          <Row label="Difficulté">
            <select
              className={selectCls}
              value={form.difficulty}
              onChange={(e) => set("difficulty", e.target.value as SongDifficulty)}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Row>
          <Row label="Statut">
            <select
              className={selectCls}
              value={form.downloadStatus}
              onChange={(e) => set("downloadStatus", e.target.value as SongStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Row>
          <Row label="videoKey (clé R2)">
            <Input value={form.videoKey} onChange={(e) => set("videoKey", e.target.value)} />
          </Row>
          <Row label="sourceUrl (origine)">
            <Input value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} />
          </Row>
          <Row label="Durée (s)">
            <Input
              type="number"
              value={form.duration}
              onChange={(e) => set("duration", e.target.value)}
            />
          </Row>
          <Row label="Épisodes">
            <Input
              value={form.episodeRange}
              onChange={(e) => set("episodeRange", e.target.value)}
            />
          </Row>
          <Row label="Tags (séparés par des virgules)">
            <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} />
          </Row>
          <Row label="Anime ID (déplacer)">
            <Input
              type="number"
              value={form.animeId}
              onChange={(e) => set("animeId", e.target.value)}
            />
          </Row>
          <div className="flex items-center gap-2 pt-5">
            <Switch checked={form.isLocked} onCheckedChange={(v) => set("isLocked", v)} />
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
            {isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  name: a?.name ?? "",
  altNames: (a?.altNames ?? []).join(", "),
  studio: a?.studio ?? "",
  siteUrl: a?.siteUrl ?? "",
  coverImage: a?.coverImage ?? "",
  seasonYear: a?.seasonYear != null ? String(a.seasonYear) : "",
  format: a?.format ?? "",
  status: a?.status ?? "",
  tags: (a?.tags ?? []).join(", "),
  popularity: String(a?.popularity ?? 0),
  franchiseId: a ? (a.franchiseId != null ? String(a.franchiseId) : "") : franchiseId != null ? String(franchiseId) : "",
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
      toast.error("Nom requis.");
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
        toast.success("Anime mis à jour.");
      } else {
        await adminApi.createAnime(payload);
        toast.success("Anime créé.");
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
          <DialogTitle>{isEdit ? `Éditer l'anime #${anime!.id}` : "Nouvel anime"}</DialogTitle>
          <DialogDescription>Métadonnées de l'anime.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[65vh] gap-3 overflow-y-auto px-1 sm:grid-cols-2">
          <Row label="Nom">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Row>
          <Row label="Franchise ID (déplacer)">
            <Input
              type="number"
              value={form.franchiseId}
              onChange={(e) => set("franchiseId", e.target.value)}
            />
          </Row>
          <Row label="Noms alternatifs (virgules)">
            <Input value={form.altNames} onChange={(e) => set("altNames", e.target.value)} />
          </Row>
          <Row label="Studio">
            <Input value={form.studio} onChange={(e) => set("studio", e.target.value)} />
          </Row>
          <Row label="Site URL">
            <Input value={form.siteUrl} onChange={(e) => set("siteUrl", e.target.value)} />
          </Row>
          <Row label="Cover image URL">
            <Input value={form.coverImage} onChange={(e) => set("coverImage", e.target.value)} />
          </Row>
          <Row label="Année">
            <Input
              type="number"
              value={form.seasonYear}
              onChange={(e) => set("seasonYear", e.target.value)}
            />
          </Row>
          <Row label="Format">
            <Input value={form.format} onChange={(e) => set("format", e.target.value)} />
          </Row>
          <Row label="Statut (AniList)">
            <Input value={form.status} onChange={(e) => set("status", e.target.value)} />
          </Row>
          <Row label="Popularité">
            <Input
              type="number"
              value={form.popularity}
              onChange={(e) => set("popularity", e.target.value)}
            />
          </Row>
          <Row label="Tags (virgules)">
            <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} />
          </Row>
          <div className="flex items-center gap-2 pt-5">
            <Switch checked={form.isLocked} onCheckedChange={(v) => set("isLocked", v)} />
            <Label className="text-sm">Verrouillé</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Franchise --------------------------------------------------------------

export function FranchiseEditDialog({
  open,
  onOpenChange,
  franchise,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  franchise?: CatalogueFranchiseGroup;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [genres, setGenres] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const isEdit = !!franchise && franchise.id !== null;

  useEffect(() => {
    if (open) {
      setName(franchise?.name ?? "");
      setGenres((franchise?.genres ?? []).join(", "));
      setIsLocked(franchise?.isLocked ?? false);
    }
  }, [open, franchise]);

  const save = async () => {
    if (!name.trim()) {
      toast.error("Nom requis.");
      return;
    }
    setBusy(true);
    try {
      const payload = { name: name.trim(), genres: toList(genres), isLocked };
      if (isEdit) {
        await adminApi.updateFranchise(franchise!.id!, payload);
        toast.success("Franchise mise à jour.");
      } else {
        await adminApi.createFranchise(payload);
        toast.success("Franchise créée.");
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
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Éditer la franchise" : "Nouvelle franchise"}</DialogTitle>
          <DialogDescription>Regroupe des animes liés.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Row label="Nom">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Row>
          <Row label="Genres (virgules)">
            <Input value={genres} onChange={(e) => setGenres(e.target.value)} />
          </Row>
          <div className="flex items-center gap-2">
            <Switch checked={isLocked} onCheckedChange={setIsLocked} />
            <Label className="text-sm">Verrouillée</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Video preview ----------------------------------------------------------

export function VideoPreviewDialog({
  song,
  onOpenChange,
}: {
  song: CatalogueSong | null;
  onOpenChange: (v: boolean) => void;
}) {
  const url = song ? getVideoUrl(song.videoKey) : "";
  return (
    <Dialog open={!!song} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-card">
        <DialogHeader>
          <DialogTitle>{song ? `${song.title} — ${song.artist}` : ""}</DialogTitle>
          <DialogDescription className="font-mono text-xs">{song?.videoKey}</DialogDescription>
        </DialogHeader>
        {url ? (
          <video src={url} controls autoPlay className="max-h-[70vh] w-full rounded bg-black" />
        ) : (
          <p className="text-sm text-muted-foreground">
            URL vidéo indisponible (VITE_R2_PUBLIC_URL manquant).
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
