import { Calendar, Sparkles, Bug, Zap, LucideIcon, Newspaper } from 'lucide-react';
import { pick } from '@/lib/i18n/text';

export interface NewsItem {
  id: number;
  title: string;
  description: string;
  content: string;
  date: string;
  type: 'update' | 'feature' | 'fix' | 'event';
}

type TypeConfig = { icon: LucideIcon; text: string; bg: string; label: string };

export const typeConfig: Record<NewsItem['type'] | 'default', TypeConfig> = {
  update: {
    icon: Zap,
    text: 'text-accent',
    bg: 'bg-accent/15',
    get label() {
      return pick('Mise à jour', 'Update');
    },
  },
  feature: {
    icon: Sparkles,
    text: 'text-primary',
    bg: 'bg-primary/15',
    get label() {
      return pick('Nouveauté', 'New');
    },
  },
  fix: {
    icon: Bug,
    text: 'text-warning',
    bg: 'bg-warning/15',
    get label() {
      return pick('Correction', 'Fix');
    },
  },
  event: {
    icon: Calendar,
    text: 'text-success',
    bg: 'bg-success/15',
    get label() {
      return pick('Événement', 'Event');
    },
  },
  default: {
    icon: Newspaper,
    text: 'text-muted-foreground',
    bg: 'bg-muted',
    get label() {
      return pick('Info', 'Info');
    },
  },
};
