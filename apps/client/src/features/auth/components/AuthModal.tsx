import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { Loader2, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';

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
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Bon retour parmi nous !');
        onOpenChange(false);
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });
        if (error) throw error;
        toast.success('Compte créé ! Vérifiez vos emails.');
        onOpenChange(false);
      } else {
        // Password recovery. Never reveal whether the account exists.
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success('Si un compte existe pour cet email, un lien de réinitialisation vient d\'être envoyé.');
        setMode('login');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'login' ? 'CONNEXION' : mode === 'signup' ? 'INSCRIPTION' : 'MOT DE PASSE OUBLIÉ';
  const description =
    mode === 'login' ? 'Connectez-vous pour sauvegarder votre progression.'
      : mode === 'signup' ? 'Rejoignez la communauté AniQuizz !'
        : 'Entrez votre email pour recevoir un lien de réinitialisation.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] sm:rounded-xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-center gradient-text">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">

          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="username">Pseudo</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="OtakuDu93"
                  className="pl-9"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="exemple@email.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); }}
                    className="text-xs text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              {mode === 'signup' && (
                <p className="text-xs text-muted-foreground">
                  Au moins 8 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial.
                </p>
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
            {mode === 'login' ? 'Se connecter' : mode === 'signup' ? "S'inscrire" : 'Envoyer le lien'}
          </Button>

          <div className="text-center text-sm text-muted-foreground mt-4">
            {mode === 'forgot' ? (
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className="text-primary hover:underline font-semibold"
              >
                Retour à la connexion
              </button>
            ) : (
              <>
                {mode === 'login' ? "Pas encore de compte ? " : "Déjà un compte ? "}
                <button
                  type="button"
                  onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
                  className="text-primary hover:underline font-semibold"
                >
                  {mode === 'login' ? "Créer un compte" : "Se connecter"}
                </button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}