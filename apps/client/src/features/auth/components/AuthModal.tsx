import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordField } from '@/components/ui/PasswordField';
import { supabase } from '@/lib/supabase';
import { Loader2, Mail, User, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AUTH_COPY } from '@/features/auth/copy/authCopy';
import { mapAuthErrorMessage } from '@/features/auth/lib/authErrorMessage';
import { isPasswordValid } from '@/features/auth/lib/passwordPolicy';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('login');

  useEffect(() => {
    if (open) {
      setMode('login');
      setError(null);
    }
  }, [open]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup' && !isPasswordValid(password)) {
      setError(AUTH_COPY.passwordInvalid);
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        toast.success(AUTH_COPY.modal.login.toast);
        onOpenChange(false);
      } else if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });
        if (signUpError) throw signUpError;
        toast.success(AUTH_COPY.modal.signup.toast);
        onOpenChange(false);
      } else {
        // Password recovery. Never reveal whether the account exists.
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        toast.success(AUTH_COPY.modal.forgot.toast);
        setMode('login');
      }
    } catch (err: unknown) {
      setError(mapAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const copy = AUTH_COPY.modal[mode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,40rem)] overflow-y-auto sm:max-w-[400px] sm:rounded-xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-center gradient-text">
            {copy.title}
          </DialogTitle>
          <DialogDescription className="text-center">{copy.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="username">{AUTH_COPY.modal.fields.username}</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder={AUTH_COPY.modal.fields.usernamePlaceholder}
                  className="pl-9"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{AUTH_COPY.modal.fields.email}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder={AUTH_COPY.modal.fields.emailPlaceholder}
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div className="space-y-2">
              <PasswordField
                id="password"
                label={AUTH_COPY.modal.fields.password}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={setPassword}
                required
                headerRight={
                  mode === 'login' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      {AUTH_COPY.modal.fields.forgotLink}
                    </button>
                  ) : null
                }
              />
              {mode === 'signup' && (
                <>
                  <p className="text-xs text-muted-foreground">{AUTH_COPY.passwordHint}</p>
                  <p className="text-xs text-muted-foreground">
                    {AUTH_COPY.modal.signup.legalLead}
                    <Link
                      to="/legal/cgu"
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {AUTH_COPY.modal.signup.terms}
                    </Link>
                    {AUTH_COPY.modal.signup.legalMid}
                    <Link
                      to="/legal/confidentialite"
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {AUTH_COPY.modal.signup.privacy}
                    </Link>
                    {AUTH_COPY.modal.signup.legalEnd}
                  </p>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full font-bold" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {copy.submit}
          </Button>

          <div className="text-center text-sm text-muted-foreground mt-4">
            {mode === 'forgot' ? (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-primary hover:underline font-semibold"
              >
                {AUTH_COPY.modal.forgot.back}
              </button>
            ) : (
              <>
                {AUTH_COPY.modal[mode].switchPrompt}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setError(null);
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  {AUTH_COPY.modal[mode].switchAction}
                </button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
