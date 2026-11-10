import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { allNews } from './newsData';
import { latestNewsPreview } from './newsPreview';

const clientRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const indexHtml = readFileSync(path.join(clientRoot, 'index.html'), 'utf8');

describe('latestNewsPreview', () => {
  it('mirrors the two newest allNews teasers (id, title, description, date, type)', () => {
    const expected = allNews.slice(0, 2).map(({ content: _content, ...teaser }) => teaser);
    expect(latestNewsPreview).toEqual(expected);
  });

  it('does not bake news copy into the first-paint shell', () => {
    expect(indexHtml).toContain('app-shell-mark');
    expect(indexHtml).not.toContain('<!--app-shell-news-->');
    expect(indexHtml).not.toContain('Testez votre');
  });

  it('is a no-op for sync:news --check (preview + shell generated from newsData)', () => {
    const result = spawnSync(process.execPath, ['scripts/news-teasers.mjs', '--check'], {
      cwd: clientRoot,
      encoding: 'utf8',
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);
  });
});
