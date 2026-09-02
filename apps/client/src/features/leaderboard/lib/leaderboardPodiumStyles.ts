import { cn } from '@/lib/utils';

export const podiumFrameClass = (rank: number): string => {
  if (rank === 1) {
    return 'border-warning/70 bg-gradient-to-b from-warning/30 via-warning/10 to-card/80 shadow-[0_0_16px_hsl(var(--warning)/0.16)]';
  }
  if (rank === 2) {
    return 'border-silver/60 bg-gradient-to-b from-silver/25 via-silver/8 to-card/80 shadow-[0_0_10px_hsl(var(--silver)/0.12)]';
  }
  if (rank === 3) {
    return 'border-bronze/60 bg-gradient-to-b from-bronze/25 via-bronze/8 to-card/80 shadow-[0_0_8px_hsl(var(--bronze)/0.14)]';
  }
  return 'border-border/60 bg-card/50';
};

export const podiumRingClass = (rank: number): string => {
  if (rank === 1) return 'border-warning ring-4 ring-warning/40 shadow-[0_0_14px_hsl(var(--warning)/0.28)]';
  if (rank === 2) return 'border-silver ring-4 ring-silver/35 shadow-[0_0_8px_hsl(var(--silver)/0.22)]';
  if (rank === 3) return 'border-bronze ring-4 ring-bronze/35 shadow-[0_0_8px_hsl(var(--bronze)/0.2)]';
  return 'border-border/70';
};

export const podiumScoreClass = (rank: number): string => {
  if (rank === 1) return 'text-warning';
  if (rank === 2) return 'text-silver';
  if (rank === 3) return 'text-medal-bronze';
  return 'text-foreground';
};

export const podiumOrderClass = (rank: number): string => {
  if (rank === 1) return 'order-1 md:order-2';
  if (rank === 2) return 'order-2 md:order-1';
  return 'order-3';
};

export const rowRankFrameClass = (rank: number): string => {
  if (rank === 1) return 'border-warning/45 bg-gradient-to-r from-warning/15 to-transparent';
  if (rank === 2) return 'border-silver/40 bg-gradient-to-r from-silver/12 to-transparent';
  if (rank === 3) return 'border-bronze/40 bg-gradient-to-r from-bronze/12 to-transparent';
  return '';
};
