import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';

// --- CONTEXT ---
import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';

// --- FEATURES ---
import { AuthModal } from '@/features/auth/components/AuthModal';

// --- PAGES ---
import Home from '@/pages/Home';
import GameHub from '@/pages/GameHub';
import Game from '@/pages/Game';
import Profile from '@/pages/Profile';
import Daily from '@/pages/Daily';
import News from '@/pages/News';
import Leaderboard from '@/pages/Leaderboard';
import Library from '@/pages/Library';
import NotFound from '@/pages/NotFound';

/**
 * Route guard: gameplay routes require an authenticated session.
 * Unauthenticated users are bounced home with the login modal opened.
 */
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { session, loading, setShowAuthModal } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      setShowAuthModal(true);
    }
  }, [loading, session, setShowAuthModal]);

  if (loading) return null;
  if (!session) return <Navigate to="/" replace />;
  return children;
};

/**
 * Composant interne qui a accès au AuthContext via useAuth().
 * C'est ici qu'on gère l'affichage de la modale et les routes.
 */
const AppContent = () => {
  // On récupère l'état d'ouverture de la modale depuis le contexte
  const { showAuthModal, setShowAuthModal } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      <Routes>
        {/* ACCUEIL */}
        <Route path="/" element={<Home />} />
        
        {/* HUB DE JEU (Choix mode, Lobby...) - Connexion requise */}
        <Route
          path="/play"
          element={
            <ProtectedRoute>
              <GameHub />
            </ProtectedRoute>
          }
        />
        
        {/* LE JEU EN COURS - Connexion requise */}
        <Route
          path="/game"
          element={
            <ProtectedRoute>
              <Game />
            </ProtectedRoute>
          }
        />
        
        {/* AUTRES ROUTES */}
        <Route path="/daily" element={<Daily />} />
        <Route path="/news" element={<News />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/library" element={<Library />} />
        <Route path="/profile" element={<Profile />} />
        
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* MODALES GLOBALES */}
      <AuthModal 
        open={showAuthModal} 
        onOpenChange={setShowAuthModal} 
      />
      
      <Toaster position="top-center" />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;