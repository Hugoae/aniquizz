import { KeyRound, LogOut, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { PROFILE_COPY } from '@/features/profile/copy/profileCopy';

export function ProfileOwnMenu({
  onOpenPasswordModal,
  onOpenDeleteAccountModal,
  onSignOut,
}: {
  onOpenPasswordModal: () => void;
  onOpenDeleteAccountModal: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="absolute top-4 right-4 z-20">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            aria-label={PROFILE_COPY.profileActions}
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={onOpenPasswordModal} className="gap-2">
            <KeyRound className="h-4 w-4" /> {PROFILE_COPY.changePassword}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onSignOut}
            className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" /> {PROFILE_COPY.signOut}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onOpenDeleteAccountModal}
            className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" /> {PROFILE_COPY.deleteAccount}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
