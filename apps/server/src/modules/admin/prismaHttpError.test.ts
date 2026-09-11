import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@aniquizz/database';
import { handlePrismaError, prismaHttpStatus } from './prismaHttpError';

describe('prismaHttpStatus', () => {
  it('maps unique conflicts to 409', () => {
    expect(prismaHttpStatus('P2002')).toEqual({
      status: 409,
      error: 'Valeur déjà utilisée (identifiant unique).',
    });
  });

  it('maps missing rows to 404', () => {
    expect(prismaHttpStatus('P2025')).toEqual({
      status: 404,
      error: 'Élément introuvable.',
    });
  });

  it('ignores unknown codes', () => {
    expect(prismaHttpStatus('P1001')).toBeNull();
  });

  it('writes mapped JSON for a known Prisma error', () => {
    const res = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const err = new Prisma.PrismaClientKnownRequestError('No record', {
      code: 'P2025',
      clientVersion: 'test',
    });
    expect(handlePrismaError(err, res as never)).toBe(true);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Élément introuvable.' });
  });
});
