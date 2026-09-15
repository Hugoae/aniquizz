import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GlobalSettingsContent } from '@/features/settings/components/GlobalSettingsContent';
import { SETTINGS_COPY } from '@/features/settings/copy/settingsCopy';
import { subscribeSettingsOpen, type SettingsTab } from '@/features/settings/lib/openSettings';

interface GlobalSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSettingsModal({ open, onOpenChange }: GlobalSettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>('general');

  useEffect(() => {
    return subscribeSettingsOpen((next) => {
      setTab(next);
      onOpenChange(true);
    });
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto overscroll-contain sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5" aria-hidden />
            {SETTINGS_COPY.panelTitle}
          </DialogTitle>
        </DialogHeader>
        <GlobalSettingsContent variant="modal" initialTab={tab} />
      </DialogContent>
    </Dialog>
  );
}
