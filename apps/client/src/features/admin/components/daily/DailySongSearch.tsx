import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { isAbortError } from '@/lib/abortError';
import { adminApi, AdminApiError, type DailySongSearchHit } from '@/lib/adminApi';
import {
  libraryDifficultyClass,
  libraryDifficultyLabel,
} from '@/features/library/lib/libraryStyles';
import { FOCUS_RING } from '@/features/hub/components/config/ConfigPrimitives';
import { toLibraryDifficulty } from './dailyAdminFormat';
import { DAILY_ADMIN_COPY } from './dailyAdminCopy';
import {
  placeDailySongSearchPanel,
  type DailySongSearchPanelBox,
} from './placeDailySongSearchPanel';

const DEBOUNCE_MS = 220;
const MIN_QUERY_LENGTH = 2;

interface DailySongSearchProps {
  excludeIds: number[];
  disabled?: boolean;
  onPick: (song: DailySongSearchHit) => void;
}

export function DailySongSearch({ excludeIds, disabled, onPick }: DailySongSearchProps) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<DailySongSearchHit[]>([]);
  const [panelBox, setPanelBox] = useState<DailySongSearchPanelBox | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const excludeKey = excludeIds.join(',');

  useEffect(() => {
    if (disabled || debounced.length < MIN_QUERY_LENGTH) {
      setHits([]);
      setLoading(false);
      return;
    }
    if (!open) return;
    const controller = new AbortController();
    const exclude = excludeKey
      .split(',')
      .map((value) => Number(value))
      .filter((id) => Number.isInteger(id) && id > 0);
    setLoading(true);
    void adminApi
      .searchDailySongs({ query: debounced, exclude, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setHits(result.songs);
      })
      .catch((error) => {
        if (isAbortError(error) || controller.signal.aborted) return;
        setHits([]);
        toast.error(error instanceof AdminApiError ? error.message : DAILY_ADMIN_COPY.loadError);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [debounced, disabled, excludeKey, open]);

  useEffect(() => {
    if (!open) {
      setPanelBox(null);
      return;
    }
    const sync = () => {
      const el = wrapRef.current;
      if (!el) return;
      setPanelBox(placeDailySongSearchPanel(el.getBoundingClientRect(), window.innerHeight));
    };
    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
    };
  }, [open, hits.length, loading]);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, []);

  const typed = query.trim();
  const pending = typed.length >= MIN_QUERY_LENGTH && typed !== debounced;
  const showList = open && Boolean(panelBox) && typed.length >= MIN_QUERY_LENGTH;
  const showEmpty = !loading && !pending && hits.length === 0;

  const listbox =
    showList && panelBox
      ? createPortal(
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            className="fixed z-[200] overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-2xl custom-scrollbar"
            style={{
              top: panelBox.top,
              bottom: panelBox.bottom,
              left: panelBox.left,
              width: panelBox.width,
              maxHeight: panelBox.maxHeight,
            }}
          >
          <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            {loading || pending
              ? DAILY_ADMIN_COPY.searchHint
              : `${DAILY_ADMIN_COPY.searchCount(hits.length)} · ${DAILY_ADMIN_COPY.searchHint}`}
          </p>
          {(loading || pending) && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {showEmpty && (
            <p className="px-2 py-4 text-sm text-muted-foreground">{DAILY_ADMIN_COPY.searchEmpty}</p>
          )}
          {!loading &&
            !pending &&
            hits.map((song) => {
              const difficulty = toLibraryDifficulty(song.difficulty);
              return (
                <button
                  key={song.id}
                  type="button"
                  role="option"
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-secondary/60',
                    FOCUS_RING,
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onPick(song);
                    setQuery('');
                    setOpen(false);
                  }}
                >
                  {song.cover ? (
                    <img
                      src={song.cover}
                      alt=""
                      className="h-12 w-8 shrink-0 rounded object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-12 w-8 shrink-0 rounded bg-secondary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[10px] font-black uppercase">
                        {song.typeLabel}
                      </span>
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                          libraryDifficultyClass(difficulty),
                        )}
                      >
                        {libraryDifficultyLabel(difficulty)}
                      </span>
                    </div>
                    <p className="truncate text-sm font-medium">{song.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {song.artist}
                      <span className="text-muted-foreground/50"> · </span>
                      {song.anime}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          disabled={disabled}
          placeholder={DAILY_ADMIN_COPY.searchPlaceholder}
          className={cn('h-9 pl-8', FOCUS_RING)}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          onFocus={() => {
            if (query.trim().length >= MIN_QUERY_LENGTH) setOpen(true);
          }}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setOpen(next.trim().length >= MIN_QUERY_LENGTH);
          }}
        />
      </div>
      {listbox}
    </div>
  );
}
