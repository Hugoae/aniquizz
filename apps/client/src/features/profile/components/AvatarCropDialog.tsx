import { useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface AvatarCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: string | null;
  isSaving: boolean;
  onConfirm: (area: Area) => void;
}

/** Round crop dialog for the profile picture; owns its crop/zoom state. */
export function AvatarCropDialog({ open, onOpenChange, image, isSaving, onConfirm }: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  // Reset the framing whenever a new image is selected.
  useEffect(() => {
    if (image) { setCrop({ x: 0, y: 0 }); setZoom(1); setArea(null); }
  }, [image]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader><DialogTitle>Ajuster la photo</DialogTitle></DialogHeader>
        <div className="relative w-full h-64 bg-background rounded-lg mt-4">
          {image && (
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          )}
        </div>
        <div className="py-4">
          <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={(v) => setZoom(v[0])} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => area && onConfirm(area)} disabled={isSaving || !area}>Valider</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
