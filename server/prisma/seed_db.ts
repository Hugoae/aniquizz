import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const DATA_FILE = path.join(__dirname, 'data/final_game_data.json');

async function main() {
  console.log(`🔥 DÉMARRAGE DU RESET & SEED (Mode Genres & Anti-Doublons)...`);

  if (!fs.existsSync(DATA_FILE)) {
    console.error(`❌ Fichier de données introuvable : ${DATA_FILE}`);
    process.exit(1);
  }

  // 1. NETTOYAGE
  console.log("🧹 Nettoyage des anciennes données...");
  // L'ordre est important pour éviter les erreurs de contraintes de clé étrangère
  await prisma.songHistory.deleteMany();
  await prisma.songVote.deleteMany();
  await prisma.playerAnimeList.deleteMany();
  await prisma.song.deleteMany();
  await prisma.anime.deleteMany();
  await prisma.franchise.deleteMany();
  console.log("✨ Base de données propre !");

  // 2. INSERTION
  console.log("🌱 Début de l'insertion...");
  const franchisesData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  
  let totalFranchises = 0;
  let totalAnimes = 0;
  let totalSongs = 0;

  // Ensembles pour traquer les doublons (Sécurité supplémentaire)
  const insertedAnimeIds = new Set<number>();
  const insertedVideoKeys = new Set<string>();

  for (const fData of franchisesData) {
    
    // Création Franchise avec GENRES IMPORTÉS DU JSON
    // Note: On s'assure que fData.genres existe, sinon tableau vide
    const franchise = await prisma.franchise.upsert({
      where: { name: fData.franchiseName },
      update: {
        genres: fData.genres || [] 
      },
      create: { 
        name: fData.franchiseName,
        genres: fData.genres || [] 
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
            seasonYear: aData.year,
            popularity: aData.popularity || 0,
            franchiseId: franchise.id
        }
      });
      insertedAnimeIds.add(aData.id);
      totalAnimes++;

      for (const sData of aData.songs) {
        if (insertedVideoKeys.has(sData.videoKey)) continue;

        // Création Song
        await prisma.song.create({
          data: {
            title: sData.title,
            artist: sData.artist,
            type: sData.type,
            videoKey: sData.videoKey,
            tags: sData.tags || [],
            difficulty: sData.difficulty || 'medium',
            duration: sData.duration || 0,
            sourceUrl: sData.sourceUrl || null,
            animeId: anime.id
          }
        });
        insertedVideoKeys.add(sData.videoKey);
        totalSongs++;
      }
    }
    process.stdout.write(`   📦 ${fData.franchiseName} traité...\r`);
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