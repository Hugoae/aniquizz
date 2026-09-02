import {
  isBotId,
  prisma,
  type Prisma,
  type SuggestionCategory as DbSuggestionCategory,
  type SuggestionCorrectionField as DbSuggestionCorrectionField,
  type SuggestionStatus as DbSuggestionStatus,
} from '@aniquizz/database';
import {
  SUGGESTION_DAILY_LIMIT,
  type SuggestionAdminUpdateInput,
  type SuggestionCreateInput,
  type SuggestionItem,
  type SuggestionStatus,
  type SuggestionsBrowseParams,
  type SuggestionsResponse,
  type SuggestionVoteResponse,
} from '@aniquizz/shared';
import { consumeRateLimitBucket, HTTP_RATE_LIMITS } from '../../core/httpRateLimit';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export class SuggestionError extends Error {
  constructor(
    message: string,
    readonly code: 'INVALID' | 'NOT_FOUND' | 'FORBIDDEN' | 'LIMIT' | 'CLOSED',
  ) {
    super(message);
    this.name = 'SuggestionError';
  }
}

const suggestionSelect = {
  id: true,
  category: true,
  status: true,
  title: true,
  body: true,
  correctionField: true,
  proposedValue: true,
  voteCount: true,
  adminReply: true,
  adminRepliedAt: true,
  staffTreatedAt: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, username: true, avatar: true } },
  song: {
    select: {
      id: true,
      title: true,
      artist: true,
      songType: true,
      difficulty: true,
      anime: { select: { name: true } },
    },
  },
} satisfies Prisma.SuggestionSelect;

type SuggestionRow = Prisma.SuggestionGetPayload<{ select: typeof suggestionSelect }>;

const mapSuggestion = (row: SuggestionRow, votedIds: ReadonlySet<string>): SuggestionItem => ({
  id: row.id,
  author: row.author,
  category: row.category,
  status: row.status,
  title: row.title,
  body: row.body,
  song: row.song
    ? {
        id: row.song.id,
        title: row.song.title,
        artist: row.song.artist,
        songType: row.song.songType,
        difficulty: row.song.difficulty,
        animeName: row.song.anime.name,
      }
    : null,
  correctionField: row.correctionField,
  proposedValue: row.proposedValue,
  voteCount: row.voteCount,
  myVote: votedIds.has(row.id),
  locked: row.staffTreatedAt != null,
  adminReply: row.adminReply,
  adminRepliedAt: row.adminRepliedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const resolveVotedIds = async (profileId: string, suggestionIds: string[]): Promise<Set<string>> => {
  if (!suggestionIds.length) return new Set();
  const votes = await prisma.suggestionVote.findMany({
    where: { profileId, suggestionId: { in: suggestionIds } },
    select: { suggestionId: true },
  });
  return new Set(votes.map((vote) => vote.suggestionId));
};

export const browseSuggestions = async (
  opts: SuggestionsBrowseParams,
  viewerId?: string | null,
): Promise<SuggestionsResponse> => {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(Math.max(1, Math.floor(opts.pageSize ?? DEFAULT_PAGE_SIZE)), MAX_PAGE_SIZE);
  const queryTerms = opts.q?.trim().split(/\s+/).filter(Boolean).slice(0, 8) ?? [];
  const searchTerm = (term: string): Prisma.SuggestionWhereInput => ({
    OR: [
      { title: { contains: term, mode: 'insensitive' } },
      { body: { contains: term, mode: 'insensitive' } },
      { proposedValue: { contains: term, mode: 'insensitive' } },
      { adminReply: { contains: term, mode: 'insensitive' } },
      { author: { username: { contains: term, mode: 'insensitive' } } },
      { song: { title: { contains: term, mode: 'insensitive' } } },
      { song: { artist: { contains: term, mode: 'insensitive' } } },
      { song: { anime: { name: { contains: term, mode: 'insensitive' } } } },
    ],
  });
  const where: Prisma.SuggestionWhereInput = {
    ...(opts.category ? { category: opts.category as DbSuggestionCategory } : {}),
    ...(opts.status ? { status: opts.status as DbSuggestionStatus } : {}),
    ...(queryTerms.length ? { AND: queryTerms.map(searchTerm) } : {}),
  };
  const orderBy: Prisma.SuggestionOrderByWithRelationInput[] =
    opts.sort === 'recent'
      ? [{ createdAt: 'desc' }]
      : [{ statusRank: 'asc' }, { voteCount: 'desc' }, { createdAt: 'desc' }];

  const [totalItems, rows] = await Promise.all([
    prisma.suggestion.count({ where }),
    prisma.suggestion.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: suggestionSelect,
    }),
  ]);
  const votedIds = viewerId
    ? await resolveVotedIds(
        viewerId,
        rows.map((row) => row.id),
      )
    : new Set<string>();

  return {
    suggestions: rows.map((row) => mapSuggestion(row, votedIds)),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
  };
};

export const getSuggestion = async (
  suggestionId: string,
  viewerId?: string | null,
): Promise<SuggestionItem> => {
  const row = await prisma.suggestion.findUnique({
    where: { id: suggestionId },
    select: suggestionSelect,
  });
  if (!row) throw new SuggestionError('Suggestion introuvable.', 'NOT_FOUND');
  const votedIds = viewerId ? await resolveVotedIds(viewerId, [suggestionId]) : new Set<string>();
  return mapSuggestion(row, votedIds);
};

export const createSuggestion = async (
  authorId: string,
  input: SuggestionCreateInput,
): Promise<SuggestionItem> => {
  if (isBotId(authorId)) {
    throw new SuggestionError('Action non autorisée pour ce compte.', 'FORBIDDEN');
  }
  if (input.category === 'CORRECTION') {
    if (!input.songId || !input.correctionField || !input.proposedValue?.trim()) {
      throw new SuggestionError('La correction doit préciser le son, le champ et la valeur.', 'INVALID');
    }
    const song = await prisma.song.findFirst({
      where: { id: input.songId, downloadStatus: 'COMPLETED' },
      select: { id: true },
    });
    if (!song) throw new SuggestionError('Son introuvable ou non jouable.', 'INVALID');
  }

  const quota = await consumeRateLimitBucket(
    'suggestion-create',
    authorId,
    HTTP_RATE_LIMITS.suggestionCreate.max,
    HTTP_RATE_LIMITS.suggestionCreate.windowMs,
  );
  if (!quota.allowed) {
    throw new SuggestionError(
      `Vous pouvez proposer ${SUGGESTION_DAILY_LIMIT} idées par période de 24 heures.`,
      'LIMIT',
    );
  }

  const row = await prisma.suggestion.create({
    data: {
      authorId,
      category: input.category as DbSuggestionCategory,
      title: input.title.trim(),
      body: input.body.trim(),
      ...(input.category === 'CORRECTION'
        ? {
            songId: input.songId,
            correctionField: input.correctionField as DbSuggestionCorrectionField,
            proposedValue: input.proposedValue?.trim(),
          }
        : {}),
    },
    select: suggestionSelect,
  });
  return mapSuggestion(row, new Set());
};

export const voteSuggestion = async (
  profileId: string,
  suggestionId: string,
): Promise<SuggestionVoteResponse> => {
  if (isBotId(profileId)) throw new SuggestionError('Action non autorisée.', 'FORBIDDEN');
  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT id, status FROM "Suggestion" WHERE id = ${suggestionId} FOR UPDATE
    `;
    if (!locked[0]) throw new SuggestionError('Suggestion introuvable.', 'NOT_FOUND');
    if (locked[0].status !== 'OPEN') {
      throw new SuggestionError("Cette suggestion n'accepte plus de votes.", 'CLOSED');
    }

    const created = await tx.suggestionVote.createMany({
      data: [{ suggestionId, profileId }],
      skipDuplicates: true,
    });
    if (created.count > 0) {
      await tx.suggestion.update({
        where: { id: suggestionId },
        data: { voteCount: { increment: created.count } },
      });
    }

    const current = await tx.suggestion.findUnique({
      where: { id: suggestionId },
      select: { voteCount: true },
    });
    return current?.voteCount ?? 0;
  });
  return { suggestionId, voted: true, voteCount: result };
};

export const unvoteSuggestion = async (
  profileId: string,
  suggestionId: string,
): Promise<SuggestionVoteResponse> => {
  if (isBotId(profileId)) throw new SuggestionError('Action non autorisée.', 'FORBIDDEN');
  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Suggestion" WHERE id = ${suggestionId} FOR UPDATE
    `;
    if (!locked[0]) throw new SuggestionError('Suggestion introuvable.', 'NOT_FOUND');

    const deleted = await tx.suggestionVote.deleteMany({ where: { suggestionId, profileId } });
    if (deleted.count > 0) {
      await tx.$executeRaw`
        UPDATE "Suggestion"
        SET "voteCount" = GREATEST("voteCount" - ${deleted.count}, 0)
        WHERE id = ${suggestionId}
      `;
    }

    const current = await tx.suggestion.findUnique({
      where: { id: suggestionId },
      select: { voteCount: true },
    });
    return current?.voteCount ?? 0;
  });
  return { suggestionId, voted: false, voteCount: result };
};

export const deleteOwnSuggestion = async (authorId: string, suggestionId: string): Promise<void> => {
  const deleted = await prisma.suggestion.deleteMany({
    where: { id: suggestionId, authorId, staffTreatedAt: null },
  });
  if (deleted.count) return;

  const existing = await prisma.suggestion.findFirst({
    where: { id: suggestionId, authorId },
    select: { id: true },
  });
  if (existing) {
    throw new SuggestionError('Cette suggestion a déjà été traitée et ne peut plus être supprimée.', 'FORBIDDEN');
  }
  throw new SuggestionError('Suggestion introuvable.', 'NOT_FOUND');
};

const STATUS_RANK: Record<SuggestionStatus, number> = {
  OPEN: 0,
  PLANNED: 1,
  DONE: 2,
  REJECTED: 3,
};

export const updateSuggestionByStaff = async (
  suggestionId: string,
  input: SuggestionAdminUpdateInput,
): Promise<SuggestionItem> => {
  const existing = await prisma.suggestion.findUnique({
    where: { id: suggestionId },
    select: { id: true, staffTreatedAt: true },
  });
  if (!existing) throw new SuggestionError('Suggestion introuvable.', 'NOT_FOUND');

  const data: Prisma.SuggestionUpdateInput = {};
  if (input.status) {
    data.status = input.status as DbSuggestionStatus;
    data.statusRank = STATUS_RANK[input.status];
  }
  if (input.adminReply !== undefined) {
    const reply = input.adminReply?.trim() || null;
    data.adminReply = reply;
    data.adminRepliedAt = reply ? new Date() : null;
  }

  const shouldLock =
    (input.status !== undefined && input.status !== 'OPEN') ||
    Boolean(input.adminReply?.trim());
  if (shouldLock && !existing.staffTreatedAt) {
    data.staffTreatedAt = new Date();
  }

  const row = await prisma.suggestion.update({
    where: { id: suggestionId },
    data,
    select: suggestionSelect,
  });
  return mapSuggestion(row, new Set());
};

export const deleteSuggestionByStaff = async (suggestionId: string): Promise<void> => {
  const deleted = await prisma.suggestion.deleteMany({ where: { id: suggestionId } });
  if (!deleted.count) throw new SuggestionError('Suggestion introuvable.', 'NOT_FOUND');
};

/** Preserve staff-treated ideas anonymously when a profile is erased. */
export const prepareSuggestionsForAccountDeletion = async (userId: string): Promise<void> => {
  const votes = await prisma.suggestionVote.groupBy({
    by: ['suggestionId'],
    where: { profileId: userId },
    _count: { _all: true },
  });
  for (const vote of votes) {
    await prisma.$executeRaw`
      UPDATE "Suggestion"
      SET "voteCount" = GREATEST("voteCount" - ${vote._count._all}, 0)
      WHERE id = ${vote.suggestionId}
    `;
  }
  await prisma.suggestionVote.deleteMany({ where: { profileId: userId } });
  await prisma.suggestion.deleteMany({ where: { authorId: userId, staffTreatedAt: null } });
  await prisma.suggestion.updateMany({ where: { authorId: userId }, data: { authorId: null } });
};
