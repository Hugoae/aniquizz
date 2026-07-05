import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'videos';

const prisma = new PrismaClient();
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
  auth: { persistSession: false }
});

const DATA_DIR = path.join(__dirname, '../data');
const TEMP_DIR = path.join(__dirname, '../data/tmp');

async function emptyBucket() {
  console.log(`\n🌊 VIDAGE DU BUCKET SUPABASE '${BUCKET_NAME}'...`);

  let hasMore = true;
  let totalDeleted = 0;

  while (hasMore) {
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
      const filesToRemove = data.map(x => x.name);
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(filesToRemove);

      if (deleteError) {
        console.error(`❌ Erreur suppression: ${deleteError.message}`);
      } else {
        totalDeleted += filesToRemove.length;
        process.stdout.write(`   🗑️  ${totalDeleted} fichiers supprimés...\r`);
      }
    }
  }
  console.log(`\n✅ Bucket vidé avec succès (${totalDeleted} fichiers).`);
}

async function cleanDatabase() {
  console.log(`\n🗄️  NETTOYAGE DE LA BASE DE DONNÉES...`);

  try {
    // 1. Suppression des enfants (Tables liées)
    const deletedHistory = await prisma.songHistory.deleteMany({});
    console.log(`   - SongHistory supprimés   : ${deletedHistory.count}`);

    const deletedVotes = await prisma.songVote.deleteMany({});
    console.log(`   - SongVotes supprimés     : ${deletedVotes.count}`);

    const deletedLists = await prisma.playerAnimeList.deleteMany({});
    console.log(`   - PlayerAnimeLists suppr. : ${deletedLists.count}`);

    // 2. Suppression des parents
    const deletedSongs = await prisma.song.deleteMany({});
    console.log(`   - Songs supprimés         : ${deletedSongs.count}`);

    const deletedAnimes = await prisma.anime.deleteMany({});
    console.log(`   - Animes supprimés        : ${deletedAnimes.count}`);

    const deletedFranchises = await prisma.franchise.deleteMany({});
    console.log(`   - Franchises supprimées   : ${deletedFranchises.count}`);

    console.log(`✅ Base de données totalement nettoyée.`);
  } catch (error: any) {
    console.error(`❌ Erreur BDD : ${error.message}`);
  }
}

function cleanLocalFiles() {
  console.log(`\n📂 SUPPRESSION DES FICHIERS LOCAUX...`);

  const filesToDelete = [
    'data_step1.json',
    'data_step2.json'
  ];

  filesToDelete.forEach(file => {
    const filePath = path.join(DATA_DIR, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`   - Supprimé : ${file}`);
    }
  });

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