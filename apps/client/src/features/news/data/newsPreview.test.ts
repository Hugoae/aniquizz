import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SITE_VERSION } from '@/lib/site';
import { allNews } from './newsData';
import { latestNewsPreview } from './newsPreview';

const clientRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const indexHtml = readFileSync(path.join(clientRoot, 'index.html'), 'utf8');

describe('latestNewsPreview', () => {
  it('mirrors the two newest allNews teasers (id, title, description, date, type)', () => {
    const expected = allNews.slice(0, 2).map(({ content: _content, ...teaser }) => teaser);
    expect(latestNewsPreview).toEqual(expected);
  });

  it('keeps the generated app-shell version and news blurbs aligned', () => {
    expect(indexHtml).toContain(`v${SITE_VERSION}`);
    expect(indexHtml).toContain('<!--app-shell-news-->');
    for (const item of latestNewsPreview) {
      expect(indexHtml).toContain(item.description);
      expect(indexHtml).toContain(item.title.replace(/&/g, '&amp;'));
    }
  });

  it('is a no-op for sync:news --check (preview + shell generated from newsData)', () => {
    const result = spawnSync(process.execPath, ['scripts/news-teasers.mjs', '--check'], {
      cwd: clientRoot,
      encoding: 'utf8',
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);
  });
});
