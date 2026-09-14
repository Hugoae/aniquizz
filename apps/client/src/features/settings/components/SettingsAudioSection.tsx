import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { usePlayerPrefs } from '@/features/settings/context/PlayerPrefsContext';
import { SETTINGS_COPY } from '@/features/settings/copy/settingsCopy';

export function SettingsAudioSection() {
  const { audioVolume, audioMuted, setAudioVolume, setAudioMuted, toggleMute, accountSync } =
    usePlayerPrefs();

  return (
    <section aria-labelledby="settings-audio-heading">
      <h3 id="settings-audio-heading" className="text-sm font-bold text-foreground">
        {SETTINGS_COPY.audioHeading}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {SETTINGS_COPY.audioHint}
      </p>

      <div className="mt-4 rounded-lg border border-border/50 bg-secondary/20 px-3 py-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            aria-pressed={audioMuted}
            aria-label={audioMuted ? SETTINGS_COPY.muteAriaOn : SETTINGS_COPY.muteAriaOff}
            className="h-8 w-8 shrink-0 rounded-md"
          >
            {audioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <span className="text-sm font-medium text-foreground">
            {audioMuted ? SETTINGS_COPY.muteOn : SETTINGS_COPY.muteOff}
          </span>
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {SETTINGS_COPY.volumeValue(audioVolume)}
          </span>
        </div>
        <Slider
          className="mt-3"
          value={[audioVolume]}
          onValueChange={([v]) => {
            setAudioVolume(v);
            if (audioMuted && v > 0) setAudioMuted(false);
          }}
          max={100}
          aria-label={SETTINGS_COPY.volumeLabel}
        />
        {audioMuted ? (
          <p className="mt-2 text-xs text-warning">{SETTINGS_COPY.mutedHint(audioVolume)}</p>
        ) : null}
      </div>

      {accountSync ? null : (
        <p className="mt-2 text-xs text-muted-foreground">{SETTINGS_COPY.signInToSync}</p>
      )}
    </section>
  );
}
