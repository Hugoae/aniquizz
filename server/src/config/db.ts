import { PrismaClient } from '@prisma/client';

/**
 * INSTANCE PRISMA UNIQUE (SINGLETON)
 * ----------------------------------
 * Permet d'éviter de multiplier les connexions à la base de données.
 * Importez ce fichier partout où vous avez besoin de `prisma`.
 */
export const prisma = new PrismaClient();