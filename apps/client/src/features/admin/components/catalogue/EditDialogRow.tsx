import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

export function EditDialogRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
