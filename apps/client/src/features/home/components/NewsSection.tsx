import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

import { allNews, typeConfig } from '@/features/news/data/newsData';

export function NewsSection() {
  const navigate = useNavigate();

  const openNewsList = () => navigate('/news');
  const openNewsItem = (id: number) => navigate(`/news#news-${id}`);

  const latestNews = allNews.slice(0, 2);

  return (
    <section className="px-4 pb-6 pt-6 w-full animate-slide-up" style={{ animationDelay: '0.2s' }}>
      <div className="max-w-xl mx-auto"> 
        
        {/* Header Section */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <typeConfig.update.icon className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold">Actualités</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={openNewsList}
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
                role="button"
                tabIndex={0}
                onClick={() => openNewsItem(news.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNewsItem(news.id); } }}
                aria-label={`Actualité : ${news.title}`}
                className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group border border-border/40 hover:border-primary/30 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`p-2 rounded-lg ${config.bg} shrink-0`}>
                    <TypeIcon className={`h-4 w-4 ${config.text}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                        {news.title}
                      </h3>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                        {new Date(news.date).toLocaleDateString('fr-FR', { 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs truncate opacity-80">
                      {news.description}
                    </p>
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 group-hover:translate-x-1 duration-300" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}