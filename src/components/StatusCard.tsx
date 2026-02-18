import { MapPin, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusCardProps {
  status: "idle" | "traveling" | "checking" | "arrived" | "sos";
  address?: string;
}

const statusConfig = {
  idle: {
    icon: MapPin,
    title: "Lista para salir",
    subtitle: "Pulsa el botón cuando te vayas",
    color: "text-muted-foreground",
  },
  traveling: {
    icon: Clock,
    title: "De camino a casa",
    subtitle: "Te avisaremos si tardas más de lo esperado",
    color: "text-primary",
  },
  checking: {
    icon: Clock,
    title: "¿Todo bien?",
    subtitle: "Parece que tardas más de lo esperado",
    color: "text-warning",
  },
  arrived: {
    icon: CheckCircle2,
    title: "¡Has llegado!",
    subtitle: "Buen viaje 🏠",
    color: "text-success",
  },
  sos: {
    icon: MapPin,
    title: "Alerta enviada",
    subtitle: "Tu contacto ha sido notificado",
    color: "text-destructive",
  },
};

export function StatusCard({ status, address }: StatusCardProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn(
      "w-full p-5 rounded-2xl bg-card card-elevated",
      "animate-fade-in"
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          "bg-accent"
        )}>
          <Icon className={cn("w-5 h-5", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn("font-semibold", config.color)}>{config.title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{config.subtitle}</p>
          {address && (
            <p className="text-xs text-muted-foreground mt-2 truncate">
              📍 {address}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
