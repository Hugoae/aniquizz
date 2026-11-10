import { describe, expect, it } from 'vitest';
import { isConfigWizardComplete, nextConfigSection } from './configWizard';

describe('config wizard', () => {
  it('starts on Général and steps forward one section at a time', () => {
    expect(nextConfigSection('general')).toBe('source');
    expect(nextConfigSection('source')).toBe('advanced');
    expect(nextConfigSection('advanced')).toBeNull();
  });

  it('treats the walk as finished only after every section was opened', () => {
    const visited = new Set<'general' | 'source' | 'advanced'>(['general', 'source']);
    expect(isConfigWizardComplete(visited)).toBe(false);
    visited.add('advanced');
    expect(isConfigWizardComplete(visited)).toBe(true);
  });
});
