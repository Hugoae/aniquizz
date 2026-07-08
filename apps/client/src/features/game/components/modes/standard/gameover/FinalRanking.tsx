import { ArrowLeft, Check, ListMusic, Medal } from 'lucide-react';

import type { GamePlayer } from '@aniquizz/shared';

import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

import { UserAvatar } from '@/components/ui/UserAvatar';

import { AddFriendButton } from '@/features/friends/AddFriendButton';

import { RankPill } from '@/features/game/components/shared/RankPill';

import { getDistinctRanks, podiumTierForRank } from '@/features/game/utils/podiumGroups';

import { XpEarnedBadge } from './XpEarnedBadge';



interface FinalRankingProps {

  sortedPlayers: GamePlayer[];

  currentUserId: string;

  ranks: Map<string, number>;

  onLeave: () => void;

  onShowDetail: () => void;

}



export function FinalRanking({ sortedPlayers, currentUserId, ranks, onLeave, onShowDetail }: FinalRankingProps) {

  const distinctRanks = getDistinctRanks(sortedPlayers, ranks);



  return (

    <div className="flex min-h-[480px] flex-col overflow-hidden lg:col-span-5 lg:min-h-0 lg:h-full">

      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card/70 shadow-[var(--shadow-card)] backdrop-blur-xl">

        <div className="flex items-center justify-between border-b border-border/60 bg-secondary/20 p-4 md:p-6">

          <h3 className="font-display flex items-center gap-2 text-xl font-bold">

            <Medal className="h-5 w-5 text-warning" aria-hidden />

            Classement final

          </h3>

          <div className="rounded-md border border-border/50 bg-secondary/40 px-3 py-1 font-mono text-xs text-muted-foreground">

            {sortedPlayers.length} joueurs

          </div>

        </div>



        <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-3 md:p-4">

          {sortedPlayers.map((p, index) => {

            const isMe = String(p.id) === String(currentUserId);

            const rank = ranks.get(String(p.id)) ?? index + 1;

            const podiumTier = podiumTierForRank(rank, distinctRanks);

            const xp = p.xpEarned;



            return (

              <div

                key={p.id}

                className={cn(

                  'group flex items-center gap-3 overflow-hidden rounded-lg border p-3 transition-colors',

                  isMe

                    ? 'border-primary/50 bg-primary/15 shadow-[0_0_15px_hsl(var(--primary)/0.2)] ring-1 ring-primary/40'

                    : 'border-border/40 bg-secondary/30 hover:bg-secondary/50',

                )}

              >

                <RankPill rank={rank} size="md" />



                <div className="flex min-w-0 flex-1 items-center gap-3">

                  <UserAvatar

                    avatar={p.avatar}

                    username={p.username}

                    className={cn(

                      'h-10 w-10 shrink-0 border-0 ring-2',

                      podiumTier === 1 && 'ring-warning/40',

                      podiumTier === 2 && 'ring-silver/40',

                      podiumTier === 3 && 'ring-bronze/40',

                      !podiumTier && 'ring-border/60',

                    )}

                  />

                  <div className="min-w-0 flex-col">

                    <span

                      className={cn(

                        'flex flex-wrap items-center gap-2 text-sm font-bold',

                        isMe ? 'text-foreground' : 'text-foreground/85',

                      )}

                    >

                      <span className="truncate">{p.username}</span>

                      {isMe && (

                        <span className="shrink-0 rounded border border-primary/25 bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">

                          Moi

                        </span>

                      )}

                      {isMe && typeof xp === 'number' && xp > 0 && <XpEarnedBadge xp={xp} />}

                    </span>

                    {typeof p.matchCorrectCount === 'number' &&

                      typeof p.matchTotalCount === 'number' &&

                      p.matchTotalCount > 0 && (

                        <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <Check className="h-3 w-3 shrink-0 text-success/80" aria-hidden />
                          {p.matchCorrectCount} / {p.matchTotalCount} bonnes réponses
                        </span>

                      )}

                  </div>

                </div>



                {!isMe && !p.isBot && (
                  <AddFriendButton
                    userId={String(p.id)}
                    isBot={p.isBot}
                    compact
                    className="shrink-0 opacity-40 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
                  />
                )}

                <div className="shrink-0 text-right">

                  <span

                    className={cn(

                      'font-mono text-xl font-black tabular-nums',

                      podiumTier ? 'text-foreground' : 'text-foreground/70',

                    )}

                  >

                    {p.score}

                  </span>

                  <span className="ml-1 text-[10px] font-bold text-muted-foreground">pts</span>

                </div>

              </div>

            );

          })}

        </div>



        <div className="space-y-3 border-t border-border/60 bg-secondary/20 p-4">

          <Button onClick={onShowDetail} variant="glow" className="h-12 w-full gap-2">

            <ListMusic className="h-4 w-4" aria-hidden />

            Détail de ma partie

          </Button>

          <Button onClick={onLeave} size="lg" variant="outline" className="h-14 w-full gap-2 text-lg">

            <ArrowLeft className="h-5 w-5" aria-hidden />

            Retour au Lobby

          </Button>

        </div>

      </div>

    </div>

  );

}


