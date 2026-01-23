import { execSync } from 'child_process';
import path from 'path';

const SCRIPTS_DIR = path.join(__dirname, 'scripts');

// Structure pour garder les temps en mémoire
interface StepTiming {
    name: string;
    description: string;
    duration: string;
}

const timings: StepTiming[] = [];

// Fonction utilitaire pour convertir les millisecondes en "1h 2m 3s"
const formatDuration = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)));

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ') || '0s';
};

const runScript = (scriptName: string, description: string) => {
    const scriptPath = path.join(SCRIPTS_DIR, scriptName);
    
    console.log(`\n------------------------------------------------------------`);
    console.log(`🎬 ÉTAPE EN COURS : ${description}`);
    console.log(`   (Script : ${scriptName})`);
    console.log(`------------------------------------------------------------\n`);
    
    const start = Date.now(); // ⏱️ Démarrage chrono
    
    try {
        execSync(`npx ts-node ${scriptPath}`, { stdio: 'inherit' });
        
        const end = Date.now(); // 🏁 Arrêt chrono
        const durationMs = end - start;
        const durationStr = formatDuration(durationMs);

        console.log(`\n✅ SUCCÈS : ${scriptName} terminé en ${durationStr}.`);
        
        // On enregistre le temps pour le bilan final
        timings.push({ name: scriptName, description, duration: durationStr });

    } catch (error) {
        console.error(`\n❌ ÉCHEC CRITIQUE : Le script ${scriptName} a rencontré une erreur.`);
        process.exit(1);
    }
};

const main = () => {
    const totalStart = Date.now(); // Chrono Global

    console.log(`
    ========================================
    🏗️  PIPELINE DE GÉNÉRATION DE DONNÉES
    ========================================
    `);

    // 1. Récupération AniList
    runScript('1_fetch_anilist.ts', 'Récupération des Données Anime (AniList)');

    // 2. Enrichissement AnimeThemes
    runScript('2_fetch_animethemes.ts', 'Recherche des Vidéos (AnimeThemes)');

    // 3. Supabase
    runScript('3_sync_supabase.ts', 'Compression, Upload & Finalisation');

    const totalEnd = Date.now();
    const totalDuration = formatDuration(totalEnd - totalStart);

    console.log(`
    ========================================
    ✨  PIPELINE TERMINÉ AVEC SUCCÈS !  ✨
    ========================================
    `);

    // 📊 LE TABLEAU RÉCAPITULATIF
    console.log(`⏱️  BILAN DES PERFORMANCES :`);
    console.log(`------------------------------------------------------------------`);
    timings.forEach(t => {
        // On aligne joliment le texte
        console.log(`   • ${t.description.padEnd(45)} : ${t.duration}`);
    });
    console.log(`------------------------------------------------------------------`);
    console.log(`   🏁 TEMPS TOTAL                                 : ${totalDuration}`);
    console.log(`------------------------------------------------------------------\n`);

    console.log(`📂 Vos données sont prêtes dans : prisma/data/final_game_data.json\n`);
};

main();