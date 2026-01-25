import axios from 'axios';
import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const ANIME_LIMIT = 1;
const ITEMS_PER_PAGE = 50; 
const OUTPUT_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'data_step1.json');
const FINAL_DATA_FILE = path.join(OUTPUT_DIR, 'final_game_data.json'); // Pour lire les locks
const DELAY_MS = 1000; 

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// --- REQUÊTES GRAPHQL ---
const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  synonyms
  seasonYear
  genres
  popularity
  status
  format
  coverImage { extraLarge color }
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

// --- NOUVEAUX SEUILS DE DIFFICULTÉ ---
function getDifficulty(popularity: number): string {
    // Augmentation drastique des seuils
    if (popularity > 200000) return 'easy';   // Était 150k
    if (popularity > 75000) return 'medium';  // Était 50k
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
            console.log(`\n🛑 Rate Limit AniList. Pause 30s...`); 
            await delay(30000); 
            return fetchWithRetry(id, retries - 1);
        }
        return null;
    }
}

async function generateCompleteTree() {
    console.log(`🚀 PHASE 1 : Récupération AniList (Tri Alphabétique)...`);
    
    // 1. CHARGEMENT DES DONNÉES VERROUILLÉES (LOCKS)
    let lockedFranchises: any[] = [];
    const lockedAnimeIds = new Set<number>();

    if (fs.existsSync(FINAL_DATA_FILE)) {
        try {
            const existingData = JSON.parse(fs.readFileSync(FINAL_DATA_FILE, 'utf-8'));
            lockedFranchises = existingData.filter((f: any) => f.isLocked === true);
            
            // On indexe les ID des animes verrouillés pour ne pas les re-récupérer
            lockedFranchises.forEach(f => {
                f.animes.forEach((a: any) => lockedAnimeIds.add(a.id));
            });

            console.log(`🔐 ${lockedFranchises.length} franchises verrouillées détectées (Conservées telles quelles).`);
        } catch (e) {
            console.warn("⚠️ Impossible de lire le fichier final existant pour les locks.");
        }
    }

    // 2. RÉCUPÉRATION DU TOP POPULARITÉ
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
            
            // On filtre les status ET ceux qui sont déjà lockés
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
                console.log(`\n🛑 Rate Limit. Pause 30s...`);
                await delay(30000);
                continue; 
            }
            console.error("\n❌ Erreur:", e.message);
            break;
        }
    }
    console.log(`\n✅ ${allAnimesRaw.length} NOUVEAUX animes racines récupérés.`);

    const animeMap = new Map();
    allAnimesRaw.forEach(a => animeMap.set(a.id, a));

    console.log("🧩 Identification des Franchises...");
    const franchises: Record<string, any[]> = {};

    for (const anime of allAnimesRaw) {
        // Si l'anime appartient à une franchise lockée (par nom), on skip aussi par sécurité
        // (Note: C'est une sécurité simple, le vrai filtre ID est fait plus haut)
        
        let current = anime;
        let root = anime;
        let depth = 0;

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
                
                // Si la suite est lockée, on ne l'ajoute pas ici
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
    
    // Transformation des nouvelles données
    const processedNewFranchises = Object.keys(franchises).map(fName => {
        const seasons = franchises[fName];
        seasons.sort((a, b) => (a.seasonYear || 0) - (b.seasonYear || 0));
        const rootAnime = seasons[0]; 

        const cleanSeasons = seasons.map(s => {
            const alts = [s.title.english, s.title.native, ...(s.synonyms || [])].filter(Boolean);
            const studioName = s.studios?.nodes?.[0]?.name || "Studio Inconnu";

            return {
                id: s.id,
                idMal: s.idMal,
                name: s.title.romaji,
                altNames: [...new Set(alts)],
                year: s.seasonYear,
                format: s.format,
                coverImage: s.coverImage?.extraLarge,
                color: s.coverImage?.color,
                popularity: s.popularity,
                difficulty: getDifficulty(s.popularity), // Utilise la nouvelle fonction
                status: s.status,
                siteUrl: `https://anilist.co/anime/${s.id}`,
                studio: studioName,
                isLocked: false, // Par défaut
                songs: [] 
            };
        });

        return {
            franchiseName: fName,
            isLocked: false, // Par défaut
            genres: rootAnime.genres,
            tags: rootAnime.tags.slice(0, 5).map((t: any) => t.name),
            animes: cleanSeasons
        };
    });

    // FUSION : Locked Data + New Data
    // On s'assure qu'il n'y a pas de doublons de nom de franchise par sécurité
    const finalMap = new Map<string, any>();

    // 1. D'abord les lockés (priorité)
    lockedFranchises.forEach(f => finalMap.set(f.franchiseName, f));

    // 2. Ensuite les nouveaux (si nom n'existe pas déjà)
    processedNewFranchises.forEach(f => {
        if (!finalMap.has(f.franchiseName)) {
            finalMap.set(f.franchiseName, f);
        }
    });

    const finalOutput = Array.from(finalMap.values());

    // --- TRI ALPHABÉTIQUE ---
    finalOutput.sort((a, b) => a.franchiseName.localeCompare(b.franchiseName));
    // ----------------------------

    const totalFranchises = finalOutput.length;
    const totalAnimes = finalOutput.reduce((acc, f) => acc + f.animes.length, 0);
    console.log(`\n📊 BILAN ANILIST (Fusionné) :`);
    console.log(`   - Franchises totales : ${totalFranchises}`);
    console.log(`   - Dont verrouillées  : ${lockedFranchises.length}`);
    console.log(`   - Total Saisons      : ${totalAnimes}`);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalOutput, null, 2));
    console.log(`🎉 Fichier généré (Trié A-Z + Locks) : ${OUTPUT_FILE}`);
}

generateCompleteTree();