// Minimal subset of the "geolib" API used by this project.
// Implements `getDistance(start, end)` returning meters (rounded).

const EARTH_RADIUS_M = 6371000;

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * @param {{latitude:number, longitude:number}} start
 * @param {{latitude:number, longitude:number}} end
 * @returns {number} Distance in meters.
 */
export function getDistance(start, end) {
  const lat1 = start?.latitude;
  const lon1 = start?.longitude;
  const lat2 = end?.latitude;
  const lon2 = end?.longitude;

  if (!isFiniteNumber(lat1) || !isFiniteNumber(lon1) || !isFiniteNumber(lat2) || !isFiniteNumber(lon2)) {
    return 0;
  }

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dPhi = toRadians(lat2 - lat1);
  const dLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_M * c);
}

