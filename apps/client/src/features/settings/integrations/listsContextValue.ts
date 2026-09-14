import { createContext, useContext } from 'react';
import type { ListOperation, ListsStatusPayload, WatchedListProvider } from '@aniquizz/shared';

export interface PendingListOperation {
  requestId: string;
  operation: ListOperation;
  provider: WatchedListProvider;
}

export interface ListOperationOutcome {
  requestId: string;
  success: boolean;
}

export interface ListsContextValue {
  status: ListsStatusPayload;
  loading: boolean;
  pending: PendingListOperation | null;
  outcome: ListOperationOutcome | null;
  refreshStatus: () => void;
  link: (provider: WatchedListProvider, username: string) => string | null;
  setActive: (provider: WatchedListProvider) => string | null;
  sync: (provider: WatchedListProvider) => string | null;
  unlink: (provider: WatchedListProvider) => string | null;
}

export const ListsContext = createContext<ListsContextValue | null>(null);

export function useLists(): ListsContextValue {
  const value = useContext(ListsContext);
  if (!value) throw new Error('useLists must be used within ListsProvider');
  return value;
}
