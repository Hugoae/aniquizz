/**
 * Deterministic roster of simulated-player (bot) profiles.
 *
 * DEV ONLY: bots let a single developer test multiplayer flows. Their ids are
 * prefixed with `bot-` so they are excluded from XP, stats, match persistence,
 * leaderboards, and friend/social features.
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
  { id: 'bot-0009', username: 'Bot Akira', email: 'bot9@aniquizz.bot', avatar: 'player9' },
  { id: 'bot-0010', username: 'Bot Hinata', email: 'bot10@aniquizz.bot', avatar: 'player10' },
  { id: 'bot-0011', username: 'Bot Kaito', email: 'bot11@aniquizz.bot', avatar: 'player11' },
  { id: 'bot-0012', username: 'Bot Miku', email: 'bot12@aniquizz.bot', avatar: 'player12' },
  { id: 'bot-0013', username: 'Bot Rei', email: 'bot13@aniquizz.bot', avatar: 'player13' },
  { id: 'bot-0014', username: 'Bot Shin', email: 'bot14@aniquizz.bot', avatar: 'player14' },
  { id: 'bot-0015', username: 'Bot Tomo', email: 'bot15@aniquizz.bot', avatar: 'player15' },
  { id: 'bot-0016', username: 'Bot Yuna', email: 'bot16@aniquizz.bot', avatar: 'player16' },
];

export const isBotId = (id: string): boolean => id.startsWith(BOT_ID_PREFIX);
