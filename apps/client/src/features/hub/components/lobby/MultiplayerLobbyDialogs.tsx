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
            <AlertDialogTitle>Quitter le salon ?</AlertDialogTitle>
            <AlertDialogDescription>
              {isHost && playerCount > 1
                ? "Vous êtes l'hôte. Si vous quittez, un nouvel hôte sera désigné automatiquement."
                : 'Vous allez être déconnecté de ce salon.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onShowLeaveChange(false);
                onLeave();
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Quitter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!transferTarget} onOpenChange={onTransferOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transférer le rôle d'hôte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce joueur deviendra l'hôte du salon et gérera les paramètres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmTransfer}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!kickTarget} onOpenChange={onKickOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exclure ce joueur ?</AlertDialogTitle>
            <AlertDialogDescription>
              {kickTarget?.name} sera retiré du salon. Il pourra le rejoindre à nouveau avec le
              code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmKick}
              className="bg-destructive hover:bg-destructive/90"
            >
              Exclure
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
