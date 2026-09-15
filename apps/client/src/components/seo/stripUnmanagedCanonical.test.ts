import { describe, expect, it } from 'vitest';
import { stripUnmanagedCanonicalLinks, stripUnmanagedSeoMeta } from './stripUnmanagedCanonical';

describe('stripUnmanagedCanonicalLinks', () => {
  it('keeps one canonical and rewrites it to the preferred href', () => {
    const root = document.implementation.createHTMLDocument('');
    const unmanaged = root.createElement('link');
    unmanaged.setAttribute('rel', 'canonical');
    unmanaged.setAttribute('href', 'https://aniquizz.com/');
    root.head.append(unmanaged);

    const managed = root.createElement('link');
    managed.setAttribute('rel', 'canonical');
    managed.setAttribute('href', 'https://aniquizz.com/profile');
    managed.setAttribute('data-rh', 'true');
    root.head.append(managed);

    stripUnmanagedCanonicalLinks('https://aniquizz.com/profile', root);

    const left = [...root.querySelectorAll('link[rel="canonical"]')];
    expect(left).toHaveLength(1);
    expect(left[0]?.getAttribute('href')).toBe('https://aniquizz.com/profile');
  });

  it('rewrites a leftover home canonical when Helmet has not duplicated yet', () => {
    const root = document.implementation.createHTMLDocument('');
    const unmanaged = root.createElement('link');
    unmanaged.setAttribute('rel', 'canonical');
    unmanaged.setAttribute('href', 'https://aniquizz.com/');
    unmanaged.setAttribute('data-rh', 'true');
    root.head.append(unmanaged);

    stripUnmanagedCanonicalLinks('https://aniquizz.com/profile', root);

    const left = [...root.querySelectorAll('link[rel="canonical"]')];
    expect(left).toHaveLength(1);
    expect(left[0]?.getAttribute('href')).toBe('https://aniquizz.com/profile');
  });
});

describe('stripUnmanagedSeoMeta', () => {
  it('rewrites leftover Home description and og:title on an inner route', () => {
    const root = document.implementation.createHTMLDocument('');
    const desc = root.createElement('meta');
    desc.setAttribute('name', 'description');
    desc.setAttribute('content', 'Home leftover');
    root.head.append(desc);
    const og = root.createElement('meta');
    og.setAttribute('property', 'og:title');
    og.setAttribute('content', "AniQuizz - Le Blindtest d'Anime");
    root.head.append(og);

    stripUnmanagedSeoMeta(
      {
        canonical: 'https://aniquizz.com/library',
        description: 'Librairie description',
        title: 'Librairie | AniQuizz',
      },
      root,
    );

    expect(root.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Librairie description',
    );
    expect(root.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      'Librairie | AniQuizz',
    );
  });

  it('removes unmanaged JSON-LD on noindex routes', () => {
    const root = document.implementation.createHTMLDocument('');
    const ld = root.createElement('script');
    ld.setAttribute('type', 'application/ld+json');
    ld.textContent = '{"@type":"WebSite"}';
    root.head.append(ld);
    const kept = root.createElement('script');
    kept.setAttribute('type', 'application/ld+json');
    kept.setAttribute('data-rh', 'true');
    kept.textContent = '{"@type":"Managed"}';
    root.head.append(kept);

    stripUnmanagedSeoMeta({ stripJsonLd: true }, root);

    const left = [...root.querySelectorAll('script[type="application/ld+json"]')];
    expect(left).toHaveLength(1);
    expect(left[0]?.getAttribute('data-rh')).toBe('true');
  });
});
