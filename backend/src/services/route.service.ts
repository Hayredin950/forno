/**
 * Delivery routing.
 *
 * Uses the free OSRM demo server (no API key) to get the REAL road distance,
 * driving duration and route geometry between the kitchen and the customer —
 * far more realistic than a straight-line haversine estimate. If the routing
 * service is unreachable (offline, blocked, timeout) we fall back to
 * haversine × 1.3 (typical road-winding factor) so the ETA still works.
 */

export interface RouteResult {
  /** Road distance in km (haversine×1.3 fallback). */
  distanceKm: number;
  /** Driving time in minutes (fallback: distance / 25 km/h). */
  durationMin: number;
  /** Route polyline as [lat, lng] pairs ready for Leaflet, or null on fallback. */
  coordinates: [number, number][] | null;
}

/** Great-circle distance in km between two coordinates. */
export const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
const TIMEOUT_MS = 3500;

const fallback = (lat1: number, lng1: number, lat2: number, lng2: number): RouteResult => {
  const straight = haversineKm(lat1, lng1, lat2, lng2);
  const distanceKm = straight * 1.3;
  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMin: Math.round((distanceKm / 25) * 60),
    coordinates: null,
  };
};

export interface RoutePoint {
  lat: number;
  lng: number;
}

/**
 * Real road route between two points. Never throws — on any failure it
 * returns the haversine-based fallback so order creation keeps working.
 */
export const estimateRoute = async (origin: RoutePoint, dest: RoutePoint): Promise<RouteResult> => {
  const points = [origin, dest];
  if (!points.every((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))) {
    return fallback(0, 0, 0, 0);
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const url = `${OSRM_URL}/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    clearTimeout(timer);

    if (!res.ok) return fallback(origin.lat, origin.lng, dest.lat, dest.lng);
    const data = (await res.json()) as {
      routes?: { distance?: number; duration?: number; geometry?: { coordinates?: number[][] } }[];
    };
    const route = data.routes?.[0];
    if (!route || typeof route.distance !== "number" || typeof route.duration !== "number") {
      return fallback(origin.lat, origin.lng, dest.lat, dest.lng);
    }

    const distanceKm = route.distance / 1000;
    const coords: [number, number][] = Array.isArray(route.geometry?.coordinates)
      ? route.geometry.coordinates
          .filter((c) => Array.isArray(c) && c.length >= 2)
          .map((c) => [c[1], c[0]] as [number, number])
      : [];

    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationMin: Math.max(1, Math.round(route.duration / 60)),
      coordinates: coords.length >= 2 ? coords : null,
    };
  } catch {
    return fallback(origin.lat, origin.lng, dest.lat, dest.lng);
  }
};
