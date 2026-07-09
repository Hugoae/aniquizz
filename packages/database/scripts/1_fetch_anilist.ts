import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { formatDuration, parseRetryAfterMs } from './lib/progress';

dotenv.config({ path: path.join(__dirname, '../.env') });

// --- CONFIGURATION ---
// How many popular anime roots to fetch (sorted by AniList popularity, most known
// first). Override per run, e.g. `ANILIST_LIMIT=30` then later `ANILIST_LIMIT=500`.
const ANIME_LIMIT = Math.max(1, Number(process.env.ANILIST_LIMIT ?? 500));
const ITEMS_PER_PAGE = Math.min(50, Math.max(1, Number(process.env.ANILIST_PER_PAGE ?? 50)));
const DELAY_MS = Math.max(0, Number(process.env.ANILIST_DELAY_MS ?? 1000));

// Chemins relatifs à database/scripts/
const OUTPUT_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'data_step1.json');
// Fichier de référence pour conserver les données verrouillées (anciennement editable_data.json)
const LOCKS_SOURCE_FILE = path.join(OUTPUT_DIR, 'manual_edits.json');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// --- GRAPHQL QUERIES ---
const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  synonyms
  season
  seasonYear
  episodes
  averageScore
  description(asHtml: false)
  genres
  popularity
  status
  format
  coverImage { extraLarge color }
  bannerImage
  tags { name rank }
  studios(isMain: true) { nodes { name } }
  relations {
    edges {
      relationType
      node { id type format }
    }
  }
`;

const LIST_QUERY = `
query ($page: Int, $perPage: Int) {
  Page (page: $page, perPage: $perPage) {
    pageInfo { hasNextPage }
    media (sort: POPULARITY_DESC, type: ANIME) {
      ${MEDIA_FIELDS}
    }
  }
}
`;

const SINGLE_ANIME_QUERY = `
query ($id: Int) {
  Media (id: $id) {
    ${MEDIA_FIELDS}
  }
}
`;

// --- UTILS ---

/**
 * Détermine la difficulté en fonction de la popularité
 */
function getDifficulty(popularity: number): string {
  if (popularity > 200000) return 'easy';
  if (popularity > 75000) return 'medium';
  return 'hard';
}

function isValidStatus(status: string): boolean {
  return ['FINISHED', 'RELEASING'].includes(status);
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(id: number, retries = 3): Promise<any> {
  try {
    const response = await axios.post('https://graphql.anilist.co', {
      query: SINGLE_ANIME_QUERY,
      variables: { id }
    });
    return response.data.data.Media;
  } catch (e: any) {
    if (e.response && e.response.status === 429 && retries > 0) {
      const wait = parseRetryAfterMs(e.response.headers, 30000);
      console.log(`\n🛑 Rate Limit AniList. Pause ${formatDuration(wait)}...`);
      await delay(wait);
      return fetchWithRetry(id, retries - 1);
    }
    return null;
  }
}

/**
 * Converts a raw AniList Media object into the normalized season shape stored
 * in data_step1.json. Newly discovered seasons are always emitted as unlocked
 * so they flow through the rest of the pipeline (themes, R2...).
 */
function normalizeSeason(s: any) {
  const alts = [s.title.english, s.title.native, ...(s.synonyms || [])].filter(Boolean);
  const studioName = s.studios?.nodes?.[0]?.name || "Studio Inconnu";

  return {
    id: s.id,
    idMal: s.idMal ?? null,
    name: s.title.romaji,
    altNames: [...new Set(alts)],
    season: s.season ?? null,
    year: s.seasonYear,
    episodes: s.episodes ?? null,
    averageScore: s.averageScore ?? null,
    description: s.description ?? null,
    format: s.format,
    coverImage: s.coverImage?.extraLarge,
    coverColor: s.coverImage?.color ?? null,
    bannerImage: s.bannerImage ?? null,
    popularity: s.popularity,
    difficulty: getDifficulty(s.popularity),
    status: s.status,
    siteUrl: `https://anilist.co/anime/${s.id}`,
    studio: studioName,
    isLocked: false,
    songs: []
  };
}

// --- MAIN PROCESS ---

async function generateCompleteTree() {
  const started = Date.now();
  console.log(`🚀 PHASE 1 : Récupération AniList (top ${ANIME_LIMIT} par popularité)...`);

  // 1. Chargement des données verrouillées (Locks)
  let lockedFranchises: any[] = [];
  const lockedAnimeIds = new Set<number>();

  if (fs.existsSync(LOCKS_SOURCE_FILE)) {
    try {
      const existingData = JSON.parse(fs.readFileSync(LOCKS_SOURCE_FILE, 'utf-8'));
      lockedFranchises = existingData.filter((f: any) => f.isLocked === true);

      lockedFranchises.forEach(f => {
        f.animes.forEach((a: any) => lockedAnimeIds.add(a.id));
      });

      console.log(`🔐 ${lockedFranchises.length} franchises verrouillées détectées (Conservées).`);
    } catch (e) {
      console.warn("⚠️ Impossible de lire le fichier de locks.");
    }
  } else {
    console.warn("⚠️  Aucun manual_edits.json : rien n'est protégé contre l'écrasement.");
    console.warn("   Avant un re-fetch, lance export_db_to_json.ts pour figer tes locks/éditions.");
  }

  // 1b. Nouvelles saisons des franchises verrouillées.
  // Un lock gèle les saisons existantes (éditions manuelles conservées), mais on
  // va tout de même chercher les SUITES parues depuis et les ajouter en tant que
  // saisons NON verrouillées, pour qu'elles suivent le pipeline normal.
  // Leurs ids sont ajoutés à lockedAnimeIds afin d'éviter qu'elles ressortent en
  // franchise séparée lors du fetch du top.
  if (lockedFranchises.length > 0) {
    console.log("🔓 Recherche de nouvelles saisons pour les franchises verrouillées...");
    let newlyAdded = 0;

    for (const franchise of lockedFranchises) {
      if (!franchise.animes?.length) continue;

      const sortedSeasons = [...franchise.animes].sort(
        (a: any, b: any) => (a.year || 0) - (b.year || 0)
      );
      const lastKnownId = sortedSeasons[sortedSeasons.length - 1].id;

      await delay(DELAY_MS);
      let current = await fetchWithRetry(lastKnownId);
      let depth = 0;

      while (current && depth < 15) {
        depth++;

        const sequelEdge = current.relations?.edges?.find((e: any) =>
          e.relationType === 'SEQUEL' && e.node.type === 'ANIME'
        );
        if (!sequelEdge) break;

        const sequelId = sequelEdge.node.id;

        // Saison déjà connue (verrouillée ou déjà ajoutée) → on suit la chaîne.
        if (lockedAnimeIds.has(sequelId) || franchise.animes.find((a: any) => a.id === sequelId)) {
          await delay(DELAY_MS);
          current = await fetchWithRetry(sequelId);
          continue;
        }

        process.stdout.write(`   + Nouvelle saison de "${franchise.franchiseName}"... `);
        await delay(DELAY_MS);
        const newSeason = await fetchWithRetry(sequelId);

        if (!newSeason) {
          console.log("Stop (Erreur/Non trouvé)");
          break;
        }
        if (!isValidStatus(newSeason.status)) {
          console.log(`Stop (Statut: ${newSeason.status})`);
          break;
        }

        console.log(`OK (${newSeason.title.romaji})`);
        franchise.animes.push(normalizeSeason(newSeason));
        lockedAnimeIds.add(sequelId);
        newlyAdded++;
        current = newSeason;
      }
    }

    console.log(`✅ ${newlyAdded} nouvelle(s) saison(s) ajoutée(s) aux franchises verrouillées.`);
  }

  // 2. Récupération du Top Popularité
  let allAnimesRaw: any[] = [];
  let currentPage = 1;

  console.log("📡 Téléchargement du Top Popularité...");
  while (allAnimesRaw.length < ANIME_LIMIT) {
    try {
      process.stdout.write(`   Page ${currentPage}... `);
      const response = await axios.post('https://graphql.anilist.co', {
        query: LIST_QUERY,
        variables: { page: currentPage, perPage: ITEMS_PER_PAGE }
      });
      const media = response.data.data.Page.media;
      if (!media || media.length === 0) break;

      const validMedia = media.filter((m: any) =>
        isValidStatus(m.status) && !lockedAnimeIds.has(m.id)
      );

      allAnimesRaw = [...allAnimesRaw, ...validMedia];

      if (allAnimesRaw.length >= ANIME_LIMIT) {
        allAnimesRaw = allAnimesRaw.slice(0, ANIME_LIMIT);
        break;
      }

      if (!response.data.data.Page.pageInfo.hasNextPage) break;
      console.log("OK");
      currentPage++;
      await delay(DELAY_MS);
    } catch (e: any) {
      if (e.response && e.response.status === 429) {
        const wait = parseRetryAfterMs(e.response.headers, 30000);
        console.log(`\n🛑 Rate Limit. Pause ${formatDuration(wait)}...`);
        await delay(wait);
        continue;
      }
      console.error("\n❌ Erreur:", e.message);
      break;
    }
  }
  console.log(`\n✅ ${allAnimesRaw.length} NOUVEAUX animes racines récupérés.`);

  const animeMap = new Map();
  allAnimesRaw.forEach(a => animeMap.set(a.id, a));

  // 2b. Expansion des préquelles (remontée symétrique aux suites) : on va chercher
  // via l'API les saisons antérieures absentes du top, pour ne pas casser une
  // franchise dont seule la saison 2+ est populaire.
  console.log("🔙 Expansion des préquelles...");
  for (const seed of [...animeMap.values()]) {
    let current = seed;
    let depth = 0;
    while (depth < 15) {
      const prequelEdge = current.relations.edges.find((e: any) =>
        e.relationType === 'PREQUEL' && e.node.type === 'ANIME'
      );
      if (!prequelEdge) break;

      const prequelId = prequelEdge.node.id;
      if (lockedAnimeIds.has(prequelId)) break; // respect the locked boundary

      let prequel = animeMap.get(prequelId);
      if (!prequel) {
        process.stdout.write(`   + Préquelle de ${current.title.romaji}... `);
        await delay(DELAY_MS);
        const fetched = await fetchWithRetry(prequelId);
        if (fetched && isValidStatus(fetched.status)) {
          console.log(`OK (${fetched.title.romaji})`);
          prequel = fetched;
          animeMap.set(prequelId, fetched);
        } else {
          console.log(fetched ? `Stop (Statut: ${fetched.status})` : "Stop (Erreur/Non trouvé)");
          break;
        }
      }

      current = prequel;
      depth++;
    }
  }

  // 3. Identification des Franchises (sur l'ensemble étendu : top + préquelles)
  console.log("🧩 Identification des Franchises...");
  const franchises: Record<string, any[]> = {};

  for (const anime of animeMap.values()) {
    let current = anime;
    let root = anime;
    let depth = 0;

    // Remontée vers la racine (Prequels) — toutes présentes dans animeMap désormais.
    while (depth < 15) {
      const prequel = current.relations.edges.find((e: any) =>
        e.relationType === 'PREQUEL' && e.node.type === 'ANIME'
      );

      if (prequel && animeMap.has(prequel.node.id)) {
        current = animeMap.get(prequel.node.id);
        root = current;
      } else {
        break;
      }
      depth++;
    }

    const franchiseName = root.title.romaji;
    if (!franchises[franchiseName]) franchises[franchiseName] = [];
    if (!franchises[franchiseName].find(a => a.id === anime.id)) {
      franchises[franchiseName].push(anime);
    }
  }

  // 4. Expansion des suites (Sequels)
  console.log("🕵️ Expansion des suites...");
  const franchiseNames = Object.keys(franchises);

  for (const fName of franchiseNames) {
    const franchiseList = franchises[fName];
    franchiseList.sort((a, b) => (a.seasonYear || 0) - (b.seasonYear || 0));

    let expansionActive = true;
    while (expansionActive) {
      const lastSeason = franchiseList[franchiseList.length - 1];

      const sequelEdge = lastSeason.relations.edges.find((e: any) =>
        e.relationType === 'SEQUEL' && e.node.type === 'ANIME'
      );

      if (sequelEdge) {
        const sequelId = sequelEdge.node.id;

        if (lockedAnimeIds.has(sequelId)) {
          expansionActive = false;
          continue;
        }

        if (animeMap.has(sequelId)) {
          const existing = animeMap.get(sequelId);
          if (!franchiseList.find(a => a.id === sequelId)) {
            franchiseList.push(existing);
          } else {
            expansionActive = false;
          }
        } else {
          process.stdout.write(`   + Suite de ${fName}... `);
          await delay(DELAY_MS);
          const newAnime = await fetchWithRetry(sequelId);

          if (newAnime) {
            if (isValidStatus(newAnime.status)) {
              console.log(`OK (${newAnime.title.romaji})`);
              franchiseList.push(newAnime);
              animeMap.set(newAnime.id, newAnime);
            } else {
              console.log(`Stop (Statut: ${newAnime.status})`);
              expansionActive = false;
            }
          } else {
            console.log("Stop (Erreur/Non trouvé)");
            expansionActive = false;
          }
        }
      } else {
        expansionActive = false;
      }
    }
  }

  console.log("\n💾 Traitement final et Fusion...");

  // 5. Normalisation des données
  const processedNewFranchises = Object.keys(franchises).map(fName => {
    const seasons = franchises[fName];
    seasons.sort((a, b) => (a.seasonYear || 0) - (b.seasonYear || 0));
    const rootAnime = seasons[0];

    const cleanSeasons = seasons.map(normalizeSeason);

    return {
      franchiseName: fName,
      isLocked: false,
      genres: rootAnime.genres,
      tags: rootAnime.tags.slice(0, 5).map((t: any) => t.name),
      animes: cleanSeasons
    };
  });

  // 6. Fusion : Locked + New
  const finalMap = new Map<string, any>();

  lockedFranchises.forEach(f => finalMap.set(f.franchiseName, f));

  processedNewFranchises.forEach(f => {
    if (!finalMap.has(f.franchiseName)) {
      finalMap.set(f.franchiseName, f);
    }
  });

  const finalOutput = Array.from(finalMap.values());
  finalOutput.sort((a, b) => a.franchiseName.localeCompare(b.franchiseName));

  const totalFranchises = finalOutput.length;
  const totalAnimes = finalOutput.reduce((acc, f) => acc + f.animes.length, 0);

  console.log(`\n📊 BILAN ANILIST (Fusionné) :`);
  console.log(`   - Franchises totales : ${totalFranchises}`);
  console.log(`   - Dont verrouillées  : ${lockedFranchises.length}`);
  console.log(`   - Total Saisons      : ${totalAnimes}`);
  console.log(`   - Temps écoulé       : ${formatDuration(Date.now() - started)}`);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalOutput, null, 2));
  console.log(`🎉 Fichier généré : ${OUTPUT_FILE}`);
}

generateCompleteTree();