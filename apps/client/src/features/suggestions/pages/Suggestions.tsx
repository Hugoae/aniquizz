import { useEffect, useState } from 'react';
import { ArrowLeft, Lightbulb, Loader2, Plus, Search, X } from 'lucide-react';
import type {
  SuggestionCategory,
  SuggestionItem,
  SuggestionSort,
  SuggestionStatus,
  SuggestionsResponse,
} from '@aniquizz/shared';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';
import { SeoHead } from '@/components/seo/SeoHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthModal } from '@/features/auth/context/AuthModalContext';
import { SuggestionCard } from '@/features/suggestions/components/SuggestionCard';
import { SuggestionCreateDialog } from '@/features/suggestions/components/SuggestionCreateDialog';
import {
  SUGGESTION_CATEGORY_LABELS,
  SUGGESTION_STATUS_LABELS,
  SUGGESTIONS_COPY,
} from '@/features/suggestions/copy/suggestionsCopy';
import { suggestionsApi, SuggestionsApiError } from '@/lib/suggestionsApi';
import { isAbortError } from '@/lib/abortError';
import { PAGE_TITLES } from '@/lib/site';
import { useNavigate } from 'react-router-dom';

const categories: SuggestionCategory[] = ['IMPROVEMENT', 'SONG_REQUEST', 'CORRECTION', 'OTHER'];
const statuses: SuggestionStatus[] = ['OPEN', 'PLANNED', 'DONE', 'REJECTED'];
const selectClass =
  'h-10 rounded-lg border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

export default function Suggestions() {
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const { setShowAuthModal } = useAuthModal();
  const [sort, setSort] = useState<SuggestionSort>('top');
  const [category, setCategory] = useState<SuggestionCategory | undefined>();
  const [status, setStatus] = useState<SuggestionStatus | undefined>();
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [votingIds, setVotingIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void suggestionsApi
      .browse({ q: query, sort, category, status, page, pageSize: 20 }, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
      })
      .catch((error) => {
        if (isAbortError(error) || controller.signal.aborted) return;
        toast.error(
          error instanceof SuggestionsApiError ? error.message : SUGGESTIONS_COPY.loadError,
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [category, page, query, sort, status]);

  const openCreate = () => {
    if (!session) {
      setShowAuthModal(true);
      return;
    }
    setCreateOpen(true);
  };

  const toggleVote = async (suggestion: SuggestionItem) => {
    if (!session) {
      toast.info(SUGGESTIONS_COPY.loginToVote);
      setShowAuthModal(true);
      return;
    }
    if (votingIds.has(suggestion.id)) return;

    const wasVoted = suggestion.myVote;
    setVotingIds((current) => new Set(current).add(suggestion.id));
    setData((current) =>
      current
        ? {
            ...current,
            suggestions: current.suggestions.map((item) =>
              item.id === suggestion.id
                ? {
                    ...item,
                    myVote: !wasVoted,
                    voteCount: Math.max(0, item.voteCount + (wasVoted ? -1 : 1)),
                  }
                : item,
            ),
          }
        : current,
    );

    try {
      const result = wasVoted
        ? await suggestionsApi.unvote(suggestion.id)
        : await suggestionsApi.vote(suggestion.id);
      setData((current) =>
        current
          ? {
              ...current,
              suggestions: current.suggestions.map((item) =>
                item.id === suggestion.id
                  ? { ...item, myVote: result.voted, voteCount: result.voteCount }
                  : item,
              ),
            }
          : current,
      );
    } catch (error) {
      setData((current) =>
        current
          ? {
              ...current,
              suggestions: current.suggestions.map((item) =>
                item.id === suggestion.id
                  ? { ...item, myVote: wasVoted, voteCount: suggestion.voteCount }
                  : item,
              ),
            }
          : current,
      );
      toast.error(
        error instanceof SuggestionsApiError ? error.message : SUGGESTIONS_COPY.voteError,
      );
    } finally {
      setVotingIds((current) => {
        const next = new Set(current);
        next.delete(suggestion.id);
        return next;
      });
    }
  };

  const deleteSuggestion = async (suggestion: SuggestionItem) => {
    if (!window.confirm(SUGGESTIONS_COPY.deleteConfirm)) return;
    try {
      await suggestionsApi.deleteOwn(suggestion.id);
      setData((current) =>
        current
          ? {
              ...current,
              suggestions: current.suggestions.filter((item) => item.id !== suggestion.id),
              pagination: {
                ...current.pagination,
                totalItems: Math.max(0, current.pagination.totalItems - 1),
              },
            }
          : current,
      );
      toast.success(SUGGESTIONS_COPY.deleteSuccess);
    } catch (error) {
      toast.error(
        error instanceof SuggestionsApiError ? error.message : SUGGESTIONS_COPY.deleteError,
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SeoHead title={PAGE_TITLES.suggestions} path="/suggestions" />
      <Header />
      <main id="main-content" className="container pb-16 pt-24">
        <div className="mx-auto max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6 gap-2 pl-0 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {SUGGESTIONS_COPY.backHome}
          </Button>

          <section className="relative mb-8 overflow-hidden border-b border-border pb-8">
            <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                  <span className="gradient-text">{SUGGESTIONS_COPY.title}</span>
                </h1>
                <p className="mt-3 max-w-2xl text-muted-foreground">
                  {SUGGESTIONS_COPY.subtitle}
                </p>
              </div>
              <Button variant="glow" size="lg" onClick={openCreate} className="shrink-0 gap-2">
                <Plus className="h-5 w-5" />
                {SUGGESTIONS_COPY.create}
              </Button>
            </div>
          </section>

          <div className="mb-5 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={SUGGESTIONS_COPY.searchPlaceholder}
                className="pl-9 pr-10"
                aria-label={SUGGESTIONS_COPY.searchAria}
              />
              {searchInput ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchInput('')}
                  className="absolute right-1 top-1 h-8 w-8 text-muted-foreground"
                  aria-label={SUGGESTIONS_COPY.clearSearchAria}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <div className="flex rounded-lg border border-border bg-card p-1">
                {(['top', 'recent'] as SuggestionSort[]).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={sort === value ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setSort(value);
                      setPage(1);
                    }}
                    className="flex-1 sm:flex-none"
                  >
                    {value === 'top' ? SUGGESTIONS_COPY.top : SUGGESTIONS_COPY.recent}
                  </Button>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={category ?? ''}
                  onChange={(event) => {
                    setCategory((event.target.value || undefined) as SuggestionCategory | undefined);
                    setPage(1);
                  }}
                  className={selectClass}
                  aria-label={SUGGESTIONS_COPY.filterCategoryAria}
                >
                  <option value="">{SUGGESTIONS_COPY.allCategories}</option>
                  {categories.map((value) => (
                    <option key={value} value={value}>
                      {SUGGESTION_CATEGORY_LABELS[value]}
                    </option>
                  ))}
                </select>
                <select
                  value={status ?? ''}
                  onChange={(event) => {
                    setStatus((event.target.value || undefined) as SuggestionStatus | undefined);
                    setPage(1);
                  }}
                  className={selectClass}
                  aria-label={SUGGESTIONS_COPY.filterStatusAria}
                >
                  <option value="">{SUGGESTIONS_COPY.allStatuses}</option>
                  {statuses.map((value) => (
                    <option key={value} value={value}>
                      {SUGGESTION_STATUS_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" aria-label={SUGGESTIONS_COPY.loadingAria} />
            </div>
          ) : data?.suggestions.length ? (
            <div className="space-y-4">
              {data.suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  voting={votingIds.has(suggestion.id)}
                  canDelete={profile?.id === suggestion.author?.id}
                  onVote={(item) => void toggleVote(item)}
                  onDelete={(item) => void deleteSuggestion(item)}
                />
              ))}
            </div>
          ) : (
            <div className="glass-card py-16 text-center">
              <Lightbulb className="mx-auto h-9 w-9 text-muted-foreground" />
              <p className="mt-4 font-bold">{SUGGESTIONS_COPY.empty}</p>
              <button className="mt-1 text-sm text-primary hover:underline" onClick={openCreate}>
                {SUGGESTIONS_COPY.emptyAction}
              </button>
            </div>
          )}

          {data && data.pagination.totalPages > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                {SUGGESTIONS_COPY.previousPage}
              </Button>
              <span className="text-sm text-muted-foreground">
                {SUGGESTIONS_COPY.pageStatus(page, data.pagination.totalPages)}
              </span>
              <Button
                variant="outline"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                {SUGGESTIONS_COPY.nextPage}
              </Button>
            </div>
          ) : null}
        </div>
      </main>

      <SuggestionCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(suggestion) => {
          setSort('recent');
          setCategory(undefined);
          setStatus(undefined);
          setSearchInput('');
          setQuery('');
          setPage(1);
          setData((current) =>
            current
              ? {
                  ...current,
                  suggestions: [suggestion, ...current.suggestions].slice(0, 20),
                  pagination: {
                    ...current.pagination,
                    totalItems: current.pagination.totalItems + 1,
                  },
                }
              : current,
          );
        }}
      />
    </div>
  );
}
