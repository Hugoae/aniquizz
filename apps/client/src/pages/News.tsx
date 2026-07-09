import { useMemo, useState, useEffect } from 'react';
import { SeoHead } from '@/components/seo/SeoHead';
import { PAGE_TITLES } from '@/lib/site';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/Header';

import { NewsCard } from '@/features/news/components/NewsCard';
import { RoadmapWidget } from '@/features/news/components/RoadmapWidget';
import { allNews, typeConfig, type NewsItem } from '@/features/news/data/newsData';

type Filter = NewsItem['type'] | 'all';

// Canonical display order for the type chips.
const TYPE_ORDER: NewsItem['type'][] = ['update', 'feature', 'fix', 'event'];

export default function News() {
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState<Filter>('all');

  const focusedId = useMemo(() => {
    const match = location.hash.match(/^#news-(\d+)$/);
    return match ? Number(match[1]) : null;
  }, [location.hash]);

  // Only surface chips for types that actually have entries.
  const availableTypes = useMemo(() => {
    const present = new Set(allNews.map((n) => n.type));
    return TYPE_ORDER.filter((t) => present.has(t));
  }, []);

  const counts = useMemo(() => {
    const map = new Map<NewsItem['type'], number>();
    for (const n of allNews) map.set(n.type, (map.get(n.type) ?? 0) + 1);
    return map;
  }, []);

  const filteredNews = filter === 'all' ? allNews : allNews.filter((n) => n.type === filter);
  const latestId = allNews[0]?.id;

  // Deep-link from home: /news#news-<id> expands and scrolls to the target card.
  useEffect(() => {
    if (focusedId === null) return;
    const exists = allNews.some((n) => n.id === focusedId);
    if (!exists) return;
    setFilter('all');
    const t = window.setTimeout(() => {
      document.getElementById(`news-${focusedId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
    return () => window.clearTimeout(t);
  }, [focusedId]);

  const chipClass = (active: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
      active
        ? 'border-primary/50 bg-primary/15 text-foreground'
        : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground',
    );

  return (
    <>
      <SeoHead
        title={PAGE_TITLES.news}
        description="Mises à jour, nouveautés et feuille de route d'AniQuizz."
        path="/news"
      />

      <div className="min-h-screen bg-background pb-12">
        <Header />

        <main id="main-content" className="container max-w-6xl mx-auto px-4 pt-24">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2 mb-6 text-muted-foreground hover:text-foreground pl-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                  <Newspaper className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Actualités</h1>
                  <p className="text-muted-foreground">Mises à jour et annonces officielles</p>
                </div>
              </div>

              {/* Type filters */}
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par type">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={chipClass(filter === 'all')}
                  aria-pressed={filter === 'all'}
                >
                  Tous
                  <span className="font-mono text-[10px] opacity-70">{allNews.length}</span>
                </button>
                {availableTypes.map((type) => {
                  const config = typeConfig[type];
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilter(type)}
                      className={chipClass(filter === type)}
                      aria-pressed={filter === type}
                    >
                      <Icon className={cn('h-3.5 w-3.5', config.text)} aria-hidden />
                      {config.label}
                      <span className="font-mono text-[10px] opacity-70">{counts.get(type) ?? 0}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4">
                {filteredNews.length === 0 ? (
                  <div className="glass-card p-10 text-center text-sm text-muted-foreground">
                    Aucune actualité dans cette catégorie.
                  </div>
                ) : (
                  filteredNews.map((news, i) => (
                    <NewsCard
                      key={news.id}
                      news={news}
                      index={i}
                      defaultExpanded={
                        focusedId !== null ? news.id === focusedId : news.id === latestId
                      }
                    />
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <RoadmapWidget />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
