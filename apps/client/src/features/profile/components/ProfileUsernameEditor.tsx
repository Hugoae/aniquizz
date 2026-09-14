import { useEffect, useRef } from 'react';
import { Check, Edit2, Loader2, X } from 'lucide-react';
import { GAME_CONFIG } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PROFILE_COPY } from '@/features/profile/copy/profileCopy';

export function ProfileUsernameEditor({
  username,
  newUsername,
  isEditing,
  isSaving,
  onStartEdit,
  onChange,
  onSave,
  onCancel,
}: {
  username: string;
  newUsername: string;
  isEditing: boolean;
  isSaving: boolean;
  onStartEdit: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  if (!isEditing) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label={PROFILE_COPY.editUsername}
        className="h-8 w-8 text-muted-foreground/50 hover:text-primary transition-colors"
        onClick={onStartEdit}
      >
        <Edit2 className="h-4 w-4" aria-hidden />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 animate-fade-in w-full md:w-auto">
      <Input
        ref={inputRef}
        value={newUsername}
        onChange={(e) => onChange(e.target.value)}
        className="text-2xl font-bold h-10 w-full md:w-64"
        maxLength={GAME_CONFIG.LIMITS.MAX_USERNAME_LENGTH}
        aria-label={PROFILE_COPY.editUsername}
      />
      <Button
        size="icon"
        onClick={onSave}
        disabled={isSaving}
        aria-label={PROFILE_COPY.saveUsername}
        className="h-10 w-10 shrink-0 bg-success text-success-foreground hover:bg-success/90"
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Check className="h-5 w-5" aria-hidden />
        )}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={onCancel}
        aria-label={PROFILE_COPY.cancelUsername}
        className="h-10 w-10 shrink-0"
      >
        <X className="h-5 w-5" aria-hidden />
      </Button>
    </div>
  );
}
