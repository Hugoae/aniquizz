import { Link, useNavigate } from 'react-router-dom';
import { hasRole } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { Coffee, LogIn, Shield } from 'lucide-react';

import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthModal } from '@/features/auth/context/AuthModalContext';
import { SuspensionBadge } from '@/features/auth/components/SuspensionBadge';
import { headerAuthSlot, sessionDisplayName } from '@/features/auth/lib/headerAuthSlot';
import { AUTH_COPY } from '@/features/auth/copy/authCopy';
import { ProfileButton } from '@/components/layout/ProfileButton';
import { prefetchRoute } from '@/lib/routePrefetch';
import { KOFI_URL } from '@/lib/site';

export function Header() {
  const navigate = useNavigate();
  const { user, profile, authReady, profileFailed, refreshProfile } = useAuth();
  const { setShowAuthModal } = useAuthModal();
  const isStaff = hasRole(profile?.role, 'MODERATOR');
  const slot = headerAuthSlot({
    authReady,
    hasUser: Boolean(user),
    hasProfile: Boolean(profile),
    profileFailed,
  });

  const openProfile = () => {
    if (slot === 'degraded') void refreshProfile();
    navigate('/profile');
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b border-border/60 bg-background/80 backdrop-blur-md z-50 px-4 md:px-6 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2.5 group" aria-label="AniQuizz — accueil">
        <img
          src="/favicon-32x32.png"
          alt=""
          width={32}
          height={32}
          fetchPriority="high"
          decoding="async"
          className="h-8 w-8 shrink-0 transition-transform group-hover:scale-110"
          aria-hidden
        />
        <span className="font-display text-2xl font-extrabold tracking-tight gradient-text">
          AniQuizz
        </span>
      </Link>

      <div className="flex min-w-[2.75rem] items-center justify-end gap-3">
        {slot === 'profile' && <SuspensionBadge />}
        <Button
          asChild
          variant="outline"
          size="sm"
          className="border-primary/35 bg-primary/[0.04] px-2.5 text-muted-foreground hover:border-primary/60 hover:bg-primary/10 hover:text-foreground sm:px-3"
        >
          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Soutenir AniQuizz sur Ko-fi (nouvel onglet)"
            title="Soutenir AniQuizz sur Ko-fi"
          >
            <Coffee className="text-primary" aria-hidden />
            <span className="hidden sm:inline">Soutenir</span>
          </a>
        </Button>
        {slot === 'profile' && isStaff && (
          <Button
            asChild
            variant="ghost"
            className="h-9 min-h-9 gap-2 rounded-lg px-3"
            aria-label="Administration"
            title="Administration"
          >
            <Link
              to="/admin"
              onPointerEnter={() => prefetchRoute('admin')}
              onFocus={() => prefetchRoute('admin')}
              onPointerDown={() => prefetchRoute('admin')}
            >
              <Shield className="h-4 w-4 text-primary" aria-hidden />
              <span className="hidden text-sm font-semibold md:inline">Admin</span>
            </Link>
          </Button>
        )}
        {slot === 'profile' && <div className="h-6 w-px bg-border/70" aria-hidden="true" />}
        {slot === 'loading' ? (
          <ProfileButton loading />
        ) : slot === 'profile' && profile ? (
          <ProfileButton
            username={profile.username}
            avatar={profile.avatar}
            xp={profile.xp}
            onClick={openProfile}
            onPrefetch={() => prefetchRoute('profile')}
          />
        ) : slot === 'degraded' ? (
          <ProfileButton
            username={sessionDisplayName(user)}
            label={AUTH_COPY.profileUnavailable}
            chipTitle={AUTH_COPY.profileUnavailableHint}
            degraded
            onClick={openProfile}
            onPrefetch={() => prefetchRoute('profile')}
          />
        ) : (
          <Button onClick={() => setShowAuthModal(true)} variant="default" className="font-bold">
            <LogIn className="mr-2 h-4 w-4" aria-hidden />
            {AUTH_COPY.signIn}
          </Button>
        )}
      </div>
    </header>
  );
}
