import { useState, useCallback } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

interface HomeLocation {
  latitude: number | null;
  longitude: number | null;
}

export function useGeolocation(homeLocation?: HomeLocation) {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
  });

  // Ubicación de casa recibida como parámetro
  const home = homeLocation ?? { latitude: null, longitude: null };

  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalización no disponible"));
        return;
      }

      setState(prev => ({ ...prev, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setState({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            error: null,
            loading: false,
          });
          resolve(position);
        },
        (error) => {
          const errorMessage = 
            error.code === 1 ? "Permiso de ubicación denegado" :
            error.code === 2 ? "Ubicación no disponible" :
            "Tiempo de espera agotado";
          
          setState(prev => ({
            ...prev,
            error: errorMessage,
            loading: false,
          }));
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  // Calcula distancia aproximada en km usando fórmula Haversine
  const calculateDistanceToHome = useCallback((lat: number, lng: number): number => {
    if (!home.latitude || !home.longitude) {
      return Infinity;
    }
    
    const R = 6371; // Radio de la Tierra en km
    const dLat = (home.latitude - lat) * Math.PI / 180;
    const dLon = (home.longitude - lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat * Math.PI / 180) * Math.cos(home.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, [home.latitude, home.longitude]);

  // Estima tiempo en minutos (asumiendo 5 km/h caminando)
  const estimateTimeToHome = useCallback((lat: number, lng: number): number => {
    const distance = calculateDistanceToHome(lat, lng);
    if (distance === Infinity) return 10; // Default si no hay casa configurada
    const walkingSpeedKmH = 5;
    const timeHours = distance / walkingSpeedKmH;
    return Math.max(Math.round(timeHours * 60), 1); // Mínimo 1 minuto
  }, [calculateDistanceToHome]);

  // Verifica si está cerca de casa (dentro de 100 metros)
  const isNearHome = useCallback((lat: number, lng: number): boolean => {
    const distance = calculateDistanceToHome(lat, lng);
    return distance < 0.1; // 100 metros
  }, [calculateDistanceToHome]);

  const hasHomeLocation = home.latitude !== null && home.longitude !== null;

  return {
    ...state,
    getCurrentPosition,
    estimateTimeToHome,
    isNearHome,
    homeLocation: home,
    hasHomeLocation,
  };
}
