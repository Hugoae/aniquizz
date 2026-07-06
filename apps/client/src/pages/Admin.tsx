import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { hasRole } from "@aniquizz/shared";
import { Header } from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { adminApi, AdminApiError } from "@/lib/adminApi";
import { UsersPanel } from "@/features/admin/components/UsersPanel";
import { RoomsPanel } from "@/features/admin/components/RoomsPanel";
import { CataloguePanel } from "@/features/admin/components/CataloguePanel";
import { DevToolsPanel } from "@/features/admin/components/DevToolsPanel";
import { StatsPanel } from "@/features/admin/components/StatsPanel";

const IS_DEV = import.meta.env.DEV;

export default function Admin() {
  const { session, loading, profile, refreshProfile } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const [tab, setTab] = useState("users");
  const [highlightRoomId, setHighlightRoomId] = useState<string | null>(null);

  const goToRoom = (roomId: string) => {
    setHighlightRoomId(roomId);
    setTab("rooms");
  };

  if (loading) return null;
  if (!session) return <Navigate to="/" replace />;

  const role = profile?.role;
  const isStaff = hasRole(role, "MODERATOR");
  const canManage = hasRole(role, "ADMIN");

  const claimAdmin = async () => {
    setClaiming(true);
    try {
      await adminApi.claimAdmin();
      await refreshProfile();
      toast.success("Vous êtes désormais administrateur.");
    } catch (e) {
      toast.error(e instanceof AdminApiError ? e.message : "Échec de l'élévation.");
    } finally {
      setClaiming(false);
    }
  };

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container pt-24 pb-12">
          <div className="max-w-md mx-auto glass-card p-8 text-center space-y-4">
            <Shield className="h-10 w-10 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-bold">Accès réservé</h1>
            <p className="text-muted-foreground text-sm">
              Cette page est réservée à l'équipe de modération.
            </p>
            {IS_DEV && (
              <Button onClick={() => void claimAdmin()} disabled={claiming}>
                Devenir admin (dev)
              </Button>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Admin - AniQuizz</title>
      </Helmet>
      <Header />
      <main className="container pt-24 pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold">
              <span className="gradient-text">Administration</span>
            </h1>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-6 flex-wrap h-auto">
              <TabsTrigger value="users">Utilisateurs</TabsTrigger>
              <TabsTrigger value="rooms">Salons</TabsTrigger>
              <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
              <TabsTrigger value="stats">Statistiques</TabsTrigger>
              {IS_DEV && canManage && <TabsTrigger value="dev">Dev Tools</TabsTrigger>}
            </TabsList>

            <TabsContent value="users">
              <UsersPanel canManage={canManage} onGoToRoom={goToRoom} />
            </TabsContent>
            <TabsContent value="rooms">
              <RoomsPanel highlightRoomId={highlightRoomId} />
            </TabsContent>
            <TabsContent value="catalogue">
              <CataloguePanel canManage={canManage} />
            </TabsContent>
            <TabsContent value="stats">
              <StatsPanel />
            </TabsContent>
            {IS_DEV && canManage && (
              <TabsContent value="dev">
                <DevToolsPanel onGoToRoom={goToRoom} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  );
}
