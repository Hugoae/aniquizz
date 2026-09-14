import { useEffect, type ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { RouteSkeletonFallback } from '@/components/layout/RouteSkeletonFallback';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthModal } from '@/features/auth/context/AuthModalContext';
import { authReturnToFromLocation, rememberAuthReturnTo } from '@/features/auth/lib/authReturnTo';

/** Gameplay, profile, and admin routes require an authenticated session. */
export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { session, authReady } = useAuth();
  const { setShowAuthModal } = useAuthModal();
  const location = useLocation();

  useEffect(() => {
    if (authReady && !session) {
      rememberAuthReturnTo(
        authReturnToFromLocation(location.pathname, location.search, location.hash),
      );
      setShowAuthModal(true);
    }
  }, [authReady, session, setShowAuthModal, location.pathname, location.search, location.hash]);

  if (!authReady) return <RouteSkeletonFallback />;
  if (!session) return <Navigate to="/" replace />;
  return children;
}
