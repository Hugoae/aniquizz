import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

// 👇 Correction du chemin vers le nouveau module News
import { allNews, typeConfig } from '@/features/news/data/newsData';

export function NewsSection() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/news');
  };

  // On prend juste les 2 dernières news pour l'accueil
  const latestNews = allNews.slice(0, 2);

  return (
    <section className="px-4 pb-6 pt-6">
      <div className="max-w-xl mx-auto"> 
        
        {/* Header Section */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/20">
              <typeConfig.update.icon className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold">Actualités</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClick}
            className="gap-1 text-muted-foreground hover:text-primary text-xs h-7 px-2"
          >
            Voir tout
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>

        {/* Liste des news */}
        <div className="space-y-2">
          {latestNews.map((news) => {
            const config = typeConfig[news.type];
            const TypeIcon = config.icon;
            
            return (
              <div
                key={news.id}
                onClick={handleClick}
                className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all cursor-pointer group border border-border/30"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${config.color} shrink-0 bg-opacity-20`}>
                    <TypeIcon className={`h-4 w-4 ${config.color.replace('bg-', 'text-')}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                        {news.title}
                      </h3>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(news.date).toLocaleDateString('fr-FR', { 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs truncate">
                      {news.description}
                    </p>
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}