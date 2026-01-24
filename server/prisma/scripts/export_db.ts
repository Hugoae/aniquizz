import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();
const EXPORT_FILE = path.join(__dirname, "../data/editable_data.json");

async function main() {
  console.log("💾 EXPORTATION DE LA BDD VERS JSON...");
  console.log("   (Ce fichier contiendra les IDs, ce qui permet de renommer/déplacer sans casser les liens)");

  // On récupère tout l'arbre : Franchise -> Animes -> Songs
  const data = await prisma.franchise.findMany({
    include: {
      animes: {
        orderBy: { seasonYear: 'asc' }, // Trié par date pour la lisibilité
        include: {
          songs: {
            orderBy: { type: 'asc' }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  // Écriture du fichier
  fs.writeFileSync(EXPORT_FILE, JSON.stringify(data, null, 2));
  
  console.log(`\n✅ EXPORT RÉUSSI !`);
  console.log(`   📄 Fichier : ${EXPORT_FILE}`);
  console.log(`   📊 Contenu : ${data.length} Franchises.`);
  console.log(`\n👉 Tu peux maintenant modifier ce fichier (renommer, déplacer, locker).`);
  console.log(`   Une fois fini, lance 'npx ts-node prisma/scripts/import_manual_edits.ts'`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });