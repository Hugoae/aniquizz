import { useState } from 'react';
import { Lock, Users, HelpCircle, RotateCcw, Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CreateRoomFormProps {
  onSubmit: (config: RoomConfig) => void;
}

interface RoomConfig {
  roomName: string;
  isPrivate: boolean;
  password: string;
  maxPlayers: number;
  gameType: string;
  responseType: string;
  soundCount: number;
  soundTypes: string[];
  difficulty: string; // Gardé pour compatibilité type, mais masqué UI
  playlist: string | null;
  precision: string;
  decade?: string;
}

const defaultConfig: RoomConfig = {
  roomName: '',
  isPrivate: false,
  password: '',
  maxPlayers: 8,
  gameType: 'standard',
  responseType: 'mix',
  soundCount: 20,
  soundTypes: ['opening'],
  difficulty: 'medium',
  playlist: null,
  precision: 'franchise', // Défaut
  decade: '2010'
};

const playlists = [
  { id: 'shonen', name: 'Shonen Jump', icon: '⚔️', count: 50 },
  { id: 'isekai', name: 'Isekai World', icon: '🌍', count: 40 },
  { id: 'romance', name: 'Romance & Drama', icon: '💖', count: 35 },
  { id: 'decades', name: 'Décennies', icon: '📅', count: 100 },
  { id: 'top-50', name: 'Top 50 Popular', icon: '🏆', count: 50 },
];

export function CreateRoomForm({ onSubmit }: CreateRoomFormProps) {
  const [config, setConfig] = useState<RoomConfig>(defaultConfig);

  const handleReset = () => {
    setConfig(defaultConfig);
  };

  const toggleSoundType = (type: string) => {
    setConfig(prev => ({
      ...prev,
      soundTypes: prev.soundTypes.includes(type)
        ? prev.soundTypes.filter(t => t !== type)
        : [...prev.soundTypes, type],
    }));
  };

  // Liste des modes pour la création de room multi
    const gameModes = [
        { id: 'standard', label: 'Standard', disabled: false },
        { id: 'battle-royale', label: 'Battle Royale', disabled: true },
        { id: 'lives', label: 'Lives', disabled: true },
    ];

  const decades = ["1980", "1990", "2000", "2010", "2020"];

  return (
    <div className="space-y-6">
      {/* Room Settings */}
      <div className="space-y-4 p-4 rounded-xl bg-secondary/30 border border-border">
        <h4 className="font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Configuration du Salon
        </h4>

        {/* Grille uniforme pour Nom/Password/Joueurs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
                <Label className="text-xs">Nom du salon</Label>
                <Input
                value={config.roomName}
                onChange={(e) => setConfig(prev => ({ ...prev, roomName: e.target.value }))}
                placeholder="Ma partie anime..."
                className="mt-1 h-9 w-full"
                />
            </div>

            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                        <Label className="text-xs">Salon privé</Label>
                    </div>
                    <Switch
                        checked={config.isPrivate}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, isPrivate: checked }))}
                        className="scale-75 origin-right"
                    />
                </div>
                <div className="h-9">
                    {config.isPrivate ? (
                        <Input
                            type="password"
                            value={config.password}
                            onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Mot de passe..."
                            className="h-full text-xs w-full"
                        />
                    ) : (
                        <div className="h-full w-full border border-border/20 rounded bg-muted/20" />
                    )}
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Joueurs max</Label>
                    <span className="text-xs font-semibold text-primary">{config.maxPlayers}</span>
                </div>
                <div className="h-9 flex items-center">
                    <Slider
                    value={[config.maxPlayers]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, maxPlayers: value }))}
                    min={2}
                    max={12}
                    step={1}
                    className="w-full"
                    />
                </div>
            </div>
        </div>
      </div>

      {/* Game Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
            {/* Game Type */}
            <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Type de partie</Label>
                <Tooltip>
                <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                    <p className="max-w-xs">Standard: classique. Battle Royale: éliminations. Lives: survie.</p>
                </TooltipContent>
                </Tooltip>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {gameModes.map(type => (
                <Button
                    key={type.id}
                    variant={config.gameType === type.id ? 'default' : 'outline'}
                    size="sm"
                    disabled={type.disabled}
                    onClick={() => !type.disabled && setConfig(prev => ({ ...prev, gameType: type.id }))}
                    className={cn("relative overflow-hidden whitespace-nowrap", type.disabled && "opacity-60 cursor-not-allowed")}
                >
                    <span className="flex items-center gap-2">
                        {type.label}
                        {type.disabled && <Hourglass className="w-3 h-3 text-muted-foreground" />}
                    </span>
                </Button>
                ))}
            </div>
            </div>

            {/* Response Type */}
            <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Type de réponse</Label>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {['typing', 'qcm', 'mix'].map(type => (
                <Button
                    key={type}
                    variant={config.responseType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setConfig(prev => ({ ...prev, responseType: type }))}
                    className="uppercase"
                >
                    {type}
                </Button>
                ))}
            </div>
            </div>

            {/* Sound Count */}
            <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Nombre de sons</Label>
                <span className="text-lg font-semibold text-primary">{config.soundCount}</span>
            </div>
            <Slider
                value={[config.soundCount]}
                onValueChange={([value]) => setConfig(prev => ({ ...prev, soundCount: value }))}
                min={5}
                max={50}
                step={5}
            />
            </div>

            {/* Sound Types */}
            <div className="space-y-3">
            <Label className="text-sm font-medium">Types de sons</Label>
            <div className="flex gap-4">
                {[
                { id: 'opening', label: 'Opening' },
                { id: 'ending', label: 'Ending' },
                { id: 'insert', label: 'Insert' },
                ].map(type => (
                <div key={type.id} className="flex items-center space-x-2">
                    <Checkbox
                    id={`room-${type.id}`}
                    checked={config.soundTypes.includes(type.id)}
                    onCheckedChange={() => toggleSoundType(type.id)}
                    />
                    <Label htmlFor={`room-${type.id}`} className="text-sm cursor-pointer">
                    {type.label}
                    </Label>
                </div>
                ))}
            </div>
            </div>

            {/* DÉCENNIES DÉPLACÉ ICI (COLONNE GAUCHE) */}
            {config.playlist === 'decades' && (
                <div className="space-y-3 animate-fade-in">
                    <Label className="text-sm font-medium">Décennie</Label>
                    <div className="grid grid-cols-5 gap-1">
                        {decades.map(year => (
                            <button
                                key={year}
                                onClick={() => setConfig((prev: any) => ({ ...prev, decade: year }))}
                                className={cn(
                                    "py-2 rounded-lg text-xs font-bold transition-all border",
                                    config.decade === year 
                                        ? "bg-purple-500 text-white border-purple-500 shadow-md" 
                                        : "bg-card border-border hover:bg-secondary hover:border-primary/30"
                                )}
                            >
                                {year}s
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Right Column - Playlists */}
        <div className="space-y-3">
            <Label className="text-sm font-medium">Playlists</Label>
            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {playlists.map(playlist => (
                <button
                    key={playlist.id}
                    onClick={() => setConfig(prev => ({ 
                        ...prev, 
                        playlist: config.playlist === playlist.id ? null : playlist.id,
                        soundCount: playlist.count
                    }))}
                    className={cn(
                    "p-3 rounded-lg border text-left transition-all hover:border-primary/50",
                    config.playlist === playlist.id 
                        ? "border-primary bg-primary/10" 
                        : "border-border bg-secondary/30"
                    )}
                >
                    <div className="flex items-center gap-2">
                    <span className="text-lg">{playlist.icon}</span>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{playlist.name}</div>
                        <div className="text-[10px] text-muted-foreground">{playlist.count} sons</div>
                    </div>
                    </div>
                </button>
                ))}
            </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
        <Button
          variant="glow"
          onClick={() => onSubmit(config)}
          className="flex-1"
          disabled={!config.roomName || config.soundTypes.length === 0 || (config.isPrivate && !config.password)}
        >
          Créer le salon
        </Button>
      </div>
    </div>
  );
}