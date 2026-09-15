/**
 * In-match page shell — UI only; all wire protocol lives in useGameSocket + gameReducer.
 *
 * Responsibilities: video playback, answer input, leave/pause dialogs, settings modal,
 * and delegating layout/game-over to StandardGameLayout / StandardGameOver.
 * Player identity is always user.id (JWT), never socket.id.
 */
import { SeoHead } from '@/components/seo/SeoHead';
import { PAGE_TITLES } from '@/lib/site';
import { Loader2 } from 'lucide-react';

import { StandardGameOver } from '@/features/game/components/modes/standard/StandardGameOver';
import { StandardGameLayout } from '@/features/game/components/modes/standard/StandardGameLayout';
import { GlobalSettingsModal } from '@/features/settings/components/GlobalSettingsModal';
import { MissingGameRoom } from '@/features/game/components/MissingGameRoom';
import { MatchLoadingOverlay } from '@/features/game/components/MatchLoadingOverlay';
import { GameLeaveDialogs } from '@/features/game/components/GameLeaveDialogs';
import { GAME_COPY } from '@/features/game/copy/gameCopy';
import { DevRenderProfiler } from '@/components/dev/DevRenderProfiler';
import { useGamePage } from '@/features/game/hooks/useGamePage';

export default function Game() {
  const page = useGamePage();

  if (!page.roomId) {
    return (
      <>
        <SeoHead title={PAGE_TITLES.game} noindex path="/game" />
        <MissingGameRoom />
      </>
    );
  }

  if (page.phase === 'ended') {
    if (!page.state.victoryData) {
      return (
        <div className="absolute inset-0 z-50 flex animate-fade-in flex-col items-center justify-center gap-4 bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" aria-hidden />
          <p className="text-muted-foreground">{GAME_COPY.results.loading}</p>
        </div>
      );
    }

    return (
      <StandardGameOver
        players={page.players}
        currentUserId={page.currentUserId}
        onLeave={page.handleReturnToLobby}
        onReplay={page.handleReplay}
        victoryData={page.state.victoryData}
        history={page.state.roundHistory}
        settings={page.gameOverSettings}
        gameMode={page.gameMode}
      />
    );
  }

  return (
    <>
      <SeoHead title={PAGE_TITLES.game} noindex path="/game" />

      <video
        ref={page.preloadRef}
        muted
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        className="pointer-events-none absolute h-px w-px opacity-0"
        style={{ left: -9999, top: -9999 }}
      />

      {page.phase === 'loading' ? (
        <MatchLoadingOverlay
          loadingCount={page.loadingCount}
          firstClipReady={page.firstClipReady}
          amIHost={page.amIHost}
          onCancel={page.actions.cancel}
          onLeaveSalon={() => page.setHardLeavePrompt('play')}
        />
      ) : (
        <DevRenderProfiler id="StandardGameLayout">
          <StandardGameLayout {...page.layoutProps} />
        </DevRenderProfiler>
      )}

      <GlobalSettingsModal open={page.showSettings} onOpenChange={page.setShowSettings} />

      <GameLeaveDialogs
        showLeaveChoice={page.showLeaveChoice}
        onShowLeaveChoiceChange={page.setShowLeaveChoice}
        hardLeavePrompt={page.hardLeavePrompt}
        onHardLeavePromptChange={page.setHardLeavePrompt}
        leaveSalonConsequences={page.leaveSalonConsequences}
        onReturnToLobby={page.handleReturnToLobby}
        onLeaveSalonPlay={() => page.leaveSalon('/play')}
        onConfirmHardLeave={page.confirmHardLeave}
      />
    </>
  );
}
