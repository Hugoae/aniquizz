import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Bot,
  Eye,
  FlaskConical,
  Gauge,
  Info,
  LogIn,
  Play,
  Rocket,
  Trash2,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  adminApi,
  AdminApiError,
  type AdminRoom,
  type BotConfig,
} from "@/lib/adminApi";

const errorMessage = (e: unknown): string =>
  e instanceof AdminApiError ? e.message : "Une erreur est survenue.";

import type { Precision, ResponseType, SoundSelection } from "@aniquizz/shared";
import { getPrecisionLabel } from "@aniquizz/shared";

interface ScenarioConfig {
  botCount: number;
  soundCount: number;
  responseType: ResponseType;
  difficulty: string[];
  soundTypes: string[];
  guessDuration: number;
  precision: Precision;
  soundSelection: SoundSelection;
}

const DEFAULT_CONFIG: ScenarioConfig = {
  botCount: 3,
  soundCount: 5,
  responseType: "mix",
  difficulty: ["medium"],
  soundTypes: ["opening"],
  guessDuration: 15,
  precision: "franchise",
  soundSelection: "random",
};

const SCENARIO_PRESETS: { key: string; label: string; botCount: number }[] = [
  { key: "solo", label: "Solo test (1 bot)", botCount: 1 },
  { key: "duel", label: "Duel (2 bots)", botCount: 2 },
  { key: "full", label: "Lobby plein (16 bots)", botCount: 16 },
];

const BOT_PRESETS: {
  key: string;
  label: string;
  accuracy: number;
  delay: [number, number];
}[] = [
  { key: "perfect", label: "Parfaits", accuracy: 1, delay: [800, 2500] },
  { key: "average", label: "Moyens", accuracy: 0.7, delay: [2000, 8000] },
  { key: "slow", label: "Lents / imprécis", accuracy: 0.4, delay: [6000, 14000] },
];

const DIFFICULTIES = [
  { id: "easy", label: "Facile" },
  { id: "medium", label: "Moyen" },
  { id: "hard", label: "Difficile" },
];

const SOUND_TYPES = [
  { id: "opening", label: "Openings" },
  { id: "ending", label: "Endings" },
  { id: "insert", label: "Inserts" },
];

const RESPONSE_TYPES: ResponseType[] = ["mix", "qcm", "typing"];
const SELECTIONS: { id: SoundSelection; label: string }[] = [
  { id: "random", label: "Aléatoire" },
  { id: "watched", label: "Watched" },
];

// --- small building blocks --------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/50",
      )}
    >
      {children}
    </button>
  );
}

function SectionTitle({ icon: Icon, title, hint }: { icon: typeof Bot; title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <Icon className="h-5 w-5 shrink-0 translate-y-1 text-primary" />
      <div>
        <h3 className="font-semibold">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

// --- main -------------------------------------------------------------------

export function DevToolsPanel({ onGoToRoom }: { onGoToRoom?: (roomId: string) => void }) {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [cfg, setCfg] = useState<ScenarioConfig>(DEFAULT_CONFIG);
  const [accuracy, setAccuracy] = useState(0.7);
  const [delay, setDelay] = useState<[number, number]>([2000, 8000]);
  const [busy, setBusy] = useState(false);
  const [loop, setLoop] = useState(false);
  const [lastRoomId, setLastRoomId] = useState<string | null>(null);
  const [devInfo, setDevInfo] = useState<{ devEnabled: boolean; botRosterSize: number } | null>(
    null,
  );
  const loopRunning = useRef(false);

  // Upper bound for bot counts, driven by the server-side roster size.
  const botMax = devInfo?.botRosterSize ?? 16;

  const botConfig = useCallback(
    (): BotConfig => ({ accuracy, minDelayMs: delay[0], maxDelayMs: delay[1] }),
    [accuracy, delay],
  );

  const scenarioSettings = useCallback(
    () => ({
      soundCount: cfg.soundCount,
      responseType: cfg.responseType,
      difficulty: cfg.difficulty.length ? cfg.difficulty : undefined,
      soundTypes: cfg.soundTypes.length ? cfg.soundTypes : undefined,
      guessDuration: cfg.guessDuration,
      precision: cfg.precision,
      soundSelection: cfg.soundSelection,
    }),
    [cfg],
  );

  const loadRooms = useCallback(async () => {
    try {
      const { rooms } = await adminApi.listRooms();
      setRooms(rooms);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    void loadRooms();
    void adminApi
      .devInfo()
      .then(setDevInfo)
      .catch(() => setDevInfo(null));
    const id = setInterval(() => void loadRooms(), 5000);
    return () => clearInterval(id);
  }, [loadRooms]);

  const toggleInArray = (key: "difficulty" | "soundTypes", value: string) => {
    setCfg((prev) => {
      const arr = prev[key];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
  };

  const applyBotPreset = (p: (typeof BOT_PRESETS)[number]) => {
    setAccuracy(p.accuracy);
    setDelay(p.delay);
  };

  // Create a room hosted by me + bots, then drop me into the lobby to watch/play.
  const createAndJoin = async () => {
    setBusy(true);
    try {
      const res = await adminApi.runScenario({
        botCount: cfg.botCount,
        join: true,
        autoStart: false,
        config: botConfig(),
        ...scenarioSettings(),
      });
      toast.success(`Salon créé avec ${res.botsAdded} bot(s). Redirection…`);
      navigate("/play", { state: { returnToLobby: true, roomId: res.roomId } });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // Headless: bots-only room that plays itself. Observe it in the Rooms tab.
  const runHeadless = useCallback(async (): Promise<string | null> => {
    try {
      const res = await adminApi.runScenario({
        botCount: cfg.botCount,
        join: false,
        autoStart: true,
        config: botConfig(),
        ...scenarioSettings(),
      });
      setLastRoomId(res.roomId);
      await loadRooms();
      return res.roomId;
    } catch (e) {
      toast.error(errorMessage(e));
      return null;
    }
  }, [cfg.botCount, botConfig, scenarioSettings, loadRooms]);

  const launchHeadless = async () => {
    setBusy(true);
    const id = await runHeadless();
    if (id) toast.success(`Scénario headless lancé (salon ${id}).`);
    setBusy(false);
  };

  // Soak loop: keep exactly one headless bot match running at all times.
  useEffect(() => {
    if (!loop) return;
    const tick = async () => {
      if (loopRunning.current) return;
      const active = rooms.some(
        (r) => r.humanCount === 0 && (r.status === "playing" || r.status === "paused"),
      );
      if (active) return;
      loopRunning.current = true;
      await runHeadless();
      loopRunning.current = false;
    };
    void tick();
    const id = setInterval(() => void tick(), 8000);
    return () => clearInterval(id);
  }, [loop, rooms, runHeadless]);

  const addBots = async (roomId: string, count: number) => {
    try {
      const { added } = await adminApi.addBots(roomId, count, botConfig());
      toast.success(`${added} bot(s) ajouté(s).`);
      await loadRooms();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const removeBots = async (roomId: string, count?: number) => {
    try {
      const { removed } = await adminApi.removeBots(roomId, count);
      toast.success(`${removed} bot(s) retiré(s).`);
      await loadRooms();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const joinRoom = (roomId: string) =>
    navigate("/play", { state: { returnToLobby: true, roomId } });

  const activeBots = rooms.reduce((sum, r) => sum + (r.playerCount - r.humanCount), 0);

  return (
    <div className="space-y-6">
      {/* --- Scénario --- */}
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
                  onClick={() => toggleInArray("difficulty", d.id)}
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
                  onClick={() => toggleInArray("soundTypes", t.id)}
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
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={loop} onCheckedChange={setLoop} />
            Boucle (soak)
          </label>
        </div>

        {lastRoomId && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3 text-sm">
            <span className="text-muted-foreground">
              Dernier scénario headless : <span className="font-mono">#{lastRoomId}</span>
            </span>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onGoToRoom?.(lastRoomId)}>
              <Eye className="h-3.5 w-3.5" /> Voir dans Salons
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => joinRoom(lastRoomId)}>
              <LogIn className="h-3.5 w-3.5" /> Rejoindre
            </Button>
          </div>
        )}
      </div>

      {/* --- Salons & bots --- */}
      <div className="glass-card p-4 space-y-3">
        <SectionTitle
          icon={Users}
          title="Salons & bots"
          hint="Ajoute/retire des bots dans un salon existant, ou saute directement dedans."
        />
        {!rooms.length && <p className="text-sm text-muted-foreground">Aucun salon actif.</p>}
        {rooms.map((room) => {
          const botCount = room.playerCount - room.humanCount;
          return (
            <div
              key={room.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2"
            >
              <div className="text-sm">
                <span className="font-medium">{room.name}</span>{" "}
                <span className="text-muted-foreground">
                  #{room.id} — {room.playerCount}/{room.maxPlayers}
                </span>{" "}
                <Badge className="bg-secondary">{room.status}</Badge>{" "}
                {botCount > 0 && (
                  <Badge className="gap-1 bg-accent/15 text-accent">
                    <Bot className="h-3 w-3" /> {botCount}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {[1, 3].map((n) => (
                  <Button
                    key={n}
                    size="sm"
                    variant="outline"
                    onClick={() => void addBots(room.id, n)}
                  >
                    +{n}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={botCount === 0}
                  onClick={() => void removeBots(room.id, 1)}
                >
                  −1
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={botCount === 0}
                  className="gap-1 text-destructive"
                  onClick={() => void removeBots(room.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Vider
                </Button>
                <Button size="sm" variant="ghost" className="gap-1" onClick={() => onGoToRoom?.(room.id)}>
                  <Eye className="h-3.5 w-3.5" /> Salons
                </Button>
                <Button size="sm" variant="ghost" className="gap-1" onClick={() => joinRoom(room.id)}>
                  <LogIn className="h-3.5 w-3.5" /> Rejoindre
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Infos dev --- */}
      <div className="glass-card p-4 space-y-2">
        <SectionTitle icon={Info} title="Infos dev" />
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Play className="h-3.5 w-3.5" />
            Dev tooling :{" "}
            <span className={devInfo?.devEnabled ? "text-success" : "text-destructive"}>
              {devInfo ? (devInfo.devEnabled ? "actif" : "désactivé") : "…"}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <Bot className="h-3.5 w-3.5" /> Roster de bots : {devInfo?.botRosterSize ?? "…"}
          </span>
          <span className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5" /> Bots actifs : {activeBots}
          </span>
        </div>
      </div>
    </div>
  );
}
