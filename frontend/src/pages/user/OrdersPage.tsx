import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardList } from 'lucide-react';
import { orderApi } from '@/services/mockApi'; // Keep using mockApi for orders for now
import type { Order } from '@/types';

const statusColors: Record<string, string> = {
  received: 'bg-[#F7931E]/15 text-[#F7931E]',
  kitchen: 'bg-[#FF6B35]/15 text-[#FF6B35]',
  delivery: 'bg-[#7CB342]/15 text-[#7CB342]',
  completed: 'bg-[#7CB342]/15 text-[#7CB342]',
  cancelled: 'bg-[#E53935]/15 text-[#E53935]',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    setLoading(true);
    const res = await orderApi.getMyOrders();
    setOrders(res.data.orders);
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-[#FF6B35]/30 border-t-[#FF6B35] rounded-full animate-spin" /></div>;
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ClipboardList size={48} className="text-forno-text-muted mb-4" />
        <h3 className="text-lg font-semibold text-forno-text-primary mb-2">No orders yet</h3>
        <p className="text-sm text-forno-text-secondary mb-6">Start ordering some delicious pizza!</p>
        <Link to="/dashboard" className="px-6 py-2 accent-gradient rounded-button text-white font-medium hover:brightness-110 transition-all">Browse Menu</Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-forno-text-primary mb-6">My Orders</h2>
      <div className="space-y-4">
        {orders.map((order, i) => (
          <motion.div key={order._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={`/dashboard/orders/${order._id}`} className="glass-card p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-[#FF6B35]/20 transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm text-forno-text-primary">{order.orderId}</span>
                  <span className={`px-2 py-0.5 rounded-pill text-[11px] font-semibold ${statusColors[order.status]}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
                <p className="text-xs text-forno-text-muted">{order.items.length} item{order.items.length > 1 ? 's' : ''} • {new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4">
                <span className="font-mono text-lg font-semibold text-forno-text-primary">₹{order.total.toFixed(2)}</span>
                <span className="text-xs text-[#FF6B35]">Track →</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
