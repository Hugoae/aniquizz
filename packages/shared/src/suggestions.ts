import type { LibraryDifficulty, LibrarySongType } from './library';

export const SUGGESTION_TITLE_MAX = 120;
export const SUGGESTION_BODY_MAX = 2_000;
export const SUGGESTION_PROPOSED_VALUE_MAX = 240;
export const SUGGESTION_ADMIN_REPLY_MAX = 2_000;
export const SUGGESTION_DAILY_LIMIT = 5;
export const SUGGESTION_SONG_OPTIONS_PAGE_SIZE = 20;
export const SUGGESTION_SONG_OPTIONS_MAX_PAGE_SIZE = 24;

export type SuggestionCategory = 'IMPROVEMENT' | 'SONG_REQUEST' | 'CORRECTION' | 'OTHER';
export type SuggestionStatus = 'OPEN' | 'PLANNED' | 'DONE' | 'REJECTED';
export type SuggestionCorrectionField = 'TITLE' | 'ARTIST' | 'DIFFICULTY' | 'OTHER';
export type SuggestionSort = 'top' | 'recent';

export interface SuggestionAuthor {
  id: string;
  username: string;
  avatar: string;
}

export interface SuggestionSongRef {
  id: number;
  title: string;
  artist: string;
  songType: LibrarySongType;
  difficulty: LibraryDifficulty;
  animeName: string;
}

export interface SuggestionItem {
  id: string;
  author: SuggestionAuthor | null;
  category: SuggestionCategory;
  status: SuggestionStatus;
  title: string;
  body: string;
  song: SuggestionSongRef | null;
  correctionField: SuggestionCorrectionField | null;
  proposedValue: string | null;
  voteCount: number;
  myVote: boolean;
  locked: boolean;
  adminReply: string | null;
  adminRepliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SuggestionsBrowseParams {
  q?: string;
  sort?: SuggestionSort;
  category?: SuggestionCategory;
  status?: SuggestionStatus;
  page?: number;
  pageSize?: number;
}

export interface SuggestionsResponse {
  suggestions: SuggestionItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface SuggestionCreateInput {
  category: SuggestionCategory;
  title: string;
  body: string;
  songId?: number;
  correctionField?: SuggestionCorrectionField;
  proposedValue?: string;
}

export interface SuggestionVoteResponse {
  suggestionId: string;
  voted: boolean;
  voteCount: number;
}

export interface SuggestionAdminUpdateInput {
  status?: SuggestionStatus;
  adminReply?: string | null;
}

export interface SuggestionSongOption {
  id: number;
  title: string;
  artist: string;
  songType: LibrarySongType;
  sequence: number;
  difficulty: LibraryDifficulty;
  animeName: string;
  coverImage: string | null;
}

export interface SuggestionSongOptionsParams {
  q: string;
  page?: number;
  pageSize?: number;
}

export interface SuggestionSongOptionsResponse {
  songs: SuggestionSongOption[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
