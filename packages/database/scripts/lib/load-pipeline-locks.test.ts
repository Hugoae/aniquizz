import assert from 'node:assert/strict';
import {
  extractLockedFranchises,
  franchiseDisplayName,
  normalizeFranchiseLock,
  collectLockedAnimeIds,
} from './load-pipeline-locks';

const sample = [
  {
    name: 'Naruto',
    isLocked: true,
    genres: ['Action'],
    animes: [{ id: 20, name: 'Naruto', seasonYear: 2002, isLocked: true }],
  },
  {
    franchiseName: 'One Piece',
    isLocked: false,
    animes: [],
  },
];

const locked = extractLockedFranchises(sample);
assert.equal(locked.length, 1);
assert.equal(locked[0].franchiseName, 'Naruto');
assert.equal(franchiseDisplayName(locked[0]), 'Naruto');

const ids = collectLockedAnimeIds(locked);
assert.deepEqual([...ids], [20]);

const normalized = normalizeFranchiseLock({
  name: 'Bleach',
  isLocked: true,
  animes: [{ id: 269, name: 'Bleach', seasonYear: 2004 }],
});
assert.equal(normalized.franchiseName, 'Bleach');
assert.equal(normalized.animes[0].year, 2004);

console.log('load-pipeline-locks: all assertions passed');
