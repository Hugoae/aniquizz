import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/PasswordField';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';

const isPasswordValid = (pw: string) =>
  pw.length >= 8 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);

/**
 * Landing page for the password-recovery email link. Supabase parses the
 * recovery tokens from the URL and establishes a short-lived recovery session,
 * which lets the user set a new password without the old one.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Primary signal: fired when Supabase parses the recovery link.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && mounted) { setReady(true); setChecking(false); }
    });

    // Fallback: `detectSessionInUrl` consumes and clears the URL fragment before
    // this page mounts, so the PASSWORD_RECOVERY event can fire before we
    // subscribe. Landing here with an active session means the link was valid.
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) setReady(true);
      setChecking(false);
    });

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.'); return;
    }
    if (!isPasswordValid(newPassword)) {
      toast.error('Le mot de passe doit faire au moins 8 caractères et contenir une majuscule, une minuscule, un chiffre et un caractère spécial.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        if (/different from the old|should be different|same.*password/i.test(error.message)) {
          toast.error('Le nouveau mot de passe doit être différent de l\'ancien.');
        } else if (/weak|at least|character|requirement|pwned|leaked/i.test(error.message)) {
          toast.error('Le mot de passe ne respecte pas les exigences de sécurité.');
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success('Mot de passe réinitialisé ! Vous êtes connecté.');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erreur lors de la réinitialisation.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Helmet><title>Réinitialiser le mot de passe · AniQuizz</title></Helmet>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black gradient-text">NOUVEAU MOT DE PASSE</h1>
        </div>

        {checking ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : ready ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordField
              id="reset-new-password"
              label="Nouveau mot de passe"
              autoComplete="new-password"
              value={newPassword}
              onChange={setNewPassword}
            />
            <PasswordField
              id="reset-confirm-password"
              label="Confirmer le nouveau mot de passe"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
            <p className="text-xs text-muted-foreground">
              Au moins 8 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial.
            </p>
            <Button type="submit" className="w-full font-bold" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Réinitialiser le mot de passe
            </Button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Ce lien de réinitialisation est invalide ou a expiré. Veuillez en demander un nouveau.
            </p>
            <Button className="w-full font-bold" onClick={() => navigate('/', { replace: true })}>
              Retour à l'accueil
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
