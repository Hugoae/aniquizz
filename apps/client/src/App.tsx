/**
 * App shell: providers, global socket moderation handlers, and route table.
 *
 * Auth-gated routes use ProtectedRoute (redirect home + open login modal).
 * Both /profile and /profile/:userId require a session.
 */
import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { ThemeProvider } from 'next-themes';
import { Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { socket } from '@/lib/socket';
import { supabase } from '@/lib/supabase';

import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import { FriendsProvider } from '@/features/friends/FriendsContext';
import { AuthModal } from '@/features/auth/components/AuthModal';

const Home = lazy(() => import('@/pages/Home'));
const GameHub = lazy(() => import('@/pages/GameHub'));
const Game = lazy(() => import('@/pages/Game'));
const Profile = lazy(() => import('@/pages/Profile'));
const News = lazy(() => import('@/pages/News'));
const Leaderboard = lazy(() => import('@/pages/Leaderboard'));
const Library = lazy(() => import('@/pages/Library'));
const Admin = lazy(() => import('@/pages/Admin'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Chargement" />
    </div>
  );
}

/** Gameplay and profile routes require an authenticated session. */
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { session, loading, setShowAuthModal } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      setShowAuthModal(true);
    }
  }, [loading, session, setShowAuthModal]);

  if (loading) return <RouteFallback />;
  if (!session) return <Navigate to="/" replace />;
  return children;
};

const AppContent = () => {
  const { showAuthModal, setShowAuthModal } = useAuth();
  const navigate = useNavigate();

  // Server-driven exits must bounce the user back home:
  //  - force_logout (admin disconnect): clear the Supabase session.
  //  - io server disconnect (admin ban): the handshake keeps them out.
  useEffect(() => {
    let lastServerMessage: string | null = null;
    // Benign when single-session enforcement replaces this connection.
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
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route
            path="/play"
            element={
              <ProtectedRoute>
                <GameHub />
              </ProtectedRoute>
            }
          />

          <Route
            path="/game"
            element={
              <ProtectedRoute>
                <Game />
              </ProtectedRoute>
            }
          />

          <Route path="/daily" element={<Navigate to="/play" replace />} />
          <Route path="/news" element={<News />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/library" element={<Library />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:userId"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />

      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <AuthProvider>
          <FriendsProvider>
            <AppContent />
          </FriendsProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
