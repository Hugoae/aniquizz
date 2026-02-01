import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

// Features & Context
import { useAuth } from '@/features/auth/context/AuthContext';
import { AuthModal } from '@/features/auth/components/AuthModal';
import { UserAvatar } from '@/components/ui/UserAvatar';

export function Header() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-white/5 bg-background/80 backdrop-blur-md z-50 px-4 md:px-6 flex items-center justify-between">
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-2xl font-black tracking-tighter gradient-text group-hover:scale-105 transition-transform">
            AniQuizz
          </span>
        </Link>

        {/* ACTIONS UTILISATEUR */}
        <div className="flex items-center gap-4">
          {user && profile ? (
            // --- CONNECTÉ ---
            <Button
                variant="ghost"
                onClick={() => navigate('/profile')}
                className="flex items-center gap-3 pl-2 pr-4 py-1 h-auto rounded-full hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer outline-none focus:ring-0"
            >
                <UserAvatar 
                    avatar={profile.avatar} 
                    username={profile.username} 
                    className="h-8 w-8" 
                />
                <div className="hidden md:flex flex-col items-start text-sm">
                    <span className="font-bold leading-none">{profile.username}</span>
                </div>
            </Button>
          ) : (
            // --- DÉCONNECTÉ ---
            <Button
              onClick={() => setShowAuthModal(true)}
              variant="default"
              className="font-bold shadow-lg shadow-primary/20"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Se connecter
            </Button>
          )}
        </div>
      </header>

      {/* MODALE D'AUTH */}
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </>
  );
}