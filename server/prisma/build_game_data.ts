import { execSync } from 'child_process';
import path from 'path';

// CONFIGURATION DU CHEMIN (Adapté à ton arborescence server/prisma/)
const SCRIPTS_DIR = path.join(__dirname, 'scripts');

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
    
    const startStep = Date.now(); // ⏱️ Start Chrono

    try {
        // 'inherit' permet de voir les logs du script fils en temps réel
        execSync(`npx ts-node ${scriptPath}`, { stdio: 'inherit' });
        
        const endStep = Date.now(); // 🏁 End Chrono
        const durationStr = formatDuration(endStep - startStep);
        console.log(`\n✅ SUCCÈS : ${scriptName} (${durationStr})`);

        // Ajout au bilan
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

    // 1. Récupération des métadonnées (AniList) -> JSON
    runScript('1_fetch_anilist.ts', '1. Fetch AniList (Structure)');

    // 2. Récupération des liens vidéos (AnimeThemes) -> JSON
    runScript('2_fetch_animethemes.ts', '2. Fetch AnimeThemes (Liens)');

    // 3. Import JSON vers Base de Données (Postgres)
    runScript('import_json_to_db.ts', '3. Import JSON -> Database (Respect Locks)');

    // 4. Worker (Téléchargement / Upload Supabase)
    runScript('3_sync_supabase.ts', '4. Worker Download & Upload');

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
        // Affichage aligné
        console.log(`   • ${t.description.padEnd(45)} : ${t.duration}`);
    });
    console.log(`------------------------------------------------------------------`);
    console.log(`   🏁 TEMPS TOTAL                                 : ${totalDuration}`);
    console.log(`==================================================================\n`);
};

main();