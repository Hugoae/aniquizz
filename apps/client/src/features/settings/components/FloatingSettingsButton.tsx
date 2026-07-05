import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlobalSettingsModal } from './GlobalSettingsModal'; // Import relatif simple

export function FloatingSettingsButton() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <Button
        variant="default" // J'ai remis 'default' ou 'secondary' car 'glass' n'existe pas par défaut dans shadcn sauf si tu l'as créé
        size="icon"
        onClick={() => setShowSettings(true)}
        // MODIFICATION: rounded-full -> rounded-2xl (Pour le style Squircle)
        className="fixed bottom-6 right-6 h-14 w-14 shadow-xl hover:scale-105 transition-transform z-50 rounded-2xl"
      >
        <Settings className="h-6 w-6" />
      </Button>

      <GlobalSettingsModal open={showSettings} onOpenChange={setShowSettings} />
    </>
  );
}