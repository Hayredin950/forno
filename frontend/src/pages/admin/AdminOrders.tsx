import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminOrderApi } from '@/services/api';
import { useToast } from '@/components/shared/Toaster';
import type { Order, OrderStatus } from '@/types';

const statusFilters = ['All', 'received', 'kitchen', 'delivery', 'completed', 'cancelled'];
const statusColors: Record<string, string> = {
  received: 'bg-[#F7931E]/15 text-[#F7931E]',
  kitchen: 'bg-[#FF6B35]/15 text-[#FF6B35]',
  delivery: 'bg-[#7CB342]/15 text-[#7CB342]',
  completed: 'bg-[#7CB342]/15 text-[#7CB342]',
  cancelled: 'bg-[#E53935]/15 text-[#E53935]',
};
const allStatuses: OrderStatus[] = ['received', 'kitchen', 'delivery', 'completed', 'cancelled'];

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => { loadOrders(); }, [page, statusFilter, search]);

  const loadOrders = async () => {
    const params: any = { page, limit: 10 };
    if (statusFilter !== 'All') params.status = statusFilter;
    if (search) params.search = search;
    const res = await adminOrderApi.getAll(params);
    setOrders(res.data.orders);
    setTotal(res.data.total);
    setTotalPages(res.data.totalPages);
  };

  const handleStatusUpdate = async (orderId: string, status: OrderStatus) => {
    await adminOrderApi.updateStatus(orderId, status);
    setOpenDropdown(null);
    loadOrders();
    toast(`Order status updated to ${status}`);
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statusFilters.map(f => (
            <button key={f} onClick={() => { setStatusFilter(f); setPage(1); }}
              className={`px-3 py-1.5 rounded-pill text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === f ? 'bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/30' : 'bg-forno-bg-tertiary text-forno-text-secondary border border-forno-border'
              }`}>{f}</button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-forno-text-muted" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search orders..." className="pl-9 pr-4 py-2 bg-forno-bg-tertiary border border-forno-border rounded-lg text-sm text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50 w-56" />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-forno-bg-tertiary">
              {['Order ID', 'Customer', 'Contact', 'Items', 'Total', 'Status', 'Time', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-[0.06em] text-forno-text-muted font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {orders.map((order, i) => (
                <motion.tr key={order._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-forno-border last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3.5 font-mono text-[13px] text-forno-text-primary whitespace-nowrap">{order.orderId}</td>
                  <td className="px-4 py-3.5 text-sm text-forno-text-primary">{order.userName || 'Guest'}</td>
                  <td className="px-4 py-3.5 text-[13px] text-forno-text-secondary">{order.userEmail || '-'}</td>
                  <td className="px-4 py-3.5 text-[13px] text-forno-text-secondary max-w-[200px] truncate">{order.items.map(it => it.name).join(', ')}</td>
                  <td className="px-4 py-3.5 font-mono text-sm text-forno-text-primary text-right">₹{order.total.toFixed(0)}</td>
                  <td className="px-4 py-3.5 relative">
                    <button onClick={() => setOpenDropdown(openDropdown === order._id ? null : order._id)}
                      className={`px-2.5 py-1 rounded-pill text-[11px] font-semibold ${statusColors[order.status]} cursor-pointer hover:opacity-80 transition-opacity`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </button>
                    {openDropdown === order._id && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-full left-4 mt-1 z-20 glass-card-elevated py-1 min-w-[140px]">
                        {allStatuses.map(s => (
                          <button key={s} onClick={() => handleStatusUpdate(order._id, s)}
                            className="w-full text-left px-3 py-1.5 text-xs text-forno-text-secondary hover:text-forno-text-primary hover:bg-white/[0.03] transition-colors">
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-forno-text-muted whitespace-nowrap">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3.5"><button className="text-forno-text-muted hover:text-forno-text-primary"><MoreHorizontal size={16} /></button></td>
                </motion.tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-forno-text-muted">No orders found</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-forno-border">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 text-forno-text-muted hover:text-forno-text-primary disabled:opacity-40">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-mono text-forno-text-muted">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 text-forno-text-muted hover:text-forno-text-primary disabled:opacity-40">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {openDropdown && <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />}
    </div>
  );
}
