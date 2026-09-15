import { describe, expect, it } from 'vitest';
import { listLinkRejectMessage } from './listLinkVerify';

describe('listLinkRejectMessage', () => {
  it('allows an exists result', () => {
    expect(listLinkRejectMessage('anilist', 'exists')).toBeNull();
    expect(listLinkRejectMessage('mal', 'exists')).toBeNull();
  });

  it('does not persist during a provider outage', () => {
    expect(listLinkRejectMessage('anilist', 'unverified')).toMatch(/indisponible/);
    expect(listLinkRejectMessage('mal', 'unverified')).toMatch(/indisponible/);
  });

  it('uses vousvoiement for a missing account', () => {
    expect(listLinkRejectMessage('anilist', 'not_found')).toMatch(/Vérifiez/);
    expect(listLinkRejectMessage('mal', 'not_found')).toMatch(/Vérifiez/);
    expect(listLinkRejectMessage('anilist', 'not_found')).not.toMatch(/\bton\b/);
  });

  it('explains a missing MAL client id', () => {
    expect(listLinkRejectMessage('mal', 'unconfigured')).toMatch(/configuré/);
  });
});
