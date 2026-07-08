import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface AniListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
}

/** Modal to enter/edit the AniList username to link. */
export function AniListDialog({ open, onOpenChange, value, onChange, onSave }: AniListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader><DialogTitle>Lier AniList</DialogTitle></DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Votre pseudo AniList exact..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        <DialogFooter><Button onClick={onSave}>Sauvegarder</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
