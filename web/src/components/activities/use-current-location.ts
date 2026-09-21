"use client";

import { useCallback, useState } from "react";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Asks the browser for a coarse position once; never stored or sent in URLs. */
export function useCurrentLocation() {
  const [coordinates, setCoordinates] = useState<Coordinates>();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string>();

  const request = useCallback((): Promise<Coordinates | undefined> => {
    if (!navigator.geolocation) {
      setError("This browser cannot share your location.");
      return Promise.resolve(undefined);
    }
    setLocating(true);
    setError(undefined);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value?: Coordinates, message?: string) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        setLocating(false);
        if (value) setCoordinates(value);
        if (message) setError(message);
        resolve(value);
      };
      const timeout = window.setTimeout(
        () =>
          finish(
            undefined,
            "Location request timed out. Check your browser permission and try again.",
          ),
        10_000,
      );
      navigator.geolocation.getCurrentPosition(
        ({ coords }) =>
          finish({ latitude: coords.latitude, longitude: coords.longitude }),
        () =>
          finish(
            undefined,
            "Location is unavailable. Check your browser permission and try again.",
          ),
        { enableHighAccuracy: false, timeout: 8_000, maximumAge: 300_000 },
      );
    });
  }, []);

  const clear = useCallback(() => setCoordinates(undefined), []);

  return { coordinates, locating, error, request, clear };
}
