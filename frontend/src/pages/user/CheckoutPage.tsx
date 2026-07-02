import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, ChevronDown, ChevronUp, MapPin, ShoppingCart } from 'lucide-react';
import { cartApi } from '@/services/api';
import { orderApi, razorpayApi } from '@/services/mockApi';
import { useToast } from '@/components/shared/Toaster';
import type { CartItem, Order } from '@/types';

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [address, setAddress] = useState({ street: '', city: '', state: '', pincode: '' });
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => { loadCart(); }, []);

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
        await cartApi.updateItem(itemId, newQuantity);
        setCartItems(items => items.map(i => i.id === itemId ? { ...i, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity } : i));
      }
    }
  };

  const subtotal = cartItems.reduce((s, i) => s + i.totalPrice, 0);
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const deliveryFee = subtotal >= 500 ? 0 : 40;
  const total = subtotal + tax + deliveryFee;

  const handlePayment = async () => {
    if (cartItems.length === 0) { toast('Your cart is empty', 'warning'); return; }
    if (!address.street || !address.city) { toast('Please fill in delivery address', 'warning'); return; }
    setLoading(true);

    try {
      const orderRes = await orderApi.create({
        items: cartItems.map(c => ({
          type: c.type,
          name: c.name,
          pizzaId: c.pizzaId,
          base: c.base,
          sauce: c.sauce,
          cheese: c.cheese,
          veggies: c.veggies,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          totalPrice: c.totalPrice,
        })),
        deliveryAddress: address,
      });

      if (orderRes.success) {
        const paymentRes = await razorpayApi.createOrder(orderRes.data.order._id, orderRes.data.order.total);
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
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="text-[#FF6B35] font-medium mb-8">Estimated: 25-30 minutes</motion.p>
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
    <div className="max-w-xl mx-auto">
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
                <div className="w-16 h-16 rounded-lg bg-forno-bg-tertiary flex items-center justify-center shrink-0 overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-forno-text-muted">{item.type === 'custom' ? 'C' : 'P'}</span>
                  )}
                </div>
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
        <div className="space-y-3">
          <input type="text" value={address.street} onChange={e => setAddress(p => ({ ...p, street: e.target.value }))}
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
    </div>
  );
}
