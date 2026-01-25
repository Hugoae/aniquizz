import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  LogOut, Loader2, ArrowLeft, Unlink, Camera, Upload, Check, X, Edit2, 
  Trophy, Target, Music2, TrendingUp, Disc, Flame, Zap, Users
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { socket } from '@/services/socket';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/canvasUtils';
import { cn } from '@/lib/utils';

// --- COMPOSANT CARTE DE STAT ---
const StatCard = ({ icon: Icon, label, value, subtext, color = "text-primary" }: any) => (
    <div className="bg-card/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between hover:bg-card/60 transition-colors relative overflow-hidden group">
        <div className={`absolute top-3 right-3 p-2 rounded-full bg-white/5 ${color} opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all`}>
            <Icon className="h-5 w-5" />
        </div>
        <div>
            <div className={`text-3xl font-black mb-1 ${color}`}>{value}</div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</div>
        </div>
        {subtext && <div className="text-[10px] text-muted-foreground/60 mt-2">{subtext}</div>}
    </div>
);

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, signOut, loading, refreshProfile } = useAuth();

  // --- ÉTATS ---
  const [showAniListModal, setShowAniListModal] = useState(false);
  const [anilistName, setAnilistName] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [totalSongsCount, setTotalSongsCount] = useState(0);

  // --- EFFETS ---
  useEffect(() => {
    if (!loading && !user) navigate('/');
    if (profile) {
      setAnilistName(profile.anilistUsername || "");
      setNewUsername(profile.username);
    }
  }, [user, loading, navigate, profile]);

  useEffect(() => {
      if (socket.connected) {
          socket.emit('get_home_stats');
          socket.on('home_stats', (data) => { if (data && data.songs) setTotalSongsCount(data.songs); });
      }
      return () => { socket.off('home_stats'); };
  }, []);

  useEffect(() => {
    const handleProfileUpdate = () => { toast.success("Profil mis à jour !"); setIsSaving(false); setIsEditingUsername(false); refreshProfile(); };
    const handleError = (err: any) => { toast.error(err.message); setIsSaving(false); };
    socket.on('user_profile', handleProfileUpdate);
    socket.on('error', handleError);
    return () => { socket.off('user_profile', handleProfileUpdate); socket.off('error', handleError); };
  }, [refreshProfile]);

  // --- CALCULS ---
  const discoveredSongs = profile?.history && Array.isArray(profile.history) && profile.history.length > 0 ? (profile.history[0] as any).count : 0;
  const winRate = profile?.gamesPlayed && profile.gamesPlayed > 0 ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100) : 0;
  
  // Stats BDD
  const totalGuesses = (profile as any).totalGuesses || 0;
  const correctGuesses = (profile as any).correctGuesses || 0;
  const guessAccuracy = totalGuesses > 0 ? Math.round((correctGuesses / totalGuesses) * 100) : 0;
  const maxStreak = (profile as any).maxStreak || 0;
  const pokedexProgress = totalSongsCount > 0 ? Math.round((discoveredSongs / totalSongsCount) * 100) : 0;

  // --- HANDLERS ---
  const handleLinkAnilist = async () => {
    if (!anilistName.trim() || !user) return;
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('Profile').update({ anilistUsername: anilistName }).eq('id', user.id);
      if (error) throw error;
      toast.success("Compte AniList lié avec succès !");
      setShowAniListModal(false);
      window.location.reload();
    } catch (err) { console.error(err); toast.error("Erreur lors de la liaison."); } finally { setIsSyncing(false); }
  };

  const handleUnlinkAnilist = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('Profile').update({ anilistUsername: null }).eq('id', user.id);
      if (error) throw error;
      toast.success("Compte AniList délié.");
      setAnilistName("");
      setShowAniListModal(false);
      window.location.reload();
    } catch (err) { console.error(err); toast.error("Erreur lors de la suppression."); } finally { setIsSyncing(false); }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        if (file.size > 5 * 1024 * 1024) { toast.error("L'image est trop volumineuse (Max 5 Mo)"); return; }
        const reader = new FileReader();
        reader.addEventListener('load', () => { setSelectedFile(reader.result as string); setShowCropModal(true); });
        reader.readAsDataURL(file);
      }
  };

  const handleCropComplete = (_croppedArea: any, croppedAreaPixels: any) => { setCroppedAreaPixels(croppedAreaPixels); };

  const uploadAvatar = async () => {
      if (!selectedFile || !croppedAreaPixels || !user) return;
      setIsSaving(true);
      try {
          const croppedImageBlob = await getCroppedImg(selectedFile, croppedAreaPixels);
          if (!croppedImageBlob) throw new Error("Erreur crop");
          const fileName = `${user.id}/${Date.now()}.jpg`;
          const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, croppedImageBlob, { upsert: true });
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
          socket.emit('update_profile_data', { avatarUrl: publicUrl });
          setShowCropModal(false);
      } catch (err: any) { toast.error(err.message || "Erreur upload"); setIsSaving(false); }
  };

  const saveUsername = () => { socket.emit('update_profile_data', { username: newUsername }); setIsSaving(true); };
  const getAvatarSrc = (avatar: string) => avatar.startsWith('http') ? avatar : `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatar}`;

  if (loading || !profile) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <>
      <Helmet><title>Profil de {profile.username} - AniQuizz</title></Helmet>
      <div className="min-h-screen bg-background pb-20">
        <Header />

        <main className="pt-24 container max-w-[1400px] mx-auto px-4 space-y-8">
          
          {/* --- EN-TÊTE PROFIL --- */}
          <div className="relative rounded-2xl overflow-hidden bg-card border border-white/10 p-8 shadow-2xl">
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
              <div className="relative group shrink-0 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="absolute -inset-1 bg-gradient-to-br from-primary to-purple-600 rounded-full blur opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                <Avatar className="h-32 w-32 border-4 border-background relative shadow-xl">
                  <AvatarImage src={getAvatarSrc(profile.avatar)} className="object-cover" />
                  <AvatarFallback className="text-4xl font-bold">{profile.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="h-8 w-8 text-white" /></div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onFileChange} />
              </div>

              <div className="flex-1 space-y-2 py-2 w-full">
                <div className="flex flex-col md:flex-row items-center md:items-end gap-3 min-h-[48px]">
                    {isEditingUsername ? (
                        <div className="flex items-center gap-2 animate-fade-in w-full md:w-auto">
                            <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="text-2xl font-bold h-10 w-full md:w-64" maxLength={15} autoFocus />
                            <Button size="icon" onClick={saveUsername} disabled={isSaving} className="h-10 w-10 shrink-0 bg-green-500 hover:bg-green-600">
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => { setIsEditingUsername(false); setNewUsername(profile.username); }} className="h-10 w-10 shrink-0"><X className="h-5 w-5" /></Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 group">
                            <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">{profile.username}</h1>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary rounded-full" onClick={() => setIsEditingUsername(true)}><Edit2 className="h-5 w-5" /></Button>
                        </div>
                    )}
                    {profile.role === 'ADMIN' && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/50 mb-2 md:mb-1">ADMIN</span>}
                </div>
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

              <div className="flex flex-col gap-3 min-w-[160px]">
                <Button variant="outline" className="gap-2 border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-400 transition-colors" onClick={() => setShowAniListModal(true)}>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/6/61/AniList_logo.svg" alt="AL" className="w-4 h-4" />
                  {profile.anilistUsername ? "Modifier AniList" : "Lier AniList"}
                </Button>
                <Button variant="destructive" className="gap-2 shadow-lg shadow-destructive/20" onClick={signOut}>
                  <LogOut className="h-4 w-4" /> Déconnexion
                </Button>
              </div>
            </div>
          </div>

          {/* --- LAYOUT GRID --- */}
          <div className="grid grid-cols-12 gap-8">
              
              {/* SECTION GAUCHE : STATS (9 cols) */}
              <div className="col-span-12 lg:col-span-9 space-y-8">
                  
                  <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-purple-500" />
                      <h2 className="text-xl font-bold">Statistiques</h2>
                  </div>

                  {/* GRID 4 COLONNES (Ligne unique) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard icon={Trophy} label="Taux de victoire" value={`${winRate}%`} color="text-yellow-500" />
                      <StatCard icon={Check} label="Taux de bon guess" value={`${guessAccuracy}%`} color="text-green-500" />
                      <StatCard icon={Target} label="Parties jouées" value={profile.gamesPlayed} color="text-blue-400" />
                      <StatCard icon={Flame} label="Best Streak" value={maxStreak} color="text-orange-500" />
                  </div>

                  {/* POKÉDEX MUSICAL */}
                  <div className="pt-4">
                      <div className="flex items-center gap-2 mb-4">
                          <Disc className="h-5 w-5 text-pink-500" />
                          <h2 className="text-xl font-bold">Pokédex Musical</h2>
                      </div>
                      
                      <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-lg relative overflow-hidden">
                          <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-4 z-10 relative">
                              <div>
                                  <div className="text-4xl font-black gradient-text">{discoveredSongs}</div>
                                  <div className="text-sm text-muted-foreground font-medium">Sons uniques découverts</div>
                              </div>
                              <div className="text-right">
                                  <span className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-xs font-bold border border-purple-500/20">
                                      {pokedexProgress > 80 ? "Maître Otaku" : pokedexProgress > 50 ? "Passionné" : pokedexProgress > 20 ? "Amateur" : "Novice"}
                                  </span>
                              </div>
                          </div>

                          <div className="space-y-2 z-10 relative">
                              <div className="h-4 bg-secondary rounded-full overflow-hidden border border-white/5 relative">
                                  <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')]"></div>
                                  <div className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-1500 ease-out" style={{ width: `${pokedexProgress}%` }} />
                              </div>
                              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                                  <span>0</span>
                                  <span>Total Disponible: {totalSongsCount}</span>
                              </div>
                          </div>
                          <div className="absolute top-[-20%] right-[-5%] p-8 opacity-5 pointer-events-none">
                              <Music2 className="h-64 w-64" />
                          </div>
                      </div>
                  </div>
              </div>

              {/* SECTION DROITE : AMIS (3 cols) */}
              <div className="col-span-12 lg:col-span-3">
                  <div className="flex items-center gap-2 mb-4 opacity-50">
                      <Users className="h-5 w-5" />
                      <h2 className="text-xl font-bold">Amis (0)</h2>
                  </div>
                  <div className="h-[400px] border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center text-muted-foreground/50 text-sm">
                      Liste d'amis bientôt disponible
                  </div>
              </div>

          </div>
        </main>
      </div>

      <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader><DialogTitle>Ajuster</DialogTitle></DialogHeader>
          <div className="relative w-full h-64 bg-black rounded-lg mt-4">{selectedFile && (<Cropper image={selectedFile} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={handleCropComplete} />)}</div>
          <div className="py-4"><Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={(v) => setZoom(v[0])} /></div>
          <DialogFooter><Button variant="ghost" onClick={() => setShowCropModal(false)}>Annuler</Button><Button onClick={uploadAvatar} disabled={isSaving}>Valider</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAniListModal} onOpenChange={setShowAniListModal}>
        <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader><DialogTitle>AniList</DialogTitle></DialogHeader>
            <div className="py-4"><Input placeholder="Pseudo..." value={anilistName} onChange={(e) => setAnilistName(e.target.value)} /></div>
            <DialogFooter><Button onClick={handleLinkAnilist}>Sauvegarder</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}