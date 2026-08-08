import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardCheck, Flame, Bike, ArrowLeft, MapPin } from 'lucide-react';
import { useToast } from '@/components/shared/Toaster';
import { orderApi, siteConfigApi, type DeliveryOrigin } from '@/services/api';
import OrderItemThumbs from '@/components/shared/OrderItemThumbs';
import type { Order } from '@/types';

const STATUS_STEPS: { status: string; label: string; icon: typeof ClipboardCheck; color: string }[] = [
  { status: 'received', label: 'Order Received', icon: ClipboardCheck, color: '#F7931E' },
  { status: 'approved', label: 'Approved by Kitchen', icon: ClipboardCheck, color: '#F9A825' },
  { status: 'kitchen', label: 'In Kitchen', icon: Flame, color: '#FF6B35' },
  { status: 'ready', label: 'Ready for Delivery', icon: ClipboardCheck, color: '#FFB300' },
  { status: 'delivery', label: 'Out for Delivery', icon: Bike, color: '#7CB342' },
];

export default function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('received');
  const [eta, setEta] = useState(25 * 60);
  const [kitchen, setKitchen] = useState<DeliveryOrigin | null>(null);

  useEffect(() => { loadOrder(); }, [orderId]);

  // Kitchen location is admin-controlled (Admin → Settings → Delivery Origin)
  // and drives the map that shows where the courier picks up your pizza.
  useEffect(() => {
    siteConfigApi.get().then((res) => {
      if (res.success) setKitchen(res.data.deliveryOrigin);
    }).catch(() => {});
  }, []);

  // Count down from the server-supplied estimated delivery time if present.
  useEffect(() => {
    if (!order) return;
    const t = new Date(order.estimatedTime).getTime();
    if (!Number.isNaN(t)) {
      setEta(Math.max(0, Math.round((t - Date.now()) / 1000)));
    }
  }, [order]);

  useEffect(() => {
    if (!order || order.status === 'completed' || order.status === 'cancelled') return;
    const poll = setInterval(async () => {
      try {
        const res = await orderApi.getStatus(orderId!);
        if (res.data.status !== currentStatus) {
          setCurrentStatus(res.data.status);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(poll);
  }, [orderId, order, currentStatus]);

  useEffect(() => {
    if (order?.status === 'completed') return;
    const timer = setInterval(() => setEta(e => Math.max(0, e - 1)), 1000);
    return () => clearInterval(timer);
  }, [order]);

  const loadOrder = async () => {
    try {
      const res = await orderApi.getById(orderId!);
      setOrder(res.data.order);
      setCurrentStatus(res.data.order.status);
    } catch (err) {
      console.error('Failed to load order:', err);
      toast('Failed to load order details', 'error');
      // If order not found, redirect to orders page
      navigate('/dashboard/orders');
    }
  };

  const currentStepIdx = STATUS_STEPS.findIndex(s => s.status === currentStatus);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-6 lg:px-12 py-12 lg:py-16">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-[#FF6B35]/30 border-t-[#FF6B35] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-12 py-12 lg:py-16">
      <Link to="/dashboard/orders" className="flex items-center gap-2 text-sm text-forno-text-secondary hover:text-forno-text-primary mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Orders
      </Link>

      {/* Order Info */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-mono text-lg text-forno-text-primary">{order.orderId}</h3>
          <StatusBadge status={currentStatus} />
        </div>
        <p className="text-xs text-forno-text-muted mb-1">Placed {new Date(order.createdAt).toLocaleString()}</p>
        <p className="text-sm text-[#FF6B35] font-medium">
          {currentStatus === 'completed' ? 'Delivered!' : `Arriving in ~${formatTime(eta)}`}
        </p>
      </div>

      {/* Your Order — items with images + price breakdown */}
      <div className="glass-card p-6 mb-6">
        <h4 className="text-sm font-semibold text-forno-text-primary mb-4">Your Order</h4>
        <div className="space-y-3">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              <OrderItemThumbs items={[item]} size={56} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-forno-text-primary">{item.name}</p>
                <p className="text-xs text-forno-text-muted">
                  {item.type === 'custom'
                    ? `Custom build${item.base ? ` • ${item.base}` : ''}${item.sauce ? ` + ${item.sauce}` : ''}${item.cheese ? ` + ${item.cheese}` : ''}${(item.veggies ?? []).length ? ` + ${item.veggies!.length} topping(s)` : ''}`
                    : 'Catalogue pizza'}
                  {' × '}{item.quantity}
                </p>
              </div>
              <span className="font-mono text-sm text-forno-text-primary shrink-0">₹{item.totalPrice.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-forno-border space-y-1.5 text-sm">
          <div className="flex justify-between text-forno-text-secondary"><span>Subtotal</span><span className="font-mono">₹{order.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-forno-text-secondary"><span>Tax</span><span className="font-mono">₹{order.tax.toFixed(2)}</span></div>
          <div className="flex justify-between text-forno-text-secondary"><span>Delivery fee</span><span className="font-mono">₹{order.deliveryFee.toFixed(2)}</span></div>
          <div className="flex justify-between text-forno-text-primary font-semibold pt-1.5 border-t border-forno-border"><span>Total</span><span className="font-mono">₹{order.total.toFixed(2)}</span></div>
        </div>
      </div>

      {/* Timeline */}
      <div className="glass-card p-6 mb-6">
        <div className="relative">
          {STATUS_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isCompleted = i <= currentStepIdx;
            const isActive = i === currentStepIdx && currentStatus !== 'completed';

            return (
              <div key={step.status} className="flex gap-4 mb-6 last:mb-0">
                {/* Node */}
                <div className="flex flex-col items-center">
                  <motion.div
                    className={`w-12 h-12 rounded-full flex items-center justify-center relative z-10 ${
                      isCompleted ? 'text-white' : 'border-2 border-forno-text-muted text-forno-text-muted'
                    }`}
                    style={isCompleted ? { background: isActive ? step.color : '#7CB342' } : {}}
                    animate={isActive ? { boxShadow: [`0 0 0 0 ${step.color}40`, `0 0 0 10px ${step.color}00`] } : {}}
                    transition={isActive ? { duration: 1.5, repeat: Infinity } : {}}
                  >
                    {i < currentStepIdx ? (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    ) : (
                      <Icon size={20} />
                    )}
                  </motion.div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`w-0.5 flex-1 min-h-[40px] ${isCompleted ? '' : 'bg-forno-bg-tertiary'}`}
                      style={isCompleted ? { background: i < currentStepIdx ? '#7CB342' : step.color } : {}} />
                  )}
                </div>

                {/* Label */}
                <div className="pt-2">
                  <h4 className={`font-medium ${isCompleted ? 'text-forno-text-primary' : 'text-forno-text-muted'}`}>{step.label}</h4>
                  {isCompleted && order.statusHistory.find(h => h.status === step.status) && (
                    <p className="text-xs text-forno-text-muted mt-0.5">
                      {new Date(order.statusHistory.find(h => h.status === step.status)!.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  {isActive && step.status === 'kitchen' && (
                    <motion.span animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-xs text-[#FF6B35]">Cooking your pizza...</motion.span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map with Google Maps */}
      <div className="glass-card p-6">
        <h4 className="text-sm font-semibold text-forno-text-primary mb-4">Live Delivery Tracking</h4>
        <div className="relative h-64 bg-forno-bg-tertiary rounded-lg overflow-hidden">
          {currentStatus === 'delivery' || currentStatus === 'completed' ? (
            kitchen && kitchen.lat !== 0 && kitchen.lng !== 0 ? (
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${kitchen.lat},${kitchen.lng}&z=15&output=embed`}
                title="Kitchen location map"
                className="absolute inset-0"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-forno-text-muted px-6">
                <p className="text-sm text-center">Map unavailable — the kitchen location isn't configured yet.<br />Set it under Admin → Settings → Delivery Origin.</p>
              </div>
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-forno-text-muted">
              <div className="text-center">
                <Flame size={32} className="mx-auto mb-2 text-[#FF6B35]" />
                <p className="text-sm">Map will appear when order is out for delivery</p>
              </div>
            </div>
          )}
        </div>
        {/* Route summary: kitchen → customer */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2 bg-forno-bg-tertiary/60 border border-forno-border rounded-lg px-3 py-2.5">
            <MapPin size={14} className="text-[#FF6B35] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-forno-text-muted">From (kitchen)</p>
              <p className="text-forno-text-primary truncate">{kitchen?.label || 'Forno Kitchen'}{kitchen?.address ? ` — ${kitchen.address}` : ''}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-forno-bg-tertiary/60 border border-forno-border rounded-lg px-3 py-2.5">
            <MapPin size={14} className="text-[#7CB342] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-forno-text-muted">To (your address)</p>
              <p className="text-forno-text-primary truncate">{order.deliveryAddress.street}, {order.deliveryAddress.city} — {order.deliveryAddress.pincode}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    received: 'bg-[#F7931E]/15 text-[#F7931E]',
    approved: 'bg-[#F9A825]/15 text-[#F9A825]',
    kitchen: 'bg-[#FF6B35]/15 text-[#FF6B35]',
    ready: 'bg-[#FFB300]/15 text-[#FFB300]',
    delivery: 'bg-[#7CB342]/15 text-[#7CB342]',
    completed: 'bg-[#7CB342]/15 text-[#7CB342]',
    cancelled: 'bg-[#E53935]/15 text-[#E53935]',
  };
  const label: Record<string, string> = {
    approved: 'Approved',
    ready: 'Ready',
  };
  return <span className={`px-3 py-1 rounded-pill text-xs font-semibold ${colors[status] || colors.received}`}>{label[status] || status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}
