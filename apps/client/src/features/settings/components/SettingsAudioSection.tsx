import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { usePlayerPrefs } from '@/features/settings/context/PlayerPrefsContext';
import { useSettingsCopy } from '@/features/settings/copy/settingsCopy';
import { SettingsSignInHint } from '@/features/settings/components/SettingsSignInHint';

export function SettingsAudioSection() {
  const { audioVolume, audioMuted, setAudioVolume, setAudioMuted, toggleMute, accountSync } =
    usePlayerPrefs();
  const copy = useSettingsCopy();

  return (
    <section aria-labelledby="settings-audio-heading">
      <h3 id="settings-audio-heading" className="text-sm font-bold text-foreground">
        {copy.audioHeading}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{copy.audioHint}</p>

      <div className="mt-4 rounded-lg border border-border/50 bg-secondary/20 px-3 py-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            aria-pressed={audioMuted}
            aria-label={audioMuted ? copy.muteAriaOn : copy.muteAriaOff}
            className="h-9 w-9 shrink-0 rounded-md"
          >
            {audioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <span className="text-sm font-medium text-foreground">
            {audioMuted ? copy.muteOn : copy.muteOff}
          </span>
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {copy.volumeValue(audioVolume)}
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
          aria-label={copy.volumeLabel}
        />
        {audioMuted ? (
          <p className="mt-2 text-xs text-warning">{copy.mutedHint(audioVolume)}</p>
        ) : null}
      </div>

      {accountSync ? null : (
        <div className="mt-2">
          <SettingsSignInHint message={copy.signInToSync} />
        </div>
      )}
    </section>
  );
}
