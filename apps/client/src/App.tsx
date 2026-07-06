import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { socket } from '@/lib/socket';
import { supabase } from '@/lib/supabase';

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
import Admin from '@/pages/Admin';
import NotFound from '@/pages/NotFound';

// --- DEV TOOLING ---
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
  const navigate = useNavigate();

  // Server-driven exits must bounce the user back home:
  //  - `force_logout` (admin "disconnect"): clear the Supabase session.
  //  - `io server disconnect` (admin ban): the handshake keeps them out.
  useEffect(() => {
    let lastServerMessage: string | null = null;
    // Set when this connection is replaced by a newer one for the same user
    // (single-session enforcement): the following disconnect is benign.
    let sessionReplaced = false;

    const onError = (p: { message?: string }) => {
      lastServerMessage = p?.message ?? null;
    };

    const onForceLogout = (p?: { reason?: string }) => {
      toast.error(p?.reason || 'Vous avez été déconnecté par la modération.');
      void supabase.auth.signOut();
      navigate('/', { replace: true });
    };

    const onSessionReplaced = () => {
      sessionReplaced = true;
    };

    const onDisconnect = (reason: string) => {
      if (reason !== 'io server disconnect') return;
      if (sessionReplaced) {
        sessionReplaced = false;
        return;
      }
      const message = lastServerMessage;
      lastServerMessage = null;
      toast.error(message || 'Vous avez été déconnecté.');
      navigate('/', { replace: true });
    };

    socket.on('error', onError);
    socket.on('force_logout', onForceLogout);
    socket.on('session_replaced', onSessionReplaced);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('error', onError);
      socket.off('force_logout', onForceLogout);
      socket.off('session_replaced', onSessionReplaced);
      socket.off('disconnect', onDisconnect);
    };
  }, [navigate]);

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

        {/* ADMIN - Connexion requise ; le rôle est vérifié côté serveur */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* MODALES GLOBALES */}
      <AuthModal 
        open={showAuthModal} 
        onOpenChange={setShowAuthModal} 
      />
      
      <Toaster position="bottom-right" richColors closeButton />
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