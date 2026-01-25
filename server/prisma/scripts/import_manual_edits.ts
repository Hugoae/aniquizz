import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();
const INPUT_FILE = path.join(__dirname, "../data/editable_data.json");

async function main() {
  console.log("📥 IMPORTATION DES MODIFICATIONS MANUELLES (JSON -> SUPABASE)...");
  console.log("   ⚠️  MODE GOD : Toutes les infos du JSON vont écraser la BDD (Tags, Difficulté, Noms...)");
  
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Fichier introuvable : ${INPUT_FILE}`);
    console.log("   Lance d'abord le script d'export !");
    process.exit(1);
  }

  const franchisesData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`📦 Analyse de ${franchisesData.length} franchises...`);

  for (const fr of franchisesData) {
    
    // --- 1. GESTION FRANCHISE (Smart Upsert) ---
    
    // Cas A : On a l'ID dans le JSON -> Update direct
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
    // Cas B : Pas d'ID -> On vérifie si elle existe par nom avant de créer (Anti-Crash P2002)
    else {
        const existingFranchise = await prisma.franchise.findUnique({
            where: { name: fr.name }
        });

        if (existingFranchise) {
            console.log(`   🔄 Franchise existante trouvée par nom : "${fr.name}" (ID: ${existingFranchise.id}) -> Mise à jour.`);
            await prisma.franchise.update({
                where: { id: existingFranchise.id },
                data: {
                    isLocked: true, // On lock par sécurité si ça vient du fichier manuel
                    genres: fr.genres || []
                }
            });
            fr.id = existingFranchise.id; // On récupère l'ID pour les enfants
        } else {
            console.log(`   ✨ Création réelle nouvelle franchise : "${fr.name}"`);
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
                    franchiseId: fr.id // Gère le déplacement d'une franchise à l'autre
                }
            });
        } else {
            // Création d'un anime manuel
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

  console.log(`✅ SYNC TERMINÉE ! La Base de Données reflète exactement ton JSON.`);
  console.log(`   💡 Note : Relance l'export pour récupérer les IDs dans ton JSON.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });