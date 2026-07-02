import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, ClipboardList, Package, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardApi, orderApi } from '@/services/mockApi'; // Keep using mockApi for dashboard and orders for now
import { inventoryApi } from '@/services/api';
import type { DashboardStats, Order, InventoryItem } from '@/types';

const statusColors: Record<string, string> = {
  received: 'bg-[#F7931E]/15 text-[#F7931E]',
  kitchen: 'bg-[#FF6B35]/15 text-[#FF6B35]',
  delivery: 'bg-[#7CB342]/15 text-[#7CB342]',
  completed: 'bg-[#7CB342]/15 text-[#7CB342]',
  cancelled: 'bg-[#E53935]/15 text-[#E53935]',
};

function CountUp({ target, duration = 1000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return <>{count.toLocaleString()}</>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<{ name: string; orders: number }[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const [statsRes, chartRes, ordersRes, stockRes] = await Promise.all([
      dashboardApi.getStats(),
      dashboardApi.getOrdersChart(7),
      orderApi.getMyOrders(),
      inventoryApi.getAll({ lowStock: true }),
    ]);
    setStats(statsRes.data);
    setChartData(chartRes.data.labels.map((l, i) => ({ name: l, orders: chartRes.data.data[i] })));
    setOrders(ordersRes.data.orders.slice(0, 8));
    setLowStock(stockRes.data.items.slice(0, 5));
  };

  const statCards = [
    { label: 'Total Orders', value: stats?.totalOrders || 0, change: stats?.changes.totalOrders || '+0%', icon: ShoppingBag, changeColor: 'text-forno-status-success' },
    { label: 'Pending Orders', value: stats?.pendingOrders || 0, change: stats?.changes.pendingOrders || '0%', icon: ClipboardList, changeColor: 'text-forno-status-success' },
    { label: 'Low Stock Items', value: stats?.lowStockItems || 0, change: stats?.changes.lowStockItems || '0%', icon: Package, changeColor: 'text-forno-accent-red' },
    { label: 'Revenue Today', value: `₹${stats?.revenueToday || 0}`, change: stats?.changes.revenueToday || '+0%', icon: TrendingUp, changeColor: 'text-forno-status-success', isCurrency: true },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-5">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs uppercase tracking-[0.06em] text-forno-text-muted">{card.label}</span>
              <card.icon size={18} className="text-forno-text-muted" strokeWidth={1.5} />
            </div>
            <div className="text-3xl font-mono font-semibold text-forno-text-primary mb-1">
              {card.isCurrency ? card.value : <CountUp target={card.value as number} />}
            </div>
            <span className={`text-xs font-medium ${card.changeColor}`}>{card.change}</span>
          </motion.div>
        ))}
      </div>

      {/* Chart + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-forno-text-primary">Order Volume</h3>
            <div className="flex gap-1">
              {['7D', '30D', '90D'].map(p => (
                <button key={p} className={`px-3 py-1 text-xs rounded-lg transition-colors ${p === '7D' ? 'bg-[#FF6B35]/15 text-[#FF6B35]' : 'text-forno-text-muted hover:text-forno-text-primary'}`}>{p}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF6B35" stopOpacity={0.3} /><stop offset="100%" stopColor="#FF6B35" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="name" tick={{ fill: '#6B6258', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B6258', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#16120F', border: '1px solid rgba(245,241,234,0.08)', borderRadius: 8, fontSize: 12 }} itemStyle={{ color: '#F5F1EA' }} />
              <Area type="monotone" dataKey="orders" stroke="#FF6B35" strokeWidth={2} fill="url(#areaGrad)" animationDuration={1000} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-forno-text-primary">Low Stock Alerts</h3>
            {lowStock.length > 0 && <span className="w-5 h-5 bg-forno-accent-red rounded-full flex items-center justify-center text-[10px] text-white font-semibold">{lowStock.length}</span>}
          </div>
          <div className="space-y-3 max-h-[260px] overflow-y-auto">
            {lowStock.map(item => (
              <div key={item._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-forno-text-primary truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-forno-bg-tertiary rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(item.currentStock / item.maxCapacity) * 100}%`, background: item.currentStock < 10 ? '#E53935' : '#F9A825' }} />
                    </div>
                    <span className="text-xs font-mono text-forno-text-muted">{item.currentStock}</span>
                  </div>
                </div>
              </div>
            ))}
            {lowStock.length === 0 && <p className="text-sm text-forno-text-muted text-center py-4">All stock levels healthy</p>}
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-forno-border">
          <h3 className="font-semibold text-forno-text-primary">Recent Orders</h3>
          <Link to="/admin/orders" className="text-xs text-[#FF6B35] hover:underline">View All →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-forno-bg-tertiary">
                {['Order ID', 'Customer', 'Items', 'Total', 'Status', 'Time'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-[0.06em] text-forno-text-muted font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order, i) => (
                <motion.tr key={order._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-forno-border last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3.5 font-mono text-sm text-forno-text-primary">{order.orderId}</td>
                  <td className="px-4 py-3.5 text-sm text-forno-text-primary">{order.userName || 'Guest'}</td>
                  <td className="px-4 py-3.5 text-sm text-forno-text-secondary">{order.items.length} items</td>
                  <td className="px-4 py-3.5 font-mono text-sm text-forno-text-primary">₹{order.total.toFixed(0)}</td>
                  <td className="px-4 py-3.5"><span className={`px-2.5 py-1 rounded-pill text-[11px] font-semibold ${statusColors[order.status]}`}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></td>
                  <td className="px-4 py-3.5 text-xs text-forno-text-muted">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                </motion.tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-forno-text-muted">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
