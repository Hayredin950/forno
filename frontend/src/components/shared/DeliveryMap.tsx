import { useEffect, useRef, useState, type ReactNode } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Locate, Search, Loader2 } from "lucide-react";

/**
 * Free map picker (Leaflet + OpenStreetMap, no API key) for choosing the pizza
 * delivery location.
 *
 * Features:
 *  - Defaults to the user's current location (with a sensible fallback) on load
 *  - Click or drag the marker to set an exact address
 *  - "Use my location" re-detects the device position
 *  - Search box uses Nominatim (free) to jump to an address
 *  - Reverse-geocodes every point so street/city/state/pincode are filled in
 *    for the order.
 */

export interface MapLocation {
  lat: number;
  lng: number;
  street: string;
  city: string;
  state: string;
  pincode: string;
}

interface DeliveryMapProps {
  value: MapLocation | null;
  onChange: (loc: MapLocation) => void;
  height?: number;
  /** Helper text under the map (defaults to the checkout wording). */
  instruction?: ReactNode;
}

// Fallback center if geolocation is unavailable or denied.
const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946]; // Bengaluru

const pinIcon = L.divIcon({
  className: "",
  html: '<div style="width:26px;height:26px;background:#FF6B35;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

async function reverseGeocode(lat: number, lng: number): Promise<Partial<MapLocation>> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`;
    const res = await fetch(url);
    const data = await res.json();
    const a = data?.address ?? {};
    const street =
      [a.road, a.house_number, a.suburb, a.neighbourhood].filter(Boolean).join(", ") ||
      data?.display_name ||
      "";
    return {
      street,
      city: a.city || a.town || a.village || a.county || "",
      state: a.state || "",
      pincode: a.postcode || "",
    };
  } catch {
    return {};
  }
}

export default function DeliveryMap({ value, onChange, height = 300, instruction }: DeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pinRef = useRef<((lat: number, lng: number) => Promise<void>) | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (mapRef.current) return;

    const map = L.map(el, { center: DEFAULT_CENTER, zoom: 13 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    mapRef.current = map;

    const marker = L.marker(DEFAULT_CENTER, { icon: pinIcon, draggable: true }).addTo(map);
    markerRef.current = marker;

    // Shared "move to a point and fill the address" logic used by click, drag,
    // search and "use my location".
    const pin = async (lat: number, lng: number) => {
      marker.setLatLng([lat, lng]);
      map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: true });
      setLoading(true);
      const addr = await reverseGeocode(lat, lng);
      setLoading(false);
      onChange({ lat, lng, ...addr } as MapLocation);
    };
    pinRef.current = pin;

    marker.on("dragend", () => {
      const p = marker.getLatLng();
      pin(p.lat, p.lng);
    });
    map.on("click", (e: L.LeafletMouseEvent) => {
      pin(e.latlng.lat, e.latlng.lng);
    });

    // Initial position: use provided value if present (position the marker
    // WITHOUT emitting onChange — otherwise a stored address would be
    // clobbered by a fresh reverse-geocode on every mount).
    if (value) {
      marker.setLatLng([value.lat, value.lng]);
      map.setView([value.lat, value.lng], 15);
    } else if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => pin(pos.coords.latitude, pos.coords.longitude),
        () => pin(DEFAULT_CENTER[0], DEFAULT_CENTER[1]),
        { enableHighAccuracy: true, timeout: 9000 },
      );
    } else {
      pin(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      pinRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async () => {
    if (!search.trim() || !pinRef.current) return;
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        await pinRef.current(parseFloat(data[0].lat), parseFloat(data[0].lon));
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation || !pinRef.current) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => pinRef.current?.(pos.coords.latitude, pos.coords.longitude),
      () => setLoading(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forno-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search address or area…"
            className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50"
          />
        </div>
        <button
          onClick={useMyLocation}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-forno-text-secondary border border-forno-border rounded-lg hover:border-[#FF6B35]/30 hover:text-forno-text-primary transition-all"
        >
          <Locate size={16} /> My Location
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative z-0 w-full overflow-hidden rounded-xl border border-forno-border"
        style={{ height }}
        aria-label="Delivery location map"
      />
      {loading && (
        <p className="flex items-center gap-2 text-xs text-forno-text-muted">
          <Loader2 size={14} className="animate-spin" /> Resolving address…
        </p>
      )}
      <p className="text-xs text-forno-text-muted leading-relaxed">
        {instruction ?? (
          <>Click or drag the <span className="text-[#FF6B35]">orange pin</span> on the map to set your delivery
          address, or search above. Fields are filled automatically and can be edited below.</>
        )}
      </p>
    </div>
  );
}

