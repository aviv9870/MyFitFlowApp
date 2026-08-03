import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MuscleMap from "@/components/MuscleMap";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import Dashboard from "@/pages/Dashboard";
import Exercises from "@/pages/Exercises";
import Workout from "@/pages/Workout";
import History from "@/pages/History";
import Profile from "@/pages/Profile";
import Analytics from "@/pages/Analytics";
import Nutrition from "@/pages/Nutrition";
import CoachDashboard from "@/pages/CoachDashboard";
import TrainerTest from "@/pages/TrainerTest";
import Auth from "@/pages/Auth";
import Onboarding from "@/pages/Onboarding";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// Local-only direct entry point to the coach dashboard, bypassing the
// production email gate in AppSidebar (see MyFitFlow spec: solo-coach model).
const CoachRoute = () => {
  const navigate = useNavigate();
  return <CoachDashboard onClose={() => navigate("/")} />;
};

const ProtectedRoutes = () => {
  const { user, loading, needsOnboarding } = useAuth();

  if (loading || (user && needsOnboarding === null)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="neon-text text-xl font-bold animate-pulse-neon">MyFitFlow</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (needsOnboarding) return <Onboarding />;

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/exercises" element={<Exercises />} />
        <Route path="/workout" element={<Workout />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/coach" element={<CoachRoute />} />
        <Route path="/trainer-test" element={<TrainerTest />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </>
  );
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="neon-text text-xl font-bold animate-pulse-neon">MyFitFlow</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
