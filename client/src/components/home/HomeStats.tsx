import { useEffect, useState } from 'react';
import { socket } from '@/services/socket';

export function HomeStats() {
  const [stats, setStats] = useState<{ animes: number | null, users: number | null, songs: number | null }>({ 
      animes: null, 
      users: null, 
      songs: null 
  });

  useEffect(() => {
    // Fonction pour demander les stats
    const fetchStats = () => {
        console.log("🌐 [FRONT] Socket connecté/prêt, envoi de la demande stats...");
        socket.emit('get_home_stats');
    };

    // 1. Si déjà connecté, on demande tout de suite
    if (socket.connected) {
        fetchStats();
    } else {
        // 2. Sinon, on se connecte et on attend l'événement 'connect'
        console.log("🌐 [FRONT] Socket déconnecté, connexion en cours...");
        socket.connect();
    }

    // Écouteurs d'événements
    socket.on('connect', fetchStats); // Dès qu'on se connecte, on demande
    
    socket.on('home_stats', (data) => {
        console.log("✅ [FRONT] Stats reçues du serveur :", data);
        setStats(data);
    });

    socket.on('connect_error', (err) => {
        console.error("❌ [FRONT] Erreur de connexion socket :", err);
    });

    return () => {
        socket.off('connect', fetchStats);
        socket.off('home_stats');
        socket.off('connect_error');
    };
  }, []);

  const displayValue = (val: number | null) => val === null ? "-" : val;

  return (
    <div className="animate-fade-in delay-200 pointer-events-none select-none">
        <div className="flex items-center gap-10 md:gap-20 px-4 py-2">
            
            {/* STAT 1 : FRANCHISES */}
            <div className="flex flex-col items-center gap-1 group">
                <span className="text-3xl md:text-4xl font-black font-mono text-white tracking-tighter leading-none drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
                    {displayValue(stats.animes)}
                </span>
                <div className="h-0.5 w-6 bg-primary/60 rounded-full mb-1" />
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/50">
                    Nombre d'Animes
                </span>
            </div>

            {/* STAT 2 : JOUEURS */}
            <div className="flex flex-col items-center gap-1 group">
                <span className="text-3xl md:text-4xl font-black font-mono text-white tracking-tighter leading-none drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
                    {displayValue(stats.users)}
                </span>
                <div className="h-0.5 w-6 bg-blue-500/60 rounded-full mb-1" />
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/50">
                    Joueurs Uniques
                </span>
            </div>

            {/* STAT 3 : GÉNÉRIQUES */}
            <div className="flex flex-col items-center gap-1 group">
                <span className="text-3xl md:text-4xl font-black font-mono text-white tracking-tighter leading-none drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
                    {displayValue(stats.songs)}
                </span>
                <div className="h-0.5 w-6 bg-purple-500/60 rounded-full mb-1" />
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/50">
                    Sons Disponibles
                </span>
            </div>

        </div>
    </div>
  );
}