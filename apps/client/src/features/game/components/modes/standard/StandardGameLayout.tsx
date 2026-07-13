import { useMemo, useState, memo } from 'react';
import { SkipLinkTarget } from '@/components/a11y/SkipLink';
import type { GamePlayer, Precision } from '@aniquizz/shared';
import type { VideoMode } from '@aniquizz/shared';
import { socket } from '@/lib/socket';
import { cn } from '@/lib/utils';
import type { CurrentSong } from '@/features/game/state/gameReducer';
import { activeMatchPlayers } from '../../../utils/ranking';

import { SongInfoCard } from '../../shared/SongInfoCard';
import { GameSidebar } from '../../core/GameSidebar';
import { GameTopBar } from './parts/GameTopBar';
import { VideoStage } from './parts/VideoStage';
import { AnswerInput } from './parts/AnswerInput';
import { PlayersFloor } from './parts/PlayersFloor';
import { SprintLeaderboard } from './parts/SprintLeaderboard';
import { ConfigBadges, type ConfigBadgesData } from './parts/ConfigBadges';
import type { GamePhase, InputMode, MyProfile } from './parts/types';
import type { SprintLeaderboardPayload } from '@aniquizz/shared';

interface StandardGameLayoutProps {
  phase: GamePhase;
  players: GamePlayer[];
  currentRound: number;
  totalRounds: number;
  phaseEndsAt: number;
  phaseDurationSeconds: number;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  autoplayBlocked: boolean;
  onSafePlay: () => void;
  isGamePaused: boolean;
  isPausePending: boolean;
  resumeCountdown: number | null;
  onVotePause: () => void;
  pauseVotes: number;
  pauseRequired: number;
  skipVotes: number;
  skipRequired: number;
  onVoteSkip: () => void;
  currentSong: CurrentSong;
  videoMode: VideoMode;
  myWatchedIds: number[];
  inputMode: InputMode;
  submittedAnswer: string | null;
  choices: string[];
  onAction: (val: string) => void;
  onSwitchCarre: () => void;
  onSwitchDuo: () => void;
  precision?: Precision;
  myProfile: MyProfile;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  onShowLeave: () => void;
  onShowProfile: () => void;
  showPointsAnimation: boolean;
  pointsEarned: number | null;
  currentUserId: string;
  gameMode: 'solo' | 'multiplayer';
  roomId?: string;
  /** Room response mode — carré/duo switches only allowed when `mix`. */
  responseType?: 'typing' | 'qcm' | 'mix';
  configBadges?: ConfigBadgesData;
  isSprint?: boolean;
  sprintLeaderboard?: SprintLeaderboardPayload | null;
  pointsBadge?: string | null;
}

export const StandardGameLayout = memo(StandardGameLayoutInner);

function StandardGameLayoutInner({
  phase, players, currentRound, totalRounds, phaseEndsAt, phaseDurationSeconds,
  volume, isMuted, onVolumeChange, onToggleMute, videoRef, autoplayBlocked, onSafePlay,
  isGamePaused, isPausePending, resumeCountdown, onVotePause, pauseVotes, pauseRequired, skipVotes, skipRequired, onVoteSkip,
  currentSong, myWatchedIds,
  inputMode, submittedAnswer, choices, onAction, onSwitchCarre, onSwitchDuo,
  myProfile, sidebarCollapsed, setSidebarCollapsed, onShowLeave, onShowProfile, showPointsAnimation, pointsEarned,
  currentUserId, gameMode, roomId,
  responseType = 'mix',
  configBadges,
  videoMode,
  precision = 'franchise',
  isSprint = false,
  sprintLeaderboard = null,
  pointsBadge,
}: StandardGameLayoutProps) {
  const revealSong = phase === 'revealed' && currentSong && 'anime' in currentSong ? currentSong : null;
  const activeRosterCount = useMemo(() => activeMatchPlayers(players).length, [players]);

  // Bumped on each "open roster" request; a change while already open triggers a
  // shake on the panel to draw attention instead of a no-op.
  const [rosterAttention, setRosterAttention] = useState(0);

  const handleSoloSkip = () => {
    if (roomId) socket.emit('game:skip_round', { roomId });
  };

  const handleOpenRoster = () => {
    if (sidebarCollapsed) setSidebarCollapsed(false);
    else setRosterAttention((n) => n + 1);
  };

  const songInfoProps = revealSong
    ? {
        animeName: revealSong.anime,
        songTitle: revealSong.title,
        artist: revealSong.artist,
        type: revealSong.type,
        difficulty: revealSong.difficulty,
        franchise: revealSong.franchise ?? undefined,
        year: revealSong.year ?? undefined,
        season: revealSong.season,
        format: revealSong.format,
        episodeRange: revealSong.episodeRange,
        coverColor: revealSong.coverColor,
        coverImage: revealSong.cover ?? undefined,
        siteUrl: revealSong.siteUrl,
        tags: revealSong.tags,
        isWatched: revealSong.animeId ? myWatchedIds.includes(revealSong.animeId) : false,
      }
    : null;

  const showSprintBoard = isSprint && phase === 'revealed' && sprintLeaderboard != null;

  return (
    <div className="fixed inset-0 flex h-[100dvh] w-screen flex-col overflow-hidden overscroll-none bg-background">
      <GameTopBar
        currentRound={currentRound}
        totalRounds={totalRounds}
        isGamePaused={isGamePaused}
        isPausePending={isPausePending}
        pauseVotes={pauseVotes}
        pauseRequired={pauseRequired}
        myProfile={myProfile}
        onShowLeave={onShowLeave}
        onVotePause={onVotePause}
        onShowProfile={onShowProfile}
      />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <main
          id={SkipLinkTarget}
          className={cn(
            'relative flex min-w-0 flex-1 flex-col items-center overflow-hidden p-4',
            // Reserve room for the always-present collapsed rail so opening the
            // overlay panel never reflows `main` (which caused a scroll jump).
            gameMode !== 'solo' && 'pr-14',
          )}
        >
          {configBadges && (
            <ConfigBadges
              data={configBadges}
              positionClassName={gameMode !== 'solo' ? 'right-16' : 'right-4'}
            />
          )}

          <div className="relative flex h-full min-h-0 w-full max-w-[1400px] animate-fade-in flex-col items-stretch justify-center gap-5 lg:flex-row lg:justify-center">
            {/* Left stack: video, answer slot, players floor. */}
            <div className="flex h-full w-full min-h-0 flex-1 flex-col items-center justify-start overflow-hidden">
              <VideoStage
                videoRef={videoRef}
                phase={phase}
                currentSong={currentSong}
                videoMode={videoMode}
                autoplayBlocked={autoplayBlocked}
                onSafePlay={onSafePlay}
                isGamePaused={isGamePaused}
                resumeCountdown={resumeCountdown}
                isMuted={isMuted}
                volume={volume}
                onToggleMute={onToggleMute}
                onVolumeChange={onVolumeChange}
                phaseEndsAt={phaseEndsAt}
                phaseDurationSeconds={phaseDurationSeconds}
                gameMode={gameMode}
                isPausePending={isPausePending}
                submittedAnswer={submittedAnswer}
                onSoloSkip={handleSoloSkip}
                playersCount={activeRosterCount}
                skipVotes={skipVotes}
                skipRequired={skipRequired}
                onVoteSkip={onVoteSkip}
              />

              {/* Slot under the video: answer input while guessing; on small screens
                  the reveal info shows here as a band (the big side card is hidden). */}
              <div className="z-50 mb-2 mt-2 flex w-full max-w-[850px] shrink-0 justify-center">
                {(phase === 'guessing' || phase === 'ready') ? (
                  <AnswerInput
                    responseType={responseType}
                    inputMode={inputMode}
                    submittedAnswer={submittedAnswer}
                    choices={choices}
                    onAction={onAction}
                    onSwitchCarre={onSwitchCarre}
                    onSwitchDuo={onSwitchDuo}
                    precision={precision}
                    roundKey={currentRound}
                    disabled={phase === 'ready'}
                    pointsBadge={pointsBadge}
                  />
                ) : songInfoProps ? (
                  <div className="flex w-full flex-col gap-3 lg:hidden">
                    <SongInfoCard variant="band" isRevealed {...songInfoProps} />
                    {showSprintBoard && sprintLeaderboard && (
                      <SprintLeaderboard
                        data={sprintLeaderboard}
                        currentUserId={currentUserId}
                        myAvatar={myProfile.avatar}
                        compact
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex h-[72px] w-full animate-pulse items-center justify-center text-muted-foreground">
                    Chargement de la réponse…
                  </div>
                )}
              </div>

              <PlayersFloor
                players={players}
                currentUserId={currentUserId}
                showResult={phase === 'revealed'}
                showPointsAnimation={showPointsAnimation}
                pointsEarned={pointsEarned}
                showRank={gameMode !== 'solo'}
                onOpenRoster={handleOpenRoster}
              />
            </div>

            {/* Right column: song info card + Sprint speed board (aligned with player cards). */}
            <div className="hidden shrink-0 flex-col self-start lg:flex lg:w-[440px] xl:w-[520px]">
              <div className="h-[34vh] shrink-0">
                <SongInfoCard variant="card" isRevealed={phase === 'revealed'} {...(songInfoProps ?? { animeName: '', songTitle: '', artist: '', type: '', difficulty: '' })} />
              </div>
              {showSprintBoard && sprintLeaderboard && (
                <div className="mt-[calc(8vh+4.25rem)]">
                  <SprintLeaderboard
                    data={sprintLeaderboard}
                    currentUserId={currentUserId}
                    myAvatar={myProfile.avatar}
                  />
                </div>
              )}
            </div>
          </div>
        </main>

        {gameMode !== 'solo' && (
          <>
            {/* The panel is always an overlay (absolute) so toggling it never
                resizes `main`. A backdrop closes it when open. */}
            {!sidebarCollapsed && (
              <button
                type="button"
                aria-label="Fermer le panneau"
                onClick={() => setSidebarCollapsed(true)}
                className="absolute inset-0 z-30 bg-background/80"
              />
            )}
            <div className="absolute inset-y-0 right-0 z-40 flex">
              <GameSidebar
                players={players}
                isCollapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                phase={phase}
                roomId={roomId || ''}
                currentUserId={currentUserId}
                attentionSignal={rosterAttention}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
