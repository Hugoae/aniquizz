import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SeoHead } from '@/components/seo/SeoHead';
import { PAGE_TITLES } from '@/lib/site';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/PasswordField';
import { supabase } from '@/lib/supabase';
import { AUTH_COPY } from '@/features/auth/copy/authCopy';
import { mapAuthErrorMessage } from '@/features/auth/lib/authErrorMessage';
import { isPasswordValid } from '@/features/auth/lib/passwordPolicy';
import {
  resolveResetPasswordAccess,
  urlLooksLikeRecovery,
  type ResetPasswordAccess,
} from '@/features/auth/lib/resetPasswordAccess';
import { consumePasswordRecovery, markPasswordRecovery } from '@/lib/passwordRecoverySignal';

/**
 * Landing page for the password-recovery email link. Supabase parses the
 * recovery tokens from the URL and establishes a short-lived recovery session,
 * which lets the user set a new password without the old one.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [access, setAccess] = useState<ResetPasswordAccess | 'checking'>('checking');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && mounted) {
        markPasswordRecovery();
        setAccess('form');
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAccess((current) => {
        if (current === 'form') return current;
        return resolveResetPasswordAccess({
          recoveryEventSeen: consumePasswordRecovery(),
          hasSession: Boolean(data.session),
          urlLooksLikeRecovery: urlLooksLikeRecovery(window.location.hash, window.location.search),
        });
      });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!isPasswordValid(newPassword)) {
      toast.error(AUTH_COPY.passwordInvalid);
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(mapAuthErrorMessage(error));
        return;
      }
      toast.success('Mot de passe réinitialisé ! Vous êtes connecté.');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      toast.error(mapAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <SeoHead title={PAGE_TITLES.resetPassword} noindex path="/reset-password" />
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black gradient-text">NOUVEAU MOT DE PASSE</h1>
        </div>

        {access === 'checking' ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : access === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordField
              id="reset-new-password"
              label="Nouveau mot de passe"
              autoComplete="new-password"
              value={newPassword}
              onChange={setNewPassword}
              required
            />
            <PasswordField
              id="reset-confirm-password"
              label="Confirmer le nouveau mot de passe"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
            />
            <p className="text-xs text-muted-foreground">{AUTH_COPY.passwordHint}</p>
            <Button type="submit" className="w-full font-bold" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Réinitialiser le mot de passe
            </Button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              {access === 'already-signed-in'
                ? AUTH_COPY.alreadySignedInReset
                : AUTH_COPY.invalidResetLink}
            </p>
            <Button
              className="w-full font-bold"
              onClick={() =>
                navigate(access === 'already-signed-in' ? '/profile' : '/', { replace: true })
              }
            >
              {access === 'already-signed-in' ? 'Ouvrir mon profil' : "Retour à l'accueil"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
