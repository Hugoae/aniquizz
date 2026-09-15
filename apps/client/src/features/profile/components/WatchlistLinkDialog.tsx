import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MAX_WATCHLIST_USERNAME_INPUT_LENGTH, type WatchedListProvider } from '@aniquizz/shared';
import { PROFILE_COPY } from '@/features/profile/copy/profileCopy';

const COPY: Record<WatchedListProvider, { title: string; placeholder: string; hint: string }> = {
  anilist: {
    title: PROFILE_COPY.watchlistAnilistTitle,
    placeholder: PROFILE_COPY.watchlistAnilistPlaceholder,
    hint: PROFILE_COPY.watchlistAnilistHint,
  },
  mal: {
    title: PROFILE_COPY.watchlistMalTitle,
    placeholder: PROFILE_COPY.watchlistMalPlaceholder,
    hint: PROFILE_COPY.watchlistMalHint,
  },
};

interface WatchlistLinkDialogProps {
  provider: WatchedListProvider;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saving?: boolean;
}

/** Modal to enter/edit an AniList or MAL username to link. */
export function WatchlistLinkDialog({
  provider,
  open,
  onOpenChange,
  value,
  onChange,
  onSave,
  saving = false,
}: WatchlistLinkDialogProps) {
  const { title, placeholder, hint } = COPY[provider];
  const fieldId = `watchlist-username-${provider}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{hint}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!saving && value.trim()) onSave();
          }}
        >
          <div className="py-4">
            <Label htmlFor={fieldId}>{PROFILE_COPY.watchlistUsernameLabel}</Label>
            <Input
              id={fieldId}
              className="mt-2"
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              autoComplete="username"
              maxLength={MAX_WATCHLIST_USERNAME_INPUT_LENGTH}
              disabled={saving}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving || !value.trim()}>
              {saving ? PROFILE_COPY.watchlistSaving : PROFILE_COPY.watchlistSave}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
