import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface SafeButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function SafeButton({ onClick, disabled }: SafeButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative w-56 h-56 rounded-full btn-safe",
        "flex flex-col items-center justify-center gap-3",
        "text-primary-foreground font-semibold text-lg",
        "transition-all duration-300 ease-out",
        "hover:scale-105 active:scale-95",
        "focus:outline-none focus:ring-4 focus:ring-primary/30",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        "pulse-soft"
      )}
    >
      <Home className="w-12 h-12" strokeWidth={2} />
      <span className="text-xl font-bold">Me voy a casa</span>
    </button>
  );
}
