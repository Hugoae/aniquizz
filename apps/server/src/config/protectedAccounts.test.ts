import { describe, expect, it } from 'vitest';
import { isProtectedProfile, parseProtectedEmails } from './protectedAccounts';

describe('parseProtectedEmails', () => {
  it('splits a CSV and ignores blanks', () => {
    const emails = parseProtectedEmails('  Owner@Example.com ,other@test.com, ');
    expect(emails.has('owner@example.com')).toBe(true);
    expect(emails.has('other@test.com')).toBe(true);
    expect(emails.size).toBe(2);
  });
});

describe('isProtectedProfile', () => {
  it('protects the owner username regardless of casing', () => {
    expect(
      isProtectedProfile({ username: 'kirikou', email: 'player@aniquizz.test' }, new Set()),
    ).toBe(true);
    expect(
      isProtectedProfile({ username: 'Kirikou', email: 'player@aniquizz.test' }, new Set()),
    ).toBe(true);
  });

  it('protects a configured owner email', () => {
    expect(
      isProtectedProfile(
        { username: 'anyone', email: 'Owner@Example.com' },
        parseProtectedEmails('owner@example.com'),
      ),
    ).toBe(true);
  });

  it('does not protect an ordinary player', () => {
    expect(
      isProtectedProfile({ username: 'admin_dev', email: 'admin@aniquizz.test' }, new Set()),
    ).toBe(false);
  });
});
