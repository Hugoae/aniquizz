import { Button } from '@/components/ui/button';
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
import { GAME_COPY } from '@/features/game/copy/gameCopy';

export type HardLeavePrompt = 'play' | 'profile';

interface GameLeaveDialogsProps {
  showLeaveChoice: boolean;
  onShowLeaveChoiceChange: (open: boolean) => void;
  hardLeavePrompt: HardLeavePrompt | null;
  onHardLeavePromptChange: (value: HardLeavePrompt | null) => void;
  leaveSalonConsequences: string;
  onReturnToLobby: () => void;
  onLeaveSalonPlay: () => void;
  onConfirmHardLeave: () => void;
}

export function GameLeaveDialogs({
  showLeaveChoice,
  onShowLeaveChoiceChange,
  hardLeavePrompt,
  onHardLeavePromptChange,
  leaveSalonConsequences,
  onReturnToLobby,
  onLeaveSalonPlay,
  onConfirmHardLeave,
}: GameLeaveDialogsProps) {
  return (
    <>
      <AlertDialog open={showLeaveChoice} onOpenChange={onShowLeaveChoiceChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{GAME_COPY.leaveMatch.title}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                <strong className="text-foreground">{GAME_COPY.leaveMatch.returnLobbyLead}</strong>{' '}
                — {GAME_COPY.leaveMatch.returnLobbyBody}
              </span>
              <span className="block">
                <strong className="text-foreground">{GAME_COPY.leaveMatch.leaveSalonLead}</strong> —{' '}
                {GAME_COPY.leaveMatch.leaveSalonBody} {leaveSalonConsequences}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>{GAME_COPY.leaveMatch.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onReturnToLobby();
                onShowLeaveChoiceChange(false);
              }}
              className="bg-primary"
            >
              {GAME_COPY.leaveMatch.returnCta}
            </AlertDialogAction>
            <Button
              variant="ghost"
              onClick={() => {
                onShowLeaveChoiceChange(false);
                onLeaveSalonPlay();
              }}
              className="text-destructive hover:bg-destructive/10"
            >
              {GAME_COPY.leaveMatch.leaveCta}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={hardLeavePrompt !== null}
        onOpenChange={(open) => {
          if (!open) onHardLeavePromptChange(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{GAME_COPY.leaveSalon.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {hardLeavePrompt === 'profile' && (
                <>
                  {GAME_COPY.leaveSalon.profile}
                  <br />
                </>
              )}
              {leaveSalonConsequences}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{GAME_COPY.leaveSalon.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmHardLeave}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {hardLeavePrompt === 'profile'
                ? GAME_COPY.leaveSalon.confirmProfile
                : GAME_COPY.leaveSalon.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
