import { Calendar, Sparkles, Bug, Zap, LucideIcon, Newspaper } from 'lucide-react';

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
  update: { icon: Zap, text: 'text-accent', bg: 'bg-accent/15', label: 'Mise à jour' },
  feature: { icon: Sparkles, text: 'text-primary', bg: 'bg-primary/15', label: 'Nouveauté' },
  fix: { icon: Bug, text: 'text-warning', bg: 'bg-warning/15', label: 'Correction' },
  event: { icon: Calendar, text: 'text-success', bg: 'bg-success/15', label: 'Événement' },
  default: { icon: Newspaper, text: 'text-muted-foreground', bg: 'bg-muted', label: 'Info' },
};
