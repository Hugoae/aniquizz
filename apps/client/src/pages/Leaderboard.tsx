import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Crown, Medal, Zap } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';

interface LeaderboardPlayer {
  rank: number;
  name: string;
  avatar: string;
  level?: number;
  xp?: number;
  competitiveRank?: string;
  points?: number;
  winRate?: number;
}

const levelLeaderboard: LeaderboardPlayer[] = [
  { rank: 1, name: 'AnimeGod420', avatar: 'god', level: 99, xp: 999999 },
  { rank: 2, name: 'OtakuLegend', avatar: 'legend', level: 95, xp: 850000 },
  { rank: 3, name: 'WeebMaster', avatar: 'master', level: 92, xp: 780000 },
  { rank: 4, name: 'OtakuMaster2024', avatar: 'player1', level: 42, xp: 87500 },
  { rank: 5, name: 'SakuraHunter', avatar: 'sakura', level: 40, xp: 82000 },
  { rank: 6, name: 'NarutoFan99', avatar: 'naruto', level: 38, xp: 75000 },
  { rank: 7, name: 'OnePieceLover', avatar: 'luffy', level: 35, xp: 68000 },
  { rank: 8, name: 'AoTWatcher', avatar: 'eren', level: 32, xp: 61000 },
  { rank: 9, name: 'JJKSimp', avatar: 'gojo', level: 30, xp: 55000 },
  { rank: 10, name: 'DragonBallZ', avatar: 'goku', level: 28, xp: 48000 },
];

const competitiveLeaderboard: LeaderboardPlayer[] = [
  { rank: 1, name: 'AnimeGod420', avatar: 'god', competitiveRank: 'Master', points: 2847, winRate: 89 },
  { rank: 2, name: 'OtakuLegend', avatar: 'legend', competitiveRank: 'Master', points: 2756, winRate: 85 },
  { rank: 3, name: 'WeebMaster', avatar: 'master', competitiveRank: 'Diamond', points: 2501, winRate: 82 },
  { rank: 4, name: 'OtakuMaster2024', avatar: 'player1', competitiveRank: 'Diamond', points: 2340, winRate: 73 },
  { rank: 5, name: 'SakuraHunter', avatar: 'sakura', competitiveRank: 'Gold', points: 1890, winRate: 68 },
  { rank: 6, name: 'NarutoFan99', avatar: 'naruto', competitiveRank: 'Gold', points: 1756, winRate: 65 },
  { rank: 7, name: 'OnePieceLover', avatar: 'luffy', competitiveRank: 'Silver', points: 1450, winRate: 60 },
  { rank: 8, name: 'AoTWatcher', avatar: 'eren', competitiveRank: 'Silver', points: 1280, winRate: 55 },
  { rank: 9, name: 'JJKSimp', avatar: 'gojo', competitiveRank: 'Bronze', points: 980, winRate: 52 },
  { rank: 10, name: 'DragonBallZ', avatar: 'goku', competitiveRank: 'Bronze', points: 750, winRate: 48 },
];

const rankColors: Record<string, string> = {
  Bronze: 'from-amber-700 to-amber-900',
  Silver: 'from-gray-300 to-gray-500',
  Gold: 'from-yellow-400 to-yellow-600',
  Diamond: 'from-cyan-400 to-blue-500',
  Master: 'from-purple-500 to-pink-500',
};

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
  if (rank === 3) return <Medal className="h-6 w-6 text-amber-700" />;
  return <span className="w-6 text-center font-bold text-muted-foreground">#{rank}</span>;
};

export default function Leaderboard() {
  return (
    <>
      <Helmet>
        <title>Classement - AniQuizz</title>
        <meta name="description" content="Consultez le classement des meilleurs joueurs d'AniQuizz par niveau et rang compétitif." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container pt-24 pb-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 animate-fade-in">
              <h1 className="text-4xl font-bold mb-4">
                <span className="gradient-text">Classement</span>
              </h1>
              <p className="text-muted-foreground">
                Les meilleurs joueurs d'AniQuizz
              </p>
            </div>

            <Tabs defaultValue="level" className="animate-fade-in">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="level" className="gap-2">
                  <Zap className="h-4 w-4" />
                  Par Niveau
                </TabsTrigger>
                <TabsTrigger value="competitive" className="gap-2">
                  <Trophy className="h-4 w-4" />
                  Rang Compétitif
                </TabsTrigger>
              </TabsList>

              <TabsContent value="level" className="space-y-3">
                {levelLeaderboard.map((player, index) => (
                  <div
                    key={player.rank}
                    className={cn(
                      "glass-card p-4 flex items-center gap-4 hover-lift transition-all animate-fade-in",
                      player.name === 'OtakuMaster2024' && "border-primary/50 bg-primary/5"
                    )}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="w-10 flex justify-center">
                      {getRankIcon(player.rank)}
                    </div>

                    <Avatar className="h-12 w-12 border-2 border-border">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatar}`} />
                      <AvatarFallback>{player.name[0]}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="font-semibold">{player.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Niveau {player.level}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-bold gradient-text">
                        {player.xp?.toLocaleString()} XP
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="competitive" className="space-y-3">
                {competitiveLeaderboard.map((player, index) => (
                  <div
                    key={player.rank}
                    className={cn(
                      "glass-card p-4 flex items-center gap-4 hover-lift transition-all animate-fade-in",
                      player.name === 'OtakuMaster2024' && "border-primary/50 bg-primary/5"
                    )}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="w-10 flex justify-center">
                      {getRankIcon(player.rank)}
                    </div>

                    <Avatar className="h-12 w-12 border-2 border-border">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatar}`} />
                      <AvatarFallback>{player.name[0]}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{player.name}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full bg-gradient-to-r ${rankColors[player.competitiveRank!]} text-white`}>
                          {player.competitiveRank}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {player.winRate}% win rate
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-bold gradient-text">
                        {player.points} pts
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </>
  );
}
