import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlobalSettingsModal } from './GlobalSettingsModal';

export function FloatingSettingsButton() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <Button
        variant="glass"
        size="icon"
        onClick={() => setShowSettings(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-elevated hover-glow z-50"
      >
        <Settings className="h-6 w-6" />
      </Button>

      <GlobalSettingsModal open={showSettings} onOpenChange={setShowSettings} />
    </>
  );
}
