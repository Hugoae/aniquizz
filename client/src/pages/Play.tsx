import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { FloatingSettingsButton } from '@/components/settings/FloatingSettingsButton';
import { Button } from '@/components/ui/button';
// J'ai ajouté 'Ghost' et 'Smile' aux imports pour Dark et Comedy
import { User, Users, Swords, ArrowLeft, Plus, Lock, RotateCcw, Check, Music2, Trophy, Flame, Film, Globe2, Flower2, Clock, HelpCircle, Eye, Target, Hourglass, Heart, Sparkles, Tv, Calendar, Zap, Rocket, Coffee, Ghost, Smile } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RoomList } from '@/components/multiplayer/RoomList';
import { MultiplayerLobby, LobbyPlayer } from '@/components/multiplayer/MultiplayerLobby';
import { cn } from '@/lib/utils';
import { socket } from '@/services/socket';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

type GameMode = 'solo' | 'multiplayer' | 'competitive';
type View = 'modes' | 'roomList' | 'createModal' | 'lobby';
type SoundSelection = 'random' | 'mix' | 'watched';

interface GameConfig {
  mode: GameMode;
  gameType: 'standard' | 'battle-royale' | 'lives';
  responseType: 'typing' | 'qcm' | 'mix';
  soundCount: number;
  soundTypes: string[];
  difficulty: string[];
  guessDuration: number;
  soundSelection: SoundSelection;
  playlist: string | null;
  livesCount?: number;
  precision: 'exact' | 'franchise';
  decade?: string;
}

interface RoomConfig extends GameConfig {
  roomName: string;
  isPrivate: boolean;
  password: string;
  maxPlayers: number;
}

const defaultConfig: GameConfig = {
  mode: 'solo',
  gameType: 'standard',
  responseType: 'mix',
  soundCount: 10,
  soundTypes: ['opening'],
  difficulty: ['medium'],
  guessDuration: 15,
  soundSelection: 'random',
  playlist: null,
  livesCount: 3,
  precision: 'franchise',
  decade: '2010'
};

const defaultRoomConfig: RoomConfig = {
  ...defaultConfig,
  mode: 'multiplayer',
  roomName: '',
  isPrivate: false,
  password: '',
  maxPlayers: 8,
};

// --- NOUVELLES PLAYLISTS (SYNCHRONISÉES AVEC LE BACKEND) ---
const playlists = [
  // 1. LES SPÉCIALES (En premier)
  { 
    id: 'top-50', 
    name: 'Top 50 Popular', 
    icon: <Trophy className="w-4 h-4"/>, 
    count: 'Les incontournables',
    color: '#EAB308' // Yellow
  },
  { 
    id: 'decades', 
    name: 'Décennies', 
    icon: <Calendar className="w-4 h-4"/>, 
    count: '80s, 90s, 2000s...',
    color: '#A855F7' // Purple
  },
  
  // 2. LES GENRES (Ordre et IDs identiques à tagConfig.ts)
  { 
    id: 'action', 
    name: 'Action & Aventure', 
    icon: <Swords className="w-4 h-4"/>, 
    count: 'Combats & Épopées',
    color: '#FF4500' // Orange Red
  },
  { 
    id: 'fantasy', 
    name: 'Fantasy & Magic', 
    icon: <Sparkles className="w-4 h-4"/>, 
    count: 'Magie & Mondes',
    color: '#9C27B0' // Purple
  },
  { 
    id: 'romance', 
    name: 'Romance & Drama', 
    icon: <Heart className="w-4 h-4"/>, 
    count: 'Amour & Émotion',
    color: '#E91E63' // Pink
  },
  { 
    id: 'scifi', 
    name: 'Sci-Fi & Mecha', 
    icon: <Rocket className="w-4 h-4"/>, 
    count: 'Futur & Robots',
    color: '#00BCD4' // Cyan
  },
  { 
    id: 'dark', 
    name: 'Dark & Psy', 
    icon: <Ghost className="w-4 h-4"/>, 
    count: 'Horreur & Thriller',
    color: '#607D8B' // Blue Grey (plus visible que le noir)
  },
  { 
    id: 'chill', 
    name: 'Chill / SoL', 
    icon: <Coffee className="w-4 h-4"/>, 
    count: 'Détente & Quotidien',
    color: '#8BC34A' // Light Green
  },
  { 
    id: 'comedy', 
    name: 'Comédie', 
    icon: <Tv className="w-4 h-4"/>, 
    count: 'Rire & Fun',
    color: '#FDD835' // Yellow
  },
];

const modeCards = [
  { id: 'solo' as GameMode, title: 'Solo', description: 'Entraînez-vous seul et améliorez vos scores', icon: User, gradient: 'from-blue-500 to-cyan-500', disabled: false },
  { id: 'multiplayer' as GameMode, title: 'Multijoueur', description: 'Affrontez vos amis ou des joueurs du monde entier', icon: Users, gradient: 'from-purple-500 to-pink-500', disabled: false },
  { id: 'competitive' as GameMode, title: 'Compétitif', description: 'Duels 1v1 classés, montez dans les rangs', icon: Swords, gradient: 'from-orange-500 to-red-500', disabled: true },
];

const mapServerPlayersToLobby = (serverPlayers: any[], currentHostId?: string): LobbyPlayer[] => {
  if (!Array.isArray(serverPlayers)) return [];
  return serverPlayers.map((p: any) => ({
    id: p.id || p.socketId,
    name: p.username || p.name || `Joueur ${String(p.id).substring(0,4)}`,
    avatar: p.avatar || 'player1',
    level: 1, 
    rank: p.rank || 'Bronze',
    rankTier: p.rankTier || 4,
    totalWins: p.stats?.wins || 0,
    isReady: p.isReady || false,
    isHost: (currentHostId && String(p.id) === String(currentHostId)) ? true : (p.isHost || false),
    isInGame: p.isInGame || false
  }));
};

export default function Play() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as any;
  const { user, profile } = useAuth();
  const hasJoinedRef = useRef(false);

  const [view, setView] = useState<View>(() => { 
      if (locationState?.returnToLobby && locationState?.roomId) return 'lobby'; 
      return 'modes'; 
  });

  const [showConfig, setShowConfig] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingRoomId, setPendingRoomId] = useState('');

  const [config, setConfig] = useState<GameConfig>(defaultConfig);
  const [roomConfig, setRoomConfig] = useState<RoomConfig>(defaultRoomConfig);
  
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string>(locationState?.roomId || '');
  const [isAmIHost, setIsAmIHost] = useState(false);
  const [mySocketId, setMySocketId] = useState<string>(socket.id || '');
  const [joinCode, setJoinCode] = useState('');
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  const getPlayerIdentity = () => { return { userId: user?.id, username: profile?.username || "Invité", avatar: profile?.avatar || "player1" }; };

  useEffect(() => { if (view === 'roomList' && socket.connected) { socket.emit('get_rooms'); } }, [view]);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    if (socket.connected) setMySocketId(socket.id || '');
    
    const onConnect = () => { 
        setMySocketId(socket.id || ''); 
        if (view === 'roomList') socket.emit('get_rooms'); 
    };

    const onRoomsUpdate = (rooms: any[]) => setAvailableRooms(rooms);
    
    const onRoomCreated = (data: { roomId: string, room: any }) => {
      setCurrentRoomId(data.roomId); 
      setIsAmIHost(true); 
      setLobbyPlayers(mapServerPlayersToLobby(data.room.players, socket.id));
      
      if (data.room.settings && data.room.settings.maxPlayers === 1 && data.room.name.startsWith("Solo")) { 
          setShowConfig(false); 
          socket.emit('start_game', { roomId: data.roomId }); 
      } else { 
          setShowCreateModal(false); 
          setView('lobby'); 
          toast.success("Salon créé avec succès !"); 
      }
    };

    const onRoomJoined = (data: { roomId: string, players: any[], hostId?: string, roomSettings?: any }) => {
      setCurrentRoomId(data.roomId); 
      const myId = socket.id;
      if (data.hostId && myId) setIsAmIHost(String(data.hostId) === String(myId));
      
      setLobbyPlayers(mapServerPlayersToLobby(data.players, data.hostId)); 
      if(data.roomSettings) setRoomConfig(prev => ({...prev, ...data.roomSettings}));
      
      setShowPasswordModal(false); 
      setPasswordInput(''); 
      setJoinCode(''); 
      setView('lobby');
    };

    const onRoomUpdated = (data: { roomSettings: any, players: any[], roomName: string }) => {
        setRoomConfig(prev => ({...prev, ...data.roomSettings, roomName: data.roomName})); 
        setLobbyPlayers(mapServerPlayersToLobby(data.players));
        toast.info("Les paramètres du salon ont été mis à jour."); 
        setShowCreateModal(false);
    };

    const onRoomClosed = () => { toast.info("Le salon a été fermé."); setCurrentRoomId(''); setLobbyPlayers([]); setView('roomList'); };
    const onPasswordRequired = (data: { roomId: string }) => { setPendingRoomId(data.roomId); setShowPasswordModal(true); };
    
    const onUpdatePlayers = (data: { players: any[], hostId?: string }) => { 
        if (data.hostId && socket.id) setIsAmIHost(String(data.hostId) === String(socket.id)); 
        setLobbyPlayers(mapServerPlayersToLobby(data.players, data.hostId)); 
    };
    
    const onPlayerJoined = (data: { players: any[] }) => setLobbyPlayers(mapServerPlayersToLobby(data.players));
    
    const onPlayerLeft = (data: { players: any[], hostId?: string }) => { 
        if (data.hostId && socket.id) { 
            const amINewHost = String(data.hostId) === String(socket.id); 
            setIsAmIHost(amINewHost); 
            if (amINewHost) toast.success("Vous êtes maintenant l'hôte du salon ! 👑"); 
        } 
        setLobbyPlayers(mapServerPlayersToLobby(data.players, data.hostId)); 
    };
    
    const onGameStarted = (data: any) => {
      const isSolo = data.settings?.maxPlayers === 1;
      const gameDataConstructed = { firstVideo: data.firstVideo, firstChoices: data.firstChoices, firstDuoChoices: data.firstDuoChoices };
      const safePlayers = mapServerPlayersToLobby(data.players || lobbyPlayers);
      navigate('/game', { state: { roomId: data.roomId, gameData: gameDataConstructed, players: safePlayers, settings: data.settings, mode: isSolo ? 'solo' : 'multiplayer', gameStartTime: data.gameStartTime } });
    };

    const onError = (err: { message: string }) => { toast.error(err.message || "Une erreur est survenue"); if (err.message && err.message.toLowerCase().includes("mot de passe")) setPasswordInput(''); };

    socket.on('connect', onConnect); 
    socket.on('rooms_update', onRoomsUpdate); 
    socket.on('room_created', onRoomCreated); 
    socket.on('room_joined', onRoomJoined); 
    socket.on('room_updated', onRoomUpdated); 
    socket.on('room_closed', onRoomClosed); 
    socket.on('password_required', onPasswordRequired); 
    socket.on('update_players', onUpdatePlayers); 
    socket.on('player_joined', onPlayerJoined); 
    socket.on('player_left', onPlayerLeft); 
    socket.on('game_started', onGameStarted); 
    socket.on('error', onError);

    if (locationState?.returnToLobby && locationState?.roomId && !hasJoinedRef.current) {
        hasJoinedRef.current = true;
        socket.emit('join_room', { roomId: locationState.roomId, ...getPlayerIdentity() });
        window.history.replaceState({}, document.title);
    }

    return () => { 
        socket.off('connect', onConnect); 
        socket.off('rooms_update', onRoomsUpdate); 
        socket.off('room_created', onRoomCreated); 
        socket.off('room_joined', onRoomJoined); 
        socket.off('room_updated', onRoomUpdated); 
        socket.off('room_closed', onRoomClosed); 
        socket.off('password_required', onPasswordRequired); 
        socket.off('update_players', onUpdatePlayers); 
        socket.off('player_joined', onPlayerJoined); 
        socket.off('player_left', onPlayerLeft); 
        socket.off('game_started', onGameStarted); 
        socket.off('error', onError); 
    };
  }, []); 

  const handleModeSelect = (mode: GameMode) => { if (mode === 'competitive') return; setConfig(prev => ({ ...prev, mode })); if (mode === 'multiplayer') setView('roomList'); else setShowConfig(true); };
  const handleOpenCreateRoom = () => { setRoomConfig({ ...defaultRoomConfig }); setShowCreateModal(true); };
  const handleStartGame = () => { const soloRoomPayload = { roomName: "Solo-" + Date.now(), ...getPlayerIdentity(), settings: { ...config, isPrivate: true, maxPlayers: 1, password: "" } }; socket.emit('create_room', soloRoomPayload); };
  const handleCreateOrUpdateRoom = () => { if (view === 'lobby' && currentRoomId) { socket.emit('update_room_settings', { roomId: currentRoomId, settings: roomConfig }); } else { const payload = { roomName: roomConfig.roomName || "Salon de jeu", ...getPlayerIdentity(), settings: roomConfig }; socket.emit('create_room', payload); } };
  const handleStartLobbyGame = () => { if (currentRoomId && isAmIHost) socket.emit('start_game', { roomId: currentRoomId }); };
  const handleToggleReady = () => { if (currentRoomId) socket.emit('toggle_ready', { roomId: currentRoomId }); };
  const handleTransferHost = (targetId: string | number) => { if (currentRoomId && isAmIHost) socket.emit('transfer_host', { roomId: currentRoomId, targetId }); };
  const handleReset = () => setConfig(defaultConfig);
  const handleResetRoom = () => setRoomConfig(defaultRoomConfig);
  const toggleSoundType = (type: string, isRoom = false) => { const setTargetConfig = isRoom ? setRoomConfig : setConfig; setTargetConfig((prev: any) => ({ ...prev, soundTypes: prev.soundTypes.includes(type) ? prev.soundTypes.filter((t: string) => t !== type) : [...prev.soundTypes, type], })); };
  const handleJoinRoom = (roomId: string) => { const targetRoomId = roomId || joinCode; if (targetRoomId) socket.emit('join_room', { roomId: targetRoomId, ...getPlayerIdentity() }); };
  const handlePasswordSubmit = () => { if(!pendingRoomId || !passwordInput) return; socket.emit('join_room', { roomId: pendingRoomId, password: passwordInput, ...getPlayerIdentity() }); };
  const handleOpenRoomSettings = () => setShowCreateModal(true);
  const goBack = () => { if (view === 'lobby') { if (currentRoomId) { socket.emit('leave_room', { roomId: currentRoomId }); setCurrentRoomId(''); setLobbyPlayers([]); } setView('roomList'); } else { setView('modes'); } };

  if (view === 'lobby') {
    return (
      <>
        <MultiplayerLobby roomName={roomConfig.roomName || "Salon de jeu"} players={lobbyPlayers} maxPlayers={roomConfig.maxPlayers} isHost={isAmIHost} currentUserId={mySocketId} gameSettings={{ gameType: roomConfig.gameType, soundCount: roomConfig.soundCount, guessDuration: roomConfig.guessDuration, difficulty: roomConfig.difficulty[0] || 'medium', }} roomCode={currentRoomId} onStartGame={handleStartLobbyGame} onToggleReady={handleToggleReady} onLeave={goBack} onOpenSettings={handleOpenRoomSettings} onTransferHost={handleTransferHost} />
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="sm:max-w-3xl bg-card border-border">
            <DialogHeader className="pb-2">
                <DialogTitle className="text-xl flex items-center gap-3">Paramètres du salon <span className="px-2 py-0.5 text-xs rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white">{isAmIHost ? 'Modification' : 'Détails'}</span></DialogTitle>
                <DialogDescription>Configurez les règles de votre salon multijoueur.</DialogDescription>
            </DialogHeader>
            <GameConfigForm config={roomConfig} setConfig={setRoomConfig as any} toggleSoundType={(t) => toggleSoundType(t, true)} onReset={handleResetRoom} onSubmit={handleCreateOrUpdateRoom} isRoom playlists={playlists} currentPlayersCount={lobbyPlayers.length} />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Helmet><title>Jouer - AniQuizz</title></Helmet>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container pt-28 pb-12 px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            {view === 'modes' && (
              <div className="relative">
                <button onClick={() => navigate('/')} className="absolute top-0 left-0 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="h-5 w-5" /><span className="text-sm">Retour</span></button>
                <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 animate-fade-in">Choisissez votre <span className="gradient-text">mode de jeu</span></h1>
                <p className="text-center text-muted-foreground mb-8 md:mb-12 animate-fade-in">Sélectionnez un mode pour configurer votre partie</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">{modeCards.map((mode, index) => ( <button key={mode.id} onClick={() => handleModeSelect(mode.id)} disabled={mode.disabled} className={cn("glass-card p-8 text-left hover-lift hover-glow group cursor-pointer animate-fade-in transition-all relative overflow-hidden", mode.disabled && "opacity-60 cursor-not-allowed grayscale-[0.3]")} style={{ animationDelay: `${index * 0.1}s` }}> <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${mode.gradient} mb-4`}><mode.icon className="h-7 w-7 text-white" /></div> <h3 className="text-2xl font-semibold mb-2 group-hover:text-primary transition-colors">{mode.title}</h3> <p className="text-sm text-muted-foreground">{mode.description}</p> </button> ))}</div>
              </div>
            )}

            {view === 'roomList' && (
              <div className="animate-fade-in relative">
                <button onClick={() => setView('modes')} className="absolute top-0 left-0 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="h-5 w-5" /><span className="text-sm">Retour</span></button>
                <div className="flex flex-col gap-4 items-center w-full max-w-4xl mx-auto pt-12">
                    <div className="w-full flex items-center justify-between mb-6"><h1 className="text-3xl font-bold">Rejoindre un <span className="gradient-text">salon</span></h1><Button variant="glow" size="lg" className="gap-2" onClick={handleOpenCreateRoom}><Plus className="h-5 w-5" /> Créer un salon</Button></div>
                    <div className="flex gap-2 mb-8 w-full max-w-md"><Input placeholder="CODE..." className="text-center uppercase tracking-widest font-mono font-bold" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={6} /><Button onClick={() => handleJoinRoom(joinCode)} variant="secondary" disabled={!joinCode || joinCode.length < 4}>Rejoindre</Button></div>
                    <div className="w-full"><RoomList rooms={availableRooms} onJoin={handleJoinRoom} /></div>
                </div>
              </div>
            )}
          </div>
        </main>
        <Dialog open={showConfig} onOpenChange={setShowConfig}>
            <DialogContent className="sm:max-w-3xl bg-card border-border">
                <DialogHeader>
                    <DialogTitle>Configuration de la partie</DialogTitle>
                    <DialogDescription>Personnalisez vos paramètres de jeu.</DialogDescription>
                </DialogHeader>
                <GameConfigForm config={config} setConfig={setConfig} toggleSoundType={(t) => toggleSoundType(t)} onReset={handleReset} onSubmit={handleStartGame} playlists={playlists} />
            </DialogContent>
        </Dialog>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogContent className="sm:max-w-3xl bg-card border-border">
                <DialogHeader>
                    <DialogTitle>Créer un salon Multijoueur</DialogTitle>
                    <DialogDescription>Créez un salon pour jouer avec vos amis.</DialogDescription>
                </DialogHeader>
                <GameConfigForm config={roomConfig} setConfig={setRoomConfig as any} toggleSoundType={(t) => toggleSoundType(t, true)} onReset={handleResetRoom} onSubmit={handleCreateOrUpdateRoom} isRoom playlists={playlists} currentPlayersCount={lobbyPlayers.length} />
            </DialogContent>
        </Dialog>
        <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
            <DialogContent className="sm:max-w-md bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> Salon privé</DialogTitle>
                    <DialogDescription>Entrez le mot de passe pour rejoindre ce salon.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4"><p className="text-sm text-muted-foreground">Ce salon est protégé par un mot de passe.</p><div className="space-y-2"><Label>Mot de passe</Label><Input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowPasswordModal(false)}>Annuler</Button><Button variant="glow" onClick={handlePasswordSubmit} disabled={!passwordInput}>Valider</Button></DialogFooter>
            </DialogContent>
        </Dialog>
        <FloatingSettingsButton />
      </div>
    </>
  );
}

// --- FORMULAIRE OPTIMISÉ ---
interface GameConfigFormProps {
  config: GameConfig | RoomConfig;
  setConfig: React.Dispatch<React.SetStateAction<any>>;
  toggleSoundType: (type: string) => void;
  onReset: () => void;
  onSubmit: () => void;
  isRoom?: boolean;
  playlists: typeof playlists;
  currentPlayersCount?: number;
}

function GameConfigForm({ config, setConfig, toggleSoundType, onReset, onSubmit, isRoom, playlists, currentPlayersCount = 0 }: GameConfigFormProps) {
  const roomConfig = config as RoomConfig;
  const isSolo = config.mode === 'solo' && !isRoom;

  const availableGameTypes = [
    { id: 'standard', label: 'Standard', disabled: false },
    ...(!isSolo ? [
        { id: 'battle-royale', label: 'Battle Royale', disabled: true },
        { id: 'lives', label: 'Lives', disabled: true }
    ] : [])
  ];

  const toggleDifficulty = (diff: string) => { setConfig((prev: any) => { const current = prev.difficulty || []; if (current.includes(diff)) { if (current.length === 1) return prev; return { ...prev, difficulty: current.filter((d: string) => d !== diff) }; } else { return { ...prev, difficulty: [...current, diff] }; } }); };

  const decades = ["1980", "1990", "2000", "2010", "2020"];

  return (
    <div className="space-y-6 py-2">
      {isRoom && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
          <div className="space-y-2"><div className="flex justify-between items-center"><Label>Nom du salon</Label><div className="flex items-center gap-2"><Switch checked={roomConfig.isPrivate} onCheckedChange={(c) => setConfig((prev: any) => ({ ...prev, isPrivate: c }))} /><Label className="text-xs text-muted-foreground">Salon privé</Label></div></div><Input placeholder="Ma partie anime..." value={roomConfig.roomName} onChange={(e) => setConfig((prev: any) => ({ ...prev, roomName: e.target.value }))} /></div>
          {roomConfig.isPrivate && ( <div className="space-y-2 animate-fade-in"><Label>Mot de passe</Label><Input type="password" placeholder="Secret123" value={roomConfig.password} onChange={(e) => setConfig((prev: any) => ({ ...prev, password: e.target.value }))} /></div> )}
          <div className="space-y-2"><div className="flex justify-between"><Label>Joueurs max</Label><span className="text-xs font-bold text-primary">{roomConfig.maxPlayers}</span></div><Slider value={[roomConfig.maxPlayers]} onValueChange={([v]) => setConfig((prev: any) => ({ ...prev, maxPlayers: v }))} max={16} min={Math.max(2, currentPlayersCount)} step={1} /></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* --- COLONNE GAUCHE --- */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2"><Label>Type de partie</Label><Tooltip delayDuration={300}><TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground/50 hover:text-primary transition-colors cursor-help" /></TooltipTrigger><TooltipContent><p className="w-48 text-xs">Standard: Classique à points<br/>Battle Royale: Le dernier survivant<br/>Lives: 3 vies, game over si 0</p></TooltipContent></Tooltip></div>
            <div className="grid grid-cols-3 gap-2">
              {availableGameTypes.map((type) => ( 
                <button 
                  key={type.id} 
                  onClick={() => !type.disabled && setConfig((prev: any) => ({ ...prev, gameType: type.id }))} 
                  className={cn(
                    "relative flex-1 py-2.5 text-xs font-bold uppercase rounded-xl transition-all flex items-center justify-center gap-2 border overflow-hidden whitespace-nowrap", 
                    config.gameType === type.id ? "bg-primary text-primary-foreground shadow-md border-primary" : "bg-card border-border hover:border-primary/50 text-muted-foreground", 
                    type.disabled && "opacity-60 cursor-not-allowed bg-secondary/50"
                  )} 
                  disabled={type.disabled}
                >
                  <span className="flex items-center gap-2">
                    {type.label}
                    {type.disabled && <Hourglass className="w-3 h-3 text-muted-foreground" />}
                  </span>
                </button> 
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2"><Label>Type de réponse</Label><Tooltip delayDuration={300}><TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground/50 hover:text-primary transition-colors cursor-help" /></TooltipTrigger><TooltipContent><p className="w-48 text-xs">Typing: Écrire le nom exact<br/>QCM: 4 choix<br/>Mix: Commencer par Typing, puis QCM si difficile</p></TooltipContent></Tooltip></div>
            <div className="flex gap-2">{['typing', 'qcm', 'mix'].map((type) => ( <button key={type} onClick={() => setConfig((prev: any) => ({ ...prev, responseType: type }))} className={cn("flex-1 py-2.5 text-xs font-bold uppercase rounded-xl transition-all border", config.responseType === type ? "bg-primary text-primary-foreground shadow-md border-primary" : "bg-card border-border hover:border-primary/50 text-muted-foreground")}>{type}</button> ))}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><div className="flex justify-between"><Label>Nombre de sons</Label><span className="text-xs font-bold text-primary">{config.soundCount}</span></div><Slider value={[config.soundCount]} onValueChange={([v]) => setConfig((prev: any) => ({ ...prev, soundCount: v }))} max={50} min={5} step={5} /></div>
            <div className="space-y-2"><div className="flex justify-between"><Label>Temps de guess</Label><span className="text-xs font-bold text-primary">{config.guessDuration}s</span></div><Slider value={[config.guessDuration]} onValueChange={([v]) => setConfig((prev: any) => ({ ...prev, guessDuration: v }))} max={60} min={5} step={5} /></div>
          </div>

           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2"><Label>Types de sons</Label><div className="flex gap-2 flex-wrap">{['opening', 'ending'].map(type => ( <button key={type} onClick={() => type === 'opening' && toggleSoundType(type)} disabled={type === 'ending'} className={cn("flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all text-xs font-bold uppercase", config.soundTypes.includes(type) ? "bg-primary/20 border-primary text-primary" : "bg-card border-border text-muted-foreground hover:bg-secondary", type === 'ending' && "opacity-50 cursor-not-allowed bg-secondary/30 border-transparent")}>{config.soundTypes.includes(type) && <Check className="w-3 h-3" />}{type === 'opening' ? 'OP' : 'ED'}</button> ))}</div></div>
             {config.playlist !== 'top-50' && ( <div className="space-y-2"><Label>Difficulté</Label><div className="flex gap-1">{['easy', 'medium', 'hard'].map(diff => ( <button key={diff} onClick={() => toggleDifficulty(diff)} className={cn("flex-1 py-1.5 rounded-full text-[10px] font-bold uppercase border transition-all", config.difficulty.includes(diff) ? (diff === 'easy' ? "bg-green-500/20 border-green-500 text-green-500" : diff === 'medium' ? "bg-blue-500/20 border-blue-500 text-blue-500" : "bg-red-500/20 border-red-500 text-red-500") : "bg-card border-border text-muted-foreground hover:bg-secondary")}>{diff === 'easy' ? 'Facile' : diff === 'medium' ? 'Moyen' : 'Difficile'}</button> ))}</div></div> )}
          </div>

          {config.playlist === 'decades' && (
                <div className="animate-fade-in pt-2">
                    <Label className="mb-2 block text-primary">Choisir la décennie</Label>
                    <div className="grid grid-cols-5 gap-1">
                        {decades.map(year => (
                            <button
                                key={year}
                                onClick={() => setConfig((prev: any) => ({ ...prev, decade: year }))}
                                className={cn(
                                    "py-2 rounded-lg text-xs font-bold transition-all border",
                                    config.decade === year 
                                        ? "bg-purple-500 text-white border-purple-500 shadow-md" 
                                        : "bg-card border-border hover:bg-secondary hover:border-primary/30"
                                )}
                            >
                                {year}s
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* --- COLONNE DROITE --- */}
        <div className="space-y-6">
            <div className="space-y-3">
                <div className="flex items-center gap-2"><Label>Précision des réponses</Label><Tooltip delayDuration={300}><TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground/50 hover:text-primary transition-colors cursor-help" /></TooltipTrigger><TooltipContent><p className="w-48 text-xs">Franchise: Si l'anime est "Naruto Shippuden", "Naruto" est accepté.<br/>Exacte: Il faut trouver la saison précise (Ex: "MHA S2").</p></TooltipContent></Tooltip></div>
                <div className="flex gap-2">
                    <button onClick={() => setConfig((prev: any) => ({ ...prev, precision: 'exact' }))} className={cn("flex-1 py-2.5 text-xs font-bold uppercase rounded-xl transition-all border flex items-center justify-center gap-2", config.precision === 'exact' ? "bg-blue-500/20 text-blue-500 border-blue-500 shadow-sm" : "bg-card border-border hover:border-primary/50 text-muted-foreground")}><Target className="h-4 w-4" /> Anime Exact</button>
                    <button onClick={() => setConfig((prev: any) => ({ ...prev, precision: 'franchise' }))} className={cn("flex-1 py-2.5 text-xs font-bold uppercase rounded-xl transition-all border flex items-center justify-center gap-2", config.precision === 'franchise' ? "bg-purple-500/20 text-purple-500 border-purple-500 shadow-sm" : "bg-card border-border hover:border-primary/50 text-muted-foreground")}><Globe2 className="h-4 w-4" /> Franchise</button>
                </div>
            </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2"><Label>Sélection de sons</Label><Tooltip delayDuration={300}><TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground/50 hover:text-primary transition-colors cursor-help" /></TooltipTrigger><TooltipContent><p className="w-48 text-xs">Aléatoire: Tout le catalogue<br/>Watched: Uniquement vos animes vus (connexion requise)</p></TooltipContent></Tooltip></div>
            <div className="flex gap-2">
                <Button variant={config.soundSelection === 'random' ? 'default' : 'outline'} size="sm" className="flex-1 rounded-xl" onClick={() => setConfig((prev: any) => ({ ...prev, soundSelection: 'random', playlist: null }))}><Music2 className="w-4 h-4 mr-2" /> Aléatoire</Button>
                <Button variant={config.soundSelection === 'watched' ? 'default' : 'outline'} size="sm" className="flex-1 rounded-xl" disabled><Eye className="w-4 h-4 mr-2" /> Watched</Button>
            </div>
            <Label className="text-xs text-muted-foreground mt-4 block">Ou choisir une playlist</Label>
            <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
              {playlists.map(playlist => {
                  const isSelected = config.playlist === playlist.id;
                  return (
                    <button 
                        key={playlist.id} 
                        onClick={() => setConfig((prev: any) => ({ ...prev, playlist: isSelected ? null : playlist.id, soundSelection: isSelected ? 'random' : 'mix' }))} 
                        className={cn("p-3 rounded-xl border text-left transition-all hover:border-primary/50", isSelected ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-secondary/50")}
                        // Ajout du style dynamique pour la couleur
                        style={{
                            borderColor: isSelected ? playlist.color : undefined,
                            backgroundColor: isSelected ? `${playlist.color}15` : undefined // Opacité 15%
                        }}
                    > 
                        <div className="flex items-center gap-2"> 
                            {/* L'icône prend aussi la couleur */}
                            <span className="text-lg" style={{ color: isSelected ? playlist.color : undefined }}>{playlist.icon}</span> 
                            <div className="flex-1 min-w-0"> 
                                <div className="text-xs font-medium truncate">{playlist.name}</div> 
                                <div className="text-[10px] text-muted-foreground">{playlist.count}</div> 
                            </div> 
                        </div> 
                    </button> 
                  );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-3 pt-4 border-t border-white/5"><Button variant="outline" onClick={onReset} className="gap-2 rounded-xl"><RotateCcw className="h-4 w-4" /> Reset</Button><Button variant="glow" onClick={onSubmit} className="flex-1 text-lg font-bold rounded-xl" disabled={isRoom ? (!roomConfig.roomName || config.soundTypes.length === 0 || (roomConfig.isPrivate && !roomConfig.password)) : config.soundTypes.length === 0}>{isRoom ? (currentPlayersCount > 0 ? 'Mettre à jour' : 'Créer le salon') : 'Lancer la partie'}</Button></div>
    </div>
  );
}