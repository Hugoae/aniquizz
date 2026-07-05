import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
export * from '@prisma/client'; // On exporte aussi les types (User, Song...)