import { useState, useEffect } from 'react';

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

interface UseGeolocationReturn {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  timestamp: number | null;
  loading: boolean;
}

export function useGeolocation(options: GeolocationOptions = {}): UseGeolocationReturn {
  const [state, setState] = useState<UseGeolocationReturn>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    timestamp: null,
    loading: true
  });

  useEffect(() => {
    let mounted = true;

    if (!navigator.geolocation) {
      if (mounted) {
        setState(prev => ({
          ...prev,
          error: "Geolocation is not supported by your browser",
          loading: false
        }));
      }
      return;
    }

    const onSuccess = (position: GeolocationPosition) => {
      if (!mounted) return;
      
      setState({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        error: null,
        timestamp: position.timestamp,
        loading: false
      });
    };

    const onError = (error: GeolocationPositionError) => {
      if (!mounted) return;
      
      setState(prev => ({
        ...prev,
        error: error.message,
        loading: false
      }));
    };

    const defaultOptions: GeolocationOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      onError,
      { ...defaultOptions, ...options }
    );

    const watchId = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      { ...defaultOptions, ...options }
    );

    return () => {
      mounted = false;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [options.enableHighAccuracy, options.timeout, options.maximumAge]);

  return state;
}
