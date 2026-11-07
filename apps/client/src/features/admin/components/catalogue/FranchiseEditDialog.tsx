import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { adminApi, type CatalogueFranchiseGroup } from '@/lib/adminApi';
import { errMsg, toList } from './editDialogFields';
import { EditDialogRow as Row } from './EditDialogRow';

// --- Franchise --------------------------------------------------------------

export function FranchiseEditDialog({
  open,
  onOpenChange,
  franchise,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  franchise?: CatalogueFranchiseGroup;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [genres, setGenres] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const isEdit = !!franchise && franchise.id !== null;

  useEffect(() => {
    if (open) {
      setName(franchise?.name ?? '');
      setGenres((franchise?.genres ?? []).join(', '));
      setIsLocked(franchise?.isLocked ?? false);
    }
  }, [open, franchise]);

  const save = async () => {
    if (!name.trim()) {
      toast.error('Nom requis.');
      return;
    }
    setBusy(true);
    try {
      const payload = { name: name.trim(), genres: toList(genres), isLocked };
      if (isEdit) {
        await adminApi.updateFranchise(franchise!.id!, payload);
        toast.success('Franchise mise à jour.');
      } else {
        await adminApi.createFranchise(payload);
        toast.success('Franchise créée.');
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Éditer la franchise' : 'Nouvelle franchise'}</DialogTitle>
          <DialogDescription>Regroupe des animes liés.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Row label="Nom">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Row>
          <Row label="Genres (virgules)">
            <Input value={genres} onChange={(e) => setGenres(e.target.value)} />
          </Row>
          <div className="flex items-center gap-2">
            <Switch checked={isLocked} onCheckedChange={setIsLocked} />
            <Label className="text-sm">Verrouillée</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
