import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { isFirstLandingPaint } from '@/lib/initialPaint';
import { cn } from '@/lib/utils';
import { useHomeCopy } from '@/features/home/copy/homeCopy';
import { formatAppDate } from '@/lib/i18n/format';
import { latestNewsPreview } from '@/features/news/data/newsPreview';
import { localizedNewsTeaser } from '@/features/news/data/newsData';
import { pick } from '@/lib/i18n/text';
import { useLocale } from '@/features/i18n/LocaleContext';
import { typeConfig } from '@/features/news/data/newsTypes';

export function NewsSection() {
  const skipEntryAnimation = isFirstLandingPaint();
  const copy = useHomeCopy();
  const { locale } = useLocale();

  return (
    <section
      className={cn('w-full px-4 pb-6 pt-6', !skipEntryAnimation && 'animate-slide-up')}
      style={skipEntryAnimation ? undefined : { animationDelay: '0.2s' }}
    >
      <div className="max-w-xl mx-auto" data-home-clear>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <typeConfig.update.icon className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold">{copy.newsTitle}</h2>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground hover:text-primary text-xs h-7 px-2"
          >
            <Link to="/news">
              {copy.newsSeeAll}
              <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>

        <div className="space-y-2">
          {latestNewsPreview.map((raw) => {
            const news = localizedNewsTeaser(raw);
            const config = typeConfig[news.type];
            const TypeIcon = config.icon;

            return (
              <Link
                key={`${news.id}-${locale}`}
                to={`/news#news-${news.id}`}
                aria-label={`${pick('Actualité', 'News')}: ${news.title}`}
                className="flex p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group border border-border/40 hover:border-primary/30 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center gap-4 relative z-10 min-w-0 w-full">
                  <div className={`p-2 rounded-lg ${config.bg} shrink-0`}>
                    <TypeIcon className={`h-4 w-4 ${config.text}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                        {news.title}
                      </h3>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                        {formatAppDate(new Date(news.date), {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs truncate opacity-80">
                      {news.description}
                    </p>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 group-hover:translate-x-1 duration-300" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
