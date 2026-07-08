import { Crown } from 'lucide-react';

import type { GamePlayer } from '@aniquizz/shared';

import { cn } from '@/lib/utils';

import { UserAvatar } from '@/components/ui/UserAvatar';

import { multiFinishSubtitle } from '@/features/game/utils/frenchOrdinals';

import { buildPodiumLayout, type PodiumSlot } from '@/features/game/utils/podiumGroups';



interface PodiumStepStyle {

  ring: string;

  grad: string;

  score: string;

  height: string;

  avatar: string;

  avatarGlow: string;

  fade: string;

  overlap: string;

}



const PODIUM_STYLES: Record<1 | 2 | 3, PodiumStepStyle> = {

  1: {

    ring: 'ring-warning',

    grad: 'from-warning/20 to-warning/5 border-warning/30',

    score: 'text-warning',

    height: 'h-56 md:h-72',

    avatar: 'h-24 w-24 md:h-32 md:w-32',

    avatarGlow: 'shadow-[0_0_30px_hsl(var(--warning)/0.4)]',

    fade: 'from-warning/5',

    overlap: '-ml-10 md:-ml-12',

  },

  2: {

    ring: 'ring-silver',

    grad: 'from-silver/25 to-silver/5 border-silver/30',

    score: 'text-silver',

    height: 'h-40 md:h-52',

    avatar: 'h-16 w-16 md:h-20 md:w-20',

    avatarGlow: 'shadow-[0_0_16px_hsl(var(--silver)/0.35)]',

    fade: 'from-silver/5',

    overlap: '-ml-6 md:-ml-8',

  },

  3: {

    ring: 'ring-bronze',

    grad: 'from-bronze/20 to-bronze/5 border-bronze/30',

    score: 'text-medal-bronze',

    height: 'h-32 md:h-40',

    avatar: 'h-16 w-16 md:h-20 md:w-20',

    avatarGlow: 'shadow-[0_0_12px_hsl(var(--bronze)/0.3)]',

    fade: 'from-bronze/5',

    overlap: '-ml-6 md:-ml-8',

  },

};



const MAX_PODIUM_AVATARS = 3;



function PodiumAvatarStack({

  players,

  style,

}: {

  players: GamePlayer[];

  style: PodiumStepStyle;

}) {

  const visible = players.slice(0, MAX_PODIUM_AVATARS);

  const overflow = players.length - MAX_PODIUM_AVATARS;



  return (

    <div className="relative flex justify-center">

      <div className="flex items-center">

        {visible.map((player, index) => (

          <UserAvatar

            key={String(player.id)}

            avatar={player.avatar}

            username={player.username}

            className={cn(

              'relative border-2 border-background ring-4 shadow-xl',

              style.avatar,

              style.ring,

              style.avatarGlow,

              index > 0 && style.overlap,

            )}

            style={{ zIndex: index }}

          />

        ))}

      </div>

      {overflow > 0 && (

        <div className="absolute -right-2 -top-1 z-20 rounded-full border border-border/60 bg-card px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">

          +{overflow}

        </div>

      )}

    </div>

  );

}



function PodiumStep({

  slot,

  delay,

  raised,

}: {

  slot: PodiumSlot;

  delay?: string;

  raised?: boolean;

}) {

  const s = PODIUM_STYLES[slot.step];

  const { players } = slot;

  const displayScore = players[0]?.score ?? 0;



  return (

    <div

      className={cn(

        'flex w-1/3 max-w-[220px] animate-slide-up flex-col items-center gap-3',

        slot.step === 1 && 'relative -top-6 z-10',

        slot.step !== 1 && 'max-w-[200px]',

      )}

      style={delay ? { animationDelay: delay } : undefined}

    >

      {slot.step === 1 && (

        <Crown

          className="mb-1 h-10 w-10 animate-bounce text-warning drop-shadow-[0_0_10px_hsl(var(--warning)/0.5)] md:h-12 md:w-12"

          aria-hidden

        />

      )}



      <PodiumAvatarStack players={players} style={s} />



      <div

        className={cn(

          'relative flex w-full flex-col items-center justify-end overflow-hidden rounded-t-xl border-l border-r border-t bg-gradient-to-b pb-6 backdrop-blur-sm',

          s.grad,

          s.height,

          raised && 'pb-8',

        )}

      >

        <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t to-transparent', s.fade)} />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-background via-background/80 to-transparent" />



        <span

          className={cn(

            'relative z-10 font-display font-black tabular-nums',

            slot.step === 1 ? 'text-5xl md:text-6xl' : 'text-3xl md:text-4xl',

            s.score,

          )}

        >

          {displayScore}

        </span>

        <span className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground md:text-xs">

          pts

        </span>

      </div>

    </div>

  );

}



interface MultiPodiumProps {

  sortedPlayers: GamePlayer[];

  isPlayerWinner: boolean;

  myRank: number;

  ranks: Map<string, number>;

}



export function MultiPodium({ sortedPlayers, isPlayerWinner, myRank, ranks }: MultiPodiumProps) {

  const layout = buildPodiumLayout(sortedPlayers, ranks);



  return (

    <div className="relative flex min-h-[420px] flex-col lg:col-span-7 lg:min-h-0">

      <div className="mb-4 pt-2 text-center lg:mb-8 lg:pt-4">

        <h1 className="overflow-visible px-2 font-display text-5xl font-black uppercase italic tracking-normal md:text-7xl">

          {isPlayerWinner ? (

            <span className="text-success drop-shadow-[0_0_16px_hsl(var(--success)/0.35)]">Victoire</span>

          ) : (

            <span className="text-destructive drop-shadow-[0_0_12px_hsl(var(--destructive)/0.3)]">Défaite</span>

          )}

        </h1>

        <p className="mt-2 text-lg font-medium text-muted-foreground">

          {isPlayerWinner ? 'Incroyable performance !' : multiFinishSubtitle(myRank)}

        </p>

      </div>



      <div className="mt-auto flex items-end justify-center gap-3 px-2 pb-6 md:gap-8 md:pb-10">

        {layout.left && <PodiumStep slot={layout.left} delay="0.2s" />}

        {layout.center && <PodiumStep slot={layout.center} raised />}

        {layout.right && <PodiumStep slot={layout.right} delay="0.4s" />}

      </div>

    </div>

  );

}


