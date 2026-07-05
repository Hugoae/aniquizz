import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';

interface HomeStatsData {
  animes: number | null;
  users: number | null;
  songs: number | null;
}

export function HomeStats() {
  const [stats, setStats] = useState<HomeStatsData>({ 
      animes: null, 
      users: null, 
      songs: null 
  });

  useEffect(() => {
    const fetchStats = () => {
        if (socket.connected) {
            socket.emit('get_home_stats');
        }
    };

    if (!socket.connected) {
        socket.connect();
    } else {
        fetchStats();
    }

    const onConnect = () => fetchStats();
    const onStats = (data: HomeStatsData) => setStats(data);

    socket.on('connect', onConnect);
    socket.on('home_stats', onStats);

    // Polling de sécurité
    const interval = setInterval(fetchStats, 10000);

    return () => {
        socket.off('connect', onConnect);
        socket.off('home_stats', onStats);
        clearInterval(interval);
    };
  }, []);

  const displayValue = (val: number | null) => val === null ? "-" : val;

  return (
    <div className="animate-fade-in delay-200 pointer-events-none select-none">
        <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 px-4 py-2">
            
            {/* STAT 1 : ANIMES */}
            <div className="flex flex-col items-center gap-1 group">
                <span className="text-3xl md:text-4xl font-black font-mono text-white tracking-tighter leading-none drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
                    {displayValue(stats.animes)}
                </span>
                <div className="h-0.5 w-6 bg-pink-500/60 rounded-full mb-1" />
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

            {/* STAT 3 : CHANSONS */}
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