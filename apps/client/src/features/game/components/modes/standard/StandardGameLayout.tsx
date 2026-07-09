import { SkipLinkTarget } from '@/components/a11y/SkipLink';
import type { GamePlayer } from '@aniquizz/shared';
import { socket } from '@/lib/socket';
import { cn } from '@/lib/utils';
import type { AnimeSuggestion } from '@aniquizz/shared';
import type { CurrentSong } from '@/features/game/state/gameReducer';
import { activeMatchPlayers } from '../../../utils/ranking';

import { SongInfoCard } from '../../shared/SongInfoCard';
import { GameSidebar } from '../../core/GameSidebar';
import { GameTopBar } from './parts/GameTopBar';
import { VideoStage } from './parts/VideoStage';
import { AnswerInput } from './parts/AnswerInput';
import { PlayersFloor } from './parts/PlayersFloor';
import { ConfigBadges, type ConfigBadgesData } from './parts/ConfigBadges';
import type { GamePhase, InputMode, MyProfile } from './parts/types';

interface StandardGameLayoutProps {
  phase: GamePhase;
  players: GamePlayer[];
  currentRound: number;
  totalRounds: number;
  timeLeft: number;
  progress: number;
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
  myWatchedIds: number[];
  inputMode: InputMode;
  answer: string;
  setAnswer: (val: string) => void;
  submittedAnswer: string | null;
  suggestions: AnimeSuggestion[];
  choices: string[];
  onAction: (val: string) => void;
  onSwitchCarre: () => void;
  onSwitchDuo: () => void;
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
}

export function StandardGameLayout({
  phase, players, currentRound, totalRounds, timeLeft, progress,
  volume, isMuted, onVolumeChange, onToggleMute, videoRef, autoplayBlocked, onSafePlay,
  isGamePaused, isPausePending, resumeCountdown, onVotePause, pauseVotes, pauseRequired, skipVotes, skipRequired, onVoteSkip,
  currentSong, myWatchedIds,
  inputMode, answer, setAnswer, submittedAnswer, suggestions, choices, onAction, onSwitchCarre, onSwitchDuo,
  myProfile, sidebarCollapsed, setSidebarCollapsed, onShowLeave, onShowProfile, showPointsAnimation, pointsEarned,
  currentUserId, gameMode, roomId,
  responseType = 'mix',
  configBadges,
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
        coverImage: revealSong.cover ?? undefined,
        siteUrl: revealSong.siteUrl,
        tags: revealSong.tags,
        isWatched: revealSong.animeId ? myWatchedIds.includes(revealSong.animeId) : false,
      }
    : null;

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
            <div className="flex h-full w-full min-h-0 flex-1 flex-col items-center">
              <VideoStage
                videoRef={videoRef}
                phase={phase}
                currentSong={currentSong}
                autoplayBlocked={autoplayBlocked}
                onSafePlay={onSafePlay}
                isGamePaused={isGamePaused}
                resumeCountdown={resumeCountdown}
                isMuted={isMuted}
                volume={volume}
                onToggleMute={onToggleMute}
                onVolumeChange={onVolumeChange}
                timeLeft={timeLeft}
                progress={progress}
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
                    answer={answer}
                    setAnswer={setAnswer}
                    submittedAnswer={submittedAnswer}
                    suggestions={suggestions}
                    choices={choices}
                    onAction={onAction}
                    onSwitchCarre={onSwitchCarre}
                    onSwitchDuo={onSwitchDuo}
                    disabled={phase === 'ready'}
                  />
                ) : songInfoProps ? (
                  <div className="w-full lg:hidden">
                    <SongInfoCard variant="band" isRevealed {...songInfoProps} />
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

            {/* Right column: song info card, top-aligned with the video. Wider but
                shorter than the player so titles/tags have room without wrapping. */}
            <div className="hidden shrink-0 animate-fade-in self-start lg:block lg:h-[34vh] lg:w-[440px] xl:w-[520px]">
              <SongInfoCard variant="card" isRevealed={phase === 'revealed'} {...(songInfoProps ?? { animeName: '', songTitle: '', artist: '', type: '', difficulty: '' })} />
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
                className="absolute inset-0 z-30 bg-background/60 backdrop-blur-sm"
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
