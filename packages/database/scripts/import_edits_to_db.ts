import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();
const INPUT_FILE = path.join(__dirname, "../data/manual_edits.json");

async function main() {
  console.log("📥 IMPORTATION DES MODIFICATIONS MANUELLES (JSON -> DATABASE)...");
  console.log("   ⚠️  ATTENTION : Écrase les métadonnées de la BDD avec le contenu du JSON.");

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Fichier introuvable : ${INPUT_FILE}`);
    console.log("   Lance d'abord le script d'export !");
    process.exit(1);
  }

  const franchisesData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`📦 Analyse de ${franchisesData.length} franchises...`);

  for (const fr of franchisesData) {

    // --- 1. GESTION FRANCHISE ---

    // Cas A : ID connu -> Update direct
    if (fr.id) {
      await prisma.franchise.update({
        where: { id: fr.id },
        data: {
          name: fr.name,
          isLocked: fr.isLocked,
          genres: fr.genres || []
        }
      });
    }
    // Cas B : Pas d'ID -> Recherche par nom ou création
    else {
      const existingFranchise = await prisma.franchise.findUnique({
        where: { name: fr.name }
      });

      if (existingFranchise) {
        console.log(`   🔄 Franchise existante trouvée par nom : "${fr.name}" -> Mise à jour.`);
        await prisma.franchise.update({
          where: { id: existingFranchise.id },
          data: {
            isLocked: true,
            genres: fr.genres || []
          }
        });
        fr.id = existingFranchise.id;
      } else {
        console.log(`   ✨ Création manuelle franchise : "${fr.name}"`);
        const newFr = await prisma.franchise.create({
          data: {
            name: fr.name,
            isLocked: true,
            genres: fr.genres || []
          }
        });
        fr.id = newFr.id;
      }
    }

    // --- 2. GESTION ANIMES ---
    for (const anime of fr.animes) {
      if (anime.id) {
        await prisma.anime.update({
          where: { id: anime.id },
          data: {
            name: anime.name,
            altNames: anime.altNames || [],
            tags: anime.tags || [],
            seasonYear: anime.seasonYear,
            isLocked: anime.isLocked,
            franchiseId: fr.id
          }
        });
      } else {
        await prisma.anime.create({
          data: {
            name: anime.name,
            altNames: anime.altNames || [],
            tags: anime.tags || [],
            franchiseId: fr.id,
            isLocked: true
          }
        });
      }

      // --- 3. GESTION SONGS ---
      for (const song of anime.songs) {
        if (song.id) {
          await prisma.song.update({
            where: { id: song.id },
            data: {
              title: song.title,
              artist: song.artist,
              difficulty: song.difficulty,
              type: song.type,
              tags: song.tags || [],
              isLocked: song.isLocked,
              animeId: anime.id
            }
          });
        }
      }
    }
  }

  console.log(`✅ SYNC TERMINÉE ! La BDD reflète le JSON manuel.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });