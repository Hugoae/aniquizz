import type { Dispatch, SetStateAction } from 'react';
import type { Precision, ResponseType, SoundSelection } from '@aniquizz/shared';
import { getPrecisionLabel } from '@aniquizz/shared';
import { Eye, FlaskConical, Gauge, LogIn, Rocket } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  BOT_PRESETS,
  DIFFICULTIES,
  RESPONSE_TYPES,
  SCENARIO_PRESETS,
  SELECTIONS,
  SOUND_TYPES,
  type ScenarioConfig,
} from './devToolsConfig';
import { Chip, Field, SectionTitle } from './devToolsUi';

export function DevScenarioSection({
  cfg,
  setCfg,
  botMax,
  toggleInArray,
  accuracy,
  setAccuracy,
  delay,
  setDelay,
  applyBotPreset,
  createAndJoin,
  launchHeadless,
  busy,
  loop,
  setLoop,
  lastRoomId,
  onGoToRoom,
  joinRoom,
}: {
  cfg: ScenarioConfig;
  setCfg: Dispatch<SetStateAction<ScenarioConfig>>;
  botMax: number;
  toggleInArray: (key: 'difficulty' | 'soundTypes', value: string) => void;
  accuracy: number;
  setAccuracy: Dispatch<SetStateAction<number>>;
  delay: [number, number];
  setDelay: Dispatch<SetStateAction<[number, number]>>;
  applyBotPreset: (preset: (typeof BOT_PRESETS)[number]) => void;
  createAndJoin: () => void;
  launchHeadless: () => void;
  busy: boolean;
  loop: boolean;
  setLoop: Dispatch<SetStateAction<boolean>>;
  lastRoomId: string | null;
  onGoToRoom?: (roomId: string) => void;
  joinRoom: (roomId: string) => void;
}) {
  return (
    <div className="glass-card p-4 space-y-4">
      <SectionTitle
        icon={FlaskConical}
        title="Lancer un scénario de bots"
        hint="Peuple un salon de bots pour tester le multijoueur seul, avec ou sans toi dedans."
      />

      {/* Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Presets :</span>
        {SCENARIO_PRESETS.map((p) => (
          <Chip
            key={p.key}
            active={cfg.botCount === p.botCount}
            onClick={() => setCfg((prev) => ({ ...prev, botCount: p.botCount }))}
          >
            {p.label}
          </Chip>
        ))}
      </div>

      {/* Numeric config */}
      <div className="flex flex-wrap items-end gap-4">
        <Field label={`Bots (1-${botMax})`}>
          <Input
            type="number"
            min={1}
            max={botMax}
            value={cfg.botCount}
            onChange={(e) =>
              setCfg((prev) => ({
                ...prev,
                botCount: Math.min(botMax, Math.max(1, Number(e.target.value) || 1)),
              }))
            }
            className="w-24"
          />
        </Field>
        <Field label="Sons">
          <Input
            type="number"
            min={1}
            max={50}
            value={cfg.soundCount}
            onChange={(e) =>
              setCfg((prev) => ({ ...prev, soundCount: Number(e.target.value) || 1 }))
            }
            className="w-24"
          />
        </Field>
        <Field label="Temps / round (s)">
          <Input
            type="number"
            min={5}
            max={120}
            value={cfg.guessDuration}
            onChange={(e) =>
              setCfg((prev) => ({ ...prev, guessDuration: Number(e.target.value) || 5 }))
            }
            className="w-24"
          />
        </Field>
        <Field label="Mode réponse">
          <select
            className="rounded border border-border bg-background px-2 py-2"
            value={cfg.responseType}
            onChange={(e) =>
              setCfg((prev) => ({ ...prev, responseType: e.target.value as ResponseType }))
            }
          >
            {RESPONSE_TYPES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Précision">
          <select
            className="rounded border border-border bg-background px-2 py-2"
            value={cfg.precision}
            onChange={(e) =>
              setCfg((prev) => ({ ...prev, precision: e.target.value as Precision }))
            }
          >
            <option value="franchise">{getPrecisionLabel('franchise')}</option>
            <option value="anime">{getPrecisionLabel('anime')}</option>
          </select>
        </Field>
        <Field label="Source">
          <select
            className="rounded border border-border bg-background px-2 py-2"
            value={cfg.soundSelection}
            onChange={(e) =>
              setCfg((prev) => ({ ...prev, soundSelection: e.target.value as SoundSelection }))
            }
          >
            {SELECTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Difficulty + sound types */}
      <div className="flex flex-wrap gap-6">
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">Difficulté</span>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d.id}
                active={cfg.difficulty.includes(d.id)}
                onClick={() => toggleInArray('difficulty', d.id)}
              >
                {d.label}
              </Chip>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">Types de sons</span>
          <div className="flex gap-2">
            {SOUND_TYPES.map((t) => (
              <Chip
                key={t.id}
                active={cfg.soundTypes.includes(t.id)}
                onClick={() => toggleInArray('soundTypes', t.id)}
              >
                {t.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {/* Bot behavior */}
      <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Gauge className="h-4 w-4 text-primary" /> Comportement des bots
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {BOT_PRESETS.map((p) => (
            <Chip
              key={p.key}
              active={accuracy === p.accuracy && delay[0] === p.delay[0] && delay[1] === p.delay[1]}
              onClick={() => applyBotPreset(p)}
            >
              {p.label}
            </Chip>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Précision des bots</span>
              <span className="font-semibold">{Math.round(accuracy * 100)}%</span>
            </div>
            <Slider
              value={[accuracy]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={(v) => setAccuracy(v[0])}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Délai de réponse</span>
              <span className="font-semibold">
                {(delay[0] / 1000).toFixed(1)}s – {(delay[1] / 1000).toFixed(1)}s
              </span>
            </div>
            <Slider
              value={delay}
              min={0}
              max={20000}
              step={500}
              minStepsBetweenThumbs={1}
              onValueChange={(v) => setDelay([v[0], v[1]] as [number, number])}
            />
          </div>
        </div>
      </div>

      {/* Launch */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button onClick={() => void createAndJoin()} disabled={busy} className="gap-2">
          <LogIn className="h-4 w-4" /> Créer et me placer dedans
        </Button>
        <Button
          variant="outline"
          onClick={() => void launchHeadless()}
          disabled={busy}
          className="gap-2"
        >
          <Rocket className="h-4 w-4" /> Lancer headless (auto)
        </Button>
        <label
          htmlFor="admin-dev-loop"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Switch id="admin-dev-loop" checked={loop} onCheckedChange={setLoop} />
          Boucle (soak)
        </label>
      </div>

      {lastRoomId && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3 text-sm">
          <span className="text-muted-foreground">
            Dernier scénario headless : <span className="font-mono">#{lastRoomId}</span>
          </span>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => onGoToRoom?.(lastRoomId)}
          >
            <Eye className="h-3.5 w-3.5" /> Voir dans Salons
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => joinRoom(lastRoomId)}
          >
            <LogIn className="h-3.5 w-3.5" /> Rejoindre
          </Button>
        </div>
      )}
    </div>
  );
}
