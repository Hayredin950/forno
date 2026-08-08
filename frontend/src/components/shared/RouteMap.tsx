import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { pointAtFraction } from '@/lib/route';

export interface RouteMapPoint {
  lat: number;
  lng: number;
  label?: string;
}

interface RouteMapProps {
  origin: RouteMapPoint | null;
  destination: RouteMapPoint | null;
  /** Route polyline as [lat, lng] pairs (OSRM). Falls back to a straight line. */
  route: [number, number][] | null;
  /** 'hidden' → no courier; 'moving' → animates from kitchen to door; 'arrived' → parked at the door. */
  courier?: 'hidden' | 'moving' | 'arrived';
  height?: number;
}

const pinHtml = (color: string) =>
  `<div style="width:26px;height:26px;background:${color};border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`;

const originIcon = L.divIcon({ className: '', html: pinHtml('#FF6B35'), iconSize: [26, 26], iconAnchor: [13, 26] });
const destIcon = L.divIcon({ className: '', html: pinHtml('#7CB342'), iconSize: [26, 26], iconAnchor: [13, 26] });

const courierIcon = L.divIcon({
  className: '',
  html:
    '<div style="position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#0D0B0A;border:2px solid #FF6B35;box-shadow:0 2px 10px rgba(0,0,0,.5);animation:forno-courier-pulse 1.6s ease-out infinite">' +
    '<span style="font-size:16px;line-height:1">🛵</span>' +
    '</div>' +
    '<style>@keyframes forno-courier-pulse{0%{box-shadow:0 0 0 0 rgba(255,107,53,.5)}100%{box-shadow:0 0 0 12px rgba(255,107,53,0)}}</style>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

/**
 * Live delivery tracking map: kitchen marker (orange) → customer marker
 * (green), the real road route between them, and a scooter that rides along
 * it while the order is out for delivery.
 */
export default function RouteMap({ origin, destination, route, courier = 'hidden', height = 320 }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const courierRef = useRef<L.Marker | null>(null);
  const pathRef = useRef<[number, number][]>([]);

  // Build once on mount (both points are guaranteed present by the caller).
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !origin || !destination || mapRef.current) return;

    const map = L.map(el, { zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    mapRef.current = map;

    L.marker([origin.lat, origin.lng], { icon: originIcon }).addTo(map).bindPopup(origin.label ?? 'Kitchen');
    L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map).bindPopup(destination.label ?? 'Delivery');

    const path = (route && route.length >= 2 ? route : [[origin.lat, origin.lng], [destination.lat, destination.lng]]) as [number, number][];
    pathRef.current = path;

    L.polyline(path, { color: '#FF6B35', weight: 4, opacity: 0.9, dashArray: '8 8' }).addTo(map);

    map.fitBounds(L.latLngBounds(path.map(p => L.latLng(p[0], p[1]))), { padding: [40, 40] });

    const courier = L.marker(path[0], { icon: courierIcon, interactive: false }).addTo(map);
    courierRef.current = courier;

    return () => {
      map.remove();
      mapRef.current = null;
      courierRef.current = null;
      pathRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ride the courier along the polyline when the order goes out for delivery.
  useEffect(() => {
    const marker = courierRef.current;
    const path = pathRef.current;
    if (!marker || path.length < 2) return;

    if (courier === 'hidden') {
      marker.setLatLng(path[0]);
      return;
    }
    if (courier === 'arrived') {
      marker.setLatLng(path[path.length - 1]);
      return;
    }

    const start = performance.now();
    const duration = 14000; // 14s demo ride regardless of length
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      marker.setLatLng(pointAtFraction(path, t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [courier]);

  return (
    <div
      ref={containerRef}
      className="relative z-0 w-full overflow-hidden rounded-xl border border-forno-border"
      style={{ height }}
      aria-label="Delivery route map"
    />
  );
}
