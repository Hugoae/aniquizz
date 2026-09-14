import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import type { ListOperation, ListProviderStatus, WatchedListProvider } from '@aniquizz/shared';
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
import { WatchlistLinkDialog } from '@/features/profile/components/WatchlistLinkDialog';
import { SettingsChoiceRow } from '@/features/settings/components/SettingsField';
import { SETTINGS_COPY } from '@/features/settings/copy/settingsCopy';
import { useLists } from '@/features/settings/integrations/listsContextValue';

function formatWhen(iso: string | null): string {
  if (!iso) return SETTINGS_COPY.listNeverSynced;
  return SETTINGS_COPY.listLastSync(new Date(iso).toLocaleString('fr-FR'));
}

function stateLabel(status: ListProviderStatus): string {
  if (!status.linked) return SETTINGS_COPY.listUnlinked;
  if (status.active) return SETTINGS_COPY.listActive;
  return SETTINGS_COPY.listInactive;
}

function fetchStateLabel(status: ListProviderStatus): string | null {
  if (
    !status.linked ||
    status.state === 'idle' ||
    status.state === 'ok' ||
    status.state === 'unlinked'
  )
    return null;
  return SETTINGS_COPY.listState[status.state];
}

function ListCard({
  title,
  status,
  pendingOperation,
  disabled,
  onLink,
  onSync,
  onUnlink,
}: {
  title: string;
  status: ListProviderStatus;
  pendingOperation: ListOperation | null;
  disabled: boolean;
  onLink: () => void;
  onSync: () => void;
  onUnlink: () => void;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-secondary/20 px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {status.active ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                {SETTINGS_COPY.listActive}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {status.username ?? SETTINGS_COPY.listUnlinked}
            {status.linked ? ` · ${stateLabel(status)}` : ''}
          </p>
          {status.linked ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {formatWhen(status.lastSync)}
              {status.animeCount != null ? ` · ${status.animeCount} animes` : ''}
              {fetchStateLabel(status) ? ` · ${fetchStateLabel(status)}` : ''}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onLink}>
          {status.linked ? SETTINGS_COPY.listEdit : SETTINGS_COPY.listLink}
        </Button>
        {status.linked ? (
          <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={onSync}>
            {pendingOperation === 'refresh' ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            )}
            {SETTINGS_COPY.listSync}
          </Button>
        ) : null}
        {status.linked ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={disabled}
            onClick={onUnlink}
          >
            {SETTINGS_COPY.listUnlink}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function SettingsIntegrationsSection() {
  const { status, loading, pending, outcome, link, setActive, sync, unlink } = useLists();
  const [linkProvider, setLinkProvider] = useState<WatchedListProvider | null>(null);
  const [linkName, setLinkName] = useState('');
  const [linkRequestId, setLinkRequestId] = useState<string | null>(null);
  const [unlinkProvider, setUnlinkProvider] = useState<WatchedListProvider | null>(null);

  useEffect(() => {
    if (!linkRequestId || outcome?.requestId !== linkRequestId) return;
    setLinkRequestId(null);
    if (outcome.success) setLinkProvider(null);
  }, [linkRequestId, outcome]);

  const operationFor = (provider: WatchedListProvider): ListOperation | null =>
    pending?.provider === provider ? pending.operation : null;
  const disabled = Boolean(pending);
  const bothLinked = status.anilist.linked && status.mal.linked;
  const sourceOptions = [
    { value: 'anilist' as const, label: 'AniList' },
    { value: 'mal' as const, label: 'MyAnimeList' },
  ];

  return (
    <section aria-labelledby="settings-integrations-heading">
      <h3 id="settings-integrations-heading" className="text-sm font-bold text-foreground">
        {SETTINGS_COPY.integrationsHeading}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {SETTINGS_COPY.integrationsHint}
      </p>
      {loading ? (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          {SETTINGS_COPY.listLoading}
        </p>
      ) : null}
      {bothLinked && status.active ? (
        <div className="mt-4">
          <SettingsChoiceRow<WatchedListProvider>
            legend={SETTINGS_COPY.listActiveSource}
            value={status.active}
            options={sourceOptions}
            disabled={disabled}
            onChange={setActive}
          />
        </div>
      ) : null}
      <div className="mt-4 space-y-3">
        <ListCard
          title="AniList"
          status={status.anilist}
          pendingOperation={operationFor('anilist')}
          disabled={disabled}
          onLink={() => {
            setLinkProvider('anilist');
            setLinkName(status.anilist.username ?? '');
          }}
          onSync={() => sync('anilist')}
          onUnlink={() => setUnlinkProvider('anilist')}
        />
        <ListCard
          title="MyAnimeList"
          status={status.mal}
          pendingOperation={operationFor('mal')}
          disabled={disabled}
          onLink={() => {
            setLinkProvider('mal');
            setLinkName(status.mal.username ?? '');
          }}
          onSync={() => sync('mal')}
          onUnlink={() => setUnlinkProvider('mal')}
        />
      </div>

      <WatchlistLinkDialog
        provider={linkProvider ?? 'anilist'}
        open={linkProvider != null}
        onOpenChange={(open) => {
          if (!open && !linkRequestId) setLinkProvider(null);
        }}
        value={linkName}
        onChange={setLinkName}
        saving={Boolean(linkRequestId)}
        onSave={() => {
          if (!linkProvider) return;
          const requestId = link(linkProvider, linkName);
          if (requestId) setLinkRequestId(requestId);
        }}
      />

      <AlertDialog
        open={unlinkProvider != null}
        onOpenChange={(open) => !open && setUnlinkProvider(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{SETTINGS_COPY.listUnlinkConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{SETTINGS_COPY.listUnlinkConfirmBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={disabled}
              onClick={() => {
                if (unlinkProvider) unlink(unlinkProvider);
                setUnlinkProvider(null);
              }}
            >
              {SETTINGS_COPY.listUnlink}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
