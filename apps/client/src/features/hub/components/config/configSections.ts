import type { LucideIcon } from 'lucide-react';
import { Music2, ScrollText, Settings2 } from 'lucide-react';
import { pick } from '@/lib/i18n/text';

export type ConfigSectionId = 'general' | 'source' | 'advanced';

export interface ConfigSectionDef {
  id: ConfigSectionId;
  label: string;
  icon: LucideIcon;
}

export function buildConfigSections(): ConfigSectionDef[] {
  return [
    {
      id: 'general',
      get label() {
        return pick('Général', 'General');
      },
      icon: ScrollText,
    },
    {
      id: 'source',
      get label() {
        return pick('Source', 'Source');
      },
      icon: Music2,
    },
    {
      id: 'advanced',
      get label() {
        return pick('Avancée', 'Advanced');
      },
      icon: Settings2,
    },
  ];
}

export function defaultSectionId(): ConfigSectionId {
  return 'general';
}
