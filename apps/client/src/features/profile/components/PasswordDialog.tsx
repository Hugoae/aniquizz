import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/PasswordField';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';

interface PasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string | undefined;
}

const isPasswordValid = (pw: string) =>
  pw.length >= 8 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);

/** Self-contained "change password" modal (owns its fields + submit logic). */
export function PasswordDialog({ open, onOpenChange, userEmail }: PasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const reset = () => {
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
  };

  const close = () => { reset(); onOpenChange(false); };

  const handleChangePassword = async () => {
    if (!userEmail) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs.'); return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les nouveaux mots de passe ne correspondent pas.'); return;
    }
    if (!isPasswordValid(newPassword)) {
      toast.error('Le mot de passe doit faire au moins 8 caractères et contenir une majuscule, une minuscule, un chiffre et un caractère spécial.'); return;
    }
    setIsChangingPassword(true);
    try {
      // The project enforces "Require current password when changing password",
      // so we let Supabase verify the current password server-side.
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        current_password: currentPassword,
      });
      if (error) {
        const msg = error.message || '';
        if (/different from the old|should be different|same.*password/i.test(msg)) {
          toast.error('Le nouveau mot de passe doit être différent de l\'ancien.');
        } else if (/current password|invalid|incorrect|credential/i.test(msg)) {
          toast.error('Mot de passe actuel incorrect.');
        } else if (/weak|at least|character|requirement|pwned|leaked/i.test(msg)) {
          toast.error('Le nouveau mot de passe ne respecte pas les exigences de sécurité.');
        } else {
          toast.error(msg || 'Erreur lors du changement de mot de passe.');
        }
        return;
      }

      toast.success('Mot de passe mis à jour !');
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset(); }}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader><DialogTitle>Changer de mot de passe</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <PasswordField
            id="current-password"
            label="Mot de passe actuel"
            autoComplete="current-password"
            value={currentPassword}
            onChange={setCurrentPassword}
          />
          <PasswordField
            id="new-password"
            label="Nouveau mot de passe"
            autoComplete="new-password"
            value={newPassword}
            onChange={setNewPassword}
          />
          <PasswordField
            id="confirm-password"
            label="Confirmer le nouveau mot de passe"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
          <p className="text-xs text-muted-foreground">
            Au moins 8 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={close}>Annuler</Button>
          <Button onClick={handleChangePassword} disabled={isChangingPassword}>
            {isChangingPassword ? <Loader2 className="animate-spin h-4 w-4" /> : 'Mettre à jour'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
