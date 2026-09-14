-- Persist artist-precision matches alongside franchise / anime.

ALTER TYPE "StoredPrecision" ADD VALUE IF NOT EXISTS 'ARTIST';
