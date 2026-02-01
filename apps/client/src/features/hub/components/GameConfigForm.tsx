import { useEffect } from 'react';
import { 
  Skull, Lock, RotateCcw, Music2, 
  Eye, Link2, Ungroup, Target, Globe2, Swords, Gamepad2,
  Keyboard, MousePointer, Shuffle, Calendar, ListMusic, Trophy, Disc, AudioWaveform, HelpCircle, SlidersHorizontal
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

import { GameConfig, RoomConfig } from '@aniquizz/shared';

interface GameConfigFormProps {
  config: GameConfig | RoomConfig;
  setConfig: React.Dispatch<React.SetStateAction<any>>;
  toggleSoundType: (type: string) => void;
  onReset: () => void;
  onSubmit: () => void;
  isRoom?: boolean;
  playlists: any[]; 
  currentPlayersCount?: number;
  user: any; 
  profile: any;
}

// Composant Helper pour les titres avec Tooltip
const SectionHeader = ({ icon: Icon, title, tooltip }: { icon: any, title: string, tooltip: string }) => (
    <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
        <Tooltip>
            <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-primary transition-colors cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[250px] bg-popover border-white/10 text-xs">
                <p>{tooltip}</p>
            </TooltipContent>
        </Tooltip>
    </div>
);

export function GameConfigForm({ 
  config, 
  setConfig, 
  toggleSoundType, 
  onReset, 
  onSubmit, 
  isRoom = false,
  playlists,
  currentPlayersCount = 0,
  user,
  profile
}: GameConfigFormProps) {

  useEffect(() => {
      if (config.gameType === 'battle-royale') {
          setConfig((prev: any) => ({ ...prev, gameType: 'standard' }));
      }
  }, []);

  const toggleDifficulty = (diffId: string) => {
      setConfig((prev: any) => {
          const current = prev.difficulty || [];
          if (current.includes(diffId)) {
              if (current.length <= 1) return prev;
              return { ...prev, difficulty: current.filter((d: string) => d !== diffId) };
          } else {
              return { ...prev, difficulty: [...current, diffId] };
          }
      });
  };

  const handleSourceChange = (source: 'random' | 'playlist' | 'watched') => {
      setConfig((prev: any) => ({ 
          ...prev, 
          soundSelection: source,
          playlist: source === 'playlist' ? prev.playlist : null, 
          decade: source === 'playlist' ? prev.decade : null
      }));
  };

  const soundTypes = [
    { id: 'opening', label: 'Openings', icon: <Music2 className="w-4 h-4" />, disabled: false },
    { id: 'ending', label: 'Endings', icon: <Disc className="w-4 h-4" />, disabled: true },
    { id: 'ost', label: 'OST', icon: <AudioWaveform className="w-4 h-4" />, disabled: true }
  ];

  const difficultyOptions = [
    { id: 'easy', label: 'Facile', color: 'bg-green-500' },
    { id: 'medium', label: 'Moyen', color: 'bg-blue-500' },
    { id: 'hard', label: 'Difficile', color: 'bg-red-500' },
  ];

  const decades = ['1970', '1980', '1990', '2000', '2010', '2020'];

  // ✅ CORRECTION TYPES : Casting sûr pour éviter les erreurs TS
  const roomConfig = config as RoomConfig;
  
  // Utilisation de cast 'any' ou 'string' pour les comparaisons si le type partagé est strict
  const isTop50Selected = (config.soundSelection as string) === 'playlist' && config.playlist === 'top-50';
  const isDecadeSelected = (config.soundSelection as string) === 'playlist' && config.playlist === 'decades';

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      
      {/* 1. ZONE SCROLLABLE (Contenu Principal) */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 p-1">
        
        {/* Paramètres Salon (Multi uniquement) */}
        {isRoom && (
            <div className="space-y-4 bg-secondary/10 p-4 rounded-2xl border border-white/5">
                <SectionHeader icon={Globe2} title="Paramètres du Salon" tooltip="Configurez l'accès à votre salon privé ou public." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Nom du salon</Label>
                        <Input 
                            value={roomConfig.roomName} 
                            onChange={(e) => setConfig((prev: any) => ({ ...prev, roomName: e.target.value }))}
                            placeholder="Ex: Les bg du 93" maxLength={20} className="bg-secondary/20 border-white/10"
                        />
                    </div>
                    {/* ✅ ACCÈS SÉCURISÉ à maxPlayers via roomConfig */}
                    <div className="space-y-2">
                        <Label>Joueurs Max ({roomConfig.maxPlayers})</Label>
                        <Slider value={[roomConfig.maxPlayers]} min={2} max={32} step={1} onValueChange={(v) => setConfig((prev: any) => ({ ...prev, maxPlayers: v[0] }))} className="py-2" />
                    </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2"><Switch checked={roomConfig.isPrivate} onCheckedChange={(c) => setConfig((prev: any) => ({ ...prev, isPrivate: c }))} /><Label>Salon Privé</Label></div>
                    {roomConfig.isPrivate && ( <Input type="password" value={roomConfig.password || ''} onChange={(e) => setConfig((prev: any) => ({ ...prev, password: e.target.value }))} placeholder="Mot de passe..." className="w-40 bg-secondary/20 border-white/10 h-8" /> )}
                </div>
            </div>
        )}

        {/* Sélection Mode de Jeu */}
        <div className="space-y-3">
            <SectionHeader icon={Gamepad2} title="Mode de Jeu" tooltip="Standard: Cumulez des points. Battle Royale: Le dernier survivant gagne (Bientôt)." />
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setConfig((prev: any) => ({ ...prev, gameType: 'standard' }))} className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all relative overflow-hidden", config.gameType === 'standard' ? "border-primary bg-primary/10 text-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]" : "border-border bg-card/50 text-muted-foreground hover:border-primary/50")}>
                    <Trophy className="w-6 h-6" /><span className="font-bold text-sm">Standard</span>
                </button>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button disabled className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-white/5 bg-secondary/10 text-muted-foreground/30 cursor-not-allowed grayscale relative">
                            <div className="absolute inset-0 bg-background/50 z-10" />
                            <Swords className="w-6 h-6" /><span className="font-bold text-sm">Battle Royale</span>
                            <div className="absolute top-2 right-2 text-[10px] font-bold bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/30 z-20 flex items-center gap-1"><Lock className="w-3 h-3" /> Bientôt</div>
                        </button>
                    </TooltipTrigger>
                    <TooltipContent><p>Ce mode est en cours de développement !</p></TooltipContent>
                </Tooltip>
            </div>
        </div>

        {/* GRID PRINCIPALE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            
            {/* GAUCHE : Règles & Filtres */}
            <div className="space-y-6">
                
                {/* Sliders */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div className="flex justify-between"><Label>Sons</Label><span className="font-mono text-primary font-bold">{config.soundCount}</span></div>
                        <Slider value={[config.soundCount]} min={5} max={50} step={5} onValueChange={(v) => setConfig((prev: any) => ({ ...prev, soundCount: v[0] }))} />
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between"><Label>Durée</Label><span className="font-mono text-primary font-bold">{config.guessDuration}s</span></div>
                        <Slider value={[config.guessDuration]} min={5} max={60} step={5} onValueChange={(v) => setConfig((prev: any) => ({ ...prev, guessDuration: v[0] }))} />
                    </div>
                </div>

                {/* Mode Réponse */}
                <div className="space-y-3">
                    <SectionHeader icon={Keyboard} title="Mode de réponse" tooltip="Comment les joueurs doivent-ils répondre ?" />
                    <div className="grid grid-cols-3 gap-2">
                        {['typing', 'qcm', 'mix'].map((mode) => (
                            <button key={mode} onClick={() => setConfig((prev: any) => ({ ...prev, responseType: mode }))} className={cn("p-2 rounded-lg border flex flex-col items-center gap-1 transition-all", config.responseType === mode ? "bg-primary/20 border-primary text-primary" : "bg-card border-white/10 hover:bg-white/5")}>
                                {mode === 'typing' ? <Keyboard className="w-4 h-4" /> : mode === 'qcm' ? <MousePointer className="w-4 h-4" /> : <Shuffle className="w-4 h-4" />}
                                <span className="text-[10px] font-bold uppercase">{mode}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {config.responseType !== 'qcm' && (
                    <div className="space-y-3">
                        <SectionHeader icon={Target} title="Précision" tooltip="Degré de précision requis pour valider la réponse." />
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setConfig((prev: any) => ({ ...prev, precision: 'franchise' }))} className={cn("p-2 rounded-lg border text-left transition-all", config.precision === 'franchise' ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" : "bg-card border-white/10 hover:bg-white/5")}>
                                <div className="font-bold text-xs flex items-center gap-2"><Ungroup className="w-3 h-3" /> Franchise</div>
                            </button>
                            <button onClick={() => setConfig((prev: any) => ({ ...prev, precision: 'exact' }))} className={cn("p-2 rounded-lg border text-left transition-all", config.precision === 'exact' ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" : "bg-card border-white/10 hover:bg-white/5")}>
                                <div className="font-bold text-xs flex items-center gap-2"><Target className="w-3 h-3" /> Exact</div>
                            </button>
                        </div>
                    </div>
                )}

                {/* ✅ GROS BLOC FILTRES SÉPARÉ */}
                <div className="bg-secondary/10 border border-white/5 p-4 rounded-xl space-y-5 shadow-inner">
                    <SectionHeader icon={SlidersHorizontal} title="Filtres & Contraintes" tooltip="Affinez votre sélection de musiques." />

                    {/* Types de sons */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase">Types</Label>
                        <div className="flex flex-wrap gap-2">
                            {soundTypes.map(type => (
                                <button key={type.id} disabled={type.disabled} onClick={() => !type.disabled && toggleSoundType(type.id)} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-2 cursor-pointer", type.disabled ? "opacity-50 cursor-not-allowed bg-secondary/20 border-transparent text-muted-foreground" : config.soundTypes.includes(type.id) ? "bg-primary text-white border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/50")}>
                                    {type.icon} {type.label} {type.disabled && <Lock className="w-3 h-3 ml-1 opacity-50" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Difficulté */}
                    <div className={cn("space-y-2 transition-opacity", isTop50Selected && "opacity-40 pointer-events-none")}>
                        <div className="flex justify-between items-center">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Difficulté</Label>
                            {isTop50Selected && <span className="text-[9px] text-yellow-500 font-bold bg-yellow-500/10 px-1 rounded">Auto (Top 50)</span>}
                        </div>
                        <div className="flex gap-2">
                            {difficultyOptions.map((diff) => (
                                <button key={diff.id} onClick={() => toggleDifficulty(diff.id)} className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border-2", config.difficulty.includes(diff.id) ? `${diff.color} text-white border-transparent shadow-md` : "bg-card border-white/10 text-muted-foreground hover:bg-white/5")}>
                                    {diff.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ✅ DÉCENNIES (Apparaît ici si Playlist = Decades) */}
                    {isDecadeSelected && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 pt-2 border-t border-white/5">
                            <Label className="text-xs font-bold text-purple-400 uppercase flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> Décennie
                            </Label>
                            <div className="grid grid-cols-3 gap-2">
                                {decades.map(decade => (
                                    <button
                                        key={decade}
                                        onClick={() => setConfig((prev: any) => ({ ...prev, decade }))}
                                        className={cn(
                                            "py-1.5 rounded text-[10px] font-bold border transition-all",
                                            config.decade === decade 
                                                ? "bg-purple-500 text-white border-purple-400 shadow-lg shadow-purple-500/20" 
                                                : "bg-card border-white/10 hover:border-white/30 text-muted-foreground"
                                        )}
                                    >
                                        {decade}s
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* DROITE : Sources */}
            <div className="space-y-4">
                <SectionHeader icon={Eye} title="Source des musiques" tooltip="D'où proviennent les animes ?" />
                
                <div className="flex bg-secondary/20 p-1 rounded-xl">
                    <button onClick={() => handleSourceChange('random')} className={cn("flex-1 py-1.5 rounded-lg text-xs font-bold transition-all", (config.soundSelection as string) === 'random' ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground")}>Aléatoire</button>
                    <button onClick={() => handleSourceChange('watched')} className={cn("flex-1 py-1.5 rounded-lg text-xs font-bold transition-all", (config.soundSelection as string) === 'watched' ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground")}>Watched</button>
                    <button onClick={() => handleSourceChange('playlist')} className={cn("flex-1 py-1.5 rounded-lg text-xs font-bold transition-all", (config.soundSelection as string) === 'playlist' ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground")}>Playlists</button>
                </div>

                <div className="min-h-[250px] bg-card/30 rounded-xl border border-white/5 p-2">
                    
                    {/* RANDOM */}
                    {(config.soundSelection as string) === 'random' && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 text-muted-foreground animate-in fade-in zoom-in duration-300">
                            <div className="bg-primary/10 p-4 rounded-full mb-3"><Skull className="w-8 h-8 text-primary" /></div>
                            <p className="font-bold text-foreground">Mode Aléatoire</p>
                            <p className="text-xs mt-1">Pioche parmi toute la base de données.</p>
                        </div>
                    )}

                    {/* WATCHED LIST */}
                    {(config.soundSelection as string) === 'watched' && (
                        <div className="space-y-4 p-2 animate-in fade-in zoom-in duration-300">
                            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl text-xs text-blue-200">
                                <p className="font-bold mb-1 flex items-center gap-2"><Link2 className="w-3 h-3" /> Compte AniList Requis</p>
                                Utilise vos listes <b>Completed</b> et <b>Watching</b>.
                            </div>
                            {isRoom && (
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase">Mode de fusion</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => setConfig((prev: any) => ({ ...prev, watchedMode: 'union' }))} className={cn("p-2 rounded-lg border text-left", config.watchedMode === 'union' ? "border-primary bg-primary/10" : "border-border bg-card opacity-50")}>
                                            <div className="font-bold text-xs">Union</div>
                                            <div className="text-[9px] text-muted-foreground">Tout le monde.</div>
                                        </button>
                                        <button onClick={() => setConfig((prev: any) => ({ ...prev, watchedMode: 'intersection' }))} className={cn("p-2 rounded-lg border text-left", config.watchedMode === 'intersection' ? "border-primary bg-primary/10" : "border-border bg-card opacity-50")}>
                                            <div className="font-bold text-xs">Commun</div>
                                            <div className="text-[9px] text-muted-foreground">Vus par TOUS.</div>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PLAYLISTS */}
                    {(config.soundSelection as string) === 'playlist' && (
                        <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="grid grid-cols-1 gap-2">
                                {playlists.map(playlist => {
                                    const isSelected = config.playlist === playlist.id;
                                    return ( 
                                        <button 
                                            key={playlist.id} 
                                            onClick={() => setConfig((prev: any) => ({ ...prev, playlist: playlist.id, decade: playlist.id === 'decades' ? '2010' : null }))}
                                            className={cn("flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all hover:border-primary/50", isSelected ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-secondary/50")}
                                            style={{ borderColor: isSelected ? playlist.color : undefined, backgroundColor: isSelected ? `${playlist.color}15` : undefined }}
                                        > 
                                            <div className="flex items-center gap-2"> 
                                                <span className="text-lg" style={{ color: playlist.color}}>{playlist.icon}</span> 
                                                <div className="flex-1 min-w-0"><div className="text-xs font-medium truncate">{playlist.name}</div><div className="text-[10px] text-muted-foreground">{playlist.count}</div></div> 
                                            </div> 
                                        </button> 
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
      
      {/* 2. FOOTER FIXE (Boutons) */}
      <div className="flex gap-3 pt-4 mt-2 border-t border-white/5 shrink-0 bg-background/50 backdrop-blur-sm">
          <Button variant="outline" onClick={onReset} className="gap-2 rounded-xl">
              <RotateCcw className="h-4 w-4" /> Reset
          </Button>
          <Button 
            variant="glow" 
            onClick={onSubmit} 
            className="flex-1 text-lg font-bold rounded-xl" 
            disabled={isRoom ? (!roomConfig.roomName || config.soundTypes.length === 0 || (roomConfig.isPrivate && !roomConfig.password)) : config.soundTypes.length === 0}
          >
              {isRoom ? (currentPlayersCount > 0 ? 'Mettre à jour' : 'Créer le salon') : 'Lancer la partie'}
          </Button>
      </div>
    </div>
  );
}