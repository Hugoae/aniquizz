import { useEffect, useState } from 'react';
import { Loader2, MessageSquareText, RefreshCw, Save, Trash2 } from 'lucide-react';
import type {
  SuggestionCategory,
  SuggestionItem,
  SuggestionStatus,
  SuggestionsResponse,
} from '@aniquizz/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SuggestionCard } from '@/features/suggestions/components/SuggestionCard';
import {
  SUGGESTION_CATEGORY_LABELS,
  SUGGESTION_STATUS_LABELS,
  SUGGESTIONS_COPY,
} from '@/features/suggestions/copy/suggestionsCopy';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { isAbortError } from '@/lib/abortError';
import { suggestionsApi, SuggestionsApiError } from '@/lib/suggestionsApi';

const categories: SuggestionCategory[] = ['IMPROVEMENT', 'SONG_REQUEST', 'CORRECTION', 'OTHER'];
const statuses: SuggestionStatus[] = ['OPEN', 'PLANNED', 'DONE', 'REJECTED'];
const controlClass =
  'h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

interface SuggestionsPanelProps {
  canManage: boolean;
}

export function SuggestionsPanel({ canManage }: SuggestionsPanelProps) {
  const [category, setCategory] = useState<SuggestionCategory | undefined>();
  const [status, setStatus] = useState<SuggestionStatus | undefined>();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftReplies, setDraftReplies] = useState<Record<string, string>>({});
  const [draftStatuses, setDraftStatuses] = useState<Record<string, SuggestionStatus>>({});
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void suggestionsApi
      .browse({ sort: 'top', category, status, page, pageSize: 20 }, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setDraftReplies(
          Object.fromEntries(result.suggestions.map((item) => [item.id, item.adminReply ?? ''])),
        );
        setDraftStatuses(
          Object.fromEntries(result.suggestions.map((item) => [item.id, item.status])),
        );
      })
      .catch((error) => {
        if (isAbortError(error) || controller.signal.aborted) return;
        toast.error(
          error instanceof SuggestionsApiError ? error.message : SUGGESTIONS_COPY.adminLoadError,
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [category, page, reloadToken, status]);

  const save = async (item: SuggestionItem) => {
    setSavingId(item.id);
    try {
      const updated = await adminApi.updateSuggestion(item.id, {
        status: draftStatuses[item.id] ?? item.status,
        adminReply: draftReplies[item.id]?.trim() || null,
      });
      setData((current) =>
        current
          ? {
              ...current,
              suggestions: current.suggestions.map((entry) =>
                entry.id === item.id ? updated : entry,
              ),
            }
          : current,
      );
      toast.success(SUGGESTIONS_COPY.adminUpdateSuccess);
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : SUGGESTIONS_COPY.adminUpdateError);
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (item: SuggestionItem) => {
    if (!window.confirm(SUGGESTIONS_COPY.adminDeleteConfirm)) return;
    setSavingId(item.id);
    try {
      await adminApi.deleteSuggestion(item.id);
      toast.success(SUGGESTIONS_COPY.adminDeleteSuccess);
      setReloadToken((current) => current + 1);
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : SUGGESTIONS_COPY.adminDeleteError);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold">{SUGGESTIONS_COPY.adminTitle}</h2>
          <p className="text-sm text-muted-foreground">{SUGGESTIONS_COPY.adminSubtitle}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setReloadToken((current) => current + 1)}
          disabled={loading}
        >
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          {SUGGESTIONS_COPY.adminRefresh}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-3">
        <select
          value={category ?? ''}
          onChange={(event) => {
            setCategory((event.target.value || undefined) as SuggestionCategory | undefined);
            setPage(1);
          }}
          className={controlClass}
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
          className={controlClass}
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

      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : data?.suggestions.length ? (
        <div className="space-y-6">
          {data.suggestions.map((item) => (
            <div key={item.id} className="space-y-2">
              <SuggestionCard suggestion={item} voting onVote={() => undefined} />
              <div className="glass-card border border-border/70 p-4">
                <div className="grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-end">
                  <label className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {SUGGESTIONS_COPY.adminStatus}
                    </span>
                    <select
                      value={draftStatuses[item.id] ?? item.status}
                      onChange={(event) =>
                        setDraftStatuses((current) => ({
                          ...current,
                          [item.id]: event.target.value as SuggestionStatus,
                        }))
                      }
                      className={`${controlClass} w-full`}
                    >
                      {statuses.map((value) => (
                        <option key={value} value={value}>
                          {SUGGESTION_STATUS_LABELS[value]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <MessageSquareText className="h-3.5 w-3.5" />
                      {SUGGESTIONS_COPY.adminReplyLabel}
                    </span>
                    <textarea
                      value={draftReplies[item.id] ?? ''}
                      onChange={(event) =>
                        setDraftReplies((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      maxLength={2000}
                      rows={2}
                      placeholder={SUGGESTIONS_COPY.adminReplyPlaceholder}
                      className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => void save(item)}
                      disabled={savingId === item.id}
                      className="gap-2"
                    >
                      {savingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {SUGGESTIONS_COPY.adminSave}
                    </Button>
                    {canManage ? (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => void remove(item)}
                        disabled={savingId === item.id}
                        className="text-destructive hover:text-destructive"
                        aria-label={SUGGESTIONS_COPY.adminDeleteAria}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card py-14 text-center text-muted-foreground">
          {SUGGESTIONS_COPY.adminEmpty}
        </div>
      )}

      {data && data.pagination.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {SUGGESTIONS_COPY.previousPage}
          </Button>
          <span className="text-sm text-muted-foreground">
            {SUGGESTIONS_COPY.pageStatus(page, data.pagination.totalPages)}
          </span>
          <Button
            variant="outline"
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            {SUGGESTIONS_COPY.nextPage}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
