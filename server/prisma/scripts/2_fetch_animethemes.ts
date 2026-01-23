import axios from "axios";
import fs from "fs";
import path from "path";

// --- CONFIGURATION ---
const INPUT_FILE = path.join(__dirname, "../data/data_step1.json");
const OUTPUT_FILE = path.join(__dirname, "../data/data_step2.json");
const DATA_DIR = path.join(__dirname, "../data");

const CACHE_FILE = path.join(DATA_DIR, "animethemes_cache.json");
const DELAY_MS = 200;

const ANIMETHEMES_API = "https://api.animethemes.moe/anime";
const ANIMETHEMES_BASE = "https://animethemes.moe";

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

// Choix du meilleur clip: priorité aux "NC" si dispo, sinon le 1er
function chooseBestVideo(videos: Array<{ link: string; tags?: any }>) {
  if (!videos || videos.length === 0) return null;

  const normalized = videos
    .filter((v) => !!v?.link)
    .map((v) => ({
      ...v,
      tags: toTagArray(v.tags),
    }));

  const nc = normalized.find((v) =>
    v.tags.some((t) => t.toUpperCase().includes("NC"))
  );

  return nc ?? normalized[0] ?? null;
}

/**
 * Récupère un animé AnimeThemes via mapping AniList (resources)
 * + inclut animethemes.song.artists + animethemeentries.videos
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

      // Wrapper (au cas où)
      if (Array.isArray(payload?.anime) && payload.anime.length > 0) {
        return payload.anime[0];
      }

      // JSON:API
      const data = payload?.data;
      if (!Array.isArray(data) || data.length === 0) return null;

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
                }))
                .filter((v: any) => !!v.link);

              return { videos };
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

      const wait = 400 * Math.pow(2, attempt);
      await delay(wait);
    }
  }

  return null;
}

async function enrichData() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const franchises = JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8"));
  const cache = loadCache();

  let totalSongsAdded = 0;
  let animeCount = 0;

  console.log("\n🟠 [ÉTAPE 2/3] ENRICHISSEMENT ANIMETHEMES (ALL OPENINGS OP1/OP2/...)");
  console.log("=============================================================\n");

  for (const franchise of franchises) {
    console.log(`📦 Franchise : ${franchise.franchiseName}`);

    for (const anime of franchise.animes) {
      animeCount++;
      process.stdout.write(
        `   [${animeCount}] Recherche ID ${anime.id} (${anime.name})... `
      );

      const cacheKey = String(anime.id);
      let atAnime = cache[cacheKey];

      if (!atAnime) {
        atAnime = await fetchByAniListId(anime.id);
        cache[cacheKey] = atAnime ?? null;
        saveCache(cache);
        await delay(DELAY_MS);
      }

      if (!atAnime || !Array.isArray(atAnime.animethemes)) {
        console.log("⚠️  Pas de correspondance ID.");
        anime._toBeDeleted = true;
        continue;
      }

      // ✅ récupère toutes les OP
      const opThemes = atAnime.animethemes
        .filter((t: any) => String(t?.type ?? "").toUpperCase() === "OP");

      if (opThemes.length === 0) {
        console.log("⚠️  Match OK mais aucune OP trouvée.");
        anime._toBeDeleted = true;
        continue;
      }

      // Sort par sequence si possible
      opThemes.sort((a: any, b: any) => {
        const sa = Number(a?.sequence);
        const sb = Number(b?.sequence);
        const va = Number.isFinite(sa) ? sa : 9999;
        const vb = Number.isFinite(sb) ? sb : 9999;
        return va - vb;
      });

      const songsForThisAnime: any[] = [];
      let fallbackSeq = 1;

      for (const theme of opThemes) {
        // sequence fiable si dispo, sinon fallback
        const seq =
          Number.isFinite(Number(theme?.sequence)) && Number(theme.sequence) > 0
            ? Number(theme.sequence)
            : fallbackSeq++;

        // récupère tous les videos
        const allVideos: Array<{ link: string; tags?: any }> = [];
        for (const entry of theme.animethemeentries ?? []) {
          for (const v of entry.videos ?? []) {
            if (v?.link) allVideos.push(v);
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

        songsForThisAnime.push({
          title: rawTitle,
          artist,
          type: `OP${seq}`, // ✅ OP1 / OP2 / OP3 ...
          sequence: seq,
          videoKey: sourceUrl, // URL source; remplacée par filename à l’étape 3
          difficulty: anime.difficulty ?? "easy",
          tags: franchise.tags ?? [],
        });
      }

      if (songsForThisAnime.length === 0) {
        console.log("⚠️  OP trouvées mais aucune vidéo exploitable.");
        anime._toBeDeleted = true;
        continue;
      }

      anime.songs = songsForThisAnime;
      totalSongsAdded += songsForThisAnime.length;

      console.log(`✅ ${songsForThisAnime.length} opening(s) ajoutée(s).`);
    }

    franchise.animes = franchise.animes.filter((a: any) => !a._toBeDeleted);
    franchise.animes.forEach((a: any) => delete a._toBeDeleted);
  }

  const filteredFranchises = franchises.filter((f: any) => f.animes.length > 0);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(filteredFranchises, null, 2));

  console.log(`\n✨ FIN ÉTAPE 2 : ${totalSongsAdded} openings (OP1/OP2/...) trouvées.`);
  console.log(`   📄 Fichier : ${OUTPUT_FILE}`);
}

enrichData();
