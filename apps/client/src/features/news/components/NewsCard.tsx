import { Badge } from '@/components/ui/badge';
import { typeConfig, NewsItem } from '../data/newsData';

interface NewsCardProps {
  news: NewsItem;
}

export function NewsCard({ news }: NewsCardProps) {
  const config = typeConfig[news.type] || typeConfig.default;
  const TypeIcon = config.icon;

  // Fonction de formatage pour le gras (**texte**)
  const formatContent = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
            <strong key={index} className="text-foreground font-black">
                {part.slice(2, -2)}
            </strong>
        );
      }
      return part;
    });
  };

  return (
    <article className="glass-card p-6 border border-white/5 rounded-2xl animate-fade-in">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${config.color} bg-opacity-20 shrink-0`}>
          <TypeIcon className={`h-5 w-5 ${config.color.replace('bg-', 'text-')}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <Badge variant="outline" className={`${config.color} bg-opacity-10 border-opacity-20`}>
              {config.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(news.date).toLocaleDateString('fr-FR', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </span>
          </div>
          <h2 className="font-bold text-xl mb-2 text-foreground">
            {news.title}
          </h2>
          
          <div className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
            {formatContent(news.content)}
          </div>
        </div>
      </div>
    </article>
  );
}