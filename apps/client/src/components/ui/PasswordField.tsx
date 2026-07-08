import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
}

/** Password input with a white label above and a press-and-hold reveal eye. */
export function PasswordField({ id, label, value, autoComplete, onChange }: PasswordFieldProps) {
  const [reveal, setReveal] = useState(false);
  const hide = () => setReveal(false);

  // Keyboard support: the button is focusable; holding Space/Enter reveals the
  // password (parity with press-and-hold) and releasing/blurring hides it again.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setReveal(true); }
  };
  const onKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hide(); }
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <Input
          id={id}
          type={reveal ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          aria-label="Maintenir pour afficher le mot de passe"
          aria-pressed={reveal}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onMouseDown={() => setReveal(true)}
          onMouseUp={hide}
          onMouseLeave={hide}
          onTouchStart={(e) => { e.preventDefault(); setReveal(true); }}
          onTouchEnd={hide}
          onTouchCancel={hide}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onBlur={hide}
        >
          {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
