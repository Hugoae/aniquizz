import fs from 'fs';
import path from 'path';

// On remonte de 'utils' (..) vers 'src' (..) vers 'server', puis on descend dans 'prisma/data'
const DATA_FILE = path.join(__dirname, '../../prisma/data/final_game_data.json');

interface Stat {
  count: number;
  type: 'Genre (Franchise)' | 'Tag (Anime)';
}

async function main() {
  console.log(`🔍 Lecture du fichier : ${DATA_FILE}`);

  if (!fs.existsSync(DATA_FILE)) {
      console.error("❌ ERREUR : Le fichier de données est introuvable !");
      console.error("Vérifie que le chemin est correct.");
      process.exit(1);
  }

  const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
  const franchises = JSON.parse(rawData);

  const stats = new Map<string, Stat>();

  console.log(`📦 Analyse en cours de ${franchises.length} franchises...`);

  franchises.forEach((f: any) => {
    // 1. Analyse des Genres (Franchise)
    if (f.genres && Array.isArray(f.genres)) {
      f.genres.forEach((g: string) => {
        const current = stats.get(g) || { count: 0, type: 'Genre (Franchise)' };
        stats.set(g, { count: current.count + 1, type: current.type });
      });
    }

    // 2. Analyse des Tags (Anime)
    if (f.animes && Array.isArray(f.animes)) {
      f.animes.forEach((a: any) => {
        if (a.tags && Array.isArray(a.tags)) {
          a.tags.forEach((t: string) => {
            // On priorise le type "Genre" s'il existe déjà, sinon c'est un tag
            // Cela permet de voir si un tag est aussi utilisé comme genre global
            const current = stats.get(t);
            if (!current) {
                stats.set(t, { count: 1, type: 'Tag (Anime)' });
            } else {
                stats.set(t, { count: current.count + 1, type: current.type });
            }
          });
        }
      });
    }
  });

  // Tri par popularité (Nombre d'occurrences décroissant)
  const sortedTags = Array.from(stats.entries()).sort((a, b) => b[1].count - a[1].count);

  console.log(`\n📊 RÉSULTATS (${sortedTags.length} tags uniques trouvés) :\n`);
  console.log("| Tag / Genre          | Type        | Occurences |");
  console.log("|----------------------|-------------|------------|");
  
  sortedTags.forEach(([name, data]) => {
    console.log(`| ${name.padEnd(20)} | ${data.type.padEnd(11)} | ${data.count}        |`);
  });

  console.log("\n💡 CONSEIL : Utilise cette liste pour remplir 'server/src/config/tagConfig.ts'");
}

main();