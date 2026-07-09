import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import {
  buildVideoKey,
  getPipelineSongSource,
  looksLikeVideoKey,
  normalizePipelineSong,
  parsePipelineDifficulty,
} from './lib/song-helpers';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
// Priorité au fichier manuel s'il existe, sinon le fichier brut
const MANUAL_FILE = path.join(__dirname, '../data/manual_edits.json');
const GENERATED_FILE = path.join(__dirname, '../data/data_step2.json');

const SOURCE_FILE = fs.existsSync(MANUAL_FILE) ? MANUAL_FILE : GENERATED_FILE;

async function main() {
  console.log(`🔥 DÉMARRAGE DU SEED (Reset & Fill)...`);
  console.log(`   📂 Source : ${path.basename(SOURCE_FILE)}`);

  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`❌ Fichier source introuvable.`);
    process.exit(1);
  }

  // 1. NETTOYAGE
  console.log("🧹 Nettoyage des anciennes données...");
  await prisma.songHistory.deleteMany();
  await prisma.playerAnimeList.deleteMany();
  await prisma.song.deleteMany();
  await prisma.anime.deleteMany();
  await prisma.franchise.deleteMany();
  console.log("✨ Base de données propre !");

  // 2. INSERTION
  console.log("🌱 Début de l'insertion...");
  const franchisesData = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf-8'));

  let totalFranchises = 0;
  let totalAnimes = 0;
  let totalSongs = 0;

  const insertedAnimeIds = new Set<number>();
  const insertedVideoKeys = new Set<string>();

  for (const fData of franchisesData) {

    // Création Franchise
    const franchise = await prisma.franchise.create({
      data: {
        name: fData.franchiseName || fData.name, // Supporte les deux formats
        genres: fData.genres || [],
        isLocked: fData.isLocked || false
      }
    });
    totalFranchises++;

    for (const aData of fData.animes) {
      if (insertedAnimeIds.has(aData.id)) continue;

      // Création Anime
      const anime = await prisma.anime.create({
        data: {
          id: aData.id,
          name: aData.name,
          siteUrl: aData.siteUrl,
          coverImage: aData.coverImage,
          altNames: aData.altNames || [],
          tags: aData.tags || [],
          format: aData.format,
          status: aData.status,
          seasonYear: aData.year || aData.seasonYear,
          popularity: aData.popularity || 0,
          franchiseId: franchise.id,
          isLocked: aData.isLocked || false
        }
      });
      insertedAnimeIds.add(aData.id);
      totalAnimes++;

      for (const sData of aData.songs) {
        const { songType, sequence } = normalizePipelineSong(sData);
        // Reuse a real R2 key from a DB export; otherwise rebuild it (legacy pipeline
        // files stored the AnimeThemes URL in `videoKey`, which is not a valid key).
        const videoKey = looksLikeVideoKey(sData.videoKey)
          ? sData.videoKey
          : buildVideoKey(aData.name, aData.id, songType, sequence);
        if (insertedVideoKeys.has(videoKey)) continue;

        // Seeds metadata only; media must be (re)synced to R2 via `4_sync_storage`.
        // Songs start PENDING with their downloadable source resolved across formats.
        await prisma.song.create({
          data: {
            title: sData.title,
            artist: sData.artist,
            songType,
            sequence,
            videoKey,
            tags: sData.tags || [],
            difficulty: parsePipelineDifficulty(sData.difficulty),
            duration: sData.duration || 0,
            sourceUrl: getPipelineSongSource(sData),
            animeId: anime.id,
          }
        });
        insertedVideoKeys.add(videoKey);
        totalSongs++;
      }
    }
    process.stdout.write(`   📦 ${franchise.name} traité...\r`);
  }

  console.log(`\n\n✅ SEEDING TERMINÉ AVEC SUCCÈS !`);
  console.log(`===================================`);
  console.log(`   🏛️  Franchises : ${totalFranchises}`);
  console.log(`   📺 Animes     : ${totalAnimes}`);
  console.log(`   🎵 Songs      : ${totalSongs}`);
  console.log(`===================================`);
}

main()
  .catch((e) => {
    console.error("\n❌ ERREUR FATALE :");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });