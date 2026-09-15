import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LIBRARY_COPY } from '@/features/library/copy/libraryCopy';
import { homeJsonLd, SITE_ALTERNATE_NAMES, websiteJsonLd, collectionPageJsonLd } from './jsonLd';

describe('home JSON-LD', () => {
  it('lists genuine aliases, not a stuffed keyword list', () => {
    expect(SITE_ALTERNATE_NAMES[0]).toBe('AniQuiz');
    expect(SITE_ALTERNATE_NAMES.at(-1)).toBe('aniquizz.com');
    expect(SITE_ALTERNATE_NAMES.join(' ')).not.toMatch(/naruto|amq|one piece/i);
  });

  it('exposes library search as a SearchAction', () => {
    const action = websiteJsonLd().potentialAction;
    expect(action['@type']).toBe('SearchAction');
    expect(action.target.urlTemplate).toContain('/library?q={search_term_string}');
  });

  it('keeps the static index.html graph in sync', () => {
    const html = readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
    const match = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
    expect(match?.[1]).toBeTruthy();
    expect(JSON.parse(match![1])).toEqual(homeJsonLd());
  });

  it('describes /library as a CollectionPage', () => {
    const block = collectionPageJsonLd({
      name: 'Librairie | AniQuizz',
      description: 'Catalogue',
      path: '/library',
    });
    expect(block['@type']).toBe('CollectionPage');
    expect(block.url).toContain('/library');
  });
});

describe('prerender /library', () => {
  it('reads hero copy from libraryCopy.ts instead of duplicating the sentence', () => {
    const prerender = readFileSync(
      path.join(process.cwd(), 'scripts/prerender-routes.mjs'),
      'utf8',
    );
    expect(prerender).toContain('readLibraryHeroCopy');
    expect(prerender).toContain('libraryCopy.ts');
    expect(prerender).not.toContain(LIBRARY_COPY.heroSubtitle);
    expect(LIBRARY_COPY.heroSubtitle).toMatch(/inserts/i);
  });
});
