import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';

import { User, Users, Swords, ArrowLeft, Plus, Lock, Trophy, Calendar, Sparkles, Heart, Rocket, Ghost, Coffee, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { Header } from '@/components/layout/Header';
import { FloatingSettingsButton } from '@/features/settings/components/FloatingSettingsButton';
import { GameConfigForm } from '@/features/hub/components/GameConfigForm';
import { GameConfig, RoomConfig, GameMode } from '@aniquizz/shared';
import { RoomList } from '@/features/hub/components/RoomList';
import { MultiplayerLobby, LobbyPlayer } from '@/features/hub/components/MultiplayerLobby';
import { TriviaCard } from '@/features/hub/components/TriviaCard';

import { useAuth } from '@/features/auth/context/AuthContext';
import { socket } from '@/lib/socket';

type View = 'modes' | 'roomList' | 'createModal' | 'lobby';

const defaultConfig: GameConfig = {
  mode: 'solo', gameType: 'standard', responseType: 'mix', soundCount: 10, soundTypes: ['opening'], difficulty: ['medium'],
  guessDuration: 15, soundSelection: 'random', playlist: null, livesCount: 3, precision: 'franchise', decade: '2010', watchedMode: 'union'
};

const defaultRoomConfig: RoomConfig = { ...defaultConfig, mode: 'multiplayer', roomName: '', isPrivate: false, password: '', maxPlayers: 8 };

const playlists = [ { id: 'top-50', name: 'Top 50 Popular', icon: <Trophy className="w-4 h-4"/>, count: 'Les incontournables', color: '#EAB308' }, { id: 'decades', name: 'Décennies', icon: <Calendar className="w-4 h-4"/>, count: '80s, 90s, 2000s...', color: '#A855F7' }, { id: 'action', name: 'Action & Aventure', icon: <Swords className="w-4 h-4"/>, count: 'Combats & Épopées', color: '#FF4500' }, { id: 'fantasy', name: 'Fantasy & Magic', icon: <Sparkles className="w-4 h-4"/>, count: 'Magie & Mondes', color: '#9C27B0' }, { id: 'romance', name: 'Romance & Drama', icon: <Heart className="w-4 h-4"/>, count: 'Amour & Émotion', color: '#E91E63' }, { id: 'scifi', name: 'Sci-Fi & Mecha', icon: <Rocket className="w-4 h-4"/>, count: 'Futur & Robots', color: '#00BCD4' }, { id: 'dark', name: 'Dark & Psy', icon: <Ghost className="w-4 h-4"/>, count: 'Horreur & Thriller', color: '#607D8B' }, { id: 'chill', name: 'Chill / SoL', icon: <Coffee className="w-4 h-4"/>, count: 'Détente & Quotidien', color: '#8BC34A' }, { id: 'comedy', name: 'Comédie', icon: <Tv className="w-4 h-4"/>, count: 'Rire & Fun', color: '#FDD835' }, ];
const modeCards = [ { id: 'solo' as GameMode, title: 'Solo', description: 'Entraînez-vous seul et améliorez vos scores', icon: User, gradient: 'from-blue-500 to-cyan-500', disabled: false }, { id: 'multiplayer' as GameMode, title: 'Multijoueur', description: 'Affrontez vos amis ou des joueurs du monde entier', icon: Users, gradient: 'from-purple-500 to-pink-500', disabled: false }, { id: 'competitive' as GameMode, title: 'Compétitif', description: 'Mode classé avec rangs et saisons. (Bientôt disponible)', icon: Swords, gradient: 'from-slate-500 to-slate-700', disabled: true }, ];

const mapServerPlayersToLobby = (serverPlayers: any[], currentHostId?: string, gameStatus?: string): LobbyPlayer[] => {
  if (!Array.isArray(serverPlayers)) return [];
  return serverPlayers.map((p: any) => ({
    id: p.id || p.socketId,
    name: p.username || p.name || `Joueur ${String(p.id).substring(0,4)}`,
    avatar: p.avatar || 'player1',
    level: 1, totalWins: p.stats?.wins || 0,
    isReady: p.isReady || false,
    isHost: (currentHostId && String(p.id) === String(currentHostId)) ? true : (p.isHost || false),
    isInGame: p.isInGame 
  }));
};

export default function GameHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as any;
  const { user, profile } = useAuth();
  
  // Refs pour éviter les doublons
  const hasJoinedRef = useRef(false);
  const hasAutoCreatedRef = useRef(false);
  const hasShownToastRef = useRef(false);

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
  
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'paused' | 'finished'>('waiting');

  const getPlayerIdentity = () => { return { userId: user?.id, username: profile?.username || "Invité", avatar: profile?.avatar || "player1" }; };

  useEffect(() => { if (view === 'roomList' && socket.connected) { socket.emit('get_rooms'); } }, [view]);

  // REPLAY SOLO
  useEffect(() => {
    if (locationState?.createSolo && !hasAutoCreatedRef.current) {
        hasAutoCreatedRef.current = true;
        if (locationState.settings) setConfig(prev => ({ ...prev, ...locationState.settings }));
        
        const pseudo = profile?.username || "Joueur";
        const soloRoomName = `${pseudo}'s Solo`;

        const soloRoomPayload = { 
            roomName: soloRoomName, 
            ...getPlayerIdentity(), 
            settings: { 
                ...(locationState.settings || config), 
                isPrivate: true, 
                maxPlayers: 1, 
                password: "" 
            } 
        }; 
        socket.emit('lobby:create', soloRoomPayload);
        window.history.replaceState({}, document.title);
    }
  }, [locationState, config, user, profile]);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    if (socket.connected) setMySocketId(socket.id || '');
    
    const onConnect = () => { setMySocketId(socket.id || ''); if (view === 'roomList') socket.emit('get_rooms'); };
    const onRoomsUpdate = (rooms: any[]) => setAvailableRooms(rooms);
    
    const onRoomCreated = (data: { roomId: string, room: any }) => {
      // ✅ ANTI-DOUBLON NOTIFICATION
      if (!hasShownToastRef.current) {
          toast.success("Salon prêt !");
          hasShownToastRef.current = true;
          // Reset le ref après un court délai
          setTimeout(() => { hasShownToastRef.current = false; }, 2000);
      }

      setCurrentRoomId(data.roomId);
      setIsAmIHost(true);
      setLobbyPlayers(mapServerPlayersToLobby(data.room.players, socket.id, data.room.status));
      if (data.room.status) setGameStatus(data.room.status);
      
      if (data.room.settings) {
          setRoomConfig(prev => ({...prev, ...data.room.settings, roomName: data.room.settings.name || prev.roomName}));
      }

      setShowCreateModal(false); setShowConfig(false);
      setView('lobby'); 
    };

    const onRoomJoined = (data: { roomId: string, players: any[], hostId?: string, settings?: any, status?: any }) => {
      setCurrentRoomId(data.roomId); 
      const myId = socket.id;
      if (data.hostId && myId) setIsAmIHost(String(data.hostId) === String(myId));
      setLobbyPlayers(mapServerPlayersToLobby(data.players, data.hostId, data.status)); 
      
      if(data.settings) {
          setRoomConfig(prev => ({
              ...prev, 
              ...data.settings, 
              roomName: data.settings.name || prev.roomName,
              password: data.settings.password || prev.password 
          }));
      }

      if (data.status) setGameStatus(data.status);
      setShowPasswordModal(false); setPasswordInput(''); setJoinCode(''); 
      setView('lobby');
    };

    const onRoomUpdated = (data: { roomSettings: any, players: any[], roomName: string }) => {
        setRoomConfig(prev => ({
            ...prev, 
            ...data.roomSettings, 
            roomName: data.roomName
        })); 
        setLobbyPlayers(mapServerPlayersToLobby(data.players, undefined, gameStatus));
        toast.info("Paramètres mis à jour."); 
        setShowCreateModal(false);
    };

    const onRoomClosed = () => { toast.info("Salon fermé."); setCurrentRoomId(''); setLobbyPlayers([]); setGameStatus('waiting'); setView('roomList'); };
    const onPasswordRequired = (data: { roomId: string }) => { setPendingRoomId(data.roomId); setShowPasswordModal(true); };
    
    const onUpdatePlayers = (data: { players: any[], hostId?: string, status?: any }) => { 
        if (data.hostId && socket.id) setIsAmIHost(String(data.hostId) === String(socket.id)); 
        const currentStatus = data.status || gameStatus;
        if (data.status) setGameStatus(data.status);
        setLobbyPlayers(mapServerPlayersToLobby(data.players, data.hostId, currentStatus));
    };
    
    const onPlayerJoined = (data: { players: any[] }) => setLobbyPlayers(mapServerPlayersToLobby(data.players, undefined, gameStatus));
    
    const onPlayerLeft = (data: { players: any[], hostId?: string }) => { 
        if (data.hostId && socket.id) { 
            const amINewHost = String(data.hostId) === String(socket.id); 
            setIsAmIHost(amINewHost); 
            if (amINewHost) toast.success("Vous êtes l'hôte !"); 
        } 
        setLobbyPlayers(mapServerPlayersToLobby(data.players, data.hostId, gameStatus)); 
    };
    
    const onGameStarted = (data: any) => {
      const isSolo = data.settings?.maxPlayers === 1;
      const gameDataConstructed = { firstVideo: data.firstVideo, firstChoices: data.firstChoices, firstDuoChoices: data.firstDuoChoices };
      setGameStatus('playing'); 
      const safePlayers = mapServerPlayersToLobby(data.players || lobbyPlayers, undefined, 'playing');
      const localStartTime = Date.now() + (data.introDuration || 3000);

      navigate('/game', { 
          state: { 
              roomId: data.roomId, gameData: gameDataConstructed, players: safePlayers, 
              settings: data.settings, mode: isSolo ? 'solo' : 'multiplayer', gameStartTime: localStartTime 
          } 
      });
    };

    const onError = (err: { message: string }) => { toast.error(err.message || "Erreur"); if (err.message && err.message.toLowerCase().includes("mot de passe")) setPasswordInput(''); };

    socket.on('connect', onConnect); socket.on('rooms_update', onRoomsUpdate); 
    socket.on('lobby:joined', (data) => { if (data.isHost) { onRoomCreated({ roomId: data.roomId, room: { players: [], ...data } }); } else { onRoomJoined(data); } });
    socket.on('room_updated', onRoomUpdated); socket.on('room_closed', onRoomClosed); socket.on('password_required', onPasswordRequired); socket.on('update_players', onUpdatePlayers); socket.on('player_joined', onPlayerJoined); socket.on('player_left', onPlayerLeft); socket.on('game_started', onGameStarted); socket.on('error', onError);

    if (locationState?.returnToLobby && locationState?.roomId && !hasJoinedRef.current) {
        hasJoinedRef.current = true;
        socket.emit('lobby:join', { roomId: locationState.roomId, ...getPlayerIdentity() });
        window.history.replaceState({}, document.title);
    }

    return () => { socket.off('connect', onConnect); socket.off('rooms_update', onRoomsUpdate); socket.off('room_created', onRoomCreated); socket.off('room_joined', onRoomJoined); socket.off('room_updated', onRoomUpdated); socket.off('room_closed', onRoomClosed); socket.off('password_required', onPasswordRequired); socket.off('update_players', onUpdatePlayers); socket.off('player_joined', onPlayerJoined); socket.off('player_left', onPlayerLeft); socket.off('game_started', onGameStarted); socket.off('error', onError); };
  }, [gameStatus, view]);

  const handleModeSelect = (mode: GameMode) => { if (mode === 'competitive') return; setConfig(prev => ({ ...prev, mode })); if (mode === 'multiplayer') setView('roomList'); else setShowConfig(true); };
  const handleOpenCreateRoom = () => { setRoomConfig({ ...defaultRoomConfig }); setShowCreateModal(true); };
  
  const handleStartGame = () => { 
    const pseudo = profile?.username || "Joueur";
    const soloRoomName = `${pseudo}'s Solo`;

    const soloRoomPayload = { 
        roomName: soloRoomName, 
        ...getPlayerIdentity(), 
        settings: { ...config, isPrivate: true, maxPlayers: 1, password: "" } 
    }; 
    socket.emit('lobby:create', soloRoomPayload); 
  };

  const handleCreateOrUpdateRoom = () => { 
      if (view === 'lobby' && currentRoomId) { 
          socket.emit('update_room_settings', { roomId: currentRoomId, settings: roomConfig }); 
      } else { 
          const payload = { roomName: roomConfig.roomName || "Salon de jeu", ...getPlayerIdentity(), settings: roomConfig }; 
          socket.emit('lobby:create', payload); 
      } 
  };

  const handleStartLobbyGame = () => { if (currentRoomId && isAmIHost) socket.emit('start_game', { roomId: currentRoomId }); };
  const handleToggleReady = () => { if (currentRoomId) socket.emit('toggle_ready', { roomId: currentRoomId }); };
  const handleTransferHost = (targetId: string | number) => { if (currentRoomId && isAmIHost) socket.emit('transfer_host', { roomId: currentRoomId, targetId }); };
  const handleReset = () => setConfig(defaultConfig);
  const handleResetRoom = () => setRoomConfig(defaultRoomConfig);
  const toggleSoundType = (type: string, isRoom = false) => { const setTargetConfig = isRoom ? setRoomConfig : setConfig; setTargetConfig((prev: any) => ({ ...prev, soundTypes: prev.soundTypes.includes(type) ? prev.soundTypes.filter((t: string) => t !== type) : [...prev.soundTypes, type], })); };
  const handleJoinRoom = (roomId: string) => { const targetRoomId = roomId || joinCode; if (targetRoomId) socket.emit('lobby:join', { roomId: targetRoomId, ...getPlayerIdentity() }); };
  const handlePasswordSubmit = () => { if(!pendingRoomId || !passwordInput) return; socket.emit('lobby:join', { roomId: pendingRoomId, password: passwordInput, ...getPlayerIdentity() }); };
  const handleOpenRoomSettings = () => setShowCreateModal(true);
  
  const goBack = () => { 
      if (view === 'lobby') { 
          if (currentRoomId) { 
              socket.emit('leave_room', { roomId: currentRoomId }); 
              setCurrentRoomId(''); 
              setLobbyPlayers([]); 
          } 
          setView('modes'); 
      } else { 
          setView('modes'); 
      } 
  };

  if (view === 'lobby') {
    return (
      <>
        <MultiplayerLobby 
            roomName={roomConfig.roomName || "Salon de jeu"} 
            players={lobbyPlayers} 
            maxPlayers={roomConfig.maxPlayers} 
            isHost={isAmIHost} 
            currentUserId={mySocketId} 
            gameSettings={roomConfig} 
            roomCode={currentRoomId} 
            gameStatus={gameStatus} 
            onStartGame={handleStartLobbyGame} 
            onToggleReady={handleToggleReady} 
            onLeave={goBack} 
            onOpenSettings={handleOpenRoomSettings} 
            onTransferHost={handleTransferHost} 
        />
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="sm:max-w-3xl bg-card border-border" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader><DialogTitle className="text-xl flex items-center gap-3">Paramètres du salon</DialogTitle><DialogDescription>Configurez les règles.</DialogDescription></DialogHeader>
            <GameConfigForm 
                config={roomConfig} 
                setConfig={setRoomConfig as any} 
                toggleSoundType={(t) => toggleSoundType(t, true)} 
                onReset={handleResetRoom} 
                onSubmit={handleCreateOrUpdateRoom} 
                isRoom={roomConfig.maxPlayers > 1} 
                playlists={playlists} 
                currentPlayersCount={lobbyPlayers.length} 
                user={user} 
                profile={profile} 
            />
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
          <div className="max-w-6xl mx-auto">
            {view === 'modes' && (
              <div className="relative">
                <button onClick={() => navigate('/')} className="absolute top-0 left-0 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="h-5 w-5" /><span className="text-sm">Retour</span></button>
                <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 animate-fade-in">Choisissez votre <span className="gradient-text">mode de jeu</span></h1>
                <p className="text-center text-muted-foreground mb-8 md:mb-12 animate-fade-in">Sélectionnez un mode pour configurer votre partie</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">{modeCards.map((mode, index) => ( <button key={mode.id} onClick={() => handleModeSelect(mode.id)} disabled={mode.disabled} className={cn("glass-card p-10 text-left hover-lift hover-glow group cursor-pointer animate-fade-in transition-all relative overflow-hidden flex flex-col justify-center min-h-[300px]", mode.disabled && "opacity-60 cursor-not-allowed grayscale-[0.3]")} style={{ animationDelay: `${index * 0.1}s` }} > <div className={`inline-flex p-5 rounded-2xl bg-gradient-to-br ${mode.gradient} mb-6 w-fit`}><mode.icon className="h-8 w-8 text-white" /></div> <h3 className="text-3xl font-bold mb-3 group-hover:text-primary transition-colors">{mode.title}</h3> <p className="text-base text-muted-foreground leading-relaxed">{mode.description}</p> </button> ))}</div>
                <TriviaCard />
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
            <DialogContent className="sm:max-w-3xl bg-card border-border" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader><DialogTitle>Configuration</DialogTitle><DialogDescription>Mode Solo</DialogDescription></DialogHeader>
                <GameConfigForm config={config} setConfig={setConfig} toggleSoundType={(t) => toggleSoundType(t)} onReset={handleReset} onSubmit={handleStartGame} playlists={playlists} user={user} profile={profile} />
            </DialogContent>
        </Dialog>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}><DialogContent className="sm:max-w-3xl bg-card border-border" onOpenAutoFocus={(e) => e.preventDefault()}><DialogHeader><DialogTitle>Créer un salon</DialogTitle><DialogDescription>Invitez vos amis.</DialogDescription></DialogHeader><GameConfigForm config={roomConfig} setConfig={setRoomConfig as any} toggleSoundType={(t) => toggleSoundType(t, true)} onReset={handleResetRoom} onSubmit={handleCreateOrUpdateRoom} isRoom playlists={playlists} currentPlayersCount={lobbyPlayers.length} user={user} profile={profile} /></DialogContent></Dialog>
        <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}><DialogContent className="sm:max-w-md bg-card border-border"><DialogHeader><DialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> Salon privé</DialogTitle><DialogDescription>Mot de passe</DialogDescription></DialogHeader><div className="py-4 space-y-4"><div className="space-y-2"><Label>Mot de passe</Label><Input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowPasswordModal(false)}>Annuler</Button><Button variant="glow" onClick={handlePasswordSubmit} disabled={!passwordInput}>Valider</Button></DialogFooter></DialogContent></Dialog>
        <FloatingSettingsButton />
      </div>
    </>
  );
}