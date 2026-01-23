import { Music, User, Tv, Link as LinkIcon, Video, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getTagStyle } from '@/config/constants';

interface SongInfoCardProps {
  franchise?: string;
  animeName?: string;
  songTitle?: string;
  artist?: string;
  type?: string;
  difficulty?: string;
  year?: number;
  tags?: string[]; // On reçoit les tags ici
  isRevealed?: boolean;
  coverImage?: string;
  siteUrl?: string; 
  sourceUrl?: string; 
}

export function SongInfoCard({ 
    franchise, 
    animeName, 
    songTitle, 
    artist, 
    type, 
    difficulty = "medium",
    year,
    tags = [], 
    isRevealed = true, 
    coverImage,
    siteUrl,
    sourceUrl 
}: SongInfoCardProps) {

  const handleLinkClick = (url?: string) => {
    if (url) window.open(url, '_blank');
  };

  const diffColor = 
    difficulty === 'easy' ? 'bg-green-500/20 text-green-500 border-green-500/20' :
    difficulty === 'hard' ? 'bg-red-500/20 text-red-500 border-red-500/20' :
    'bg-blue-500/20 text-blue-500 border-blue-500/20';

  // On limite à 3 tags pour que ça reste joli
  const displayTags = tags ? tags.slice(0, 3) : [];

  return (
    <div className={cn(
      "glass-card overflow-hidden w-[380px] transition-all duration-500 h-fit border border-white/10 shadow-xl",
      isRevealed ? "animate-scale-in" : "opacity-60 grayscale"
    )}>
      <div className="flex h-36">
          {/* GAUCHE : INFOS */}
          <div className="flex-1 p-3 space-y-1.5 flex flex-col justify-center min-w-0 relative">
              
              {/* Franchise */}
              {franchise && (
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold truncate">
                      {isRevealed ? franchise : "???"}
                  </div>
              )}

              {/* Anime */}
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
              <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-muted-foreground">
                      <Music className="h-3 w-3 shrink-0" />
                      <span className="text-xs font-medium truncate" title={songTitle}>{isRevealed ? songTitle : '???'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground/70">
                      <User className="h-3 w-3 shrink-0" />
                      <span className="text-xs truncate" title={artist}>{isRevealed ? artist : '???'}</span>
                  </div>
              </div>

              {/* Badges Techniques */}
              <div className="flex items-center gap-2 pt-1">
                  <div className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border", diffColor)}>
                      {isRevealed ? difficulty : "?"}
                  </div>
                  <div className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-secondary text-secondary-foreground border border-white/5">
                      {isRevealed ? type : "?"}
                  </div>
                  {isRevealed && year && (
                      <div className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />{year}
                      </div>
                  )}
              </div>

              {/* TAGS COLORÉS */}
              {isRevealed && displayTags.length > 0 && (
                <div className="flex gap-1 pt-1 overflow-hidden flex-wrap">
                    {displayTags.map((tag, i) => {
                        const style = getTagStyle(tag);
                        return (
                            <span 
                                key={i} 
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold border truncate max-w-[80px]"
                                style={style}
                            >
                                {tag}
                            </span>
                        )
                    })}
                </div>
              )}

              {/* Bouton Video */}
              {isRevealed && sourceUrl && (
                  <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute bottom-2 right-2 h-6 w-6 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white z-10"
                      onClick={(e) => { e.stopPropagation(); handleLinkClick(sourceUrl); }}
                      title="Voir le clip"
                  >
                      <Video className="h-3 w-3" />
                  </Button>
              )}
          </div>

          {/* DROITE : COVER IMAGE */}
          <div className="w-28 min-w-[112px] bg-black/20 shrink-0 relative border-l border-white/5 h-full">
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