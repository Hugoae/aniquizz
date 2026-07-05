import { execSync } from 'child_process';
import path from 'path';

// CONFIGURATION DU CHEMIN
const SCRIPTS_DIR = __dirname;

// Structure pour garder les temps en mémoire
interface StepTiming {
  name: string;
  description: string;
  duration: string;
}
const timings: StepTiming[] = [];

// Fonction utilitaire : Convertit ms en "1m 30s"
const formatDuration = (ms: number) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const parts = [];
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ') || '0s';
};

const runScript = (scriptName: string, description: string) => {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);

  console.log(`\n------------------------------------------------------------`);
  console.log(`🎬 ÉTAPE : ${description}`);
  console.log(`   Fichier : ${scriptName}`);
  console.log(`------------------------------------------------------------\n`);

  const startStep = Date.now();

  try {
    execSync(`npx ts-node ${scriptPath}`, { stdio: 'inherit' });

    const endStep = Date.now();
    const durationStr = formatDuration(endStep - startStep);
    console.log(`\n✅ SUCCÈS : ${scriptName} (${durationStr})`);

    timings.push({ name: scriptName, description, duration: durationStr });

  } catch (error) {
    console.error(`\n❌ ARRÊT CRITIQUE sur ${scriptName}`);
    process.exit(1);
  }
};

const main = () => {
  const totalStart = Date.now();

  console.log(`
    ========================================
    🚀  ANIGAME DATA PIPELINE (V2: DB-FIRST)
    ========================================
    `);

  // 1. Récupération des métadonnées (AniList)
  runScript('1_fetch_anilist.ts', '1. Fetch AniList (Structure)');

  // 2. Récupération des liens vidéos (AnimeThemes)
  runScript('2_fetch_animethemes.ts', '2. Fetch AnimeThemes (Liens)');

  // 3. Import JSON vers Base de Données
  runScript('3_load_initial_data.ts', '3. Import JSON -> Database (Respect Locks)');

  // 4. Worker (Download / Upload R2)
  runScript('4_sync_storage.ts', '4. Worker Download & Upload (R2)');

  const totalEnd = Date.now();
  const totalDuration = formatDuration(totalEnd - totalStart);

  console.log(`
    ==================================================================
    ✨  PIPELINE TERMINÉ AVEC SUCCÈS !  ✨
    ==================================================================
    `);

  console.log(`⏱️  BILAN DES PERFORMANCES :`);
  console.log(`------------------------------------------------------------------`);
  timings.forEach(t => {
    console.log(`   • ${t.description.padEnd(45)} : ${t.duration}`);
  });
  console.log(`------------------------------------------------------------------`);
  console.log(`   🏁 TEMPS TOTAL                                 : ${totalDuration}`);
  console.log(`==================================================================\n`);
};

main();