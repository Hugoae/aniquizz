import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SoloGameOverActionsProps {
  onLeave: () => void;
  onReplay: () => void;
}

export function SoloGameOverActions({ onLeave, onReplay }: SoloGameOverActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:col-span-1">
      <Button onClick={onLeave} variant="outline" className="h-12 gap-2">
        <ArrowLeft className="h-4 w-4" /> Retour Lobby
      </Button>
      <Button onClick={onReplay} variant="glow" className="h-12 gap-2">
        <RotateCcw className="h-4 w-4" /> Rejouer
      </Button>
    </div>
  );
}
