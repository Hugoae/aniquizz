import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  LogOut, Loader2, ArrowLeft, Check, Link as LinkIcon
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();

  // --- ÉTATS ---
  const [showAniListModal, setShowAniListModal] = useState(false);
  const [anilistName, setAnilistName] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // --- EFFETS ---
  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
    if (profile?.anilistUsername) {
      setAnilistName(profile.anilistUsername);
    }
  }, [user, loading, navigate, profile]);

  // --- HANDLERS ---
  const handleLinkAnilist = async () => {
    if (!anilistName.trim() || !user) return;

    setIsSyncing(true);
    try {
      const { error } = await supabase
        .from('Profile')
        .update({ anilistUsername: anilistName })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("Compte AniList lié avec succès !");
      setShowAniListModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la liaison du compte.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Profil de {profile.username} - AniQuizz</title>
      </Helmet>

      <div className="min-h-screen bg-background pb-20">
        <Header />

        <main className="pt-24 container max-w-4xl mx-auto px-4">
          
          {/* BOUTON RETOUR */}
          <div className="mb-6">
            <Button 
                variant="ghost" 
                onClick={() => navigate('/')} 
                className="gap-2 text-muted-foreground hover:text-foreground pl-0"
            >
                <ArrowLeft className="h-5 w-5" />
                Retour à l'accueil
            </Button>
          </div>

          {/* CARTE PROFIL SIMPLIFIÉE */}
          <div className="relative rounded-2xl overflow-hidden bg-card border border-white/10 p-8 shadow-2xl">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px]" />

            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">

              {/* Avatar */}
              <div className="relative group shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-br from-primary to-purple-600 rounded-full blur opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                <Avatar className="h-32 w-32 border-4 border-background relative shadow-xl">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.avatar}`} />
                  <AvatarFallback className="text-4xl font-bold">{profile.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>

              {/* Infos */}
              <div className="flex-1 space-y-2 py-2">
                <h1 className="text-4xl font-black tracking-tight flex flex-col md:flex-row items-center md:items-end gap-3">
                  {profile.username}
                  {profile.role === 'ADMIN' && (
                    <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/50 mb-2 md:mb-1">
                      ADMIN
                    </span>
                  )}
                </h1>
                
                <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span>En ligne</span>
                </div>

                {profile.anilistUsername && (
                    <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-blue-400 mt-2 bg-blue-500/10 px-3 py-1 rounded-full w-fit mx-auto md:mx-0">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/6/61/AniList_logo.svg" alt="AniList" className="w-4 h-4" />
                        <span>Lié à : <b>{profile.anilistUsername}</b></span>
                    </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 min-w-[160px]">
                <Button 
                    variant="outline" 
                    className="gap-2 border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-400 transition-colors" 
                    onClick={() => setShowAniListModal(true)}
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/6/61/AniList_logo.svg" alt="AL" className="w-4 h-4" />
                  {profile.anilistUsername ? "Modifier AniList" : "Lier AniList"}
                </Button>
                
                <Button 
                    variant="destructive" 
                    className="gap-2 shadow-lg shadow-destructive/20" 
                    onClick={signOut}
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </Button>
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* MODAL ANILIST */}
      <Dialog open={showAniListModal} onOpenChange={setShowAniListModal}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/61/AniList_logo.svg" alt="AL" className="w-6 h-6" />
                Intégration AniList
            </DialogTitle>
            <DialogDescription>
              Entrez votre pseudo AniList pour permettre au jeu de générer des questions basées sur les animés que vous avez vus.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="anilist-username">Pseudo AniList</Label>
                <Input 
                    id="anilist-username" 
                    placeholder="Ex: Kirikou" 
                    value={anilistName}
                    onChange={(e) => setAnilistName(e.target.value)}
                    className="bg-secondary/50"
                />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAniListModal(false)}>Annuler</Button>
            <Button onClick={handleLinkAnilist} disabled={isSyncing} className="gap-2">
                {isSyncing && <Loader2 className="h-4 w-4 animate-spin" />}
                Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}