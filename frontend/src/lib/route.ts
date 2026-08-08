/**
 * Route helpers shared by checkout ("how far is the kitchen?") and the live
 * tracking map (route polyline + animated courier). Uses the free OSRM demo
 * server — no API key — with a haversine×1.3 fallback when offline/blocked.
 */

export interface RouteEstimate {
  distanceKm: number;
  durationMin: number;
  coordinates: [number, number][] | null;
}

export interface RoutePoint {
  lat: number;
  lng: number;
}

export const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const fallback = (origin: RoutePoint, dest: RoutePoint): RouteEstimate => {
  const straight = haversineKm(origin.lat, origin.lng, dest.lat, dest.lng);
  const distanceKm = straight * 1.3;
  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMin: Math.max(1, Math.round((distanceKm / 25) * 60)),
    coordinates: null,
  };
};

/**
 * Real road route between two points. Never throws; falls back to haversine.
 * Debounce/throttle callers: each call hits the routing server.
 */
export async function fetchRoute(origin: RoutePoint, dest: RoutePoint): Promise<RouteEstimate> {
  if (![origin, dest].every(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))) {
    return { distanceKm: 0, durationMin: 0, coordinates: null };
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    clearTimeout(timer);
    if (!res.ok) return fallback(origin, dest);

    const data = (await res.json()) as {
      routes?: { distance?: number; duration?: number; geometry?: { coordinates?: number[][] } }[];
    };
    const route = data.routes?.[0];
    if (!route || typeof route.distance !== 'number' || typeof route.duration !== 'number') {
      return fallback(origin, dest);
    }

    const coords: [number, number][] = Array.isArray(route.geometry?.coordinates)
      ? route.geometry.coordinates
          .filter(c => Array.isArray(c) && c.length >= 2)
          .map(c => [c[1], c[0]] as [number, number])
      : [];

    return {
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMin: Math.max(1, Math.round(route.duration / 60)),
      coordinates: coords.length >= 2 ? coords : null,
    };
  } catch {
    return fallback(origin, dest);
  }
}

/**
 * Point on a polyline at fraction t (0 → start, 1 → end), walking it by
 * cumulative distance so the courier moves at a steady speed around corners.
 */
export function pointAtFraction(coords: [number, number][], t: number): [number, number] {
  if (coords.length === 0) return [0, 0];
  if (coords.length === 1 || t <= 0) return coords[0];
  if (t >= 1) return coords[coords.length - 1];

  const segLengths: number[] = [];
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const d = haversineKm(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
    segLengths.push(d);
    total += d;
  }
  if (total === 0) return coords[0];

  let target = t * total;
  for (let i = 0; i < segLengths.length; i++) {
    if (target <= segLengths[i] || i === segLengths.length - 1) {
      const frac = segLengths[i] === 0 ? 0 : target / segLengths[i];
      const a = coords[i];
      const b = coords[i + 1];
      return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac];
    }
    target -= segLengths[i];
  }
  return coords[coords.length - 1];
}
