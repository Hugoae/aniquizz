import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const INPUT_FILE = path.join(__dirname, "../data/data_step2.json");

async function main() {
  console.log(`🔥 IMPORTATION JSON -> DATABASE (Mode : Respect Locks)`);

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Fichier introuvable : ${INPUT_FILE}`);
    process.exit(1);
  }

  const franchisesData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`📦 ${franchisesData.length} Franchises à traiter...`);

  for (const fData of franchisesData) {

    // --- ÉTAPE A : GESTION FRANCHISE ---
    let dbFranchise = await prisma.franchise.findUnique({
      where: { name: fData.franchiseName }
    });

    // Tentative de lien parent/enfant si franchise introuvable
    if (!dbFranchise && fData.animes.length > 0) {
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
    } else {
      const f = await prisma.franchise.upsert({
        where: { id: dbFranchise ? dbFranchise.id : -1 },
        create: {
          name: fData.franchiseName,
          genres: fData.genres || []
        },
        update: {
          genres: fData.genres || []
        }
      });

      if (!dbFranchise) {
        const created = await prisma.franchise.findUnique({ where: { name: fData.franchiseName } });
        if (created) franchiseId = created.id;
      } else {
        franchiseId = f.id;
      }
    }

    if (!franchiseId) continue;

    // --- ÉTAPE B : GESTION ANIMES ---
    for (const aData of fData.animes) {
      const existingAnime = await prisma.anime.findUnique({ where: { id: aData.id } });

      if (existingAnime && existingAnime.isLocked) {
        // Anime locké : ne rien faire
      } else {
        await prisma.anime.upsert({
          where: { id: aData.id },
          update: {
            name: aData.name,
            siteUrl: aData.siteUrl,
            coverImage: aData.coverImage,
            altNames: aData.altNames || [],
            tags: aData.tags || [],
            format: aData.format,
            status: aData.status,
            seasonYear: aData.year,
            popularity: aData.popularity || 0,
            franchiseId: franchiseId
          },
          create: {
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
            franchiseId: franchiseId
          }
        });
      }

      // --- ÉTAPE C : GESTION SONGS (AVEC LOCK CHECK) ---
      for (const sData of aData.songs) {
        if (!sData.videoKey) continue;

        // Clé unique pour identifier le son
        const songNameClean = `${aData.name.replace(/[^a-zA-Z0-9]/g, "")}-${aData.id}-${sData.type}.mp4`;

        // Vérification du Lock
        const existingSong = await prisma.song.findUnique({
          where: { videoKey: songNameClean }
        });

        if (existingSong && existingSong.isLocked) {
          continue;
        }

        await prisma.song.upsert({
          where: { videoKey: songNameClean },
          update: {
            title: sData.title,
            artist: sData.artist,
            type: sData.type,
            tags: sData.tags || [],
            sourceUrl: sData.videoKey,
            difficulty: sData.difficulty || 'medium',
            animeId: aData.id
          },
          create: {
            title: sData.title,
            artist: sData.artist,
            type: sData.type,
            videoKey: songNameClean,
            tags: sData.tags || [],
            sourceUrl: sData.videoKey,
            difficulty: sData.difficulty || 'medium',
            animeId: aData.id,
            downloadStatus: 'PENDING'
          }
        });
      }
    }
  }

  console.log(`✅ Import terminé. Base de données synchronisée.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });