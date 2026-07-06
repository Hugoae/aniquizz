/**
 * Deterministic roster of simulated-player (bot) profiles.
 *
 * DEV ONLY: bots let a single developer test multiplayer flows. Their ids are
 * prefixed with `bot-` so they can be trivially excluded from leaderboards and
 * other player-facing queries later.
 */

export const BOT_ID_PREFIX = 'bot-';

export interface BotProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;
}

export const BOT_PROFILES: BotProfile[] = [
  { id: 'bot-0001', username: 'Bot Sakura', email: 'bot1@aniquizz.bot', avatar: 'player1' },
  { id: 'bot-0002', username: 'Bot Kenji', email: 'bot2@aniquizz.bot', avatar: 'player2' },
  { id: 'bot-0003', username: 'Bot Yuki', email: 'bot3@aniquizz.bot', avatar: 'player3' },
  { id: 'bot-0004', username: 'Bot Ren', email: 'bot4@aniquizz.bot', avatar: 'player4' },
  { id: 'bot-0005', username: 'Bot Mei', email: 'bot5@aniquizz.bot', avatar: 'player5' },
  { id: 'bot-0006', username: 'Bot Haru', email: 'bot6@aniquizz.bot', avatar: 'player6' },
  { id: 'bot-0007', username: 'Bot Aoi', email: 'bot7@aniquizz.bot', avatar: 'player7' },
  { id: 'bot-0008', username: 'Bot Sora', email: 'bot8@aniquizz.bot', avatar: 'player8' },
];

export const isBotId = (id: string): boolean => id.startsWith(BOT_ID_PREFIX);
