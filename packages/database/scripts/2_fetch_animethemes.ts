import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { formatDuration, parseRetryAfterMs, Progress, Tally } from "./lib/progress";
import { buildVideoKey } from "./lib/song-helpers";
import { isSongExcluded, loadAllPipelineExclusions } from "./lib/load-pipeline-exclusions";

dotenv.config({ path: path.join(__dirname, "../.env") });

// --- CONFIGURATION ---
const INPUT_FILE = path.join(__dirname, "../data/data_step1.json");
const OUTPUT_FILE = path.join(__dirname, "../data/data_step2.json");
const DATA_DIR = path.join(__dirname, "../data");
const CACHE_FILE = path.join(DATA_DIR, "animethemes_cache.json");

const DELAY_MS = Math.max(0, Number(process.env.ANIMETHEMES_DELAY_MS ?? 200));
const ANIMETHEMES_API = "https://api.animethemes.moe/anime";
const ANIMETHEMES_BASE = "https://animethemes.moe";

// Which theme types to import. Default OP-only; extend later with e.g.
// `SONG_TYPES=OP,ED`. Values map to Song.songType (OP / ED / INSERT). The
// AnimeThemes cache already stores every theme (OP + ED), so widening this list
// later just re-parses the cache without any re-fetch.
const VALID_SONG_TYPES = ["OP", "ED", "INSERT"] as const;
type SongTypeValue = (typeof VALID_SONG_TYPES)[number];
const SONG_TYPES: SongTypeValue[] = (process.env.SONG_TYPES ?? "OP")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter((s): s is SongTypeValue => (VALID_SONG_TYPES as readonly string[]).includes(s));
const songTypeSet = new Set<string>(SONG_TYPES.length ? SONG_TYPES : ["OP"]);

// --- UTILS ---

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadCache(): Record<string, any> {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {};
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, any>) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function isRetryableStatus(status?: number) {
  if (!status) return false;
  return status === 429 || (status >= 500 && status < 600);
}

function normalizeVideoLink(rawLink: string): string {
  if (!rawLink) return rawLink;
  if (rawLink.startsWith("http")) return rawLink;
  return `${ANIMETHEMES_BASE}${rawLink}`;
}

function toTagArray(tags: any): string[] {
  if (Array.isArray(tags)) return tags.map(String);
  if (typeof tags === "string") return [tags];
  return [];
}

/**
 * Selects the best video: prefer creditless (NC), then highest resolution.
 * `episodes` (episode range) is carried from the parent animethemeentry.
 */
function chooseBestVideo(
  videos: Array<{ link: string; tags?: any; resolution?: any; nc?: any; episodes?: string | null }>,
) {
  if (!videos || videos.length === 0) return null;

  const normalized = videos
    .filter((v) => !!v?.link)
    .map((v) => {
      const tags = toTagArray(v.tags);
      const nc =
        typeof v?.nc === "boolean" ? v.nc : tags.some((t) => t.toUpperCase().includes("NC"));
      const resolution = Number.isFinite(Number(v?.resolution)) ? Number(v.resolution) : 0;
      return { link: v.link, tags, nc, resolution, episodes: v?.episodes ?? null };
    });

  normalized.sort((a, b) => {
    // Creditless first, then highest resolution.
    if (a.nc !== b.nc) return a.nc ? -1 : 1;
    return b.resolution - a.resolution;
  });

  return normalized[0] ?? null;
}

/**
 * Récupère un animé AnimeThemes via l'ID AniList
 */
async function fetchByAniListId(anilistId: number) {
  const url =
    `${ANIMETHEMES_API}` +
    `?filter[has]=resources` +
    `&filter[site]=AniList` +
    `&filter[external_id]=${anilistId}` +
    `&include=animethemes.song.artists,animethemes.animethemeentries.videos`;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const resp = await axios.get(url, {
        headers: { Accept: "application/json" },
        timeout: 25000,
      });

      const payload = resp.data;

      if (Array.isArray(payload?.anime) && payload.anime.length > 0) {
        return payload.anime[0];
      }

      const data = payload?.data;
      if (!Array.isArray(data) || data.length === 0) return null;

      // Parsing des "includes" (JSON:API Spec)
      const included = Array.isArray(payload?.included) ? payload.included : [];
      const includedMap = new Map<string, any>();
      for (const r of included) {
        if (r?.type && r?.id) includedMap.set(`${r.type}:${r.id}`, r);
      }
      const get = (ref: any) =>
        ref?.type && ref?.id ? includedMap.get(`${ref.type}:${ref.id}`) : null;

      const anime = data[0];
      const themeRefs = anime?.relationships?.animethemes?.data ?? [];

      const animethemes = themeRefs
        .map(get)
        .filter(Boolean)
        .map((t: any) => {
          const song = get(t?.relationships?.song?.data);

          const artistRefs = song?.relationships?.artists?.data ?? [];
          const artists = artistRefs
            .map(get)
            .filter(Boolean)
            .map((a: any) => a?.attributes?.name)
            .filter(Boolean);

          const entryRefs = t?.relationships?.animethemeentries?.data ?? [];
          const animethemeentries = entryRefs
            .map(get)
            .filter(Boolean)
            .map((e: any) => {
              const videoRefs = e?.relationships?.videos?.data ?? [];
              const videos = videoRefs
                .map(get)
                .filter(Boolean)
                .map((v: any) => ({
                  link: v?.attributes?.link as string,
                  tags: v?.attributes?.tags,
                  resolution: v?.attributes?.resolution,
                  nc: v?.attributes?.nc,
                }))
                .filter((v: any) => !!v.link);

              return { episodes: e?.attributes?.episodes ?? null, videos };
            })
            .filter((e: any) => e.videos.length > 0);

          return {
            type: t?.attributes?.type, // "OP"
            sequence: t?.attributes?.sequence, // 1,2,3...
            song: {
              title: song?.attributes?.title,
              artists: artists.map((name: string) => ({ name })),
            },
            animethemeentries,
          };
        });

      return { animethemes };
    } catch (e: any) {
      const status = e?.response?.status;
      const retryable = isRetryableStatus(status);
      if (!retryable) return null;

      const backoff = 400 * Math.pow(2, attempt);
      // Honor Retry-After on 429; otherwise exponential backoff.
      const wait = status === 429 ? parseRetryAfterMs(e?.response?.headers, backoff) : backoff;
      await delay(wait);
    }
  }

  return null;
}

// --- MAIN PROCESS ---

async function enrichData() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const franchises = JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8"));
  const cache = loadCache();
  const pipelineExclusions = loadAllPipelineExclusions(DATA_DIR);

  if (pipelineExclusions.songIds.size > 0 || pipelineExclusions.videoKeys.size > 0) {
    console.log(
      `🚫 ${pipelineExclusions.songIds.size} excluded song id(s), ${pipelineExclusions.videoKeys.size} excluded videoKey(s)`,
    );
  }

  let totalSongsAdded = 0;
  const tally = new Tally();

  const totalAnimes: number = franchises.reduce(
    (n: number, f: any) => n + (f.animes?.filter((a: any) => !a.isLocked).length ?? 0),
    0,
  );

  console.log(`\n🟠 [ÉTAPE 2/3] ENRICHISSEMENT ANIMETHEMES (types: ${[...songTypeSet].join(", ")})`);
  console.log(`   ${totalAnimes} animes à traiter${totalAnimes ? "" : " (rien à faire)"}`);
  console.log("=============================================================\n");

  const progress = new Progress(totalAnimes);

  for (const franchise of franchises) {
    // A locked franchise freezes its existing seasons, but newly-added
    // (non-locked) seasons must still be enriched. Only skip entirely when
    // every season is locked.
    const hasProcessable = franchise.animes?.some((a: any) => !a.isLocked);
    if (franchise.isLocked && !hasProcessable) {
      tally.add("Franchises verrouillées (skip)");
      continue;
    }

    for (const anime of franchise.animes) {
      if (anime.isLocked) {
        tally.add("Animes verrouillés (skip)");
        continue;
      }

      progress.tick();
      progress.line(anime.name);

      const cacheKey = String(anime.id);
      let atAnime = cache[cacheKey];

      if (!atAnime) {
        atAnime = await fetchByAniListId(anime.id);
        cache[cacheKey] = atAnime ?? null;
        saveCache(cache);
        await delay(DELAY_MS);
      }

      if (!atAnime || !Array.isArray(atAnime.animethemes)) {
        tally.add("Sans correspondance AnimeThemes");
        continue;
      }

      const themes = atAnime.animethemes
        .filter((t: any) => songTypeSet.has(String(t?.type ?? "").toUpperCase()));

      if (themes.length === 0) {
        tally.add("Match sans thème retenu");
        continue;
      }

      // Sort by type then sequence for stable output.
      themes.sort((a: any, b: any) => {
        const ta = String(a?.type ?? "").toUpperCase();
        const tb = String(b?.type ?? "").toUpperCase();
        if (ta !== tb) return ta.localeCompare(tb);
        const sa = Number(a?.sequence);
        const sb = Number(b?.sequence);
        const va = Number.isFinite(sa) ? sa : 9999;
        const vb = Number.isFinite(sb) ? sb : 9999;
        return va - vb;
      });

      const songsForThisAnime: any[] = [];
      const fallbackSeq: Record<string, number> = { OP: 0, ED: 0, INSERT: 0 };

      for (const theme of themes) {
        const themeType = String(theme?.type ?? "").toUpperCase();
        const seq =
          Number.isFinite(Number(theme?.sequence)) && Number(theme.sequence) > 0
            ? Number(theme.sequence)
            : (fallbackSeq[themeType] = (fallbackSeq[themeType] ?? 0) + 1);

        // Flatten videos, carrying each entry's episode range for episodeRange.
        const allVideos: Array<{ link: string; tags?: any; resolution?: any; nc?: any; episodes?: string | null }> = [];
        for (const entry of theme.animethemeentries ?? []) {
          for (const v of entry.videos ?? []) {
            if (v?.link) allVideos.push({ ...v, episodes: entry?.episodes ?? null });
          }
        }

        const best = chooseBestVideo(allVideos);
        if (!best?.link) continue;

        const rawTitle = theme?.song?.title ?? "Unknown Title";
        const artistsArr = (theme?.song?.artists ?? [])
          .map((a: any) => a?.name)
          .filter(Boolean);

        const artist = artistsArr.length ? artistsArr.join(", ") : "Unknown Artist";
        const sourceUrl = normalizeVideoLink(best.link);
        const videoKey = buildVideoKey(anime.name, anime.id, themeType, seq);

        if (isSongExcluded(pipelineExclusions, { videoKey })) {
          tally.add("Sons exclus (skip)");
          continue;
        }

        songsForThisAnime.push({
          title: rawTitle,
          artist,
          songType: themeType,
          sequence: seq,
          sourceUrl,
          episodeRange: best.episodes ?? null,
          difficulty: anime.difficulty ?? 'easy',
          tags: franchise.tags ?? [],
        });
      }

      if (songsForThisAnime.length === 0) {
        tally.add("Thèmes sans vidéo exploitable");
        continue;
      }

      anime.songs = songsForThisAnime;
      totalSongsAdded += songsForThisAnime.length;
      tally.add("Animes avec sons");
    }
  }

  progress.done();
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(franchises, null, 2));

  tally.print("📊 BILAN ANIMETHEMES");
  console.log(`\n✨ FIN ÉTAPE 2 : ${totalSongsAdded} sons | ${formatDuration(progress.elapsedMs)}`);
  console.log(`   📄 Fichier : ${OUTPUT_FILE}`);
}

enrichData();