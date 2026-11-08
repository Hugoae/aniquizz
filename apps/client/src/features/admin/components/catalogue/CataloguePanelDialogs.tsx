import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ADMIN_COPY } from '@/features/admin/copy/adminCopy';
import type { CatalogueAnime, CatalogueFranchiseGroup, CatalogueSong } from '@/lib/adminApi';
import {
  AnimeEditDialog,
  FranchiseEditDialog,
  SongEditDialog,
  VideoPreviewDialog,
} from './EditDialogs';

export type CatalogueConfirm =
  | { kind: 'song'; id: number; label: string }
  | { kind: 'anime'; id: number; label: string }
  | { kind: 'franchise'; id: number; label: string }
  | null;

function confirmText(confirm: CatalogueConfirm): string {
  if (!confirm) return '';
  if (confirm.kind === 'franchise') return ADMIN_COPY.catalogue.deleteFranchise(confirm.label);
  if (confirm.kind === 'anime') return ADMIN_COPY.catalogue.deleteAnime(confirm.label);
  return ADMIN_COPY.catalogue.deleteSong(confirm.label);
}

export function CataloguePanelDialogs({
  songDialog,
  setSongDialog,
  animeDialog,
  setAnimeDialog,
  franchiseDialog,
  setFranchiseDialog,
  preview,
  setPreview,
  confirm,
  setConfirm,
  onSaved,
  onDelete,
  page,
  totalPages,
  showPagination,
  onPage,
}: {
  songDialog: { song?: CatalogueSong; animeId: number } | null;
  setSongDialog: (value: { song?: CatalogueSong; animeId: number } | null) => void;
  animeDialog: { anime?: CatalogueAnime; franchiseId: number | null } | null;
  setAnimeDialog: (value: { anime?: CatalogueAnime; franchiseId: number | null } | null) => void;
  franchiseDialog: { franchise?: CatalogueFranchiseGroup } | null;
  setFranchiseDialog: (value: { franchise?: CatalogueFranchiseGroup } | null) => void;
  preview: CatalogueSong | null;
  setPreview: (song: CatalogueSong | null) => void;
  confirm: CatalogueConfirm;
  setConfirm: (value: CatalogueConfirm) => void;
  onSaved: () => Promise<void>;
  onDelete: () => Promise<void>;
  page: number;
  totalPages: number;
  showPagination: boolean;
  onPage: (page: number) => void;
}) {
  return (
    <>
      {showPagination && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            {ADMIN_COPY.catalogue.prev}
          </Button>
          <span className="text-sm text-muted-foreground">
            {ADMIN_COPY.catalogue.page(page, totalPages)}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
          >
            {ADMIN_COPY.catalogue.next}
          </Button>
        </div>
      )}

      {songDialog && (
        <SongEditDialog
          open
          onOpenChange={(open) => !open && setSongDialog(null)}
          song={songDialog.song}
          animeId={songDialog.animeId}
          onSaved={onSaved}
        />
      )}
      {animeDialog && (
        <AnimeEditDialog
          open
          onOpenChange={(open) => !open && setAnimeDialog(null)}
          anime={animeDialog.anime}
          franchiseId={animeDialog.franchiseId}
          onSaved={onSaved}
        />
      )}
      {franchiseDialog && (
        <FranchiseEditDialog
          open
          onOpenChange={(open) => !open && setFranchiseDialog(null)}
          franchise={franchiseDialog.franchise}
          onSaved={onSaved}
        />
      )}
      <VideoPreviewDialog song={preview} onOpenChange={(open) => !open && setPreview(null)} />

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ADMIN_COPY.catalogue.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmText(confirm)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ADMIN_COPY.catalogue.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => void onDelete()}
            >
              {ADMIN_COPY.catalogue.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
