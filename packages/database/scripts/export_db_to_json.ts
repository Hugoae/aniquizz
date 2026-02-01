import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();
const EXPORT_FILE = path.join(__dirname, "../data/manual_edits.json");

async function main() {
  console.log("💾 EXPORTATION DE LA BDD VERS JSON...");
  console.log("   Ce fichier permet de sauvegarder les IDs et l'état de verrouillage.");

  // Récupération de l'arbre complet
  const data = await prisma.franchise.findMany({
    include: {
      animes: {
        orderBy: { seasonYear: 'asc' },
        include: {
          songs: {
            orderBy: { type: 'asc' }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  fs.writeFileSync(EXPORT_FILE, JSON.stringify(data, null, 2));

  console.log(`\n✅ EXPORT RÉUSSI !`);
  console.log(`   📄 Fichier : ${EXPORT_FILE}`);
  console.log(`   📊 Contenu : ${data.length} Franchises.`);
  console.log(`\n👉 Modifie ce fichier (renommage, locks) puis relance 'import_edits_to_db.ts'.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });