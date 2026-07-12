import { lazy, Suspense, useEffect, useLayoutEffect, type ReactElement, type ReactNode } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SkipLink } from '@/components/a11y/SkipLink';
import { RouteSkeletonFallback, DelayedRouteFallback } from '@/components/layout/RouteSkeletonFallback';
import { warmLikelyRoutes } from '@/lib/routePrefetch';
import { dismissAppShellWhenReady } from '@/lib/appShell';
import { markLandingPaintDone } from '@/lib/initialPaint';

import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import { AuthModalProvider, useAuthModal } from '@/features/auth/context/AuthModalContext';
import { notifyModerationBan } from '@/lib/suspension';
import { CookieConsentProvider } from '@/features/legal/CookieConsentContext';
import { CookieConsentBanner } from '@/features/legal/CookieConsentBanner';

import Home from '@/pages/Home';
const GameHub = lazy(() => import('@/pages/GameHub'));
const Game = lazy(() => import('@/pages/Game'));
const Profile = lazy(() => import('@/pages/Profile'));
const News = lazy(() => import('@/pages/News'));
const Leaderboard = lazy(() => import('@/pages/Leaderboard'));
const Library = lazy(() => import('@/pages/Library'));
const Admin = lazy(() => import('@/pages/Admin'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const PrivacyPolicyPage = lazy(() => import('@/pages/legal/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('@/pages/legal/TermsOfServicePage'));
const LegalNoticePage = lazy(() => import('@/pages/legal/LegalNoticePage'));

const AuthModal = lazy(() =>
  import('@/features/auth/components/AuthModal').then((m) => ({ default: m.AuthModal })),
);

const FriendsProvider = lazy(() =>
  import('@/features/friends/FriendsContext').then((m) => ({ default: m.FriendsProvider })),
);

/** Gameplay and profile routes require an authenticated session. */
const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const { session, authReady } = useAuth();
  const { setShowAuthModal } = useAuthModal();

  useEffect(() => {
    if (authReady && !session) {
      setShowAuthModal(true);
    }
  }, [authReady, session, setShowAuthModal]);

  if (!authReady) return <RouteSkeletonFallback />;
  if (!session) return <Navigate to="/" replace />;
  return children;
};

/** Friends socket state is only needed for signed-in users — defer the chunk until then. */
function SessionFriendsProvider({ children }: { children: ReactNode }) {
  const { session, authReady } = useAuth();
  if (!authReady || !session) return <>{children}</>;
  return (
    <Suspense fallback={null}>
      <FriendsProvider>{children}</FriendsProvider>
    </Suspense>
  );
}

/** No skeleton on `/` — Home is eager-imported and the HTML app-shell covers first paint. */
function AppSuspenseFallback() {
  const { pathname } = useLocation();
  if (pathname === '/') return null;
  return <DelayedRouteFallback />;
}

const AppContent = () => {
  const { showAuthModal, setShowAuthModal } = useAuthModal();
  const { session, authReady } = useAuth();
  const navigate = useNavigate();

  // Keep the HTML shell covering #root until Tailwind is verified on the mounted Home.
  useLayoutEffect(() => {
    markLandingPaintDone();
  }, []);

  useEffect(() => {
    void dismissAppShellWhenReady();
  }, []);

  // Warm the most likely next route chunks once idle so navigation never flashes
  // a Suspense skeleton. Signed-in users also get the profile chunk.
  useEffect(() => {
    if (!authReady) return;
    warmLikelyRoutes(Boolean(session));
  }, [authReady, session]);

  // Server-driven exits must bounce the user back home:
  //  - force_logout (admin disconnect): clear the Supabase session.
  //  - io server disconnect (admin ban): the handshake keeps them out.
  useEffect(() => {
    let disposed = false;
    let cleanupSocket: (() => void) | undefined;

    void import('@/lib/socket').then(({ socket }) => {
      if (disposed) return;

      let lastServerMessage: string | null = null;
      let sessionReplacedAt = 0;
      const SESSION_REPLACED_GRACE_MS = 3_000;

      const onError = (p: { message?: string }) => {
        lastServerMessage = p?.message ?? null;
      };

      const onForceLogout = (p?: { reason?: string }) => {
        toast.error(p?.reason || 'Vous avez été déconnecté par la modération.');
        void import('@/lib/supabase').then(({ supabase }) => supabase.auth.signOut());
        navigate('/', { replace: true });
      };

      const onSessionReplaced = () => {
        sessionReplacedAt = Date.now();
      };

      const onDisconnect = (reason: string) => {
        if (reason !== 'io server disconnect') return;
        // Benign single-session policy: another tab/socket replaced this connection.
        if (Date.now() - sessionReplacedAt < SESSION_REPLACED_GRACE_MS) return;

        const message = lastServerMessage;
        lastServerMessage = null;

        if (notifyModerationBan(message)) {
          navigate('/', { replace: true });
          return;
        }

        // Unknown server drop — let Socket.io reconnect; only surface explicit server copy.
        if (message) {
          toast.error(message);
        }
      };

      socket.on('error', onError);
      socket.on('force_logout', onForceLogout);
      socket.on('session_replaced', onSessionReplaced);
      socket.on('disconnect', onDisconnect);

      cleanupSocket = () => {
        socket.off('error', onError);
        socket.off('force_logout', onForceLogout);
        socket.off('session_replaced', onSessionReplaced);
        socket.off('disconnect', onDisconnect);
      };
    });

    return () => {
      disposed = true;
      cleanupSocket?.();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      <SkipLink />
      <Suspense fallback={<AppSuspenseFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/legal/confidentialite" element={<PrivacyPolicyPage />} />
          <Route path="/legal/cgu" element={<TermsOfServicePage />} />
          <Route path="/legal/mentions" element={<LegalNoticePage />} />

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

      {showAuthModal && (
        <Suspense fallback={null}>
          <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
        </Suspense>
      )}

      <CookieConsentBanner />
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
};

function App() {
  return (
    <TooltipProvider>
      <CookieConsentProvider>
        <AuthModalProvider>
          <AuthProvider>
            <SessionFriendsProvider>
              <AppContent />
            </SessionFriendsProvider>
          </AuthProvider>
        </AuthModalProvider>
      </CookieConsentProvider>
    </TooltipProvider>
  );
}

export default App;
