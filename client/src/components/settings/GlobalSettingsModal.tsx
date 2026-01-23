import { useState } from 'react';
import { Settings, Globe, Music, Link2, History, BookOpen, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface GlobalSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const languages = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'jp', flag: '🇯🇵', label: '日本語' },
];

const integrations = [
  { id: 'anilist', name: 'AniList', connected: false },
  { id: 'mal', name: 'MyAnimeList', connected: true },
  { id: 'kitsu', name: 'Kitsu', connected: false },
];

export function GlobalSettingsModal({ open, onOpenChange }: GlobalSettingsModalProps) {
  const [selectedLang, setSelectedLang] = useState('fr');
  const [titlePreference, setTitlePreference] = useState<'english' | 'romaji'>('english');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5" />
            Paramètres
          </DialogTitle>
        </DialogHeader>

        <div className="relative mt-2">
            
            {/* --- OVERLAY COMING SOON --- */}
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl bg-background/60 backdrop-blur-[2px] border border-white/5">
                 <div className="bg-black/90 p-6 rounded-2xl border border-primary/30 shadow-2xl flex flex-col items-center gap-3 text-center animate-in zoom-in-95">
                    <div className="p-3 rounded-full bg-primary/20">
                        <Lock className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold gradient-text">Bientôt disponible</h3>
                        <p className="text-xs text-muted-foreground max-w-[220px]">
                            Les paramètres avancés, les langues et les intégrations arriveront dans une prochaine mise à jour !
                        </p>
                    </div>
                </div>
            </div>

            {/* --- CONTENU DÉSACTIVÉ EN ARRIÈRE-PLAN --- */}
            <div className="space-y-6 opacity-40 pointer-events-none select-none filter blur-[1px]">
            
                {/* Language */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Langue & Région
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                    {languages.map((lang) => (
                        <Button
                        key={lang.code}
                        variant={selectedLang === lang.code ? 'default' : 'outline'}
                        className="justify-start gap-2 h-9"
                        onClick={() => setSelectedLang(lang.code)}
                        >
                        <span className="text-base">{lang.flag}</span>
                        {lang.label}
                        </Button>
                    ))}
                    </div>
                </div>

                {/* Anime Titles */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                    <Music className="h-4 w-4 text-muted-foreground" />
                    Préférence de titres
                    </Label>
                    <div className="flex bg-secondary/50 p-1 rounded-lg">
                    <Button
                        variant={titlePreference === 'english' ? 'default' : 'ghost'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setTitlePreference('english')}
                    >
                        Anglais
                    </Button>
                    <Button
                        variant={titlePreference === 'romaji' ? 'default' : 'ghost'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setTitlePreference('romaji')}
                    >
                        Romaji
                    </Button>
                    </div>
                </div>

                {/* Integrations */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    Intégrations
                    </Label>
                    <div className="space-y-2">
                    {integrations.map((integration) => (
                        <div
                        key={integration.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-secondary/50"
                        >
                        <span className="text-sm">{integration.name}</span>
                        <Switch checked={integration.connected} />
                        </div>
                    ))}
                    </div>
                </div>

                {/* History & Tutorial Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="justify-start gap-2 h-auto py-3">
                        <History className="h-4 w-4" />
                        <div className="flex flex-col items-start text-xs">
                            <span className="font-semibold">Historique</span>
                            <span className="text-muted-foreground">Vos derniers sons</span>
                        </div>
                    </Button>

                    <Button variant="outline" className="justify-start gap-2 h-auto py-3">
                        <BookOpen className="h-4 w-4" />
                        <div className="flex flex-col items-start text-xs">
                            <span className="font-semibold">Tutoriel</span>
                            <span className="text-muted-foreground">Revoir l'intro</span>
                        </div>
                    </Button>
                </div>

            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}