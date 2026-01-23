import axios from 'axios';
import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const ANIME_LIMIT = 500; 
const ITEMS_PER_PAGE = 50; 
const OUTPUT_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'data_step1.json');
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

function getDifficulty(popularity: number): string {
    if (popularity > 150000) return 'easy';
    if (popularity > 50000) return 'medium';
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
            
            const validMedia = media.filter((m: any) => isValidStatus(m.status));
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
    console.log(`\n✅ ${allAnimesRaw.length} animes racines récupérés.`);

    const animeMap = new Map();
    allAnimesRaw.forEach(a => animeMap.set(a.id, a));

    console.log("🧩 Identification des Franchises...");
    const franchises: Record<string, any[]> = {};

    for (const anime of allAnimesRaw) {
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
                if (franchiseList.length > 1) {
                   // console.log("   |-> Terminé (Pas de suite connue)"); 
                }
                expansionActive = false;
            }
        }
    }

    console.log("\n💾 Traitement final...");
    const finalOutput = Object.keys(franchises).map(fName => {
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
                difficulty: getDifficulty(s.popularity),
                status: s.status,
                siteUrl: `https://anilist.co/anime/${s.id}`,
                studio: studioName,
                songs: [] 
            };
        });

        return {
            franchiseName: fName,
            genres: rootAnime.genres,
            tags: rootAnime.tags.slice(0, 5).map((t: any) => t.name),
            animes: cleanSeasons
        };
    });

    // --- TRI ALPHABÉTIQUE ICI ---
    finalOutput.sort((a, b) => a.franchiseName.localeCompare(b.franchiseName));
    // ----------------------------

    const totalFranchises = finalOutput.length;
    const totalAnimes = finalOutput.reduce((acc, f) => acc + f.animes.length, 0);
    console.log(`\n📊 BILAN ANILIST :`);
    console.log(`   - Franchises trouvées : ${totalFranchises}`);
    console.log(`   - Total Saisons/Animes : ${totalAnimes}`);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalOutput, null, 2));
    console.log(`🎉 Fichier généré (Trié A-Z) : ${OUTPUT_FILE}`);
}

generateCompleteTree();