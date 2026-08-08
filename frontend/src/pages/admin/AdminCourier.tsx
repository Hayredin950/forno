import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bike, Package, CheckCircle2, MapPin, Phone, Clock, ArrowRight } from 'lucide-react';
import { adminOrderApi, siteConfigApi, type DeliveryOrigin } from '@/services/api';
import RouteMap from '@/components/shared/RouteMap';
import { useToast } from '@/components/shared/Toaster';
import type { Order } from '@/types';

const fmtClock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** mm:ss (or h:mm:ss) remaining, with an overdue flag. */
const countdown = (ms: number): { text: string; overdue: boolean } => {
  if (ms <= 0) return { text: 'Overdue', overdue: true };
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return { text: h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`, overdue: false };
};

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

const loadSeq = { current: 0 };

export default function AdminCourier() {
  const [active, setActive] = useState<Order[]>([]);
  const [ready, setReady] = useState<Order[]>([]);
  const [deliveredToday, setDeliveredToday] = useState<Order[]>([]);
  const [kitchen, setKitchen] = useState<DeliveryOrigin | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const toast = useToast();

  // Kitchen origin (for the route maps) is loaded once.
  useEffect(() => {
    siteConfigApi.get().then((res) => {
      if (res.success) setKitchen(res.data.deliveryOrigin);
    }).catch(() => {});
  }, []);

  // Live fleet data: on the road, ready to dispatch, and today's completed.
  // A monotonically increasing sequence guards against a slow poll resolving
  // after a newer one and overwriting fresh state with stale results.
  const load = async () => {
    const seq = ++loadSeq.current;
    try {
      const [deliveryRes, kitchenRes, doneRes] = await Promise.all([
        adminOrderApi.getAll({ status: 'delivery', limit: 100 }),
        adminOrderApi.getAll({ status: 'kitchen', limit: 100 }),
        adminOrderApi.getAll({ status: 'completed', limit: 100 }),
      ]);
      if (seq !== loadSeq.current) return; // superseded by a newer poll
      setActive(deliveryRes.data.orders);
      setReady(kitchenRes.data.orders);
      setDeliveredToday(doneRes.data.orders.filter(o => isToday(o.createdAt)));
    } catch { /* keep last known state */ } finally {
      if (seq === loadSeq.current) setLoaded(true);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  // Per-second tick keeps countdowns honest, but only while something is on
  // the road — an idle queue shouldn't re-render the whole page every second.
  useEffect(() => {
    if (active.length === 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active.length]);

  const updateStatus = async (order: Order, status: 'delivery' | 'completed') => {
    setBusyId(order._id);
    try {
      await adminOrderApi.updateStatus(order._id, status);
      toast(status === 'delivery' ? `${order.orderId} dispatched` : `${order.orderId} marked delivered`);
      await load();
    } catch (e) {
      toast((e as Error).message || 'Failed to update order', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const origin =
    kitchen && kitchen.lat !== 0 && kitchen.lng !== 0
      ? { lat: kitchen.lat, lng: kitchen.lng, label: kitchen.label || 'Forno Kitchen' }
      : null;

  if (!loaded) {
    return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-[#FF6B35]/30 border-t-[#FF6B35] rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Fleet summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'On the road', value: active.length, icon: Bike, color: '#FF6B35' },
          { label: 'Ready to dispatch', value: ready.length, icon: Package, color: '#F9A825' },
          { label: 'Delivered today', value: deliveredToday.length, icon: CheckCircle2, color: '#7CB342' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.color}18`, color: s.color }}>
              <s.icon size={20} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-2xl font-mono font-semibold text-forno-text-primary">{s.value}</p>
              <p className="text-xs uppercase tracking-[0.06em] text-forno-text-muted">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Active deliveries */}
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-forno-text-primary mb-4">
          <Bike size={16} className="text-[#FF6B35]" /> Out for delivery
          <span className="px-2 py-0.5 bg-[#FF6B35]/10 text-[#FF6B35] rounded-pill text-xs font-semibold">{active.length}</span>
        </h3>

        {active.length === 0 ? (
          <div className="glass-card p-10 text-center text-forno-text-muted">
            <Bike size={36} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No deliveries on the road right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {active.map((order, i) => {
              const dispatchedAt = order.statusHistory.find(h => h.status === 'delivery')?.timestamp;
              const dest =
                order.deliveryAddress.lat !== undefined && order.deliveryAddress.lng !== undefined &&
                order.deliveryAddress.lat !== 0 && order.deliveryAddress.lng !== 0
                  ? { lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng, label: 'Customer' }
                  : null;
              const eta = countdown(new Date(order.estimatedTime).getTime() - now);

              return (
                <motion.div key={order._id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-forno-border">
                    <div>
                      <p className="font-mono text-sm text-forno-text-primary">{order.orderId}</p>
                      <p className="text-xs text-forno-text-muted">{order.userName || 'Guest'}{dispatchedAt ? ` · Dispatched ${fmtClock(dispatchedAt)}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono text-lg font-semibold ${eta.overdue ? 'text-forno-accent-red' : 'text-[#7CB342]'}`}>{eta.text}</p>
                      <p className="text-[10px] uppercase tracking-wide text-forno-text-muted">ETA</p>
                    </div>
                  </div>

                  {/* Map */}
                  {origin && dest ? (
                    <RouteMap origin={origin} destination={dest} route={order.routeGeometry ?? null} courier="moving" height={220} />
                  ) : (
                    <div className="h-[140px] bg-forno-bg-tertiary flex items-center justify-center text-forno-text-muted px-6">
                      <p className="text-xs text-center">{!origin ? 'Kitchen location not configured (Admin → Settings → Delivery Origin).' : 'No delivery coordinates on this order.'}</p>
                    </div>
                  )}

                  {/* Details */}
                  <div className="px-5 py-4 space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin size={14} className="text-[#7CB342] shrink-0 mt-0.5" />
                      <span className="text-forno-text-primary min-w-0">
                        {order.deliveryAddress.street}, {order.deliveryAddress.city} — {order.deliveryAddress.pincode}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={14} className="text-[#FF6B35] shrink-0" />
                      <span className="text-forno-text-secondary">{order.contactPhone || order.userPhone || 'No phone on file'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={14} className="text-forno-text-muted shrink-0" />
                      <span className="text-forno-text-secondary">
                        {order.routeDistanceKm && order.routeDistanceKm > 0 ? `≈ ${order.routeDistanceKm} km route · ` : ''}
                        {order.items.length} item{order.items.length === 1 ? '' : 's'} · ₹{order.total.toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="px-5 py-3.5 border-t border-forno-border flex justify-end">
                    <button
                      onClick={() => updateStatus(order, 'completed')}
                      disabled={busyId === order._id}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold accent-gradient text-white rounded-pill hover:brightness-110 transition-all disabled:opacity-60">
                      {busyId === order._id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle2 size={14} /> Mark delivered</>}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ready to dispatch */}
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-forno-text-primary mb-4">
          <Package size={16} className="text-[#F9A825]" /> Ready to dispatch
          <span className="px-2 py-0.5 bg-[#F9A825]/10 text-[#F9A825] rounded-pill text-xs font-semibold">{ready.length}</span>
        </h3>
        {ready.length === 0 ? (
          <p className="text-sm text-forno-text-muted">Nothing waiting in the kitchen.</p>
        ) : (
          <div className="glass-card divide-y divide-forno-border">
            {ready.map(order => (
              <div key={order._id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-forno-text-primary">{order.orderId}</p>
                  <p className="text-xs text-forno-text-muted truncate">
                    {order.userName || 'Guest'} · {order.deliveryAddress.street}, {order.deliveryAddress.city}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono text-forno-text-primary">{order.routeDistanceKm && order.routeDistanceKm > 0 ? `≈ ${order.routeDistanceKm} km` : ''}</p>
                  <p className="text-[11px] text-forno-text-muted">{order.items.length} item{order.items.length === 1 ? '' : 's'}</p>
                </div>
                <button
                  onClick={() => updateStatus(order, 'delivery')}
                  disabled={busyId === order._id}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white accent-gradient rounded-pill hover:brightness-110 transition-all disabled:opacity-60 shrink-0">
                  {busyId === order._id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ArrowRight size={13} /> Dispatch</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
