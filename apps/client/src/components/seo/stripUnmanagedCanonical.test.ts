import { describe, expect, it } from 'vitest';
import { stripUnmanagedCanonicalLinks } from './stripUnmanagedCanonical';

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
