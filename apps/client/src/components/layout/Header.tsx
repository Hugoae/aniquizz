import { Link, useNavigate } from 'react-router-dom';
import { hasRole } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { LogIn, Shield } from 'lucide-react';

import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthModal } from '@/features/auth/context/AuthModalContext';
import { SuspensionBadge } from '@/features/auth/components/SuspensionBadge';
import { ProfileButton } from '@/components/layout/ProfileButton';
import { prefetchRoute } from '@/lib/routePrefetch';

export function Header() {
  const navigate = useNavigate();
  const { user, profile, authReady } = useAuth();
  const { setShowAuthModal } = useAuthModal();
  const isStaff = hasRole(profile?.role, 'MODERATOR');

  const showProfileLoading = !authReady || Boolean(user && !profile);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b border-border/60 bg-background/80 backdrop-blur-md z-50 px-4 md:px-6 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2.5 group" aria-label="AniQuizz — accueil">
        <img
          src="/favicon-32x32.png"
          alt=""
          width={32}
          height={32}
          fetchpriority="high"
          decoding="async"
          className="h-8 w-8 shrink-0 transition-transform group-hover:scale-110"
          aria-hidden
        />
        <span className="font-display text-2xl font-extrabold tracking-tight gradient-text">
          AniQuizz
        </span>
      </Link>

      <div className="flex min-w-[2.75rem] items-center justify-end gap-3">
        {user && profile && <SuspensionBadge />}
        {user && profile && isStaff && (
          <Button
            variant="ghost"
            onClick={() => navigate('/admin')}
            onPointerEnter={() => prefetchRoute('admin')}
            onFocus={() => prefetchRoute('admin')}
            onPointerDown={() => prefetchRoute('admin')}
            className="h-auto gap-2 rounded-lg px-3 py-1"
            aria-label="Administration"
            title="Administration"
          >
            <Shield className="h-4 w-4 text-primary" aria-hidden />
            <span className="hidden md:inline text-sm font-semibold">Admin</span>
          </Button>
        )}
        {user && profile && isStaff && (
          <div className="h-6 w-px bg-border/70" aria-hidden="true" />
        )}
        {showProfileLoading ? (
          <ProfileButton loading />
        ) : user && profile ? (
          <ProfileButton
            username={profile.username}
            avatar={profile.avatar}
            xp={profile.xp}
            onClick={() => navigate('/profile')}
            onPrefetch={() => prefetchRoute('profile')}
          />
        ) : (
          <Button
            onClick={() => setShowAuthModal(true)}
            variant="default"
            className="font-bold"
          >
            <LogIn className="mr-2 h-4 w-4" aria-hidden />
            Se connecter
          </Button>
        )}
      </div>
    </header>
  );
}
