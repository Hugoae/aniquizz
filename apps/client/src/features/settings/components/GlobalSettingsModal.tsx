import { Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GlobalSettingsContent } from '@/features/settings/components/GlobalSettingsContent';

interface GlobalSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSettingsModal({ open, onOpenChange }: GlobalSettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5" aria-hidden />
            Paramètres
          </DialogTitle>
        </DialogHeader>
        <GlobalSettingsContent variant="modal" />
      </DialogContent>
    </Dialog>
  );
}
