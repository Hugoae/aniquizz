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
import type { LobbyPlayer } from '@/features/hub/components/LobbyPlayerCard';
import { pick } from '@/lib/i18n/text';

interface MultiplayerLobbyDialogsProps {
  showLeave: boolean;
  onShowLeaveChange: (open: boolean) => void;
  isHost: boolean;
  playerCount: number;
  onLeave: () => void;
  transferTarget: string | number | null;
  onTransferOpenChange: () => void;
  onConfirmTransfer: () => void;
  kickTarget: LobbyPlayer | null;
  onKickOpenChange: () => void;
  onConfirmKick: () => void;
}

export function MultiplayerLobbyDialogs({
  showLeave,
  onShowLeaveChange,
  isHost,
  playerCount,
  onLeave,
  transferTarget,
  onTransferOpenChange,
  onConfirmTransfer,
  kickTarget,
  onKickOpenChange,
  onConfirmKick,
}: MultiplayerLobbyDialogsProps) {
  return (
    <>
      <AlertDialog open={showLeave} onOpenChange={onShowLeaveChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pick('Quitter le salon ?', 'Leave the room?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {isHost && playerCount > 1
                ? pick(
                    "Vous êtes l'hôte. Si vous quittez, un nouvel hôte sera désigné automatiquement.",
                    'You are the host. If you leave, a new host is chosen automatically.',
                  )
                : pick(
                    'Vous allez être déconnecté de ce salon.',
                    'You will be disconnected from this room.',
                  )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{pick('Annuler', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onShowLeaveChange(false);
                onLeave();
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              {pick('Quitter', 'Leave')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!transferTarget} onOpenChange={onTransferOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pick("Transférer le rôle d'hôte ?", 'Transfer the host role?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pick(
                "Ce joueur deviendra l'hôte du salon et gérera les paramètres.",
                'This player becomes the room host and manages the settings.',
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{pick('Annuler', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmTransfer}>
              {pick('Confirmer', 'Confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!kickTarget} onOpenChange={onKickOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pick('Exclure ce joueur ?', 'Remove this player?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pick(
                `${kickTarget?.name} sera retiré du salon. Il pourra le rejoindre à nouveau avec le code.`,
                `${kickTarget?.name} will be removed from the room. They can join again with the code.`,
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{pick('Annuler', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmKick}
              className="bg-destructive hover:bg-destructive/90"
            >
              {pick('Exclure', 'Remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
