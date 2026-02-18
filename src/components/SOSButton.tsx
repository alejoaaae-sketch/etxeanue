import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SOSButtonProps {
  onClick: () => void;
  compact?: boolean;
}

export function SOSButton({ onClick, compact = false }: SOSButtonProps) {
  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-14 h-14 rounded-full btn-sos",
          "flex items-center justify-center",
          "text-destructive-foreground",
          "transition-all duration-200",
          "hover:scale-110 active:scale-95",
          "focus:outline-none focus:ring-4 focus:ring-destructive/30"
        )}
      >
        <AlertTriangle className="w-6 h-6" strokeWidth={2.5} />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full py-4 px-6 rounded-2xl btn-sos",
        "flex items-center justify-center gap-3",
        "text-destructive-foreground font-bold text-lg",
        "transition-all duration-200",
        "hover:scale-[1.02] active:scale-[0.98]",
        "focus:outline-none focus:ring-4 focus:ring-destructive/30"
      )}
    >
      <AlertTriangle className="w-6 h-6" strokeWidth={2.5} />
      <span>SOS - Avisar ahora</span>
    </button>
  );
}
