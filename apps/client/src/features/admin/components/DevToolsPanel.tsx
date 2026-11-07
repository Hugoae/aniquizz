import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Bot, Info, Play, Users } from 'lucide-react';
import { adminApi, AdminApiError, type AdminRoom, type BotConfig } from '@/lib/adminApi';
import { DEFAULT_CONFIG, type ScenarioConfig } from './devToolsConfig';
import { SectionTitle } from './devToolsUi';
import { DevScenarioSection } from './DevScenarioSection';
import { DevRoomList } from './DevRoomList';

const errorMessage = (e: unknown): string =>
  e instanceof AdminApiError ? e.message : 'Une erreur est survenue.';

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

  const toggleInArray = (key: 'difficulty' | 'soundTypes', value: string) => {
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
      navigate('/play', { state: { returnToLobby: true, roomId: res.roomId } });
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
        (r) => r.humanCount === 0 && (r.status === 'playing' || r.status === 'paused'),
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
    navigate('/play', { state: { returnToLobby: true, roomId } });

  const activeBots = rooms.reduce((sum, r) => sum + (r.playerCount - r.humanCount), 0);

  return (
    <div className="space-y-6">
      <DevScenarioSection
        cfg={cfg}
        setCfg={setCfg}
        botMax={botMax}
        toggleInArray={toggleInArray}
        accuracy={accuracy}
        setAccuracy={setAccuracy}
        delay={delay}
        setDelay={setDelay}
        applyBotPreset={applyBotPreset}
        createAndJoin={() => void createAndJoin()}
        launchHeadless={() => void launchHeadless()}
        busy={busy}
        loop={loop}
        setLoop={setLoop}
        lastRoomId={lastRoomId}
        onGoToRoom={onGoToRoom}
        joinRoom={joinRoom}
      />
      <DevRoomList
        rooms={rooms}
        addBots={(roomId, count) => void addBots(roomId, count)}
        removeBots={(roomId, count) => void removeBots(roomId, count)}
        onGoToRoom={onGoToRoom}
        joinRoom={joinRoom}
      />
      {/* --- Infos dev --- */}
      <div className="glass-card p-4 space-y-2">
        <SectionTitle icon={Info} title="Infos dev" />
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Play className="h-3.5 w-3.5" />
            Dev tooling :{' '}
            <span className={devInfo?.devEnabled ? 'text-success' : 'text-destructive'}>
              {devInfo ? (devInfo.devEnabled ? 'actif' : 'désactivé') : '…'}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <Bot className="h-3.5 w-3.5" /> Roster de bots : {devInfo?.botRosterSize ?? '…'}
          </span>
          <span className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5" /> Bots actifs : {activeBots}
          </span>
        </div>
      </div>
    </div>
  );
}
