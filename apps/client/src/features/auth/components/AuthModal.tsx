import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { Loader2, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { toast } from 'sonner'; // Si tu as sonner, sinon console.log

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true); // Basculer entre Login et Inscription

    // À chaque fois que la modale s'ouvre ('open' change), on remet sur Connexion
  useEffect(() => {
    if (open) {
      setIsLogin(true);
      setError(null); // On efface aussi les anciennes erreurs
    }
  }, [open]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Champs du formulaire
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // Seulement pour l'inscription

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // --- CONNEXION ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Bon retour parmi nous !');
        onOpenChange(false); // Fermer la modale
      } else {
        // --- INSCRIPTION ---
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username }, // On envoie le pseudo pour le trigger SQL qu'on a fait
          },
        });
        if (error) throw error;
        toast.success('Compte créé ! Vérifiez vos emails.');
        // On ne ferme pas forcément la modale, on attend la validation email
        // Mais pour Supabase par défaut, c'est auto-confirm en dev
        onOpenChange(false);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-center gradient-text">
            {isLogin ? 'CONNEXION' : 'INSCRIPTION'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isLogin 
              ? 'Connectez-vous pour sauvegarder votre progression.' 
              : 'Rejoignez la communauté AniQuizz !'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          
          {/* Pseudo (Seulement pour Inscription) */}
          {!isLogin && (
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

          {/* Email */}
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

          {/* Mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
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
                minLength={6}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full font-bold" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLogin ? 'Se connecter' : "S'inscrire"}
          </Button>

          <div className="text-center text-sm text-muted-foreground mt-4">
            {isLogin ? "Pas encore de compte ? " : "Déjà un compte ? "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-semibold"
            >
              {isLogin ? "Créer un compte" : "Se connecter"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}