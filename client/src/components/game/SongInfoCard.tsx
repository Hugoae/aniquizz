import { Music, User, Tv, Link as LinkIcon, Video, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SongInfoCardProps {
  franchise?: string;
  animeName?: string;
  songTitle?: string;
  artist?: string;
  type?: string;
  difficulty?: string;
  year?: number; // Ajout de l'année
  isRevealed?: boolean;
  coverImage?: string;
  siteUrl?: string; // Lien AniList
  sourceUrl?: string; // Lien Clip
}

export function SongInfoCard({ 
    franchise, 
    animeName, 
    songTitle, 
    artist, 
    type, 
    difficulty = "medium",
    year,
    isRevealed = true, 
    coverImage,
    siteUrl,
    sourceUrl 
}: SongInfoCardProps) {

  const handleLinkClick = (url?: string) => {
    if (url) window.open(url, '_blank');
  };

  // Couleurs difficulté
  const diffColor = 
    difficulty === 'easy' ? 'bg-green-500/20 text-green-500 border-green-500/20' :
    difficulty === 'hard' ? 'bg-red-500/20 text-red-500 border-red-500/20' :
    'bg-blue-500/20 text-blue-500 border-blue-500/20';

  return (
    <div className={cn(
      "glass-card overflow-hidden w-[380px] transition-all duration-500 h-fit border border-white/10 shadow-xl",
      isRevealed ? "animate-scale-in" : "opacity-60 grayscale"
    )}>
      <div className="flex h-32">
          {/* GAUCHE : INFOS */}
          <div className="flex-1 p-4 space-y-2 flex flex-col justify-center min-w-0">
              
              {/* Franchise */}
              {franchise && (
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold truncate">
                      {isRevealed ? franchise : "???"}
                  </div>
              )}

              {/* Anime + Lien AniList */}
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => handleLinkClick(siteUrl)}>
                  <Tv className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-bold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors" title={animeName}>
                      {isRevealed ? animeName : '???'}
                  </span>
                  {isRevealed && siteUrl && (
                      <LinkIcon className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
              </div>

              {/* Song & Artist */}
              <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                      <Music className="h-3 w-3 shrink-0" />
                      <span className="text-xs font-medium truncate" title={songTitle}>{isRevealed ? songTitle : '???'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground/70">
                      <User className="h-3 w-3 shrink-0" />
                      <span className="text-xs truncate" title={artist}>{isRevealed ? artist : '???'}</span>
                  </div>
              </div>

              {/* Badges & Actions */}
              <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-2 items-center">
                      <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase border", diffColor)}>
                          {isRevealed ? difficulty : "?"}
                      </div>
                      <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary text-secondary-foreground border border-white/5">
                          {isRevealed ? type : "?"}
                      </div>
                      {/* NOUVEAU : Badge Année */}
                      {isRevealed && year && (
                          <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {year}
                          </div>
                      )}
                  </div>

                  {isRevealed && sourceUrl && (
                      <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                          onClick={() => handleLinkClick(sourceUrl)}
                          title="Voir le clip"
                      >
                          <Video className="h-3 w-3" />
                      </Button>
                  )}
              </div>
          </div>

          {/* DROITE : COVER IMAGE */}
          <div className="w-32 min-w-[128px] bg-black/20 shrink-0 relative border-l border-white/5 h-full">
              {isRevealed && coverImage ? (
                  <img src={coverImage} alt="Cover" className="w-full h-full object-cover opacity-90" />
              ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/20 text-muted-foreground font-mono text-2xl font-bold">
                      ?
                  </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-card/80 to-transparent w-4 pointer-events-none" />
          </div>
      </div>
    </div>
  );
}