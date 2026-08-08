import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, ChevronDown, ChevronUp, MapPin, ShoppingCart, Lock, X, ShieldCheck, Loader2 } from 'lucide-react';
import { cartApi, orderApi, razorpayApi, siteConfigApi, userApi, type PricingConfig, type DeliveryOrigin } from '@/services/api';
import { useToast } from '@/components/shared/Toaster';
import CartItemImage from '@/components/shared/CartItemImage';
import DeliveryMap, { type MapLocation } from '@/components/shared/DeliveryMap';
import { fetchRoute, hasCoords, type RouteEstimate } from '@/lib/route';
import type { CartItem, Order } from '@/types';

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  // Simulated-payment modal (shown when the backend runs without real
  // Razorpay keys) — gives users the full card-entry experience.
  const [payModal, setPayModal] = useState<{ order: Order; razorpayOrderId: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [card, setCard] = useState({ name: '', number: '4111 1111 1111 1111', expiry: '12/29', cvv: '123' });
  const [address, setAddress] = useState<{ street: string; city: string; state: string; pincode: string; lat?: number; lng?: number }>({ street: '', city: '', state: '', pincode: '' });
  const [phone, setPhone] = useState('');
  const mapValue: MapLocation | null =
    hasCoords(address.lat, address.lng)
      ? { lat: address.lat!, lng: address.lng!, street: address.street, city: address.city, state: address.state, pincode: address.pincode }
      : null;
  const handleMapChange = (loc: MapLocation) => {
    interacted.current = true;
    setAddress(prev => ({
      ...prev,
      street: loc.street || prev.street,
      city: loc.city || prev.city,
      state: loc.state || prev.state,
      pincode: loc.pincode || prev.pincode,
      lat: loc.lat,
      lng: loc.lng,
    }));
  };
  const navigate = useNavigate();
  const toast = useToast();
  // Shop pricing is admin-controllable; fall back to defaults until loaded so
  // the page never shows NaN or ₹0 while the config is still fetching.
  const defaultPricing: PricingConfig = { customBasePrice: 200, taxRate: 0.05, deliveryFee: 40, freeDeliveryThreshold: 500 };
  const [pricing, setPricing] = useState<PricingConfig>(defaultPricing);
  // Live "how far is the kitchen?" estimate, shown under the map once the
  // customer pins a delivery location.
  const [kitchen, setKitchen] = useState<DeliveryOrigin | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteEstimate | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => { loadCart(); }, []);
  useEffect(() => {
    siteConfigApi.get().then((res) => {
      if (res.success) {
        setPricing(res.data.pricing);
        setKitchen(res.data.deliveryOrigin);
      }
    }).catch(() => {});
  }, []);

  // Ask the routing service for the real road distance once a map location is
  // picked (and the kitchen is configured). Falls back gracefully on failure.
  useEffect(() => {
    if (!kitchen || !hasCoords(kitchen.lat, kitchen.lng) || !hasCoords(address.lat, address.lng)) {
      setRouteInfo(null);
      return;
    }
    let alive = true;
    setRouteLoading(true);
    // hasCoords validated these above — the assertions are safe.
    fetchRoute({ lat: kitchen.lat, lng: kitchen.lng }, { lat: address.lat!, lng: address.lng! }).then((r) => {
      if (!alive) return;
      setRouteInfo(r);
      setRouteLoading(false);
    });
    return () => { alive = false; };
  }, [kitchen, address.lat, address.lng]);

  // Prefill from the profile: default saved address + phone (so the rider can
  // reach the customer). Both remain editable right here. The guard ensures a
  // slow profile fetch never overwrites something the user already typed.
  const interacted = useRef(false);
  const markInteracted = () => { interacted.current = true; };
  useEffect(() => {
    userApi.getMe().then((res) => {
      if (!res.success || interacted.current) return;
      setPhone(res.data.user.phone ?? '');
      const def = (res.data.user.addresses ?? []).find(a => a.isDefault) ?? res.data.user.addresses?.[0];
      if (def) {
        setAddress(p => ({ ...p, street: def.street, city: def.city, state: def.state, pincode: def.pincode, lat: def.lat, lng: def.lng }));
      }
    }).catch(() => {});
  }, []);

  const loadCart = async () => {
    try {
      const res = await cartApi.getCart();
      setCartItems(res.data.items);
    } catch (err) {
      console.error('Failed to load cart:', err);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      await cartApi.removeItem(itemId);
      setCartItems(items => items.filter(i => i.id !== itemId));
    } else {
      const item = cartItems.find(i => i.id === itemId);
      if (item) {
        await cartApi.updateQuantity(itemId, newQuantity);
        setCartItems(items => items.map(i => i.id === itemId ? { ...i, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity } : i));
      }
    }
  };

  const subtotal = cartItems.reduce((s, i) => s + (i.totalPrice || (i.unitPrice * i.quantity) || 0), 0);
  const tax = Math.round(subtotal * pricing.taxRate * 100) / 100;
  const deliveryFee = subtotal >= pricing.freeDeliveryThreshold ? 0 : pricing.deliveryFee;
  const total = subtotal + tax + deliveryFee;

  const handlePayment = async () => {
    if (cartItems.length === 0) { toast('Your cart is empty', 'warning'); return; }
    if (!address.street || !address.city) { toast('Please fill in delivery address', 'warning'); return; }
    setLoading(true);

    try {
      // Pass full cart items through as-is (not a hand-picked subset) —
      // custom pizzas need baseId/sauceId/cheeseId/veggieIds to resolve
      // real ingredient ObjectIds server-side; dropping them would silently
      // fall back to ingredient names, which the backend can't look up.
      const orderRes = await orderApi.create({
        items: cartItems,
        deliveryAddress: address,
        contactPhone: phone,
      });

      if (orderRes.success) {
        const paymentRes = await razorpayApi.createOrder(orderRes.data.order._id, orderRes.data.order.total);
        if (paymentRes.data.mock) {
          // No live Razorpay keys — open the simulated card-entry experience
          // instead of auto-confirming, so users still go through payment.
          setPayModal({ order: orderRes.data.order, razorpayOrderId: paymentRes.data.razorpayOrderId });
          setLoading(false);
          return;
        }
        await orderApi.verifyPayment(orderRes.data.order._id, paymentRes.data);
        await cartApi.clearCart();
        setOrder(orderRes.data.order);
        setConfirmed(true);
        toast('Order placed successfully!');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      toast(msg === 'Payment cancelled' ? 'Payment was cancelled.' : msg, 'error');
    }
    setLoading(false);
  };

  // Abandoning the payment: cancel the freshly created pending order so it
  // doesn't linger in the user's orders / admin queue as an unpaid ghost.
  const dismissPayment = async () => {
    if (!payModal || processing) return;
    setPayModal(null);
    const res = await orderApi.cancel(payModal.order._id);
    toast(res.success ? 'Payment cancelled — order cancelled' : 'Payment cancelled', res.success ? 'success' : 'error');
  };

  // Complete the simulated payment: brief processing → verify server-side.
  const confirmMockPayment = async () => {
    if (!payModal) return;
    setProcessing(true);
    await new Promise(r => setTimeout(r, 1800)); // simulated gateway latency
    try {
      await orderApi.verifyPayment(payModal.order._id, {
        razorpayOrderId: payModal.razorpayOrderId,
        razorpayPaymentId: `pay_mock_${Math.random().toString(36).slice(2)}`,
        razorpaySignature: `sig_mock_${Math.random().toString(36).slice(2)}`,
        mock: true,
      });
      await cartApi.clearCart();
      setOrder(payModal.order);
      setPayModal(null);
      setConfirmed(true);
      toast('Payment successful — order placed!');
    } catch (err) {
      toast((err as Error).message || 'Payment failed. Please try again.', 'error');
      setPayModal(null);
    } finally {
      setProcessing(false);
    }
  };

  const cardValid = card.number.replace(/\s/g, '').length === 16 && /^\d{2}\/\d{2}$/.test(card.expiry) && card.cvv.length >= 3 && card.name.trim().length > 0;

  if (confirmed && order) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md mx-auto">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="w-20 h-20 mx-auto mb-6 rounded-full bg-forno-status-success/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-forno-status-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <motion.circle cx="12" cy="12" r="10" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
              <motion.path d="M8 12l3 3 5-5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.5 }} />
            </svg>
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-3xl font-semibold text-forno-text-primary mb-3">Order Confirmed!</motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-forno-text-secondary mb-2">Your pizza is being prepared with love.</motion.p>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="font-mono text-sm text-forno-text-muted mb-1">{order.orderId}</motion.p>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="text-[#FF6B35] font-medium mb-8">
            Arriving ~{Math.max(1, Math.round((new Date(order.estimatedTime).getTime() - Date.now()) / 60000))} minutes
          </motion.p>
          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            onClick={() => navigate(`/dashboard/orders/${order._id}`)}
            className="px-8 py-3 accent-gradient rounded-button text-white font-semibold hover:brightness-110 transition-all">
            Track My Order
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 lg:px-12 py-12 lg:py-16">
      <h2 className="text-2xl font-semibold text-forno-text-primary mb-6">Order Summary</h2>

      <div className="glass-card p-6 mb-6">
        {cartItems.length === 0 ? (
          <div className="text-center py-8 text-forno-text-muted">
            <ShoppingCart size={48} className="mx-auto mb-2" />
            <p className="mt-2">Your cart is empty</p>
            <button onClick={() => navigate('/dashboard')} className="mt-4 text-[#FF6B35] hover:underline text-sm">Browse Menu</button>
          </div>
        ) : (
          <>
            {cartItems.map(item => (
              <div key={item.id} className="flex gap-4 py-4 border-b border-forno-border last:border-0">
                <CartItemImage item={item} size={64} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-forno-text-primary truncate">{item.name}</h4>
                    <span className="font-mono text-forno-text-primary ml-2">₹{item.totalPrice}</span>
                  </div>
                  {item.type === 'custom' && (
                    <button onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className="flex items-center gap-1 text-xs text-forno-text-muted mt-1 hover:text-[#FF6B35]">
                      Ingredients {expandedId === item.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}
                  <AnimatePresence>
                    {expandedId === item.id && item.type === 'custom' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-2 text-xs text-forno-text-secondary space-y-0.5">
                          {item.base && <p>Base: {item.base}</p>}
                          {item.sauce && <p>Sauce: {item.sauce}</p>}
                          {item.cheese && <p>Cheese: {item.cheese}</p>}
                          {item.veggies && item.veggies.length > 0 && <p>Veggies: {item.veggies.join(', ')}</p>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 rounded bg-forno-bg-tertiary border border-forno-border flex items-center justify-center text-forno-text-primary hover:border-[#FF6B35]/50 transition-colors"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <span className="text-sm font-medium text-forno-text-primary w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded bg-forno-bg-tertiary border border-forno-border flex items-center justify-center text-forno-text-primary hover:border-[#FF6B35]/50 transition-colors"
                    >
                      <ChevronUp size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="border-t border-forno-border pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-forno-text-secondary">Subtotal</span><span className="font-mono text-forno-text-primary">₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-forno-text-secondary">Tax (5%)</span><span className="font-mono text-forno-text-primary">₹{tax.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-forno-text-secondary">Delivery</span><span className="font-mono text-forno-status-success">{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span></div>
              <div className="flex justify-between text-lg font-semibold pt-2 border-t border-forno-border">
                <span className="text-forno-text-primary">Total</span>
                <span className="font-mono text-[#FF6B35]">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delivery Address */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={18} className="text-[#FF6B35]" />
          <h3 className="font-semibold text-forno-text-primary">Delivery Address</h3>
        </div>
        <DeliveryMap value={mapValue} onChange={handleMapChange} height={280} />
        {(routeInfo || routeLoading) && (
          <p className="flex items-center gap-2 text-xs text-forno-text-muted mt-2">
            {routeLoading ? (
              <><Loader2 size={13} className="animate-spin" /> Estimating distance…</>
            ) : (
              <><MapPin size={13} className="text-[#FF6B35]" /> Kitchen is <span className="text-forno-text-primary font-medium">≈ {routeInfo!.distanceKm} km</span> away — about <span className="text-forno-text-primary font-medium">{routeInfo!.durationMin} min</span> driving</>
            )}
          </p>
        )}
        <div className="space-y-3">
          <input type="tel" value={phone} onChange={e => { markInteracted(); setPhone(e.target.value); }}
            className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-3 text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50 text-sm"
            placeholder="Phone number (for the delivery rider)" />
          <input type="text" value={address.street} onChange={e => { markInteracted(); setAddress(p => ({ ...p, street: e.target.value })); }}
            className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-3 text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50 text-sm"
            placeholder="Street address" />
          <div className="grid grid-cols-3 gap-3">
            <input type="text" value={address.city} onChange={e => setAddress(p => ({ ...p, city: e.target.value }))}
              className="bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-3 text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50 text-sm" placeholder="City" />
            <input type="text" value={address.state} onChange={e => setAddress(p => ({ ...p, state: e.target.value }))}
              className="bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-3 text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50 text-sm" placeholder="State" />
            <input type="text" value={address.pincode} onChange={e => setAddress(p => ({ ...p, pincode: e.target.value }))}
              className="bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-3 text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50 text-sm" placeholder="Pincode" />
          </div>
        </div>
      </div>

      <button onClick={handlePayment} disabled={loading || cartItems.length === 0}
        className="w-full py-4 accent-gradient rounded-button text-white font-semibold text-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CreditCard size={20} /> Pay ₹{total.toFixed(2)}</>}
      </button>
      <p className="text-center text-xs text-forno-text-muted mt-3">Test mode — payment will be simulated</p>

      {/* ─── Simulated payment modal (card entry experience) ─── */}
      <AnimatePresence>
        {payModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={dismissPayment}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="glass-card-elevated p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-forno-text-primary flex items-center gap-2"><Lock size={16} className="text-[#FF6B35]" /> Secure Checkout</h3>
                <button onClick={dismissPayment} disabled={processing} className="text-forno-text-muted hover:text-forno-text-primary disabled:opacity-40"><X size={18} /></button>
              </div>

              <div className="flex items-center justify-between bg-forno-bg-tertiary/60 border border-forno-border rounded-lg px-4 py-3 mb-5">
                <div>
                  <p className="text-xs text-forno-text-muted">Order {payModal.order.orderId}</p>
                  <p className="text-sm text-forno-text-secondary">Amount due</p>
                </div>
                <span className="text-2xl font-mono font-semibold text-[#FF6B35]">₹{payModal.order.total.toFixed(2)}</span>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Name on card</label>
                  <input type="text" value={card.name} onChange={e => setCard(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" disabled={processing}
                    className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-2.5 text-forno-text-primary text-sm focus:outline-none focus:border-[#FF6B35]/50 placeholder:text-forno-text-muted" />
                </div>
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Card number</label>
                  <input type="text" inputMode="numeric" value={card.number}
                    onChange={e => setCard(p => ({ ...p, number: e.target.value.replace(/[^\d]/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim() }))}
                    placeholder="4111 1111 1111 1111" disabled={processing}
                    className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-2.5 text-forno-text-primary font-mono text-sm focus:outline-none focus:border-[#FF6B35]/50 placeholder:text-forno-text-muted" />
                  <p className="text-[11px] text-forno-text-muted mt-1">Test card: 4111 1111 1111 1111 · any future expiry / CVV</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-forno-text-muted mb-1">Expiry</label>
                    <input type="text" inputMode="numeric" value={card.expiry}
                      onChange={e => {
                        let v = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
                        if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
                        setCard(p => ({ ...p, expiry: v }));
                      }}
                      placeholder="MM/YY" disabled={processing}
                      className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-2.5 text-forno-text-primary font-mono text-sm focus:outline-none focus:border-[#FF6B35]/50 placeholder:text-forno-text-muted" />
                  </div>
                  <div>
                    <label className="block text-xs text-forno-text-muted mb-1">CVV</label>
                    <input type="password" inputMode="numeric" value={card.cvv}
                      onChange={e => setCard(p => ({ ...p, cvv: e.target.value.replace(/[^\d]/g, '').slice(0, 4) }))}
                      placeholder="•••" disabled={processing}
                      className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-2.5 text-forno-text-primary font-mono text-sm focus:outline-none focus:border-[#FF6B35]/50 placeholder:text-forno-text-muted" />
                  </div>
                </div>
              </div>

              <button onClick={confirmMockPayment} disabled={processing || !cardValid}
                className="w-full py-3.5 accent-gradient rounded-button text-white font-semibold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {processing ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</>
                ) : (
                  <><Lock size={16} /> Pay ₹{payModal.order.total.toFixed(2)}</>
                )}
              </button>
              <button onClick={dismissPayment} disabled={processing} className="w-full mt-2 py-2 text-xs text-forno-text-muted hover:text-forno-text-secondary transition-colors disabled:opacity-40">Cancel payment</button>
              <p className="text-center text-xs text-forno-text-muted mt-3 flex items-center justify-center gap-1">
                <ShieldCheck size={12} /> Test environment — no real money is charged
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
