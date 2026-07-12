import { describe, expect, it } from 'vitest';
import type { GameConfig } from '@aniquizz/shared';
import { buildLobbyRulesSections } from '@/features/hub/components/lobby/lobbyRulesCopy';

const baseConfig: GameConfig = {
  mode: 'multiplayer',
  gameType: 'standard',
  responseType: 'mix',
  soundCount: 20,
  soundTypes: ['opening'],
  difficulty: ['medium'],
  guessDuration: 15,
  soundSelection: 'random',
  precision: 'franchise',
  videoMode: 'hidden',
};

describe('buildLobbyRulesSections', () => {
  it('describes peek video mode in flow section', () => {
    const sections = buildLobbyRulesSections(
      { ...baseConfig, videoMode: 'peek' },
      { lobbyMode: 'solo' },
    );
    const flow = sections.find((s) => s.id === 'flow');
    expect(flow?.lines?.[0]).toContain('fenêtre vidéo');
    expect(flow?.lines?.[3]).toContain('vidéo complète');
  });

  it('describes beginning song start in flow section', () => {
    const sections = buildLobbyRulesSections(
      { ...baseConfig, songStartMode: 'beginning' },
      { lobbyMode: 'solo' },
    );
    const flow = sections.find((s) => s.id === 'flow');
    expect(flow?.lines?.[1]).toContain('au tout début');
  });

  it('shows song start chip in summary', () => {
    const sections = buildLobbyRulesSections(
      { ...baseConfig, songStartMode: 'random' },
      { lobbyMode: 'solo' },
    );
    const summary = sections.find((s) => s.id === 'summary');
    const chip = summary?.chips?.find((c) => c.key === 'songStart');
    expect(chip?.value).toBe('Aléatoire');
  });

  it('shows video mode chip in summary', () => {
    const sections = buildLobbyRulesSections(
      { ...baseConfig, videoMode: 'blurred' },
      { lobbyMode: 'solo' },
    );
    const summary = sections.find((s) => s.id === 'summary');
    const videoChip = summary?.chips?.find((c) => c.key === 'video');
    expect(videoChip?.value).toBe('Vidéo floutée');
  });

  it('uses simple majority copy for lobby votes', () => {
    const sections = buildLobbyRulesSections(baseConfig, { lobbyMode: 'multi', playerCount: 4 });
    const lobby = sections.find((s) => s.id === 'lobby');
    expect(lobby?.lines?.some((l) => l.includes('majorité') && l.includes('Pause'))).toBe(true);
    expect(lobby?.lines?.some((l) => l.includes('majorité') && l.includes('Suivant'))).toBe(true);
    expect(lobby?.lines?.some((l) => l.toLowerCase().includes('bot'))).toBe(false);
  });

  it('builds summary with intro and chips only', () => {
    const sections = buildLobbyRulesSections(
      { ...baseConfig, mode: 'solo' },
      { lobbyMode: 'solo' },
    );
    const summary = sections.find((s) => s.id === 'summary');
    expect(summary?.intro).toContain('Blindtest anime');
    expect(summary?.lines).toBeUndefined();
    expect(summary?.chips?.length).toBeGreaterThan(3);
    const flow = sections.find((s) => s.id === 'flow');
    expect(flow?.lines?.some((l) => l.includes('My Hero Academia'))).toBe(true);
  });

  it('lists mix choice first then each response type', () => {
    const sections = buildLobbyRulesSections(baseConfig, { lobbyMode: 'multi' });
    const scoring = sections.find((s) => s.id === 'scoring');
    expect(scoring?.lines?.[0]).toContain('En mode Mix');
    expect(scoring?.lines?.some((l) => l.startsWith('Typing :'))).toBe(true);
    expect(scoring?.lines?.some((l) => l.includes('Autocomplétion'))).toBe(true);
    expect(scoring?.lines?.some((l) => l.startsWith('Carré :'))).toBe(true);
    expect(scoring?.lines?.some((l) => l.startsWith('Duo :'))).toBe(true);
  });

  it('describes QCM as carré only without duo', () => {
    const sections = buildLobbyRulesSections(
      { ...baseConfig, responseType: 'qcm' },
      { lobbyMode: 'solo' },
    );
    const scoring = sections.find((s) => s.id === 'scoring');
    expect(scoring?.lines).toHaveLength(1);
    expect(scoring?.lines?.[0]).toMatch(/^Carré :/);
    expect(scoring?.lines?.some((l) => l.startsWith('Duo :'))).toBe(false);
  });

  it('mentions typing autocomplete in typing mode', () => {
    const sections = buildLobbyRulesSections(
      { ...baseConfig, responseType: 'typing' },
      { lobbyMode: 'solo' },
    );
    const scoring = sections.find((s) => s.id === 'scoring');
    expect(scoring?.lines?.some((l) => l.includes('Autocomplétion'))).toBe(true);
    expect(scoring?.lines?.some((l) => l.includes('menu au-dessus'))).toBe(true);
  });

  it('explains Watched union mode without playable count', () => {
    const sections = buildLobbyRulesSections(
      {
        ...baseConfig,
        soundSelection: 'watched',
        watchedMode: 'union',
        watchedAllowFallback: true,
      },
      { lobbyMode: 'solo' },
    );
    const source = sections.find((s) => s.id === 'source');
    expect(source?.lines?.some((l) => l.includes('Union'))).toBe(true);
    expect(source?.lines?.some((l) => l.includes('au moins un joueur'))).toBe(true);
    expect(source?.lines?.some((l) => l.includes('Compléter avec l\'aléatoire'))).toBe(true);
    expect(source?.lines?.some((l) => l.match(/\d+\s+son/))).toBe(false);
    expect(source?.lines?.some((l) => l.toLowerCase().includes('bot'))).toBe(false);
    expect(source?.lines?.some((l) => l.includes('Intersection'))).toBe(false);
  });

  it('uses Commun label and omits fallback line when opt-in is off', () => {
    const sections = buildLobbyRulesSections(
      {
        ...baseConfig,
        soundSelection: 'watched',
        watchedMode: 'intersection',
        watchedAllowFallback: false,
      },
      { lobbyMode: 'multi', playerCount: 4 },
    );
    const source = sections.find((s) => s.id === 'source');
    expect(source?.lines?.some((l) => l.includes('(Commun)'))).toBe(true);
    expect(source?.lines?.some((l) => l.includes('Mode Commun'))).toBe(true);
    expect(source?.lines?.some((l) => l.includes('Intersection'))).toBe(false);
    expect(source?.lines?.some((l) => l.includes('Compléter avec l\'aléatoire'))).toBe(false);
    expect(source?.lines?.some((l) => l.includes('Sans opt-in'))).toBe(false);
  });

  it('describes anime precision with season example', () => {
    const sections = buildLobbyRulesSections(
      { ...baseConfig, precision: 'anime' },
      { lobbyMode: 'solo' },
    );
    const flow = sections.find((s) => s.id === 'flow');
    expect(flow?.lines?.some((l) => l.includes('Season 3'))).toBe(true);
  });

  it('uses podium win copy in multi victory', () => {
    const sections = buildLobbyRulesSections(baseConfig, { lobbyMode: 'multi', playerCount: 6 });
    const victory = sections.find((s) => s.id === 'victory');
    expect(victory?.title).toBe('Victoire');
    expect(victory?.lines?.some((l) => l.includes('podium gagne la partie'))).toBe(true);
  });

  it('uses Victoire title and difficulty-aware bronze threshold in solo', () => {
    const sections = buildLobbyRulesSections(
      { ...baseConfig, mode: 'solo', difficulty: ['medium'] },
      { lobbyMode: 'solo' },
    );
    const victory = sections.find((s) => s.id === 'victory');
    expect(victory?.title).toBe('Victoire');
    expect(victory?.lines?.some((l) => l.includes('médaille Bronze'))).toBe(true);
    expect(victory?.lines?.some((l) => l.includes('Seuil Bronze (Moyen) : 50 %'))).toBe(true);
    expect(victory?.lines?.some((l) => l.includes('Bronze, Argent, Or et Platine'))).toBe(true);
    expect(victory?.lines?.some((l) => l.includes('Pas de classement'))).toBe(false);
  });

  it('shows blended bronze threshold when several tiers are enabled', () => {
    const sections = buildLobbyRulesSections(
      { ...baseConfig, mode: 'solo', difficulty: ['easy', 'medium'] },
      { lobbyMode: 'solo' },
    );
    const victory = sections.find((s) => s.id === 'victory');
    expect(victory?.lines?.some((l) => l.includes('Seuil Bronze : 52,5 %'))).toBe(true);
    expect(victory?.lines?.some((l) => l.includes('Facile 55 %'))).toBe(true);
    expect(victory?.lines?.some((l) => l.includes('Moyen 50 %'))).toBe(true);
  });

  it('lowers solo bronze threshold copy in anime precision', () => {
    const sections = buildLobbyRulesSections(
      { ...baseConfig, mode: 'solo', difficulty: ['medium'], precision: 'anime' },
      { lobbyMode: 'solo' },
    );
    const victory = sections.find((s) => s.id === 'victory');
    expect(victory?.lines?.some((l) => l.includes('Seuil Bronze (Moyen) : 45 %'))).toBe(true);
  });
});
