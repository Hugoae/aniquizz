import { Music, User, Tv, Link as LinkIcon, Video, Calendar, Eye } from 'lucide-react';
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
  tags?: string[];
  isRevealed?: boolean;
  coverImage?: string;
  siteUrl?: string; 
  sourceUrl?: string; 
  isWatched?: boolean;
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
    sourceUrl,
    isWatched = false
}: SongInfoCardProps) {

  const handleLinkClick = (url?: string) => {
    if (url) window.open(url, '_blank');
  };

  const diffColor = 
    difficulty === 'easy' ? 'bg-green-500/20 text-green-500 border-green-500/20' :
    difficulty === 'hard' ? 'bg-red-500/20 text-red-500 border-red-500/20' :
    'bg-blue-500/20 text-blue-500 border-blue-500/20';

  // On affiche jusqu'à 3 tags, mais avec la nouvelle hauteur ça devrait bien passer
  const displayTags = tags ? tags.slice(0, 3) : [];

  return (
    <div className={cn(
      // MODIF 1 : Hauteur passée à h-60 (240px) pour éviter le crop des tags
      "glass-card overflow-hidden w-[480px] transition-all duration-500 h-60 border border-white/10 shadow-xl",
      isRevealed ? "animate-scale-in" : "opacity-60 grayscale"
    )}>
      <div className="flex h-full">
          {/* GAUCHE : INFOS */}
          {/* MODIF : space-y-2 pour équilibrer avec la nouvelle hauteur */}
          <div className="flex-1 p-5 space-y-2 flex flex-col justify-center min-w-0 relative">
              
              {/* Franchise + Indicateur VU */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                  {franchise ? (
                      <div className="text-[11px] uppercase tracking-widest text-primary/80 font-bold truncate">
                          {isRevealed ? franchise : "???"}
                      </div>
                  ) : ( <div /> )}

                  {/* INDICATEUR VU */}
                  {isRevealed && isWatched && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 animate-fade-in" title="Vous avez vu cet anime (selon AniList)">
                          <Eye className="h-3 w-3" />
                          <span className="text-[9px] font-bold uppercase">Vu</span>
                      </div>
                  )}
              </div>

              {/* Anime */}
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => handleLinkClick(siteUrl)}>
                  <Tv className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-bold text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors" title={animeName}>
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
                      <span className="text-sm font-medium truncate" title={songTitle}>{isRevealed ? songTitle : '???'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground/70">
                      <User className="h-3 w-3 shrink-0" />
                      <span className="text-xs truncate" title={artist}>{isRevealed ? artist : '???'}</span>
                  </div>
              </div>

              {/* Badges Techniques */}
              <div className="flex items-center gap-2 pt-1">
                  <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase border", diffColor)}>
                      {isRevealed ? difficulty : "?"}
                  </div>
                  <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary text-secondary-foreground border border-white/5">
                      {isRevealed ? type : "?"}
                  </div>
                  {isRevealed && year && (
                      <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />{year}
                      </div>
                  )}
              </div>

              {/* TAGS COLORÉS */}
              {isRevealed && displayTags.length > 0 && (
                <div className="flex gap-1.5 pt-1 flex-wrap">
                    {displayTags.map((tag, i) => {
                        const style = getTagStyle(tag);
                        return (
                            <span 
                                key={i} 
                                // MODIF 3 : max-w augmenté un peu pour éviter de couper les mots longs
                                className="px-2 py-0.5 rounded text-[9px] font-bold border truncate max-w-[100px]"
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
                      className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white z-10 transition-all shadow-sm"
                      onClick={(e) => { e.stopPropagation(); handleLinkClick(sourceUrl); }}
                      title="Voir le clip"
                  >
                      <Video className="h-4 w-4" />
                  </Button>
              )}
          </div>

          {/* DROITE : COVER IMAGE */}
          {/* La largeur w-36 est conservée, c'est un bon ratio avec h-60 */}
          <div className="w-36 min-w-[144px] bg-black/20 shrink-0 relative border-l border-white/5 h-full">
              {isRevealed && coverImage ? (
                  <img src={coverImage} alt="Cover" className="w-full h-full object-cover opacity-90" />
              ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/20 text-muted-foreground font-mono text-3xl font-bold">
                      ?
                  </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-card/80 to-transparent w-6 pointer-events-none" />
          </div>
      </div>
    </div>
  );
}