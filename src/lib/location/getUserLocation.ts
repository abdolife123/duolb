export type UserLocation = {
  latitude: number;
  longitude: number;
} | null;

/**
 * Attempts to get the user's current geolocation.
 * Returns null if not available or permission denied.
 *
 * Client-side only: do not call from server code.
 */
export function getUserLocation(): Promise<UserLocation> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 0,
      }
    );
  });
}
