import { useEffect } from 'react';
import {
  DAILY_PRECISION,
  getPrecisionChipLabel,
  type DailyResultDto,
  type DailySafeRoundDto,
} from '@aniquizz/shared';
import { SeoHead } from '@/components/seo/SeoHead';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StandardGameLayout } from '@/features/game/components/modes/standard/StandardGameLayout';
import { GlobalSettingsModal } from '@/features/settings/components/GlobalSettingsModal';
import { suppressFloatingSettings } from '@/features/settings/lib/openSettings';
import { PAGE_TITLES } from '@/lib/site';
import { DAILY_COPY } from '../copy/dailyCopy';
import { useDailyPlayRound } from '../hooks/useDailyPlayRound';
import { DailyTracks } from './DailyTracks';

interface DailyPlayProps {
  initial: DailySafeRoundDto;
  onFinished: (result: DailyResultDto) => void;
}

export function DailyPlay({ initial, onFinished }: DailyPlayProps) {
  const play = useDailyPlayRound({ initial, onFinished });
  useEffect(() => suppressFloatingSettings(), []);

  return (
    <>
      <SeoHead title={PAGE_TITLES.daily} path="/daily" noindex />
      <video
        ref={play.preloadRef}
        muted
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        className="pointer-events-none absolute h-px w-px opacity-0"
        style={{ left: -9999, top: -9999 }}
      />
      <StandardGameLayout
        phase={play.phase}
        players={play.players}
        currentRound={play.round.position}
        totalRounds={play.round.total}
        phaseEndsAt={play.phaseEndsAt}
        phaseDurationSeconds={play.phaseDurationSeconds}
        volume={play.audioVolume}
        isMuted={play.audioMuted}
        onVolumeChange={play.onVolumeChange}
        onToggleMute={play.toggleMute}
        videoRef={play.videoRef}
        autoplayBlocked={play.autoplayBlocked}
        onSafePlay={play.resumeCurrent}
        isGamePaused={false}
        isPausePending={false}
        resumeCountdown={null}
        onVotePause={() => {}}
        pauseVotes={0}
        pauseRequired={1}
        skipVotes={0}
        skipRequired={1}
        onVoteSkip={play.goNext}
        onSoloSkip={() => play.commitGuess(play.submittedRef.current)}
        currentSong={play.currentSong}
        videoMode="hidden"
        myWatchedIds={[]}
        inputMode="carre"
        submittedAnswer={play.submittedAnswer}
        choices={play.round.choices}
        onAction={play.pickChoice}
        onSwitchCarre={() => {}}
        onSwitchDuo={() => {}}
        precision={DAILY_PRECISION}
        myProfile={play.myProfile}
        sidebarCollapsed={play.sidebarCollapsed}
        setSidebarCollapsed={play.setSidebarCollapsed}
        onShowLeave={() => play.setLeaveMode('result')}
        onShowProfile={() => play.setLeaveMode('profile')}
        onShowSettings={() => play.setShowSettings(true)}
        showPointsAnimation={false}
        pointsEarned={null}
        currentUserId={play.currentUserId}
        gameMode="solo"
        responseType="qcm"
        pointsBadge={null}
        hideScores
        configBadges={{
          sourceLabel: DAILY_COPY.title,
          difficultyLabel: 'QCM',
          precisionLabel: getPrecisionChipLabel(DAILY_PRECISION),
          modeLabel: DAILY_COPY.title,
        }}
        autofocusAnswer={false}
        submitOnEnter={false}
        showShortcutReminder={false}
        showPause={false}
        showRoundProgress={false}
        answerDisabled={play.committing || Boolean(play.reveal)}
        roundMeter={<DailyTracks tracks={play.tracks} />}
      />

      <GlobalSettingsModal open={play.showSettings} onOpenChange={play.setShowSettings} />

      <AlertDialog
        open={play.leaveMode !== null}
        onOpenChange={(open) => !open && play.setLeaveMode(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{DAILY_COPY.leaveTitle}</AlertDialogTitle>
            <AlertDialogDescription>{DAILY_COPY.leaveBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{DAILY_COPY.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                // Keep the intent even if Radix closes the dialog before state updates.
                event.preventDefault();
                play.confirmLeave();
              }}
            >
              {DAILY_COPY.forfeit}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
