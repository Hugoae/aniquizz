import { getFuzzySuggestions, type FuzzyAnimeCandidate } from '@aniquizz/shared';

export interface SuggestWorkerRequest {
  id: number;
  list: FuzzyAnimeCandidate[];
  query: string;
  precision: 'franchise' | 'exact';
}

export interface SuggestWorkerResponse {
  id: number;
  results: ReturnType<typeof getFuzzySuggestions>;
}

self.onmessage = (event: MessageEvent<SuggestWorkerRequest>) => {
  const { id, list, query, precision } = event.data;
  const results = getFuzzySuggestions(list, query, precision);
  const payload: SuggestWorkerResponse = { id, results };
  self.postMessage(payload);
};
