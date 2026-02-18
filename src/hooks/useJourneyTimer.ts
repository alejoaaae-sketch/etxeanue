import { useState, useEffect, useCallback, useRef } from "react";

interface JourneyState {
  isActive: boolean;
  startTime: Date | null;
  elapsedMinutes: number;
  estimatedMinutes: number;
  isOvertime: boolean;
  overtimeMinutes: number;
  checkPending: boolean;
}

interface UseJourneyTimerProps {
  onOvertimeCheck: () => void;
  onParentNotify: () => void;
  gracePeriodMinutes?: number;
  responseTimeMinutes?: number;
}

export function useJourneyTimer({
  onOvertimeCheck,
  onParentNotify,
  gracePeriodMinutes = 5, // X minutos extra antes de preguntar
  responseTimeMinutes = 3, // Y minutos para responder
}: UseJourneyTimerProps) {
  const [state, setState] = useState<JourneyState>({
    isActive: false,
    startTime: null,
    elapsedMinutes: 0,
    estimatedMinutes: 0,
    isOvertime: false,
    overtimeMinutes: 0,
    checkPending: false,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const parentNotifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Limpiar todos los timeouts
  const clearAllTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
      checkTimeoutRef.current = null;
    }
    if (parentNotifyTimeoutRef.current) {
      clearTimeout(parentNotifyTimeoutRef.current);
      parentNotifyTimeoutRef.current = null;
    }
  }, []);

  // Iniciar viaje
  const startJourney = useCallback((estimatedMinutes: number) => {
    clearAllTimers();
    
    const startTime = new Date();
    setState({
      isActive: true,
      startTime,
      elapsedMinutes: 0,
      estimatedMinutes,
      isOvertime: false,
      overtimeMinutes: 0,
      checkPending: false,
    });

    // Actualizar tiempo transcurrido cada segundo
    intervalRef.current = setInterval(() => {
      setState(prev => {
        if (!prev.startTime) return prev;
        
        const now = new Date();
        const elapsed = (now.getTime() - prev.startTime.getTime()) / 60000; // en minutos
        const overtime = elapsed - prev.estimatedMinutes;
        
        return {
          ...prev,
          elapsedMinutes: elapsed,
          isOvertime: overtime > gracePeriodMinutes,
          overtimeMinutes: Math.max(0, overtime - gracePeriodMinutes),
        };
      });
    }, 1000);

    // Programar notificación de verificación
    const checkDelay = (estimatedMinutes + gracePeriodMinutes) * 60 * 1000;
    checkTimeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, checkPending: true }));
      onOvertimeCheck();
      
      // Programar notificación a padres si no responde
      parentNotifyTimeoutRef.current = setTimeout(() => {
        onParentNotify();
      }, responseTimeMinutes * 60 * 1000);
    }, checkDelay);
  }, [clearAllTimers, gracePeriodMinutes, responseTimeMinutes, onOvertimeCheck, onParentNotify]);

  // Usuario confirma que está bien
  const confirmOk = useCallback(() => {
    if (parentNotifyTimeoutRef.current) {
      clearTimeout(parentNotifyTimeoutRef.current);
      parentNotifyTimeoutRef.current = null;
    }
    setState(prev => ({ ...prev, checkPending: false }));
  }, []);

  // Detener viaje (llegó o canceló)
  const stopJourney = useCallback(() => {
    clearAllTimers();
    setState({
      isActive: false,
      startTime: null,
      elapsedMinutes: 0,
      estimatedMinutes: 0,
      isOvertime: false,
      overtimeMinutes: 0,
      checkPending: false,
    });
  }, [clearAllTimers]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  return {
    ...state,
    startJourney,
    stopJourney,
    confirmOk,
  };
}
