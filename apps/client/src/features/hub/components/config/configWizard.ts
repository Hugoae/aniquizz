import type { ConfigSectionId } from './configSections';

const SECTION_ORDER: readonly ConfigSectionId[] = ['general', 'source', 'advanced'];

export function isConfigWizardComplete(visited: ReadonlySet<ConfigSectionId>): boolean {
  return SECTION_ORDER.every((id) => visited.has(id));
}

export function nextConfigSection(current: ConfigSectionId): ConfigSectionId | null {
  const index = SECTION_ORDER.indexOf(current);
  if (index < 0 || index >= SECTION_ORDER.length - 1) return null;
  return SECTION_ORDER[index + 1] ?? null;
}
