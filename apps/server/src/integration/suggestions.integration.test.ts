import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@aniquizz/database';
import type { SuggestionItem, SuggestionSongOptionsResponse, SuggestionsResponse } from '@aniquizz/shared';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { hasIntegrationEnv } from '../test/env';
import { getTestAccessToken, TEST_USER_IDS } from '../test/testJwt';
import { prepareSuggestionsForAccountDeletion } from '../modules/feedback/suggestionService';

const TEST_PREFIX = '[integration:suggestions]';

describe.skipIf(!hasIntegrationEnv)('suggestions integration', () => {
  let bundle: ServerBundle;
  let token: string;
  let songId: number;
  let songAnimeName: string;

  const authHeaders = () => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  const create = async (suffix: string): Promise<SuggestionItem> => {
    const response = await fetch(`${bundle.url}/suggestions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        category: 'IMPROVEMENT',
        title: `${TEST_PREFIX} ${suffix}`,
        body: 'Une description suffisamment longue pour le test d’intégration.',
      }),
    });
    expect(response.status).toBe(201);
    return (await response.json()) as SuggestionItem;
  };

  beforeAll(async () => {
    await prisma.suggestion.deleteMany({
      where: { title: { startsWith: TEST_PREFIX } },
    });
    bundle = await createServerBundle();
    token = await getTestAccessToken('admin');
    const song = await prisma.song.findFirst({
      where: { downloadStatus: 'COMPLETED' },
      include: { anime: { select: { name: true } } },
    });
    expect(song).toBeTruthy();
    songId = song!.id;
    songAnimeName = song!.anime.name;
  });

  beforeEach(async () => {
    await prisma.httpRateLimitBucket.deleteMany();
    await prisma.suggestion.deleteMany({
      where: { title: { startsWith: TEST_PREFIX } },
    });
  });

  afterAll(async () => {
    await prisma.suggestion.deleteMany({
      where: { title: { startsWith: TEST_PREFIX } },
    });
    await prisma.httpRateLimitBucket.deleteMany();
    await bundle.close();
  });

  it('GET /suggestions is publicly readable', async () => {
    const response = await fetch(`${bundle.url}/suggestions`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as SuggestionsResponse;
    expect(body.suggestions).toBeInstanceOf(Array);
    expect(body.pagination.page).toBe(1);
  });

  it('validates structured catalogue corrections', async () => {
    const invalid = await fetch(`${bundle.url}/suggestions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        category: 'CORRECTION',
        title: `${TEST_PREFIX} correction`,
        body: 'Cette correction ne précise aucun son du catalogue.',
      }),
    });
    expect(invalid.status).toBe(400);

    const invalidDifficulty = await fetch(`${bundle.url}/suggestions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        category: 'CORRECTION',
        title: `${TEST_PREFIX} difficulté invalide`,
        body: 'Cette correction utilise une difficulté qui n’existe pas.',
        songId,
        correctionField: 'DIFFICULTY',
        proposedValue: 'IMPOSSIBLE',
      }),
    });
    expect(invalidDifficulty.status).toBe(400);

    const valid = await fetch(`${bundle.url}/suggestions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        category: 'CORRECTION',
        title: `${TEST_PREFIX} artiste`,
        body: 'Le nom de cet artiste semble incorrect dans le catalogue.',
        songId,
        correctionField: 'ARTIST',
        proposedValue: 'Artiste corrigé',
      }),
    });
    expect(valid.status).toBe(201);
    const body = (await valid.json()) as SuggestionItem;
    expect(body.song?.id).toBe(songId);
    expect(body.correctionField).toBe('ARTIST');
  });

  it('creates suggestions and exposes the authenticated vote flag', async () => {
    const suggestion = await create('création');
    expect(suggestion.author?.id).toBe(TEST_USER_IDS.admin);
    expect(suggestion.status).toBe('OPEN');
    expect(suggestion.voteCount).toBe(0);
    expect(suggestion.myVote).toBe(false);
    expect(suggestion.locked).toBe(false);
  });

  it('searches suggestion text and combines the status filter', async () => {
    const suggestion = await create('recherche ciblée');
    const found = await fetch(
      `${bundle.url}/suggestions?q=${encodeURIComponent('ciblée')}&status=OPEN`,
    );
    expect(found.status).toBe(200);
    const foundBody = (await found.json()) as SuggestionsResponse;
    expect(foundBody.suggestions.some((item) => item.id === suggestion.id)).toBe(true);

    const excluded = await fetch(
      `${bundle.url}/suggestions?q=${encodeURIComponent('ciblée')}&status=REJECTED`,
    );
    const excludedBody = (await excluded.json()) as SuggestionsResponse;
    expect(excludedBody.suggestions.some((item) => item.id === suggestion.id)).toBe(false);
  });

  it('votes concurrently without duplicating the unique vote', async () => {
    const suggestion = await create('vote concurrent');
    const [first, second] = await Promise.all([
      fetch(`${bundle.url}/suggestions/${suggestion.id}/vote`, {
        method: 'PUT',
        headers: authHeaders(),
      }),
      fetch(`${bundle.url}/suggestions/${suggestion.id}/vote`, {
        method: 'PUT',
        headers: authHeaders(),
      }),
    ]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await first.json()).voteCount).toBe(1);
    expect((await second.json()).voteCount).toBe(1);
    expect(await prisma.suggestionVote.count({ where: { suggestionId: suggestion.id } })).toBe(1);
  });

  it('rejects votes once the suggestion is no longer open', async () => {
    const suggestion = await create('vote fermé');
    await fetch(`${bundle.url}/admin/suggestions/${suggestion.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: 'PLANNED' }),
    });
    const response = await fetch(`${bundle.url}/suggestions/${suggestion.id}/vote`, {
      method: 'PUT',
      headers: authHeaders(),
    });
    expect(response.status).toBe(409);
  });

  it('sorts top suggestions by open status then vote count', async () => {
    const low = await create('tri faible');
    const high = await create('tri fort');
    await prisma.suggestion.update({ where: { id: low.id }, data: { voteCount: 2 } });
    await prisma.suggestion.update({ where: { id: high.id }, data: { voteCount: 20 } });

    const response = await fetch(`${bundle.url}/suggestions?sort=top&pageSize=50`);
    const body = (await response.json()) as SuggestionsResponse;
    const highIndex = body.suggestions.findIndex((item) => item.id === high.id);
    const lowIndex = body.suggestions.findIndex((item) => item.id === low.id);
    expect(highIndex).toBeGreaterThanOrEqual(0);
    expect(highIndex).toBeLessThan(lowIndex);
  });

  it('allows staff to publish a reply and change status', async () => {
    const suggestion = await create('réponse admin');
    const response = await fetch(`${bundle.url}/admin/suggestions/${suggestion.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({
        status: 'PLANNED',
        adminReply: 'Merci, cette amélioration est prévue.',
      }),
    });
    expect(response.status).toBe(200);
    const updated = (await response.json()) as SuggestionItem;
    expect(updated.status).toBe('PLANNED');
    expect(updated.adminReply).toContain('prévue');
    expect(updated.adminRepliedAt).toBeTruthy();
    expect(updated.locked).toBe(true);
  });

  it('blocks author deletion after staff treatment', async () => {
    const suggestion = await create('verrouillée');
    await fetch(`${bundle.url}/admin/suggestions/${suggestion.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: 'DONE' }),
    });
    const response = await fetch(`${bundle.url}/suggestions/${suggestion.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    expect(response.status).toBe(403);
    expect(await prisma.suggestion.findUnique({ where: { id: suggestion.id } })).not.toBeNull();
  });

  it('allows an author to delete their untreated suggestion', async () => {
    const suggestion = await create('suppression');
    const response = await fetch(`${bundle.url}/suggestions/${suggestion.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    expect(response.status).toBe(204);
    expect(await prisma.suggestion.findUnique({ where: { id: suggestion.id } })).toBeNull();
  });

  it('enforces the five suggestions per 24 hours limit even under concurrency', async () => {
    const responses = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        fetch(`${bundle.url}/suggestions`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            category: 'OTHER',
            title: `${TEST_PREFIX} plafond ${index}`,
            body: 'Une description suffisamment longue pour atteindre le plafond.',
          }),
        }),
      ),
    );
    const statuses = responses.map((response) => response.status).sort();
    expect(statuses.filter((status) => status === 201)).toHaveLength(5);
    expect(statuses.filter((status) => status === 429)).toHaveLength(1);
  });

  it('anonymizes staff-treated suggestions when the author account is removed', async () => {
    const profileId = randomUUID();
    await prisma.profile.create({
      data: {
        id: profileId,
        username: `suggest_anon_${profileId.slice(0, 8)}`,
        email: `suggest-anon-${profileId}@aniquizz.test`,
      },
    });
    const treated = await prisma.suggestion.create({
      data: {
        authorId: profileId,
        category: 'IMPROVEMENT',
        title: `${TEST_PREFIX} à anonymiser`,
        body: 'Cette idée déjà traitée doit survivre sans auteur.',
        status: 'DONE',
        statusRank: 2,
        staffTreatedAt: new Date(),
      },
    });
    const open = await prisma.suggestion.create({
      data: {
        authorId: profileId,
        category: 'OTHER',
        title: `${TEST_PREFIX} à effacer`,
        body: 'Cette idée non traitée disparaît avec le compte.',
      },
    });

    await prepareSuggestionsForAccountDeletion(profileId);
    await prisma.profile.delete({ where: { id: profileId } });

    const kept = await prisma.suggestion.findUnique({ where: { id: treated.id } });
    expect(kept?.authorId).toBeNull();
    expect(await prisma.suggestion.findUnique({ where: { id: open.id } })).toBeNull();
    await prisma.suggestion.delete({ where: { id: treated.id } });
  });

  it('ranks and paginates catalogue song options', async () => {
    const response = await fetch(
      `${bundle.url}/suggestions/song-options?q=${encodeURIComponent(songAnimeName)}&pageSize=8`,
      { headers: authHeaders() },
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as SuggestionSongOptionsResponse;
    expect(body.songs.length).toBeGreaterThan(0);
    expect(body.songs[0]?.animeName.toLowerCase()).toContain(songAnimeName.toLowerCase().slice(0, 4));
    expect(body.pagination.page).toBe(1);
  });
});
