import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { formatDuration, parseRetryAfterMs } from './lib/progress';
import {
  defaultManualEditsPath,
  franchiseDisplayName,
  loadPipelineLocks,
  collectLockedAnimeIds,
} from './lib/load-pipeline-locks';
import { confirmRiskyPipelineRun, shouldBlockUnprotectedRun } from './lib/pipeline-lock-guard';
import {
  loadAllPipelineExclusions,
  stripExcludedFromFranchiseAnimes,
} from './lib/load-pipeline-exclusions';

dotenv.config({ path: path.join(__dirname, '../.env') });

// --- CONFIGURATION ---
// How many popular anime roots to fetch (sorted by AniList popularity, most known
// first). Override per run, e.g. `ANILIST_LIMIT=30` then later `ANILIST_LIMIT=500`.
const ANIME_LIMIT = Math.max(1, Number(process.env.ANILIST_LIMIT ?? 500));
const ITEMS_PER_PAGE = Math.min(50, Math.max(1, Number(process.env.ANILIST_PER_PAGE ?? 50)));
const DELAY_MS = Math.max(0, Number(process.env.ANILIST_DELAY_MS ?? 1000));

/**
 * Optional: run an incremental fetch for a specific list of AniList Media ids.
 *
 * Example:
 *   ANILIST_TARGET_IDS=196935,206914 npx ts-node scripts/1_fetch_anilist.ts
 *
 * When set, the script will:
 * - Fetch only these ids as "seed" nodes
 * - Expand PREQUEL + SEQUEL chains (unless skipped by env flags)
 * - Then output the same `data_step1.json` shape as a normal run
 */
function parseTargetIds(raw: string | undefined): number[] {
  if (!raw?.trim()) return [];
  const ids = raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return [...new Set(ids)];
}

const TARGET_IDS = parseTargetIds(process.env.ANILIST_TARGET_IDS);

/** Truthy when env is 1, true, or yes (case-insensitive). */
function isTruthyEnv(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

// Sequel walks are the slowest step (1 API call + DELAY_MS per hop). Skip for
// incremental runs shortly after a full fetch — see README.
const SKIP_ALL_SEQUELS = isTruthyEnv(process.env.ANILIST_SKIP_SEQUELS);
const SKIP_LOCKED_SEQUELS =
  SKIP_ALL_SEQUELS || isTruthyEnv(process.env.ANILIST_SKIP_LOCKED_SEQUELS);
const SKIP_NEW_SEQUELS =
  SKIP_ALL_SEQUELS || isTruthyEnv(process.env.ANILIST_SKIP_NEW_SEQUELS);

// Paths relative to database/scripts/
const OUTPUT_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'data_step1.json');
// Reference file for locked rows (formerly editable_data.json)
const LOCKS_SOURCE_FILE = defaultManualEditsPath(__dirname);

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
 * Map AniList popularity to difficulty tier.
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

function findSequelEdge(media: any) {
  return media.relations?.edges?.find(
    (e: any) => e.relationType === 'SEQUEL' && e.node.type === 'ANIME',
  );
}

/**
 * Walk SEQUEL edges forward from each seed id (not only the latest by year).
 * Fixes franchises where a movie/OVA after a TV season blocks the main TV chain.
 */
async function expandLockedFranchiseSequels(
  franchise: { franchiseName: string; animes: any[] },
  excludedAnimeIds: Set<number>,
  lockedAnimeIds: Set<number>,
): Promise<number> {
  let newlyAdded = 0;

  for (const seed of franchise.animes) {
    await delay(DELAY_MS);
    let current = await fetchWithRetry(seed.id);
    if (!current) continue;

    let depth = 0;
    while (current && depth < 15) {
      depth++;
      const sequelEdge = findSequelEdge(current);
      if (!sequelEdge) break;

      const sequelId = sequelEdge.node.id;
      if (excludedAnimeIds.has(sequelId)) break;

      if (franchise.animes.find((a: any) => a.id === sequelId)) {
        await delay(DELAY_MS);
        current = await fetchWithRetry(sequelId);
        continue;
      }

      if (lockedAnimeIds.has(sequelId)) {
        await delay(DELAY_MS);
        current = await fetchWithRetry(sequelId);
        continue;
      }

      process.stdout.write(`   + Nouvelle saison de "${franchise.franchiseName}"... `);
      await delay(DELAY_MS);
      const newSeason = await fetchWithRetry(sequelId);

      if (!newSeason) {
        console.log('Stop (Erreur/Non trouvé)');
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

  return newlyAdded;
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
  if (TARGET_IDS.length > 0) {
    console.log(`🚀 PHASE 1 : Récupération AniList (ciblée) — ${TARGET_IDS.length} id(s)...`);
    console.log(`   Seeds: ${TARGET_IDS.join(', ')}`);
  } else {
    console.log(`🚀 PHASE 1 : Récupération AniList (top ${ANIME_LIMIT} par popularité)...`);
  }
  if (SKIP_LOCKED_SEQUELS || SKIP_NEW_SEQUELS) {
    const parts: string[] = [];
    if (SKIP_LOCKED_SEQUELS) parts.push('locked-franchise sequels');
    if (SKIP_NEW_SEQUELS) parts.push('new-franchise sequels');
    console.log(`⏭️  Sequel expansion skipped: ${parts.join(', ')}`);
  }

  // 1. Load locked franchises (manual_edits.json, then DB fallback)
  const prisma = new PrismaClient();
  let dbLockedFranchises = 0;
  let lockResult;
  try {
    lockResult = await loadPipelineLocks({
      manualEditsPath: LOCKS_SOURCE_FILE,
      prisma,
    });
    dbLockedFranchises = await prisma.franchise.count({ where: { isLocked: true } });
  } finally {
    await prisma.$disconnect();
  }

  const lockedFranchises = lockResult.lockedFranchises;
  const pipelineExclusions = loadAllPipelineExclusions(OUTPUT_DIR);
  const excludedAnimeIds = pipelineExclusions.animeIds;

  if (excludedAnimeIds.size > 0) {
    console.log(`🚫 ${excludedAnimeIds.size} excluded anime id(s) from pipeline_exclusions.json`);
    for (const franchise of lockedFranchises) {
      franchise.animes = stripExcludedFromFranchiseAnimes(franchise.animes, excludedAnimeIds);
    }
  }

  let lockedAnimeIds = collectLockedAnimeIds(lockedFranchises);

  for (const warning of lockResult.warnings) {
    console.warn(`⚠️  ${warning}`);
  }

  if (lockedFranchises.length > 0) {
    const sourceLabel = lockResult.source === 'database' ? 'database fallback' : 'manual_edits.json';
    console.log(`🔐 ${lockedFranchises.length} locked franchise(s) loaded (${sourceLabel}).`);
  }

  if (shouldBlockUnprotectedRun(lockResult, dbLockedFranchises)) {
    const proceed = await confirmRiskyPipelineRun(
      `Database has ${dbLockedFranchises} locked franchise(s) but none were loaded. Aborting protects manual edits. Continue anyway?`,
    );
    if (!proceed) {
      console.error('❌ Step 1 aborted. Export locks with export_db_to_json.ts or set PIPELINE_ALLOW_UNPROTECTED=1.');
      process.exit(1);
    }
  }

  // 1b. New seasons for locked franchises.
  // A lock freezes existing seasons (manual edits preserved), but we still fetch
  // SEQUEL entries released since and add them as UNLOCKED seasons so they follow
  // the normal pipeline. Their ids are added to lockedAnimeIds so they are not
  // fetched again as a separate franchise during the top pass.
  if (lockedFranchises.length > 0 && !SKIP_LOCKED_SEQUELS) {
    console.log("🔓 Recherche de nouvelles saisons pour les franchises verrouillées...");
    let newlyAdded = 0;

    for (const franchise of lockedFranchises) {
      if (!franchise.animes?.length) continue;
      newlyAdded += await expandLockedFranchiseSequels(
        franchise,
        excludedAnimeIds,
        lockedAnimeIds,
      );
    }

    console.log(`✅ ${newlyAdded} nouvelle(s) saison(s) ajoutée(s) aux franchises verrouillées.`);
  } else if (lockedFranchises.length > 0 && SKIP_LOCKED_SEQUELS) {
    console.log('⏭️  Recherche de suites (franchises verrouillées) ignorée.');
  }

  const animeMap = new Map<number, any>();

  if (TARGET_IDS.length > 0) {
    // 2. Fetch targeted seeds
    console.log('📡 Téléchargement ciblé...');
    for (const id of TARGET_IDS) {
      if (lockedAnimeIds.has(id)) {
        console.log(`   - Skip ${id} (locked)`);
        continue;
      }
      if (excludedAnimeIds.has(id)) {
        console.log(`   - Skip ${id} (excluded)`);
        continue;
      }

      process.stdout.write(`   + Seed ${id}... `);
      await delay(DELAY_MS);
      const fetched = await fetchWithRetry(id);
      if (!fetched) {
        console.log('Stop (Erreur/Non trouvé)');
        continue;
      }
      if (!isValidStatus(fetched.status)) {
        console.log(`Stop (Statut: ${fetched.status})`);
        continue;
      }
      console.log(`OK (${fetched.title?.romaji ?? 'unknown'})`);
      animeMap.set(id, fetched);
    }
    console.log(`\n✅ ${animeMap.size} seed(s) récupérée(s).`);
  } else {
    // 2. Fetch popularity top
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
          isValidStatus(m.status) && !lockedAnimeIds.has(m.id) && !excludedAnimeIds.has(m.id)
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

    allAnimesRaw.forEach(a => animeMap.set(a.id, a));
  }

  // 2b. Prequel expansion (symmetric to sequel walk): fetch earlier seasons missing
  // from the top list so a franchise is not broken when only season 2+ is popular.
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
      if (lockedAnimeIds.has(prequelId) || excludedAnimeIds.has(prequelId)) break; // respect boundary

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

  // 3. Build franchise groupings (extended set: top + prequels)
  console.log("🧩 Identification des Franchises...");
  const franchises: Record<string, any[]> = {};

  for (const anime of animeMap.values()) {
    if (excludedAnimeIds.has(anime.id)) continue;

    let current = anime;
    let root = anime;
    let depth = 0;

    // Walk prequels to the root — all nodes are in animeMap now.
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
  if (!SKIP_NEW_SEQUELS) {
    console.log("🕵️ Expansion des suites...");
    const franchiseNames = Object.keys(franchises);

    for (const fName of franchiseNames) {
      const franchiseList = franchises[fName];

      let expanded = true;
      while (expanded) {
        expanded = false;

        for (const anime of [...franchiseList]) {
          const sequelEdge = findSequelEdge(anime);
          if (!sequelEdge) continue;

          const sequelId = sequelEdge.node.id;
          if (lockedAnimeIds.has(sequelId) || excludedAnimeIds.has(sequelId)) continue;
          if (franchiseList.find((a) => a.id === sequelId)) continue;

          if (animeMap.has(sequelId)) {
            franchiseList.push(animeMap.get(sequelId));
            expanded = true;
            continue;
          }

          process.stdout.write(`   + Suite de ${fName}... `);
          await delay(DELAY_MS);
          const newAnime = await fetchWithRetry(sequelId);

          if (newAnime && isValidStatus(newAnime.status)) {
            console.log(`OK (${newAnime.title.romaji})`);
            franchiseList.push(newAnime);
            animeMap.set(newAnime.id, newAnime);
            expanded = true;
          } else if (newAnime) {
            console.log(`Stop (Statut: ${newAnime.status})`);
          } else {
            console.log('Stop (Erreur/Non trouvé)');
          }
        }
      }
    }
  } else {
    console.log('⏭️  Expansion des suites (nouvelles franchises) ignorée.');
  }

  console.log("\n💾 Traitement final et Fusion...");

  // 5. Normalize output rows
  const processedNewFranchises = Object.keys(franchises).map(fName => {
    const seasons = franchises[fName];
    seasons.sort((a, b) => (a.seasonYear || 0) - (b.seasonYear || 0));
    const rootAnime = seasons[0];

    const cleanSeasons = stripExcludedFromFranchiseAnimes(
      seasons.map(normalizeSeason),
      excludedAnimeIds,
    );

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

  lockedFranchises.forEach((f) => {
    f.animes = stripExcludedFromFranchiseAnimes(f.animes, excludedAnimeIds);
    finalMap.set(franchiseDisplayName(f), f);
  });

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

generateCompleteTree().catch((err) => {
  console.error(err);
  process.exit(1);
});