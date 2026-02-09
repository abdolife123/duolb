import { getDistance } from "geolib";

export type Coordinates = {
  latitude: number | null;
  longitude: number | null;
};

function isValidLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= -180 &&
    value <= 180
  );
}

/**
 * Calculates distance in kilometers between two coordinate points.
 * Returns null if coordinates are invalid.
 */
export function calculateDistanceKm(
  pointA: Coordinates,
  pointB: Coordinates
): number | null {
  if (
    !isValidLatitude(pointA?.latitude) ||
    !isValidLongitude(pointA?.longitude) ||
    !isValidLatitude(pointB?.latitude) ||
    !isValidLongitude(pointB?.longitude)
  ) {
    return null;
  }

  const distanceInMeters = getDistance(
    { latitude: pointA.latitude, longitude: pointA.longitude },
    { latitude: pointB.latitude, longitude: pointB.longitude }
  );

  return Number((distanceInMeters / 1000).toFixed(2));
}
