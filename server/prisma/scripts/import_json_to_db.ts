import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const INPUT_FILE = path.join(__dirname, "../data/data_step2.json");
const OVERRIDES_FILE = path.join(__dirname, "../data/manual_overrides.json");

interface Overrides {
    franchises: Array<{ nameMatch: string; renameTo?: string; isLocked?: boolean; }>;
    animes: Array<{ id: number; moveToFranchise?: string; isLocked?: boolean; }>;
}

async function main() {
  console.log(`🔥 IMPORTATION JSON -> DATABASE (Mode : Smart Bridge + Overrides)`);
  
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Fichier introuvable : ${INPUT_FILE}`);
    process.exit(1);
  }

  let franchisesData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  
  // 1. APPLICATION DES OVERRIDES (SI FICHIER PRÉSENT)
  if (fs.existsSync(OVERRIDES_FILE)) {
      try {
          const overrides: Overrides = JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf-8'));
          console.log(`🔧 Application de ${overrides.franchises.length} règles manuelles...`);
          
          const renameMap = new Map(overrides.franchises.map(o => [o.nameMatch, o.renameTo]).filter(x => x[1]) as [string, string][]);
          
          franchisesData.forEach((fr: any) => {
              if (renameMap.has(fr.franchiseName)) {
                  fr.franchiseName = renameMap.get(fr.franchiseName);
              }
          });
      } catch (e) { console.warn("⚠️ Erreur lecture overrides (ignoré)."); }
  }

  console.log(`📦 ${franchisesData.length} Franchises à traiter...`);

  for (const fData of franchisesData) {
    
    // --- ÉTAPE A : RECHERCHE INTELLIGENTE (LE PONT) ---
    // 1. Chercher par nom exact
    let dbFranchise = await prisma.franchise.findUnique({ 
        where: { name: fData.franchiseName } 
    });

    // 2. Si pas trouvé, utiliser le "Pont" (Smart Match via Anime enfant)
    // C'est ça qui permet de retrouver "L'Attaque des Titans" même si le JSON dit "Shingeki"
    if (!dbFranchise && fData.animes.length > 0) {
        const firstAnimeId = fData.animes[0].id;
        const childAnime = await prisma.anime.findUnique({
            where: { id: firstAnimeId },
            include: { franchise: true }
        });

        if (childAnime && childAnime.franchise) {
            console.log(`   🌉 Pont établi : "${fData.franchiseName}" -> "${childAnime.franchise.name}"`);
            dbFranchise = childAnime.franchise;
        }
    }

    let franchiseId;

    if (dbFranchise && dbFranchise.isLocked) {
        // EXISTE ET LOCKÉ -> On ne touche à rien
        franchiseId = dbFranchise.id;
    } else {
        // NOUVEAU OU NON LOCKÉ -> On met à jour ou on crée
        // Si on a trouvé via le pont, on garde le nom de la BDD (dbFranchise.name)
        // Sinon on prend le nom du JSON (fData.franchiseName)
        const targetName = dbFranchise ? dbFranchise.name : fData.franchiseName;

        const f = await prisma.franchise.upsert({
            where: { id: dbFranchise ? dbFranchise.id : -1 }, // Hack pour upsert par ID si existe
            create: { 
                name: fData.franchiseName,
                genres: fData.genres || []
            },
            update: {
                genres: fData.genres || []
                // On ne change PAS le nom ici pour respecter le renommage manuel "soft"
            }
        });
        
        // Si on n'a pas trouvé par ID (cas création), on le récupère par nom
        if (!dbFranchise) {
             const created = await prisma.franchise.findUnique({ where: { name: fData.franchiseName } });
             if (created) franchiseId = created.id;
        } else {
            franchiseId = f.id;
        }
    }

    if (!franchiseId) continue; // Sécurité

    // --- ÉTAPE B : GESTION ANIMES ---
    for (const aData of fData.animes) {
        const existingAnime = await prisma.anime.findUnique({ where: { id: aData.id } });

        if (existingAnime && existingAnime.isLocked) {
             // Anime locké -> On ne touche pas à son parent (franchiseId)
        } else {
            // Anime libre -> On le rattache à la franchise trouvée (via nom ou pont)
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
                    franchiseId: franchiseId // <--- C'est ici que le lien se refait
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

        // --- ÉTAPE C : GESTION SONGS ---
        for (const sData of aData.songs) {
            if (!sData.videoKey) continue;
            const songNameClean = `${aData.name.replace(/[^a-zA-Z0-9]/g, "")}-${aData.id}-${sData.type}.mp4`;

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