import { cn } from "@/lib/utils";

interface TimerDisplayProps {
  elapsedMinutes: number;
  estimatedMinutes: number;
  isOvertime: boolean;
}

export function TimerDisplay({ elapsedMinutes, estimatedMinutes, isOvertime }: TimerDisplayProps) {
  const progress = Math.min((elapsedMinutes / estimatedMinutes) * 100, 100);
  const remaining = Math.max(estimatedMinutes - elapsedMinutes, 0);

  const formatTime = (minutes: number) => {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes % 1) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Circular progress */}
      <div className="relative w-48 h-48">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={isOvertime ? "hsl(var(--warning))" : "hsl(var(--primary))"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${progress * 2.64} 264`}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            "text-3xl font-bold tabular-nums",
            isOvertime ? "text-warning" : "text-foreground"
          )}>
            {formatTime(elapsedMinutes)}
          </span>
          <span className="text-sm text-muted-foreground mt-1">
            {isOvertime ? "Tiempo extra" : `de ${estimatedMinutes} min`}
          </span>
        </div>
      </div>

      {/* Status text */}
      <div className="text-center">
        {isOvertime ? (
          <p className="text-warning font-medium">
            ⚠️ Llevas {Math.round(elapsedMinutes - estimatedMinutes)} min de más
          </p>
        ) : (
          <p className="text-muted-foreground">
            Quedan aproximadamente {Math.round(remaining)} minutos
          </p>
        )}
      </div>
    </div>
  );
}
