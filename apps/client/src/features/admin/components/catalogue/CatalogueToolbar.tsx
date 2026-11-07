import type { Dispatch, SetStateAction } from 'react';
import { Lock, LockOpen, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { CatalogueTree, SongDifficulty, SongStatus } from '@/lib/adminApi';
import { ADMIN_COPY } from '@/features/admin/copy/adminCopy';

const DIFFICULTIES: SongDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];
const STATUSES: SongStatus[] = ['PENDING', 'PROCESSING', 'COMPLETED', 'ERROR', 'SKIPPED'];
const selectCls = 'rounded border border-border bg-background px-2 py-1 text-xs';

export function CatalogueToolbar({
  rawQuery,
  setRawQuery,
  focusSongId,
  onClearFocus,
  status,
  setStatus,
  difficulty,
  setDifficulty,
  locked,
  setLocked,
  setPage,
  canManage,
  onCreateFranchise,
  counts,
  coverage,
  selectedCount,
  onBulkApply,
  onClearSelection,
}: {
  rawQuery: string;
  setRawQuery: Dispatch<SetStateAction<string>>;
  focusSongId?: number | null;
  onClearFocus?: () => void;
  status: SongStatus | '';
  setStatus: Dispatch<SetStateAction<SongStatus | ''>>;
  difficulty: SongDifficulty | '';
  setDifficulty: Dispatch<SetStateAction<SongDifficulty | ''>>;
  locked: '' | 'true' | 'false';
  setLocked: Dispatch<SetStateAction<'' | 'true' | 'false'>>;
  setPage: Dispatch<SetStateAction<number>>;
  canManage: boolean;
  onCreateFranchise: () => void;
  counts: CatalogueTree['counts'] | undefined;
  coverage: number;
  selectedCount: number;
  onBulkApply: (data: {
    difficulty?: SongDifficulty;
    downloadStatus?: SongStatus;
    isLocked?: boolean;
  }) => void;
  onClearSelection: () => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Rechercher franchise, anime, son ou artiste…"
          value={rawQuery}
          onChange={(e) => {
            if (focusSongId) onClearFocus?.();
            setRawQuery(e.target.value);
          }}
          className="max-w-sm"
        />
        <select
          className={selectCls + ' py-2'}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as SongStatus | '');
            setPage(1);
          }}
        >
          <option value="">Tous statuts</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {ADMIN_COPY.downloadStatus[s]}
            </option>
          ))}
        </select>
        <select
          className={selectCls + ' py-2'}
          value={difficulty}
          onChange={(e) => {
            setDifficulty(e.target.value as SongDifficulty | '');
            setPage(1);
          }}
        >
          <option value="">Toutes difficultés</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {ADMIN_COPY.difficulty[d]}
            </option>
          ))}
        </select>
        <select
          className={selectCls + ' py-2'}
          value={locked}
          onChange={(e) => {
            setLocked(e.target.value as '' | 'true' | 'false');
            setPage(1);
          }}
        >
          <option value="">Verrou : tous</option>
          <option value="true">Franchises verrouillées</option>
          <option value="false">Franchises non verrouillées</option>
        </select>
        {canManage && (
          <Button className="ml-auto gap-1" onClick={() => onCreateFranchise()}>
            <Plus className="h-4 w-4" /> Nouvelle franchise
          </Button>
        )}
      </div>

      {/* Counters */}
      {counts && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>{counts.franchises} franchises</span>
          <span>· {counts.animes} animes</span>
          <span>· {counts.songs} sons</span>
          <span>
            — {counts.completedSongs} prêts (<span className="text-success">{coverage}%</span>)
          </span>
        </div>
      )}

      {/* Bulk bar */}
      {canManage && selectedCount > 0 && (
        <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm backdrop-blur">
          <span className="font-medium">{selectedCount} son(s) sélectionné(s)</span>
          <select
            className={selectCls}
            defaultValue=""
            onChange={(e) =>
              e.target.value && void onBulkApply({ difficulty: e.target.value as SongDifficulty })
            }
          >
            <option value="">Difficulté…</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {ADMIN_COPY.difficulty[d]}
              </option>
            ))}
          </select>
          <select
            className={selectCls}
            defaultValue=""
            onChange={(e) =>
              e.target.value && void onBulkApply({ downloadStatus: e.target.value as SongStatus })
            }
          >
            <option value="">Statut…</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {ADMIN_COPY.downloadStatus[s]}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={() => void onBulkApply({ isLocked: true })}>
            <Lock className="mr-1 h-3.5 w-3.5" /> Verrouiller
          </Button>
          <Button size="sm" variant="outline" onClick={() => void onBulkApply({ isLocked: false })}>
            <LockOpen className="mr-1 h-3.5 w-3.5" /> Déverrouiller
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => onClearSelection()}>
            <X className="mr-1 h-3.5 w-3.5" /> Effacer
          </Button>
        </div>
      )}
    </>
  );
}
