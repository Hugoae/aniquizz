import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Newspaper, Map, CheckCircle2, Circle, Clock, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
// Assure-toi que ces imports pointent vers tes vrais fichiers de données
import { allNews, typeConfig } from '@/data/newsData'; 

// Données de la Roadmap (Tu pourras les déplacer dans un fichier data plus tard)
const roadmapData = [
  {
    title: "Lancement V0.1",
    description: "Sortie publique de la base du jeu (Solo, Multi standard, Profil).",
    status: "done", // done, in-progress, planned
    date: "Janvier 2026"
  },
  {
    title: "Intégration AniList",
    description: "Possibilité de lier son compte AniList pour jouer seulement avec les animés qu'on a vu.",
    status: "in-progress",
    date: "Q1 2026"
  },
  {
    title: "Modes 'Lives' & 'Battle Royale'",
    description: "Nouveaux modes de jeu multijoueur éliminatoires.",
    status: "in-progress",
    date: "Q1 2026"
  },
  {
    title: "Système d'Xp et Amis",
    description: "Système d'xp et fonctionnalités d'amis.",
    status: "planned",
    date: "Q1 2026"
  },
  {
    title: "Paramètre et Traduction en Anglais",
    description: "Ajout de paramètres pour le site et votre compte & Traduction en Anglais",
    status: "planned",
    date: "Q2 2026"
  },
  {
    title: "Collection des sons & Coup de coeurs",
    description: "Collection des sons et possiblité de liké les sons pour les avoir en favoris",
    status: "planned",
    date: "Q2 2026"
  },
  {
    title: "Intégration MyAnimeList",
    description: "Support d'autres plateformes en plus d'AniList.",
    status: "planned",
    date: "Q3 2026"
  }
];

export default function News() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Actualités & Roadmap - AniQuizz</title>
        <meta name="description" content="Découvrez les dernières actualités et le futur d'AniQuizz." />
      </Helmet>

      <div className="min-h-screen bg-background pb-12">
        <Header />

        <main className="container max-w-6xl mx-auto px-4 pt-24">
          {/* Back button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')} 
            className="gap-2 mb-6 text-muted-foreground hover:text-foreground pl-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* COLONNE GAUCHE : ACTUALITÉS (2/3 largeur) */}
            <div className="lg:col-span-2 space-y-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Newspaper className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Actualités</h1>
                  <p className="text-muted-foreground">Mises à jour et annonces officielles</p>
                </div>
              </div>

              <div className="space-y-4">
                {allNews.map((news) => {
                  const config = typeConfig[news.type as keyof typeof typeConfig] || typeConfig.info;
                  const TypeIcon = config.icon;

                  return (
                    <article 
                      key={news.id}
                      className="glass-card p-6 hover:bg-secondary/30 transition-all cursor-default group border border-white/5 rounded-2xl"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${config.color} bg-opacity-20 shrink-0`}>
                          <TypeIcon className={`h-5 w-5 ${config.color.replace('bg-', 'text-')}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <Badge variant="outline" className={`${config.color} bg-opacity-10 border-opacity-20`}>
                              {config.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(news.date).toLocaleDateString('fr-FR', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric' 
                              })}
                            </span>
                          </div>
                          <h2 className="font-bold text-xl mb-2 text-foreground group-hover:text-primary transition-colors">
                            {news.title}
                          </h2>
                          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                            {news.content}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* COLONNE DROITE : ROADMAP (1/3 largeur) */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
                    <Map className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Roadmap</h2>
                    <p className="text-muted-foreground text-sm">Ce qui arrive bientôt...</p>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl border border-white/5 bg-secondary/10 relative overflow-hidden">
                    {/* Trait vertical de timeline */}
                    <div className="absolute left-9 top-8 bottom-8 w-0.5 bg-border/50" />

                    <div className="space-y-8 relative z-10">
                        {roadmapData.map((item, index) => {
                            let icon = <Circle className="h-3 w-3" />;
                            let colorClass = "text-muted-foreground border-muted-foreground";
                            let bgClass = "bg-background";

                            if (item.status === 'done') {
                                icon = <CheckCircle2 className="h-4 w-4" />;
                                colorClass = "text-green-500 border-green-500";
                                bgClass = "bg-green-500/10";
                            } else if (item.status === 'in-progress') {
                                icon = <Rocket className="h-3.5 w-3.5 animate-pulse" />;
                                colorClass = "text-purple-500 border-purple-500";
                                bgClass = "bg-purple-500/10";
                            } else {
                                icon = <Clock className="h-3.5 w-3.5" />;
                                colorClass = "text-muted-foreground/50 border-muted-foreground/30";
                            }

                            return (
                                <div key={index} className="flex gap-4 relative">
                                    <div className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 z-10 bg-background",
                                        colorClass
                                    )}>
                                        {icon}
                                    </div>
                                    <div className="pt-0.5 pb-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className={cn("font-bold text-sm", item.status === 'done' && "line-through opacity-70")}>
                                                {item.title}
                                            </h3>
                                            {item.status === 'in-progress' && (
                                                <Badge className="text-[9px] px-1 py-0 h-4 bg-purple-500/20 text-purple-400 border-0">En cours</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-1">
                                            {item.description}
                                        </p>
                                        <span className="text-[10px] font-mono font-bold opacity-50 uppercase tracking-widest">
                                            {item.date}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </>
  );
}