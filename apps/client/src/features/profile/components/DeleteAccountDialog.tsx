import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordField } from '@/components/ui/PasswordField';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { socket } from '@/lib/socket';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  userEmail: string | undefined;
  onDeleted: () => void;
}

/** Destructive account deletion — re-authenticates, then asks the server to erase all data. */
export function DeleteAccountDialog({
  open,
  onOpenChange,
  username,
  userEmail,
  onDeleted,
}: DeleteAccountDialogProps) {
  const [confirmUsername, setConfirmUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const reset = () => {
    setConfirmUsername('');
    setPassword('');
  };

  const close = () => {
    if (isDeleting) return;
    reset();
    onOpenChange(false);
  };

  const canSubmit =
    confirmUsername === username &&
    password.length > 0 &&
    !isDeleting;

  const handleDelete = async () => {
    if (!userEmail || !canSubmit) return;

    setIsDeleting(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password,
      });
      if (authError) {
        toast.error('Mot de passe incorrect.');
        return;
      }

      if (!socket.connected) socket.connect();

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('Délai dépassé. Réessaie.'));
        }, 30_000);

        const onDeletedEvent = () => {
          cleanup();
          resolve();
        };
        const onError = (err: { message?: string }) => {
          cleanup();
          reject(new Error(err?.message || 'Impossible de supprimer le compte.'));
        };

        const cleanup = () => {
          clearTimeout(timeout);
          socket.off('profile:account_deleted', onDeletedEvent);
          socket.off('profile:error', onError);
          socket.off('error', onError);
        };

        socket.on('profile:account_deleted', onDeletedEvent);
        socket.on('profile:error', onError);
        socket.on('error', onError);
        socket.emit('profile:delete_account', { confirmUsername });
      });

      toast.success('Compte supprimé.');
      reset();
      onOpenChange(false);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de supprimer le compte.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!isDeleting) { onOpenChange(next); if (!next) reset(); } }}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden />
            Supprimer mon compte
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <p className="text-muted-foreground">
            Cette action est <strong className="text-foreground">définitive et irréversible</strong>.
            Seront supprimés : ton profil, tes statistiques, ton historique de parties, ta liste AniList liée et tes liens d&apos;amitié.
          </p>

          <div className="space-y-2">
            <label htmlFor="confirm-username" className="text-sm font-medium">
              Saisis ton pseudo <span className="font-mono text-destructive">{username}</span> pour confirmer
            </label>
            <Input
              id="confirm-username"
              value={confirmUsername}
              onChange={(e) => setConfirmUsername(e.target.value)}
              autoComplete="off"
              disabled={isDeleting}
              placeholder={username}
            />
          </div>

          <PasswordField
            id="delete-account-password"
            label="Mot de passe actuel"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            disabled={isDeleting}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={close} disabled={isDeleting}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canSubmit}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'Supprimer définitivement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
