import axios from 'axios';
import { formatDuration, parseRetryAfterMs } from './progress';

const ANILIST_API = 'https://graphql.anilist.co';
const PAGE_SIZE = 50;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export interface EligibleAniListRanking {
  selectedIds: number[];
  skippedIds: number[];
}

/**
 * Fetch exactly N eligible ids from AniList's live POPULARITY_DESC list.
 *
 * Eligibility comes from the caller's current catalogue snapshot. Intentionally
 * excluded or not-yet-imported entries are reported and replaced by the next
 * ranked entry, which keeps targeted backfills deterministic and full-sized.
 */
export async function fetchLiveTopAniListIds(
  limit: number,
  eligibleIds: Set<number>,
  requestDelayMs: number,
): Promise<EligibleAniListRanking> {
  const query = `
    query ($page: Int!, $perPage: Int!) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media(sort: POPULARITY_DESC, type: ANIME) {
          id
          status
        }
      }
    }
  `;
  const selectedIds: number[] = [];
  const skippedIds: number[] = [];
  let page = 1;

  while (selectedIds.length < limit) {
    let response;
    try {
      response = await axios.post(
        ANILIST_API,
        { query, variables: { page, perPage: PAGE_SIZE } },
        { timeout: 25000 },
      );
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const wait = parseRetryAfterMs(error.response.headers, 30000);
        console.log(`\n🛑 AniList rate limit. Waiting ${formatDuration(wait)}...`);
        await delay(wait);
        continue;
      }
      throw error;
    }

    if (Array.isArray(response.data?.errors) && response.data.errors.length > 0) {
      throw new Error(
        `AniList top query failed: ${response.data.errors[0]?.message ?? 'unknown error'}`,
      );
    }

    const media = response.data?.data?.Page?.media;
    if (!Array.isArray(media) || media.length === 0) break;
    for (const entry of media) {
      if (!['FINISHED', 'RELEASING'].includes(entry?.status) || !Number.isInteger(entry?.id)) {
        continue;
      }
      if (eligibleIds.has(entry.id)) {
        selectedIds.push(entry.id);
      } else {
        skippedIds.push(entry.id);
      }
      if (selectedIds.length >= limit) break;
    }

    if (!response.data?.data?.Page?.pageInfo?.hasNextPage) break;
    page++;
    await delay(requestDelayMs);
  }

  if (selectedIds.length < limit) {
    throw new Error(
      `AniList returned only ${selectedIds.length} eligible catalogue anime for a requested top ${limit}.`,
    );
  }
  return { selectedIds, skippedIds };
}
