import type { LucideIcon } from 'lucide-react';
import { Music2, ScrollText, Settings2 } from 'lucide-react';

export type ConfigSectionId = 'general' | 'source' | 'advanced';

export interface ConfigSectionDef {
  id: ConfigSectionId;
  label: string;
  icon: LucideIcon;
}

export function buildConfigSections(): ConfigSectionDef[] {
  return [
    { id: 'general', label: 'Général', icon: ScrollText },
    { id: 'source', label: 'Source', icon: Music2 },
    { id: 'advanced', label: 'Avancée', icon: Settings2 },
  ];
}

export function defaultSectionId(): ConfigSectionId {
  return 'general';
}
