import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import type { SuggestionCategory, SuggestionItem } from '@aniquizz/shared';
import {
  SUGGESTION_BODY_MAX,
  SUGGESTION_TITLE_MAX,
} from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SuggestionCorrectionFields } from '@/features/suggestions/components/SuggestionCorrectionFields';
import { SuggestionSongCombobox } from '@/features/suggestions/components/SuggestionSongCombobox';
import {
  SUGGESTION_CATEGORY_LABELS,
  SUGGESTIONS_COPY,
} from '@/features/suggestions/copy/suggestionsCopy';
import { useSuggestionCreateForm } from '@/features/suggestions/hooks/useSuggestionCreateForm';
import { useSuggestionSongSearch } from '@/features/suggestions/hooks/useSuggestionSongSearch';
import { cn } from '@/lib/utils';

const categories: SuggestionCategory[] = ['IMPROVEMENT', 'SONG_REQUEST', 'CORRECTION', 'OTHER'];
const fieldClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20';

interface SuggestionCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (suggestion: SuggestionItem) => void;
}

export function SuggestionCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: SuggestionCreateDialogProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const form = useSuggestionCreateForm({
    onCreated,
    onClose: () => onOpenChange(false),
  });
  const songSearch = useSuggestionSongSearch(open && form.category === 'CORRECTION' && !form.selectedSong);

  const handleOpenChange = (next: boolean) => {
    if (!next && !form.saving) {
      form.reset();
      songSearch.reset();
      setPanelOpen(false);
      setActiveIndex(0);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{SUGGESTIONS_COPY.createTitle}</DialogTitle>
          <DialogDescription>{SUGGESTIONS_COPY.createDescription}</DialogDescription>
          <div className="mt-2 space-y-1 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-xs text-muted-foreground">
            <p>{SUGGESTIONS_COPY.duplicateHint}</p>
            <p className="font-semibold text-warning">{SUGGESTIONS_COPY.postingLimit}</p>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">{SUGGESTIONS_COPY.categoryLegend}</legend>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={form.category === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    form.setCategory(value);
                    if (value !== 'CORRECTION') form.setSelectedSong(null);
                  }}
                  className="justify-start"
                >
                  {SUGGESTION_CATEGORY_LABELS[value]}
                </Button>
              ))}
            </div>
          </fieldset>

          <label className="block space-y-2">
            <span className="text-sm font-semibold">{SUGGESTIONS_COPY.titleLabel}</span>
            <Input
              value={form.title}
              maxLength={SUGGESTION_TITLE_MAX}
              onChange={(event) => form.setTitle(event.target.value)}
              placeholder={SUGGESTIONS_COPY.titlePlaceholder}
            />
            <span className="block text-right text-xs text-muted-foreground">
              {form.title.length}/{SUGGESTION_TITLE_MAX}
            </span>
          </label>

          {form.category === 'CORRECTION' ? (
            <div className="space-y-4 border-l-2 border-aqua/60 bg-aqua/5 p-3">
              <div className="space-y-2">
                <span className="text-sm font-semibold">{SUGGESTIONS_COPY.songLabel}</span>
                <SuggestionSongCombobox
                  query={songSearch.query}
                  onQueryChange={songSearch.setQuery}
                  songs={songSearch.songs}
                  selectedSong={form.selectedSong}
                  onSelect={form.setSelectedSong}
                  onClear={() => form.setSelectedSong(null)}
                  loading={songSearch.loading}
                  loadingMore={songSearch.loadingMore}
                  hasMore={songSearch.hasMore}
                  onLoadMore={songSearch.loadMore}
                  error={songSearch.error}
                  activeIndex={activeIndex}
                  onActiveIndexChange={setActiveIndex}
                  panelOpen={panelOpen}
                  onPanelOpenChange={setPanelOpen}
                />
              </div>
              <SuggestionCorrectionFields
                correctionField={form.correctionField}
                proposedValue={form.proposedValue}
                onCorrectionFieldChange={form.setCorrectionField}
                onProposedValueChange={form.setProposedValue}
              />
            </div>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-semibold">{SUGGESTIONS_COPY.bodyLabel}</span>
            <textarea
              value={form.body}
              maxLength={SUGGESTION_BODY_MAX}
              onChange={(event) => form.setBody(event.target.value)}
              rows={6}
              placeholder={SUGGESTIONS_COPY.bodyPlaceholder}
              className={cn(fieldClass, 'resize-y')}
            />
            <span className="block text-right text-xs text-muted-foreground">
              {form.body.length}/{SUGGESTION_BODY_MAX}
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {form.validationMessage ?? SUGGESTIONS_COPY.readyToPublish}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={form.saving}
            >
              {SUGGESTIONS_COPY.cancel}
            </Button>
            <Button
              type="button"
              onClick={() => void form.submit()}
              disabled={!form.valid || form.saving}
              className="gap-2"
            >
              {form.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {SUGGESTIONS_COPY.publish}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
