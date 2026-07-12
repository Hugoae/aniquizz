import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { WatchedListProvider } from '@aniquizz/shared';

const COPY: Record<WatchedListProvider, { title: string; placeholder: string }> = {
  anilist: {
    title: 'Lier AniList',
    placeholder: 'Votre pseudo AniList exact...',
  },
  mal: {
    title: 'Lier MyAnimeList',
    placeholder: 'Votre pseudo MyAnimeList exact...',
  },
};

interface WatchlistLinkDialogProps {
  provider: WatchedListProvider;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
}

/** Modal to enter/edit an AniList or MAL username to link. */
export function WatchlistLinkDialog({
  provider,
  open,
  onOpenChange,
  value,
  onChange,
  onSave,
}: WatchlistLinkDialogProps) {
  const { title, placeholder } = COPY[provider];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="py-4">
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        <DialogFooter><Button onClick={onSave}>Sauvegarder</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
