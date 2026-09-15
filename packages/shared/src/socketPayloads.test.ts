import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from './constants';
import { MAX_LIST_REQUEST_ID_LENGTH, MAX_WATCHLIST_USERNAME_INPUT_LENGTH } from './watchedList';
import {
  answerInputSchema,
  createLobbyInputSchema,
  joinLobbyInputSchema,
  lobbyTargetInputSchema,
  roomIdInputSchema,
  chatSendMessageInputSchema,
  deleteAccountInputSchema,
  friendPrivacyInputSchema,
  listLinkInputSchema,
  listProviderOpInputSchema,
  updatePrefsInputSchema,
  updatePrivacyInputSchema,
  updateProfileDataInputSchema,
  updateRoomSettingsInputSchema,
} from './socketPayloads';

describe('roomIdInputSchema', () => {
  it('accepts a live lobby code', () => {
    expect(roomIdInputSchema.parse({ roomId: 'A3K9ZQ' })).toEqual({ roomId: 'A3K9ZQ' });
  });

  it('rejects a missing or empty room id', () => {
    expect(roomIdInputSchema.safeParse({}).success).toBe(false);
    expect(roomIdInputSchema.safeParse({ roomId: '' }).success).toBe(false);
    expect(roomIdInputSchema.safeParse({ roomId: '   ' }).success).toBe(false);
  });

  it('rejects oversized or non-alphanumeric ids', () => {
    expect(roomIdInputSchema.safeParse({ roomId: 'x'.repeat(17) }).success).toBe(false);
    expect(roomIdInputSchema.safeParse({ roomId: 'AB-12' }).success).toBe(false);
  });
});

describe('answerInputSchema', () => {
  it('accepts a typing answer and strips unknown keys', () => {
    expect(
      answerInputSchema.parse({
        roomId: 'A3K9ZQ',
        answer: 'Naruto',
        answerType: 'typing',
        extra: true,
      }),
    ).toEqual({
      roomId: 'A3K9ZQ',
      answer: 'Naruto',
      answerType: 'typing',
    });
  });

  it('accepts optional solo reveal and the three answer types', () => {
    for (const answerType of ['typing', 'qcm', 'duo'] as const) {
      expect(
        answerInputSchema.parse({
          roomId: 'A3K9ZQ',
          answer: 'One Piece',
          answerType,
          revealAfterAnswer: true,
        }).answerType,
      ).toBe(answerType);
    }
  });

  it('rejects a claimed mix type, a missing answer, and oversized text', () => {
    expect(
      answerInputSchema.safeParse({
        roomId: 'A3K9ZQ',
        answer: 'Naruto',
        answerType: 'mix',
      }).success,
    ).toBe(false);
    expect(
      answerInputSchema.safeParse({
        roomId: 'A3K9ZQ',
        answerType: 'typing',
      }).success,
    ).toBe(false);
    expect(
      answerInputSchema.safeParse({
        roomId: 'A3K9ZQ',
        answer: 'x'.repeat(GAME_CONFIG.LIMITS.MAX_ANSWER_LENGTH + 1),
        answerType: 'typing',
      }).success,
    ).toBe(false);
  });
});

describe('updateRoomSettingsInputSchema', () => {
  it('requires a room id and a settings object', () => {
    expect(
      updateRoomSettingsInputSchema.parse({
        roomId: 'A3K9ZQ',
        settings: { soundCount: 15 },
      }),
    ).toEqual({
      roomId: 'A3K9ZQ',
      settings: { soundCount: 15 },
    });
  });

  it('rejects a non-object settings patch', () => {
    expect(
      updateRoomSettingsInputSchema.safeParse({
        roomId: 'A3K9ZQ',
        settings: null,
      }).success,
    ).toBe(false);
    expect(
      updateRoomSettingsInputSchema.safeParse({
        roomId: 'A3K9ZQ',
        settings: [],
      }).success,
    ).toBe(false);
    expect(updateRoomSettingsInputSchema.safeParse({ roomId: 'A3K9ZQ' }).success).toBe(false);
  });
});

describe('createLobbyInputSchema', () => {
  it('accepts a named room and strips unknown keys', () => {
    expect(
      createLobbyInputSchema.parse({
        roomName: 'Salon test',
        username: 'Host',
        avatar: 'player1',
        settings: { maxPlayers: 8 },
        extra: true,
      }),
    ).toEqual({
      roomName: 'Salon test',
      username: 'Host',
      avatar: 'player1',
      settings: { maxPlayers: 8 },
    });
  });

  it('rejects an oversized room name', () => {
    expect(
      createLobbyInputSchema.safeParse({
        roomName: 'x'.repeat(GAME_CONFIG.LIMITS.MAX_ROOM_NAME_LENGTH + 1),
        settings: {},
      }).success,
    ).toBe(false);
  });

  it('accepts a uploaded-avatar public URL and strips client userId', () => {
    const avatar =
      'https://example.supabase.co/storage/v1/object/public/avatars/' +
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/avatar.jpg?v=1736890000000';
    expect(avatar.length).toBeGreaterThan(64);
    expect(
      createLobbyInputSchema.parse({
        roomName: 'Solo de Host',
        username: 'Host',
        avatar,
        userId: 'not-a-trusted-id',
        settings: { maxPlayers: 1 },
      }),
    ).toEqual({
      roomName: 'Solo de Host',
      username: 'Host',
      avatar,
      settings: { maxPlayers: 1 },
    });
  });

  it('rejects an oversized avatar string', () => {
    expect(
      createLobbyInputSchema.safeParse({
        settings: {},
        avatar: 'x'.repeat(GAME_CONFIG.LIMITS.MAX_AVATAR_LENGTH + 1),
      }).success,
    ).toBe(false);
  });
});

describe('joinLobbyInputSchema', () => {
  it('accepts a passworded join and keeps fromInvite informational', () => {
    expect(
      joinLobbyInputSchema.parse({
        roomId: 'A3K9ZQ',
        username: 'Guest',
        avatar: 'player1',
        password: 'secret',
        fromInvite: true,
      }),
    ).toEqual({
      roomId: 'A3K9ZQ',
      username: 'Guest',
      avatar: 'player1',
      password: 'secret',
      fromInvite: true,
    });
  });

  it('rejects a non-alphanumeric room id and an oversized password', () => {
    expect(
      joinLobbyInputSchema.safeParse({
        roomId: 'AB-12',
        username: 'Guest',
        avatar: 'player1',
      }).success,
    ).toBe(false);
    expect(
      joinLobbyInputSchema.safeParse({
        roomId: 'A3K9ZQ',
        password: 'x'.repeat(GAME_CONFIG.LIMITS.MAX_ROOM_PASSWORD_LENGTH + 1),
      }).success,
    ).toBe(false);
  });
});

describe('lobbyTargetInputSchema', () => {
  it('requires a room id and a non-empty target', () => {
    expect(lobbyTargetInputSchema.parse({ roomId: 'A3K9ZQ', targetId: 'user-2' })).toEqual({
      roomId: 'A3K9ZQ',
      targetId: 'user-2',
    });
    expect(lobbyTargetInputSchema.safeParse({ roomId: 'A3K9ZQ', targetId: '' }).success).toBe(
      false,
    );
  });
});

describe('chatSendMessageInputSchema', () => {
  it('trims content and strips unknown keys', () => {
    expect(
      chatSendMessageInputSchema.parse({
        roomId: 'A3K9ZQ',
        content: '  salut  ',
        extra: true,
      }),
    ).toEqual({ roomId: 'A3K9ZQ', content: 'salut' });
  });

  it('rejects empty, whitespace-only, or oversized content', () => {
    expect(chatSendMessageInputSchema.safeParse({ roomId: 'A3K9ZQ', content: '' }).success).toBe(
      false,
    );
    expect(chatSendMessageInputSchema.safeParse({ roomId: 'A3K9ZQ', content: '   ' }).success).toBe(
      false,
    );
    expect(
      chatSendMessageInputSchema.safeParse({
        roomId: 'A3K9ZQ',
        content: 'x'.repeat(GAME_CONFIG.LIMITS.MAX_CHAT_LENGTH + 1),
      }).success,
    ).toBe(false);
  });
});

describe('updateProfileDataInputSchema', () => {
  it('trims username, caps length, and strips unknown keys', () => {
    expect(
      updateProfileDataInputSchema.parse({
        username: '  Kirikou  ',
        extra: true,
      }),
    ).toEqual({ username: 'Kirikou' });
  });

  it('rejects empty, whitespace-only, or oversized usernames', () => {
    expect(updateProfileDataInputSchema.safeParse({ username: '' }).success).toBe(false);
    expect(updateProfileDataInputSchema.safeParse({ username: '   ' }).success).toBe(false);
    expect(
      updateProfileDataInputSchema.safeParse({
        username: 'x'.repeat(GAME_CONFIG.LIMITS.MAX_USERNAME_LENGTH + 1),
      }).success,
    ).toBe(false);
  });

  it('requires at least one known field', () => {
    expect(updateProfileDataInputSchema.safeParse({}).success).toBe(false);
    expect(updateProfileDataInputSchema.safeParse(undefined).success).toBe(false);
    expect(updateProfileDataInputSchema.parse({ username: 'Kirikou', extra: 1 })).toEqual({
      username: 'Kirikou',
    });
  });

  it('rejects favorite visibility — that patch belongs on profile:update_privacy', () => {
    expect(updateProfileDataInputSchema.safeParse({ showFavoriteSongs: false }).success).toBe(
      false,
    );
  });
});

describe('updatePrefsInputSchema', () => {
  it('accepts a partial patch and strips unknown keys', () => {
    expect(updatePrefsInputSchema.parse({ audioVolume: 40, extra: true })).toEqual({
      audioVolume: 40,
    });
  });

  it('rejects a non-object payload or an invalid motion mode', () => {
    expect(updatePrefsInputSchema.safeParse(undefined).success).toBe(false);
    expect(updatePrefsInputSchema.safeParse({ motionMode: 'off' }).success).toBe(false);
  });
});

describe('friendPrivacyInputSchema', () => {
  it('requires an explicit boolean and strips unknown keys', () => {
    expect(friendPrivacyInputSchema.parse({ allow: false, extra: true })).toEqual({ allow: false });
    expect(friendPrivacyInputSchema.parse({ allow: true })).toEqual({ allow: true });
  });

  it('rejects a missing or non-boolean allow (fail-closed)', () => {
    expect(friendPrivacyInputSchema.safeParse(undefined).success).toBe(false);
    expect(friendPrivacyInputSchema.safeParse({}).success).toBe(false);
    expect(friendPrivacyInputSchema.safeParse({ allow: 'yes' }).success).toBe(false);
  });
});

describe('updatePrivacyInputSchema', () => {
  it('accepts a partial privacy patch', () => {
    expect(
      updatePrivacyInputSchema.parse({
        matchHistoryAudience: 'friends',
        extra: true,
      }),
    ).toEqual({ matchHistoryAudience: 'friends' });
  });

  it('rejects lobbyInviteAudience everyone', () => {
    expect(updatePrivacyInputSchema.safeParse({ lobbyInviteAudience: 'everyone' }).success).toBe(
      false,
    );
  });
});

describe('deleteAccountInputSchema', () => {
  it('requires a non-empty confirmation username', () => {
    expect(deleteAccountInputSchema.parse({ confirmUsername: 'Kirikou' })).toEqual({
      confirmUsername: 'Kirikou',
    });
    expect(deleteAccountInputSchema.safeParse({}).success).toBe(false);
    expect(deleteAccountInputSchema.safeParse({ confirmUsername: '   ' }).success).toBe(false);
    expect(deleteAccountInputSchema.safeParse(undefined).success).toBe(false);
  });
});

describe('listLinkInputSchema', () => {
  it('accepts a MAL URL paste and strips unknown keys', () => {
    expect(
      listLinkInputSchema.parse({
        requestId: 'link-mal',
        provider: 'mal',
        username: '  https://myanimelist.net/profile/Hugo_ae  ',
        extra: true,
      }),
    ).toEqual({
      requestId: 'link-mal',
      provider: 'mal',
      username: 'https://myanimelist.net/profile/Hugo_ae',
    });
  });

  it('rejects missing fields, a bogus provider, and an oversized paste', () => {
    expect(listLinkInputSchema.safeParse(undefined).success).toBe(false);
    expect(
      listLinkInputSchema.safeParse({ requestId: 'x', provider: 'kitsu', username: 'A' }).success,
    ).toBe(false);
    expect(
      listLinkInputSchema.safeParse({
        requestId: 'x',
        provider: 'anilist',
        username: 'a'.repeat(MAX_WATCHLIST_USERNAME_INPUT_LENGTH + 1),
      }).success,
    ).toBe(false);
    expect(
      listLinkInputSchema.safeParse({
        requestId: 'x'.repeat(MAX_LIST_REQUEST_ID_LENGTH + 1),
        provider: 'anilist',
        username: 'A',
      }).success,
    ).toBe(false);
  });
});

describe('listProviderOpInputSchema', () => {
  it('requires requestId and a known provider', () => {
    expect(listProviderOpInputSchema.parse({ requestId: 'op-1', provider: 'anilist' })).toEqual({
      requestId: 'op-1',
      provider: 'anilist',
    });
    expect(listProviderOpInputSchema.safeParse({ provider: 'mal' }).success).toBe(false);
    expect(
      listProviderOpInputSchema.safeParse({ requestId: 'op-1', provider: 'kitsu' }).success,
    ).toBe(false);
  });
});
