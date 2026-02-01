import { ExternalLink, Calendar, Music2, User, Star, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mapping des couleurs pour les badges de genres
const GENRE_COLORS: Record<string, string> = {
  'Action': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Adventure': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Comedy': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'Drama': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Fantasy': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Romance': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'Sci-Fi': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'Slice of Life': 'bg-green-500/10 text-green-400 border-green-500/20',
  'Supernatural': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'Horror': 'bg-stone-500/10 text-stone-400 border-stone-500/20',
  'Sports': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Mecha': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
};

interface SongInfoCardProps {
  animeName: string;
  songTitle: string;
  artist: string;
  type: string;
  difficulty: string;
  franchise?: string;
  year?: number;
  coverImage?: string;
  siteUrl?: string;
  isRevealed: boolean;
  tags?: string[];
  isWatched?: boolean;
}

export function SongInfoCard({
  animeName,
  songTitle,
  artist,
  type,
  difficulty,
  franchise,
  year,
  coverImage,
  siteUrl,
  isRevealed,
  tags,
  isWatched
}: SongInfoCardProps) {
  
  // 1. État de chargement / Non révélé
  if (!isRevealed) {
    return (
      <div className="w-[500px] h-[220px] bg-card/40 border border-white/5 rounded-2xl p-4 backdrop-blur-md shadow-xl flex gap-4 animate-pulse">
        <div className="flex-1 flex flex-col gap-3 pt-2">
            <div className="h-4 w-3/4 bg-white/10 rounded" />
            <div className="h-3 w-1/2 bg-white/5 rounded" />
            <div className="h-3 w-1/3 bg-white/5 rounded mt-auto" />
        </div>
        <div className="w-36 h-full bg-white/5 rounded-xl shrink-0" />
      </div>
    );
  }

  // Couleurs selon la difficulté
  const diffColor = 
    difficulty === 'easy' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
    difficulty === 'hard' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
    'text-blue-400 border-blue-500/30 bg-blue-500/10';

  const diffLabel = difficulty ? difficulty.toUpperCase() : "NORMAL";

  // Formatage du type (OP1, ED2...)
  const formattedType = type.replace(/(\d+)$/, ' $1');

  return (
    <div className="w-full max-w-[550px] h-[220px] flex bg-[#0a0a0a]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl animate-in slide-in-from-right-4 duration-500 group hover:border-primary/30 transition-all">
      
      {/* 📝 GAUCHE : Infos (Flex-1) */}
      <div className="flex-1 flex flex-col p-5 min-w-0 relative">
        
        {/* FRANCHISE (Au-dessus du titre, coupé sur 1 ligne) */}
        {franchise && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-500/80 uppercase tracking-wider mb-0.5">
                <Star className="w-3 h-3 fill-yellow-500/50 shrink-0" />
                <span className="truncate">{franchise}</span>
            </div>
        )}

        {/* Titre Anime (Cliquable, coupé sur 2 lignes max) */}
        <a 
            href={siteUrl || '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            // line-clamp-2 permet 2 lignes max, block est nécessaire (pas de flex ici sinon ça casse le clamp)
            className="font-black text-xl leading-tight hover:text-primary hover:underline decoration-primary decoration-2 underline-offset-4 transition-all mb-2 text-white block line-clamp-2"
            title="Voir sur AniList"
        >
            {animeName}
            {/* L'icône est inline pour suivre le texte */}
            <ExternalLink className="inline ml-2 w-3.5 h-3.5 opacity-50 relative -top-0.5" />
        </a>

        {/* Titre Son & Artiste */}
        <div className="flex flex-col gap-1 mb-auto pl-1 border-l-2 border-white/10">
            <div className="flex items-center gap-2 text-base font-bold text-white/90 truncate">
                <Music2 className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">{songTitle}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                <User className="w-4 h-4 shrink-0" />
                <span className="truncate">{artist}</span>
            </div>
        </div>

        {/* Badges (En bas) */}
        <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-2 items-center">
            
            {/* INDICATEUR WATCHED (Oeil) - redondant avec l'image mais demandé */}
            {isWatched && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase border bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.2)] animate-pulse">
                    <Eye className="w-3 h-3" /> VU
                </span>
            )}

            {/* DIFFICULTÉ */}
            <span className={cn("px-2 py-1 rounded-md text-[10px] font-bold uppercase border tracking-wider shadow-sm", diffColor)}>
                {diffLabel}
            </span>

            {/* TYPE */}
            <span className="px-2.5 py-1 rounded-md text-[11px] font-black bg-white/10 text-white border border-white/10 shadow-sm">
                {formattedType}
            </span>

            {/* ANNÉE */}
            {year && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-secondary/30 text-secondary-foreground border border-white/5">
                    <Calendar className="w-3 h-3" /> {year}
                </span>
            )}

        </div>

        {/* TAGS GENRES */}
        {tags && tags.length > 0 && (
            <div className="flex gap-1.5 mt-2 overflow-hidden mask-fade-right">
                {tags.slice(0, 4).map((tag, i) => {
                    const style = GENRE_COLORS[tag] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
                    return (
                        <span key={i} className={cn("text-[9px] px-1.5 py-0.5 rounded border whitespace-nowrap font-medium", style)}>
                            {tag}
                        </span>
                    );
                })}
            </div>
        )}
      </div>

      {/* 🖼️ DROITE : Cover Image */}
      <div className="relative w-[160px] h-full shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 w-10" />
        <img 
            src={coverImage || '/placeholder.png'} 
            alt={animeName} 
            className="w-full h-full object-cover"
        />
        
        {/* ✅ Badge sur l'image avec Texte "VU" + Checkmark */}
        {isWatched && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white rounded-md shadow-lg z-20 border border-green-400 flex items-center gap-1">
                <CheckIcon className="w-3 h-3 stroke-[4]" />
                <span className="text-[10px] font-black leading-none">VU</span>
            </div>
        )}
      </div>

    </div>
  );
}

// Petite icône check locale
function CheckIcon(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
}