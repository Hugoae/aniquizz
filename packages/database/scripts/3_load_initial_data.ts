import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { parsePipelineJson } from './lib/pipeline-schemas';
import {
  buildVideoKey,
  getPipelineSongSource,
  normalizePipelineSong,
  parsePipelineDifficulty,
} from './lib/song-helpers';
import { formatDuration, Progress, Tally } from './lib/progress';
import { isSongExcluded, loadAllPipelineExclusions } from './lib/load-pipeline-exclusions';
import { recomputeFranchiseMaxPopularity } from './lib/franchise-popularity';
import { syncPipelineSerialSequences } from './lib/sync-serial-sequences';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const INPUT_FILE = path.join(__dirname, "../data/data_step2.json");
const DATA_DIR = path.join(__dirname, "../data");

async function main() {
  console.log(`🔥 IMPORTATION JSON -> DATABASE (Mode : Respect Locks)`);

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Fichier introuvable : ${INPUT_FILE}`);
    process.exit(1);
  }

  const rawJson = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  const franchisesData = parsePipelineJson(rawJson, 'data_step2.json');
  const pipelineExclusions = loadAllPipelineExclusions(DATA_DIR);

  // manual_edits import can insert Franchise rows with explicit ids and leave the
  // serial sequence behind MAX(id) — the next create then hits P2002 on id.
  await syncPipelineSerialSequences(prisma);

  console.log(`📦 ${franchisesData.length} Franchises à traiter...`);

  const tally = new Tally();
  const progress = new Progress(franchisesData.length);

  for (const fData of franchisesData) {
    progress.tick();
    progress.line(fData.franchiseName ?? fData.name ?? '');

    // Guard: skip franchises with a missing name (supports pipeline `franchiseName`
    // and DB export `name` field shapes).
    const franchiseName = fData.franchiseName ?? fData.name;
    if (!franchiseName) {
      console.warn("⚠️  Franchise ignorée (Nom manquant/undefined)");
      continue;
    }

    // --- Step A: franchise ---
    let dbFranchise = await prisma.franchise.findUnique({
      where: { name: franchiseName }
    });

    // Tentative de lien parent/enfant si franchise introuvable
    if (!dbFranchise && fData.animes && fData.animes.length > 0) {
      const firstAnimeId = fData.animes[0].id;
      const childAnime = await prisma.anime.findUnique({
        where: { id: firstAnimeId },
        include: { franchise: true }
      });

      if (childAnime && childAnime.franchise) {
        dbFranchise = childAnime.franchise;
      }
    }

    let franchiseId;

    if (dbFranchise && dbFranchise.isLocked) {
      franchiseId = dbFranchise.id;
    } else if (dbFranchise) {
      // Linked via an existing anime (name in JSON may differ from DB row).
      const f = await prisma.franchise.update({
        where: { id: dbFranchise.id },
        data: { genres: fData.genres || [] },
      });
      franchiseId = f.id;
    } else {
      const f = await prisma.franchise.upsert({
        where: { name: franchiseName },
        create: {
          name: franchiseName,
          genres: fData.genres || [],
        },
        update: {
          genres: fData.genres || [],
        },
      });
      franchiseId = f.id;
    }

    if (!franchiseId) continue;

    // --- Step B: animes ---
    if (!fData.animes) continue;

    for (const aData of fData.animes) {
      const existingAnime = await prisma.anime.findUnique({ where: { id: aData.id } });

      if (existingAnime && existingAnime.isLocked) {
        // Locked anime: skip updates
      } else {
        const animeFields = {
          name: aData.name ?? String(aData.id),
          siteUrl: aData.siteUrl,
          coverImage: aData.coverImage,
          coverColor: aData.coverColor ?? aData.color ?? null,
          bannerImage: aData.bannerImage ?? null,
          description: aData.description ?? null,
          altNames: aData.altNames || [],
          tags: aData.tags || [],
          format: aData.format,
          status: aData.status,
          season: aData.season ?? null,
          seasonYear: aData.year ?? aData.seasonYear,
          episodes: aData.episodes ?? null,
          averageScore: aData.averageScore ?? null,
          idMal: aData.idMal ?? null,
          popularity: aData.popularity || 0,
          franchiseId: franchiseId,
        };

        await prisma.anime.upsert({
          where: { id: aData.id },
          update: animeFields,
          create: { id: aData.id, ...animeFields },
        });
      }

      // --- Step C: songs (respect lock flag) ---
      if (!aData.songs) continue;

      for (const sData of aData.songs) {
        // Resolve the downloadable source across pipeline formats (new `sourceUrl`
        // or legacy `videoKey`-as-URL). No usable http source -> skip.
        const source = getPipelineSongSource(sData);
        if (!source) {
          tally.add('Sons sans source (skip)');
          continue;
        }

        const animeName = aData.name ?? String(aData.id);

        const { songType, sequence } = normalizePipelineSong(sData);
        const canonicalKey = buildVideoKey(animeName, aData.id, songType, sequence);

        if (isSongExcluded(pipelineExclusions, { songId: sData.id, videoKey: canonicalKey })) {
          tally.add('Sons exclus (skip)');
          continue;
        }

        // Identity is (anime, songType, sequence), NOT the videoKey: an AniList
        // romaji rename would change the key and create a duplicate row. Prefer the
        // canonical key (fast path), then fall back to the semantic identity so a
        // renamed song updates its existing row instead of spawning a duplicate.
        const existingSong =
          (await prisma.song.findUnique({ where: { videoKey: canonicalKey } })) ??
          (await prisma.song.findFirst({
            where: { animeId: aData.id, songType, sequence },
          }));

        if (existingSong && existingSong.isLocked) {
          tally.add('Sons verrouillés (skip)');
          continue;
        }

        // Never overwrite an already-downloaded (COMPLETED) song's live R2 URL with a
        // raw AnimeThemes source: only refresh the source while it is still pending.
        const keepCompleted = existingSong?.downloadStatus === 'COMPLETED';

        if (existingSong) {
          // Keep the existing videoKey (avoids a unique-key collision on rename;
          // the key is only an R2 object name and stays internally consistent).
          await prisma.song.update({
            where: { id: existingSong.id },
            data: {
              title: sData.title ?? existingSong.title,
              artist: sData.artist ?? existingSong.artist,
              songType,
              sequence,
              tags: sData.tags || [],
              episodeRange: sData.episodeRange ?? existingSong.episodeRange,
              ...(keepCompleted ? {} : { sourceUrl: source }),
              difficulty: parsePipelineDifficulty(sData.difficulty),
              animeId: aData.id,
            },
          });
          tally.add('Sons mis à jour');
        } else {
          await prisma.song.create({
            data: {
              title: sData.title ?? 'Unknown Title',
              artist: sData.artist ?? 'Unknown Artist',
              songType,
              sequence,
              videoKey: canonicalKey,
              tags: sData.tags || [],
              episodeRange: sData.episodeRange ?? null,
              sourceUrl: source,
              difficulty: parsePipelineDifficulty(sData.difficulty),
              animeId: aData.id,
              downloadStatus: 'PENDING',
            },
          });
          tally.add('Sons créés');
        }
      }
    }

    await recomputeFranchiseMaxPopularity(prisma, franchiseId);
  }

  progress.done();
  tally.print('📊 BILAN IMPORT');
  console.log(`\n✅ Import terminé (${formatDuration(progress.elapsedMs)}). Base synchronisée.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });