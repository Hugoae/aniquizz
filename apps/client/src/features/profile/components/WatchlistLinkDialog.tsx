import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { WatchedListProvider } from '@aniquizz/shared';

const COPY: Record<WatchedListProvider, { title: string; placeholder: string; hint: string }> = {
  anilist: {
    title: 'Lier AniList',
    placeholder: 'Votre pseudo AniList exact...',
    hint: "Utilise le pseudo de l'URL du profil (anilist.co/user/...), pas le nom affiché.",
  },
  mal: {
    title: 'Lier MyAnimeList',
    placeholder: 'Votre pseudo MyAnimeList exact...',
    hint: "Utilise le pseudo de l'URL du profil (myanimelist.net/profile/...), pas le nom affiché.",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!saving && value.trim()) onSave();
          }}
        >
          <div className="py-4">
            <Input
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              autoComplete="username"
              disabled={saving}
            />
            <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving || !value.trim()}>
              {saving ? 'Liaison...' : 'Sauvegarder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
