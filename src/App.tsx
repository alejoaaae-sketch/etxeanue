import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Setup from "./pages/Setup";
import ProtectorDashboard from "./pages/ProtectorDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Componente para rutas protegidas
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile, role, needsProfile, needsHomeLocation } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Si necesita completar perfil, ir a setup
  if (needsProfile) {
    return <Navigate to="/setup" replace />;
  }

  // Si es protector, ir a dashboard de protector
  if (role === "protector") {
    return <Navigate to="/protector" replace />;
  }

  return <>{children}</>;
}

// Componente para ruta de setup
function SetupRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, needsProfile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Solo permitir setup si realmente lo necesita
  if (!needsProfile) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Componente para ruta de protector
function ProtectorRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, role, needsProfile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (needsProfile) {
    return <Navigate to="/setup" replace />;
  }

  if (role !== "protector") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Componente para ruta de auth
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile, role, needsProfile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (user) {
    if (needsProfile) {
      return <Navigate to="/setup" replace />;
    }
    if (role === "protector") {
      return <Navigate to="/protector" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        }
      />
      <Route
        path="/auth"
        element={
          <AuthRoute>
            <Auth />
          </AuthRoute>
        }
      />
      <Route
        path="/setup"
        element={
          <SetupRoute>
            <Setup />
          </SetupRoute>
        }
      />
      <Route
        path="/protector"
        element={
          <ProtectorRoute>
            <ProtectorDashboard />
          </ProtectorRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
