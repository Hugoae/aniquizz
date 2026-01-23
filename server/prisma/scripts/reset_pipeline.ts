import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Chargement des variables d'environnement
dotenv.config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'videos';

// Initialisation des clients
const prisma = new PrismaClient();
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    auth: { persistSession: false }
});

const DATA_DIR = path.join(__dirname, '../data');
const TEMP_DIR = path.join(__dirname, '../temp_videos');

async function emptyBucket() {
    console.log(`\n🌊 VIDAGE DU BUCKET SUPABASE '${BUCKET_NAME}'...`);
    
    let hasMore = true;
    let deletedCount = 0;

    while (hasMore) {
        // 1. Lister les fichiers (par paquets de 100)
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .list('', { limit: 100 });

        if (error) {
            console.error(`❌ Erreur listing bucket: ${error.message}`);
            break;
        }

        if (!data || data.length === 0) {
            hasMore = false;
        } else {
            // 2. Supprimer les fichiers trouvés
            const filesToRemove = data.map(x => x.name);
            const { error: deleteError } = await supabase.storage
                .from(BUCKET_NAME)
                .remove(filesToRemove);

            if (deleteError) {
                console.error(`❌ Erreur suppression: ${deleteError.message}`);
            } else {
                deletedCount += filesToRemove.length;
                process.stdout.write(`   🗑️  ${deletedCount} fichiers supprimés...\r`);
            }
        }
    }
    console.log(`\n✅ Bucket vidé avec succès.`);
}

async function cleanDatabase() {
    console.log(`\n🗄️  NETTOYAGE DE LA BASE DE DONNÉES...`);
    
    try {
        // L'ordre est important à cause des clés étrangères (Foreign Keys)
        // On supprime d'abord les enfants (Songs), puis les parents (Animes), puis les grands-parents (Franchises)
        
        const deletedSongs = await prisma.song.deleteMany({});
        console.log(`   - Songs supprimés : ${deletedSongs.count}`);

        const deletedAnimes = await prisma.anime.deleteMany({});
        console.log(`   - Animes supprimés : ${deletedAnimes.count}`);

        const deletedFranchises = await prisma.franchise.deleteMany({});
        console.log(`   - Franchises supprimées : ${deletedFranchises.count}`);

        console.log(`✅ Base de données nettoyée.`);
    } catch (error: any) {
        console.error(`❌ Erreur BDD : ${error.message}`);
    }
}

function cleanLocalFiles() {
    console.log(`\n📂 SUPPRESSION DES FICHIERS LOCAUX...`);

    const filesToDelete = [
        'data_step1.json',
        'data_step2.json',
        'final_game_data.json'
    ];

    filesToDelete.forEach(file => {
        const filePath = path.join(DATA_DIR, file);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`   - Supprimé : ${file}`);
        }
    });

    // Nettoyage dossier temp videos
    if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
        console.log(`   - Dossier temporaire nettoyé.`);
    }

    console.log(`✅ Fichiers locaux nettoyés.`);
}

async function main() {
    console.log(`
    🚨 ATTENTION : LANCEMENT DU NETTOYAGE TOTAL 🚨
    ==============================================
    `);

    // 1. Nettoyage Stockage
    await emptyBucket();

    // 2. Nettoyage BDD
    await cleanDatabase();

    // 3. Nettoyage Fichiers
    cleanLocalFiles();

    console.log(`\n✨ TOUT EST PROPRE ! PRÊT POUR LE NOUVEAU PIPELINE.`);
    await prisma.$disconnect();
}

main();