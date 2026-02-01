import { Settings, Construction } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
            <Settings className="h-5 w-5" />
            Paramètres
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10 text-primary animate-pulse">
                <Construction className="h-10 w-10" />
            </div>
            
            <div className="space-y-2">
                <h3 className="text-lg font-bold">Bientôt disponible</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Les paramètres globaux (langue, audio, intégrations) arriveront dans une prochaine mise à jour.
                </p>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}