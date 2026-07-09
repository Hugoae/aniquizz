import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  isSongExcluded,
  loadAllPipelineExclusions,
  loadPipelineExclusions,
  parseExclusionIds,
  parseExclusionVideoKeys,
  stripExcludedFromFranchiseAnimes,
  stripExcludedSongsFromAnime,
} from './load-pipeline-exclusions';

assert.deepEqual(parseExclusionIds([204356, 'bad', 204356]), [204356]);
assert.deepEqual(parseExclusionVideoKeys(['A.mp4', ' ', 'A.mp4']), ['A.mp4']);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aniquizz-excl-'));
fs.writeFileSync(
  path.join(tmp, 'pipeline_exclusions.json'),
  JSON.stringify({ animeIds: [1, 2], songIds: [99], videoKeys: ['FOO-1-OP1.mp4'] }),
);
const all = loadAllPipelineExclusions(tmp);
assert.deepEqual([...loadPipelineExclusions(tmp)].sort(), [1, 2]);
assert.deepEqual([...all.songIds], [99]);
assert.deepEqual([...all.videoKeys], ['FOO-1-OP1.mp4']);

assert.equal(isSongExcluded(all, { songId: 99 }), true);
assert.equal(isSongExcluded(all, { videoKey: 'FOO-1-OP1.mp4' }), true);
assert.equal(isSongExcluded(all, { songId: 1, videoKey: 'other.mp4' }), false);

const stripped = stripExcludedFromFranchiseAnimes(
  [{ id: 1, name: 'a' }, { id: 2, name: 'b' }],
  new Set([2]),
);
assert.equal(stripped.length, 1);
assert.equal(stripped[0].id, 1);

const animeStripped = stripExcludedSongsFromAnime(
  { id: 21, songs: [{ id: 99, videoKey: 'FOO-1-OP1.mp4' }, { id: 100, videoKey: 'BAR-1-OP1.mp4' }] },
  all,
);
assert.equal(animeStripped.songs?.length, 1);
assert.equal(animeStripped.songs?.[0].id, 100);

fs.rmSync(tmp, { recursive: true });
console.log('load-pipeline-exclusions: all assertions passed');
