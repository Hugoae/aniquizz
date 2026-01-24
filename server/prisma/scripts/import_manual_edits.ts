import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();
const INPUT_FILE = path.join(__dirname, "../data/editable_data.json");

async function main() {
  console.log("📥 IMPORTATION DES MODIFICATIONS MANUELLES (JSON -> SUPABASE)...");
  
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Fichier introuvable : ${INPUT_FILE}`);
    console.log("   Lance d'abord le script d'export !");
    process.exit(1);
  }

  const franchisesData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`📦 Analyse de ${franchisesData.length} franchises...`);

  let updatesCount = 0;

  for (const fr of franchisesData) {
    // 1. MISE À JOUR FRANCHISE
    // On utilise l'ID pour retrouver la franchise, ce qui permet le RENOMMAGE
    if (fr.id) {
        await prisma.franchise.update({
            where: { id: fr.id },
            data: {
                name: fr.name,       // Si tu as changé le nom dans le JSON, ça update ici
                isLocked: fr.isLocked, // Si tu as mis true, ça lock
                genres: fr.genres
            }
        });
        updatesCount++;
    } else {
        // Si pas d'ID, c'est une création (copier-coller d'un bloc ?)
        console.log(`   ✨ Création nouvelle franchise : ${fr.name}`);
        const newFr = await prisma.franchise.create({
            data: {
                name: fr.name,
                isLocked: true, // Par sécurité, on lock les créations manuelles
                genres: fr.genres || []
            }
        });
        fr.id = newFr.id; // On assigne l'ID pour les enfants
    }

    // 2. MISE À JOUR ANIMES
    for (const anime of fr.animes) {
        if (anime.id) {
            await prisma.anime.update({
                where: { id: anime.id },
                data: {
                    name: anime.name,
                    isLocked: anime.isLocked,
                    // LA MAGIE EST ICI :
                    // On force le franchiseId à être celui du parent actuel dans le JSON.
                    // Donc si tu as déplacé le bloc anime dans une autre franchise JSON, ça le déplace en BDD.
                    franchiseId: fr.id 
                }
            });
        } else {
            // Création d'un anime manuel ? (Rare mais géré)
            await prisma.anime.create({
                data: {
                    name: anime.name,
                    franchiseId: fr.id,
                    isLocked: true
                }
            });
        }

        // 3. MISE À JOUR SONGS (Pour les locks ou titres)
        for (const song of anime.songs) {
            if (song.id) {
                await prisma.song.update({
                    where: { id: song.id },
                    data: {
                        title: song.title,
                        isLocked: song.isLocked,
                        animeId: anime.id // Permet de déplacer une song d'un anime à l'autre
                    }
                });
            }
        }
    }
  }

  console.log(`✅ SYNC TERMINÉE ! Base de données mise à jour.`);
  console.log(`   💡 Note : N'oublie pas de relancer l'export si tu veux une version JSON à jour des IDs créés.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });