import { useState, useEffect, useCallback } from 'react';

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

export type GeoStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export function useGeolocation(autoRequest = true) {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      setError('Geolocation is not supported by your browser');
      return;
    }

    setStatus('requesting');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStatus('granted');
      },
      (err) => {
        setStatus('denied');
        setError(
          err.code === 1 ? 'Location access denied — please allow location in your browser'
          : err.code === 2 ? 'Location unavailable — check your GPS or network'
          : 'Location request timed out'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    if (autoRequest) request();
  }, [autoRequest, request]);

  return { location, status, error, request };
}
