import { ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ADMIN_COPY } from '@/features/admin/copy/adminCopy';
import type { UserListFilter, UserListSort } from '@/lib/adminApi';
import { cn } from '@/lib/utils';

const FILTERS: { key: UserListFilter; label: string }[] = [
  { key: 'all', label: ADMIN_COPY.users.filters.all },
  { key: 'players', label: ADMIN_COPY.users.filters.players },
  { key: 'online', label: ADMIN_COPY.users.filters.online },
  { key: 'in_game', label: ADMIN_COPY.users.filters.in_game },
  { key: 'moderators', label: ADMIN_COPY.users.filters.moderators },
  { key: 'admins', label: ADMIN_COPY.users.filters.admins },
  { key: 'muted', label: ADMIN_COPY.users.filters.muted },
  { key: 'banned', label: ADMIN_COPY.users.filters.banned },
];

const SORTS: { key: UserListSort; label: string }[] = [
  { key: 'username', label: ADMIN_COPY.users.sorts.username },
  { key: 'xp', label: ADMIN_COPY.users.sorts.xp },
  { key: 'games', label: ADMIN_COPY.users.sorts.games },
  { key: 'created', label: ADMIN_COPY.users.sorts.created },
  { key: 'seen', label: ADMIN_COPY.users.sorts.seen },
];

export function UsersPanelToolbar({
  counts,
  query,
  onQuery,
  filter,
  onFilter,
  sortKey,
  sortDir,
  onToggleSort,
}: {
  counts: { online: number; inGame: number; banned: number; muted: number };
  query: string;
  onQuery: (value: string) => void;
  filter: UserListFilter;
  onFilter: (filter: UserListFilter) => void;
  sortKey: UserListSort;
  sortDir: 'asc' | 'desc';
  onToggleSort: (key: UserListSort) => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success" />
          {ADMIN_COPY.users.online(counts.online)}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          {ADMIN_COPY.users.inGame(counts.inGame)}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-destructive" />
          {ADMIN_COPY.users.banned(counts.banned)}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-warning" />
          {ADMIN_COPY.users.muted(counts.muted)}
        </span>
      </div>

      <Input
        placeholder={ADMIN_COPY.users.search}
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((item) => (
          <Button
            key={item.key}
            size="sm"
            variant={filter === item.key ? 'default' : 'outline'}
            onClick={() => onFilter(item.key)}
            className={cn('h-7 rounded-full px-2.5', filter !== item.key && 'border-border')}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="text-xs text-muted-foreground">{ADMIN_COPY.users.sortBy}</span>
        {SORTS.map((item) => {
          const active = sortKey === item.key;
          return (
            <Button
              key={item.key}
              size="sm"
              variant="ghost"
              onClick={() => onToggleSort(item.key)}
              className={cn(
                'h-7 gap-1 px-2 text-xs',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {item.label}
              {active &&
                (sortDir === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                ))}
            </Button>
          );
        })}
      </div>
    </>
  );
}
