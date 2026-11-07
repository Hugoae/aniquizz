import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  secondary,
  accent = 'text-primary',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  secondary?: string;
  accent?: string;
}) {
  return (
    <div className="glass-card p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className={cn('h-4 w-4', accent)} />
      </div>
      <div className={cn('text-2xl font-bold', accent)}>{value}</div>
      {secondary && <div className="text-xs text-muted-foreground">{secondary}</div>}
    </div>
  );
}

export interface Segment {
  label: string;
  value: number;
  className: string;
  dot: string;
}

export function SegmentBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary/50">
        {total === 0 ? (
          <div className="h-full w-full bg-secondary/50" />
        ) : (
          segments.map((seg) => (
            <div
              key={seg.label}
              className={cn('h-full', seg.className)}
              style={{ width: `${(seg.value / total) * 100}%` }}
              title={`${seg.label}: ${seg.value}`}
            />
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {segments.map((seg) => (
          <span key={seg.label} className="flex items-center gap-1.5 text-muted-foreground">
            <span className={cn('h-2 w-2 rounded-full', seg.dot)} />
            {seg.label} <span className="font-semibold text-foreground">{seg.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function TopList({
  icon: Icon,
  title,
  items,
  empty,
}: {
  icon: LucideIcon;
  title: string;
  items: { primary: string; secondary?: string; count: number }[];
  empty: string;
}) {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground">{empty}</div>
      ) : (
        <ol className="space-y-2">
          {items.map((it, i) => (
            <li key={`${it.primary}-${i}`} className="flex items-center gap-3 text-sm">
              <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{it.primary}</div>
                {it.secondary && (
                  <div className="truncate text-xs text-muted-foreground">{it.secondary}</div>
                )}
              </div>
              <span className="shrink-0 rounded-md bg-secondary/50 px-2 py-0.5 text-xs text-muted-foreground">
                {it.count}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
