import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/AuthContext"; // <--- L'IMPORT IMPORTANT

import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Play from "./pages/Play";
import Game from "./pages/Game";
import Leaderboard from "./pages/Leaderboard";
import Library from "./pages/Library";
import Daily from "./pages/Daily";
import News from "./pages/News";
import NotFound from "./pages/NotFound";
import { useEffect } from 'react';
import { socket } from './services/socket';

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // On lance la connexion Socket.io (pour le jeu en temps réel)
    socket.connect();

    socket.on("connect", () => {
      console.log("✅ Socket Service : Connecté avec ID", socket.id);
    });

    return () => {
      socket.off("connect"); 
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        {/* On englobe tout le site avec l'Authentification */}
        <AuthProvider> 
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/play" element={<Play />} />
                  <Route path="/game" element={<Game />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/library" element={<Library />} />
                  <Route path="/daily" element={<Daily />} />
                  <Route path="/news" element={<News />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </AuthProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
};

export default App;