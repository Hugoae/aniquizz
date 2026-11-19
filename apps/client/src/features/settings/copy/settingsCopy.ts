import { useMemo } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { ListOperation } from '@aniquizz/shared';
import i18n from '@/lib/i18n';
import { formatAppNumber } from '@/lib/i18n/format';

export interface SettingsCopy {
  panelTitle: string;
  panelAria: string;
  closeAria: string;
  openAria: string;
  signInCta: string;
  cancel: string;
  prefsSyncError: string;
  privacySyncError: string;
  tabs: { general: string; social: string; account: string };
  legalPrivacy: string;
  legalTerms: string;
  legalNotice: string;
  legalHeading: string;
  cookiesHeading: string;
  cookiesBody: string;
  analyticsLabel: string;
  analyticsHint: string;
  analyticsAria: string;
  reopenBanner: string;
  audioHeading: string;
  audioHint: string;
  muteOn: string;
  muteOff: string;
  muteAriaOn: string;
  muteAriaOff: string;
  volumeLabel: string;
  volumeValue: (n: number) => string;
  mutedHint: (n: number) => string;
  signInToSync: string;
  motionHeading: string;
  motionHint: string;
  motionAuto: string;
  motionReduced: string;
  motionFull: string;
  gameplayHeading: string;
  autofocusLabel: string;
  autofocusHint: string;
  submitOnEnterLabel: string;
  submitOnEnterHint: string;
  answerSoundsLabel: string;
  answerSoundsHint: string;
  configWalkthroughLabel: string;
  configWalkthroughHint: string;
  shortcutReminderLabel: string;
  shortcutReminderHint: string;
  notificationsHeading: string;
  notificationsHint: string;
  friendRequestVisual: string;
  friendRequestSound: string;
  lobbyInviteVisual: string;
  lobbyInviteSound: string;
  soundsMutedHint: string;
  privacyHeading: string;
  privacyHint: string;
  showFavorites: string;
  allowFriendRequests: string;
  statusAudience: string;
  historyAudience: string;
  inviteAudience: string;
  audienceEveryone: string;
  audienceFriends: string;
  audienceNobody: string;
  historyAudienceHint: string;
  blockedHeading: string;
  blockedEmpty: string;
  blockedUnblock: string;
  blockedConfirmTitle: string;
  blockedConfirmBody: (username: string) => string;
  integrationsHeading: string;
  integrationsHint: string;
  integrationsManage: string;
  listActive: string;
  listInactive: string;
  listUnlinked: string;
  listLink: string;
  listEdit: string;
  listLoading: string;
  listActiveSource: string;
  listSync: string;
  listUnlink: string;
  listUnlinkConfirmTitle: string;
  listUnlinkConfirmBody: string;
  listOperationPending: string;
  listServerOffline: string;
  listServerTimeout: string;
  listGenericError: string;
  listOperationSuccess: Record<ListOperation, (provider: string) => string>;
  listAnimeCount: (n: number) => string;
  listLastSync: (when: string) => string;
  listNeverSynced: string;
  listState: {
    idle: string;
    ok: string;
    cache: string;
    stale: string;
    private_empty: string;
    unavailable: string;
    unlinked: string;
  };
  signInForAccount: string;
}

function buildSettingsCopy(t: TFunction<'settings'>): SettingsCopy {
  const operation =
    (key: ListOperation) =>
    (provider: string): string =>
      t(`listOperationSuccess.${key}`, { provider });
  return {
    panelTitle: t('panelTitle'),
    panelAria: t('panelAria'),
    closeAria: t('closeAria'),
    openAria: t('openAria'),
    signInCta: t('signInCta'),
    cancel: t('cancel'),
    prefsSyncError: t('prefsSyncError'),
    privacySyncError: t('privacySyncError'),
    tabs: { general: t('tabs.general'), social: t('tabs.social'), account: t('tabs.account') },
    legalPrivacy: t('legalPrivacy'),
    legalTerms: t('legalTerms'),
    legalNotice: t('legalNotice'),
    legalHeading: t('legalHeading'),
    cookiesHeading: t('cookiesHeading'),
    cookiesBody: t('cookiesBody'),
    analyticsLabel: t('analyticsLabel'),
    analyticsHint: t('analyticsHint'),
    analyticsAria: t('analyticsAria'),
    reopenBanner: t('reopenBanner'),
    audioHeading: t('audioHeading'),
    audioHint: t('audioHint'),
    muteOn: t('muteOn'),
    muteOff: t('muteOff'),
    muteAriaOn: t('muteAriaOn'),
    muteAriaOff: t('muteAriaOff'),
    volumeLabel: t('volumeLabel'),
    volumeValue: (n) => t('volumeValue', { value: formatAppNumber(n) }),
    mutedHint: (n) => t('mutedHint', { value: formatAppNumber(n) }),
    signInToSync: t('signInToSync'),
    motionHeading: t('motionHeading'),
    motionHint: t('motionHint'),
    motionAuto: t('motionAuto'),
    motionReduced: t('motionReduced'),
    motionFull: t('motionFull'),
    gameplayHeading: t('gameplayHeading'),
    autofocusLabel: t('autofocusLabel'),
    autofocusHint: t('autofocusHint'),
    submitOnEnterLabel: t('submitOnEnterLabel'),
    submitOnEnterHint: t('submitOnEnterHint'),
    answerSoundsLabel: t('answerSoundsLabel'),
    answerSoundsHint: t('answerSoundsHint'),
    configWalkthroughLabel: t('configWalkthroughLabel'),
    configWalkthroughHint: t('configWalkthroughHint'),
    shortcutReminderLabel: t('shortcutReminderLabel'),
    shortcutReminderHint: t('shortcutReminderHint'),
    notificationsHeading: t('notificationsHeading'),
    notificationsHint: t('notificationsHint'),
    friendRequestVisual: t('friendRequestVisual'),
    friendRequestSound: t('friendRequestSound'),
    lobbyInviteVisual: t('lobbyInviteVisual'),
    lobbyInviteSound: t('lobbyInviteSound'),
    soundsMutedHint: t('soundsMutedHint'),
    privacyHeading: t('privacyHeading'),
    privacyHint: t('privacyHint'),
    showFavorites: t('showFavorites'),
    allowFriendRequests: t('allowFriendRequests'),
    statusAudience: t('statusAudience'),
    historyAudience: t('historyAudience'),
    inviteAudience: t('inviteAudience'),
    audienceEveryone: t('audienceEveryone'),
    audienceFriends: t('audienceFriends'),
    audienceNobody: t('audienceNobody'),
    historyAudienceHint: t('historyAudienceHint'),
    blockedHeading: t('blockedHeading'),
    blockedEmpty: t('blockedEmpty'),
    blockedUnblock: t('blockedUnblock'),
    blockedConfirmTitle: t('blockedConfirmTitle'),
    blockedConfirmBody: (username) => t('blockedConfirmBody', { username }),
    integrationsHeading: t('integrationsHeading'),
    integrationsHint: t('integrationsHint'),
    integrationsManage: t('integrationsManage'),
    listActive: t('listActive'),
    listInactive: t('listInactive'),
    listUnlinked: t('listUnlinked'),
    listLink: t('listLink'),
    listEdit: t('listEdit'),
    listLoading: t('listLoading'),
    listActiveSource: t('listActiveSource'),
    listSync: t('listSync'),
    listUnlink: t('listUnlink'),
    listUnlinkConfirmTitle: t('listUnlinkConfirmTitle'),
    listUnlinkConfirmBody: t('listUnlinkConfirmBody'),
    listOperationPending: t('listOperationPending'),
    listServerOffline: t('listServerOffline'),
    listServerTimeout: t('listServerTimeout'),
    listGenericError: t('listGenericError'),
    listOperationSuccess: {
      link: operation('link'),
      set_active: operation('set_active'),
      refresh: operation('refresh'),
      unlink: operation('unlink'),
    },
    listAnimeCount: (n) => t('listAnimeCount', { count: n, formatted: formatAppNumber(n) }),
    listLastSync: (when) => t('listLastSync', { when }),
    listNeverSynced: t('listNeverSynced'),
    listState: {
      idle: t('listState.idle'),
      ok: t('listState.ok'),
      cache: t('listState.cache'),
      stale: t('listState.stale'),
      private_empty: t('listState.private_empty'),
      unavailable: t('listState.unavailable'),
      unlinked: t('listState.unlinked'),
    },
    signInForAccount: t('signInForAccount'),
  };
}

/** Current settings strings. Use inside a render so a language change refreshes the screen. */
export function useSettingsCopy(): SettingsCopy {
  const { t } = useTranslation('settings');
  return useMemo(() => buildSettingsCopy(t), [t]);
}

/** For toasts fired outside the render that just changed. */
export function settingsText(): SettingsCopy {
  return buildSettingsCopy(i18n.getFixedT(null, 'settings'));
}
