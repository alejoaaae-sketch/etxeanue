import { useState, useCallback, useEffect } from "react";
import { SafeButton } from "@/components/SafeButton";
import { SOSButton } from "@/components/SOSButton";
import { StatusCard } from "@/components/StatusCard";
import { TimerDisplay } from "@/components/TimerDisplay";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useJourneyTimer } from "@/hooks/useJourneyTimer";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Shield, X, Check, LogOut, UserCheck, MapPin, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type AppStatus = "idle" | "traveling" | "checking" | "arrived" | "sos";

const Index = () => {
  const [status, setStatus] = useState<AppStatus>("idle");
  const [showSOSConfirm, setShowSOSConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCheckDialog, setShowCheckDialog] = useState(false);
  const [protectorName, setProtectorName] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  
  const { toast } = useToast();
  const { profile, protectorLink, signOut, updateHomeLocation, refetchUserData } = useAuth();
  const navigate = useNavigate();

  // Fetch protector profile info
  useEffect(() => {
    const fetchProtector = async () => {
      if (!protectorLink?.protector_user_id) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", protectorLink.protector_user_id)
        .maybeSingle();
      if (data) setProtectorName(data.display_name);
    };
    fetchProtector();
  }, [protectorLink]);
  
  // Pasar ubicación de casa desde el perfil
  const geo = useGeolocation({
    latitude: profile?.home_latitude ?? null,
    longitude: profile?.home_longitude ?? null,
  });
  
  const timer = useJourneyTimer({
    onOvertimeCheck: () => {
      setStatus("checking");
      setShowCheckDialog(true);
      // Simular notificación push
      toast({
        title: "⏰ ¿Todo va bien?",
        description: "Parece que tardas más de lo esperado",
      });
    },
    onParentNotify: () => {
      // Simular notificación al padre
      toast({
        title: "📱 Contacto notificado",
        description: "Se ha enviado tu última ubicación conocida",
        variant: "destructive",
      });
    },
    gracePeriodMinutes: 0.5, // Para demo: 30 segundos
    responseTimeMinutes: 0.5, // Para demo: 30 segundos
  });

  // Verificar llegada periódicamente
  useEffect(() => {
    if (status !== "traveling") return;

    const checkArrival = async () => {
      try {
        const position = await geo.getCurrentPosition();
        if (geo.isNearHome(position.coords.latitude, position.coords.longitude)) {
          handleArrived();
        }
      } catch {
        // Silenciar errores de geolocalización durante verificación
      }
    };

    const interval = setInterval(checkArrival, 30000); // Cada 30 segundos
    return () => clearInterval(interval);
  }, [status, geo]);

  const handleStartJourney = async () => {
    try {
      const position = await geo.getCurrentPosition();
      const estimated = geo.estimateTimeToHome(
        position.coords.latitude,
        position.coords.longitude
      );
      
      // Para demo: tiempo estimado mínimo de 1 minuto
      const demoEstimated = Math.max(estimated, 1);
      
      timer.startJourney(demoEstimated);
      setStatus("traveling");
      
      toast({
        title: "🏠 ¡Buen viaje!",
        description: `Tiempo estimado: ${demoEstimated} minutos`,
      });
    } catch (error) {
      toast({
        title: "Error de ubicación",
        description: error instanceof Error ? error.message : "No se pudo obtener la ubicación",
        variant: "destructive",
      });
    }
  };

  const handleArrived = () => {
    timer.stopJourney();
    setStatus("arrived");
    setShowCheckDialog(false);
    
    toast({
      title: "🎉 ¡Has llegado a casa!",
      description: "El seguimiento se ha detenido",
    });

    // Volver a idle después de 3 segundos
    setTimeout(() => setStatus("idle"), 3000);
  };

  const handleConfirmOk = () => {
    timer.confirmOk();
    setStatus("traveling");
    setShowCheckDialog(false);
    
    toast({
      title: "✅ Perfecto",
      description: "Continuamos monitoreando tu viaje",
    });
  };

  const handleSOS = () => {
    timer.stopJourney();
    setStatus("sos");
    setShowSOSConfirm(false);
    
    toast({
      title: "🆘 Alerta SOS enviada",
      description: "Tu contacto de emergencia ha sido notificado con tu ubicación",
      variant: "destructive",
    });

    // Volver a idle después de 5 segundos
    setTimeout(() => setStatus("idle"), 5000);
  };

  const handleCancel = () => {
    timer.stopJourney();
    setStatus("idle");
    setShowCancelConfirm(false);
    
    toast({
      title: "Viaje cancelado",
      description: "El seguimiento se ha detenido",
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleSetHomeLocation = async () => {
    setLocationLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      await updateHomeLocation(position.coords.latitude, position.coords.longitude);

      toast({
        title: "📍 Ubicación guardada",
        description: "La ubicación de casa se ha actualizado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof GeolocationPositionError
          ? "No se pudo obtener la ubicación GPS"
          : "No se pudo guardar la ubicación",
        variant: "destructive",
      });
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg">SafeHome</span>
        </div>
        <div className="flex items-center gap-2">
          {status === "traveling" && (
            <SOSButton compact onClick={() => setShowSOSConfirm(true)} />
          )}
          <button onClick={handleLogout} className="p-2 text-muted-foreground">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>
      {/* Protector reference */}
      {(protectorName || protectorLink?.protector_phone) && (
        <div className="px-6 py-3 bg-accent/50 border-b">
          <div className="flex items-center gap-2 text-sm text-accent-foreground">
            <UserCheck className="w-4 h-4" />
            <span>
              Tu protector: <strong>{protectorName || protectorLink?.protector_phone}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Home location config */}
      <div className="px-6 py-2">
        <Button
          onClick={handleSetHomeLocation}
          disabled={locationLoading}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <MapPin className="w-4 h-4 mr-2" />
          {locationLoading
            ? "Obteniendo ubicación..."
            : profile?.home_latitude
              ? "Cambiar ubicación de casa"
              : "Configurar ubicación de casa"}
        </Button>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        {status === "idle" && (
          <div className="flex flex-col items-center gap-8 animate-fade-in">
            <SafeButton onClick={handleStartJourney} disabled={geo.loading} />
            <StatusCard status="idle" />
          </div>
        )}

        {(status === "traveling" || status === "checking") && (
          <div className="flex flex-col items-center gap-8 w-full max-w-sm animate-fade-in">
            <TimerDisplay
              elapsedMinutes={timer.elapsedMinutes}
              estimatedMinutes={timer.estimatedMinutes}
              isOvertime={timer.isOvertime}
            />
            <StatusCard status={status} />
            
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="flex-1 py-3 px-4 rounded-xl bg-secondary text-secondary-foreground font-medium flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors"
              >
                <X className="w-5 h-5" />
                Cancelar
              </button>
              <button
                onClick={handleArrived}
                className="flex-1 py-3 px-4 rounded-xl btn-safe text-primary-foreground font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Check className="w-5 h-5" />
                Ya llegué
              </button>
            </div>
          </div>
        )}

        {status === "arrived" && (
          <div className="flex flex-col items-center gap-8 animate-fade-in">
            <div className="w-32 h-32 rounded-full bg-success/20 flex items-center justify-center">
              <Check className="w-16 h-16 text-success" />
            </div>
            <StatusCard status="arrived" />
          </div>
        )}

        {status === "sos" && (
          <div className="flex flex-col items-center gap-8 animate-fade-in">
            <StatusCard status="sos" />
          </div>
        )}
      </main>

      {/* Bottom SOS button (only when not traveling) */}
      {status === "idle" && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background to-transparent">
          <SOSButton onClick={() => setShowSOSConfirm(true)} />
        </div>
      )}

      {/* Dialogs */}
      <ConfirmDialog
        open={showSOSConfirm}
        onOpenChange={setShowSOSConfirm}
        title="¿Enviar alerta SOS?"
        description="Se enviará tu ubicación actual a tu contacto de emergencia inmediatamente."
        confirmText="Sí, enviar alerta"
        onConfirm={handleSOS}
        variant="destructive"
      />

      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="¿Cancelar el viaje?"
        description="El seguimiento se detendrá y no se notificará a nadie."
        confirmText="Sí, cancelar"
        onConfirm={handleCancel}
      />

      <ConfirmDialog
        open={showCheckDialog}
        onOpenChange={setShowCheckDialog}
        title="⏰ ¿Todo va bien?"
        description="Parece que tardas más de lo esperado. Si no respondes, avisaremos a tu contacto."
        confirmText="Estoy bien, continuar"
        cancelText="Necesito ayuda (SOS)"
        onConfirm={handleConfirmOk}
      />
    </div>
  );
};

export default Index;
