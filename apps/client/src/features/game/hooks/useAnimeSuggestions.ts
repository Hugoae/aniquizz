import { useEffect, useRef, useState } from 'react';
import {
  GAME_CONFIG,
  getFuzzySuggestions,
  type AnimeListEntry,
  type AnimeSuggestion,
} from '@aniquizz/shared';

const DEBOUNCE_MS = 100;

interface UseAnimeSuggestionsArgs {
  animeList: AnimeListEntry[];
  query: string;
  precision?: 'franchise' | 'exact';
  enabled?: boolean;
}

/**
 * Debounced anime autocomplete for the in-game typing bar. Runs the search on
 * the main thread for small catalogues; offloads to a Web Worker above the
 * configured threshold so keystrokes stay smooth on large lists.
 */
export function useAnimeSuggestions({
  animeList,
  query,
  precision = 'franchise',
  enabled = true,
}: UseAnimeSuggestionsArgs): AnimeSuggestion[] {
  const [suggestions, setSuggestions] = useState<AnimeSuggestion[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const workerThreshold = GAME_CONFIG.FUZZY.SUGGESTION_WORKER_THRESHOLD;

  useEffect(() => {
    if (animeList.length <= workerThreshold) return;

    const worker = new Worker(new URL('../workers/animeSuggest.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    const onMessage = (event: MessageEvent<{ id: number; results: AnimeSuggestion[] }>) => {
      if (event.data.id === requestIdRef.current) {
        setSuggestions(event.data.results);
      }
    };
    worker.addEventListener('message', onMessage);

    return () => {
      worker.removeEventListener('message', onMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, [animeList.length, workerThreshold]);

  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      return;
    }

    const handle = window.setTimeout(() => {
      const worker = workerRef.current;
      if (animeList.length > workerThreshold && worker) {
        const id = ++requestIdRef.current;
        worker.postMessage({ id, list: animeList, query, precision });
        return;
      }

      setSuggestions(getFuzzySuggestions(animeList, query, precision));
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [animeList, query, precision, enabled, workerThreshold]);

  return suggestions;
}
