import { Prisma } from '@aniquizz/database';
import type { Response } from 'express';

export const prismaHttpStatus = (code: string): { status: number; error: string } | null => {
  switch (code) {
    case 'P2002':
      return { status: 409, error: 'Valeur déjà utilisée (identifiant unique).' };
    case 'P2025':
      return { status: 404, error: 'Élément introuvable.' };
    case 'P2003':
      return { status: 400, error: 'Référence invalide (animeId / franchiseId).' };
    default:
      return null;
  }
};

/** Map common Prisma write errors to friendly HTTP responses. Returns handled. */
export const handlePrismaError = (e: unknown, res: Response): boolean => {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return false;
  const mapped = prismaHttpStatus(e.code);
  if (!mapped) return false;
  if (!res.headersSent) res.status(mapped.status).json({ error: mapped.error });
  return true;
};
