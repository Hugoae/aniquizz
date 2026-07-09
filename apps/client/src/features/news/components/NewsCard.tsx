import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { typeConfig, type NewsItem } from '../data/newsData';

interface NewsCardProps {
  news: NewsItem;
  /** Expand the full content on mount (used for the latest entry). */
  defaultExpanded?: boolean;
  /** Position in the list, for a subtle staggered entrance. */
  index?: number;
}

/** "Patchnote 0.4 - Title" → { version: "0.4", title: "Title" }. */
const VERSION_RE = /^Patchnote\s+([\d.]+)\s*[-–—]\s*(.*)$/i;

/** Render inline `**bold**` markers as <strong>, leaving the rest as plain text. */
function renderRichText(text: string): ReactNode[] {
  return text.split(/(\*\*.*?\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={index} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

/**
 * Render patchnote content into real blocks: `**heading**` lines become section
 * titles, `•` lines group into bullet lists (with the "Label :" part emphasized),
 * everything else becomes paragraphs.
 */
function renderContent(text: string): ReactNode[] {
  const blocks: ReactNode[] = [];
  let items: string[] = [];

  const flushList = () => {
    if (items.length === 0) return;
    const current = items;
    items = [];
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="my-3 space-y-2">
        {current.map((item, i) => {
          const [label, detail] = item.split(/ : (.+)/s);
          return (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" aria-hidden="true" />
              <span>
                {detail !== undefined ? (
                  <>
                    <span className="font-medium text-foreground">{label}</span>
                    {' : '}
                    {renderRichText(detail)}
                  </>
                ) : (
                  renderRichText(item)
                )}
              </span>
            </li>
          );
        })}
      </ul>,
    );
  };

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith('•')) {
      items.push(line.replace(/^•\s*/, ''));
      continue;
    }
    flushList();
    const heading = line.match(/^\*\*(.+)\*\*$/);
    if (heading) {
      blocks.push(
        <h4 key={`h-${blocks.length}`} className="mb-1.5 mt-5 text-sm font-bold text-foreground first:mt-0">
          {heading[1]}
        </h4>,
      );
      continue;
    }
    blocks.push(
      <p key={`p-${blocks.length}`} className="mb-2 text-sm leading-relaxed text-muted-foreground">
        {renderRichText(line)}
      </p>,
    );
  }
  flushList();
  return blocks;
}

export function NewsCard({ news, defaultExpanded = false, index = 0 }: NewsCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const config = typeConfig[news.type] ?? typeConfig.default;
  const TypeIcon = config.icon;

  const match = news.title.match(VERSION_RE);
  const version = match?.[1];
  const title = match?.[2] ?? news.title;

  const formattedDate = new Date(news.date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <article
      id={`news-${news.id}`}
      className="glass-card animate-fade-in scroll-mt-28 p-6"
      style={{ animationDelay: `${Math.min(index, 6) * 80}ms` }}
    >
      <div className="flex items-start gap-4">
        <div className={cn('shrink-0 rounded-lg p-3', config.bg)}>
          <TypeIcon className={cn('h-5 w-5', config.text)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2.5">
            <Badge variant="outline" className={cn('border-transparent', config.text, config.bg)}>
              {config.label}
            </Badge>
            {version && (
              <span className="rounded-md border border-border bg-secondary/60 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                v{version}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
          </div>

          <h2 className="mb-1.5 text-xl font-bold text-foreground">{title}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{news.description}</p>

          {expanded && (
            <div id={`news-content-${news.id}`} className="mt-4 border-t border-border/60 pt-4">{renderContent(news.content)}</div>
          )}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={`news-content-${news.id}`}
            aria-label={expanded ? `Réduire : ${title}` : `Lire la suite : ${title}`}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            {expanded ? 'Réduire' : 'Lire la suite'}
            <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}
