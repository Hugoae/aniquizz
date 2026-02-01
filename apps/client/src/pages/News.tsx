import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';

// Features
import { NewsCard } from '@/features/news/components/NewsCard';
import { RoadmapWidget } from '@/features/news/components/RoadmapWidget';
import { allNews } from '@/features/news/data/newsData';

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
          
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')} 
            className="gap-2 mb-6 text-muted-foreground hover:text-foreground pl-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* COLONNE GAUCHE : ACTUALITÉS */}
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
                {allNews.map((news) => (
                    <NewsCard key={news.id} news={news} />
                ))}
              </div>
            </div>

            {/* COLONNE DROITE : ROADMAP */}
            <div className="lg:col-span-1">
                <RoadmapWidget />
            </div>

          </div>
        </main>
      </div>
    </>
  );
}