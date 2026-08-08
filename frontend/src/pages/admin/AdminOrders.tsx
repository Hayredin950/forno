import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MoreHorizontal, ChevronLeft, ChevronRight, X, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { adminOrderApi } from '@/services/api';
import OrderItemThumbs from '@/components/shared/OrderItemThumbs';
import { useToast } from '@/components/shared/Toaster';
import type { Order, OrderStatus } from '@/types';const statusFilters = ['All', 'received', 'approved', 'kitchen', 'ready', 'delivery', 'completed', 'cancelled'];
const statusColors: Record<string, string> = {
  received: 'bg-[#F7931E]/15 text-[#F7931E]',
  approved: 'bg-[#F9A825]/15 text-[#F9A825]',
  kitchen: 'bg-[#FF6B35]/15 text-[#FF6B35]',
  ready: 'bg-[#FFB300]/15 text-[#FFB300]',
  delivery: 'bg-[#7CB342]/15 text-[#7CB342]',
  completed: 'bg-[#7CB342]/15 text-[#7CB342]',
  cancelled: 'bg-[#E53935]/15 text-[#E53935]',
};
// Mirrors the backend's CAN_TRANSITION state machine: orders can only move
// forward (plus cancel before dispatch), so admins never see invalid options.
const CAN_TRANSITION: Record<OrderStatus, OrderStatus[]> = {
  received: ['approved', 'cancelled'],
  approved: ['kitchen', 'cancelled'],
  kitchen: ['ready', 'cancelled'],
  ready: ['delivery'],
  delivery: ['completed'],
  completed: [],
  cancelled: [],
};

const statusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const toast = useToast();

  useEffect(() => { loadOrders(); }, [page, statusFilter, search, sort]);

  const loadOrders = async () => {
    try {
      const params: any = { page, limit: 10, sort };
      if (statusFilter !== 'All') params.status = statusFilter;
      if (search) params.search = search;
      const res = await adminOrderApi.getAll(params);
      setOrders(res.data.orders);
      setTotalPages(res.data.totalPages);
    } catch (e) {
      toast((e as Error).message || 'Failed to load orders', 'error');
    }
  };

  const handleStatusUpdate = async (orderId: string, status: OrderStatus) => {
    try {
      await adminOrderApi.updateStatus(orderId, status);
      setOpenDropdown(null);
      await loadOrders();
      toast(`Order moved to ${statusLabel(status)}`);
      // Keep the open detail modal fully in sync (status + timeline).
      setDetailOrder(d => d && d._id === orderId ? {
        ...d,
        status,
        statusHistory: [...(d.statusHistory ?? []), { status, timestamp: new Date().toISOString(), updatedBy: 'admin' }],
      } : d);
    } catch (e) {
      toast((e as Error).message || 'Failed to update status', 'error');
    }
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
        <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-forno-bg-tertiary border border-forno-border rounded-lg text-sm text-forno-text-secondary focus:outline-none focus:border-[#FF6B35]/50">
          <option value="newest">Sort: Newest first</option>
          <option value="oldest">Sort: Oldest first</option>
          <option value="total_desc">Sort: Total high → low</option>
          <option value="total_asc">Sort: Total low → high</option>
        </select>
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
                  onClick={() => setDetailOrder(order)}
                  className="border-b border-forno-border last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer">
                  <td className="px-4 py-3.5 font-mono text-[13px] text-forno-text-primary whitespace-nowrap">{order.orderId}</td>
                  <td className="px-4 py-3.5 text-sm text-forno-text-primary">{order.userName || 'Guest'}</td>
                  <td className="px-4 py-3.5 text-[13px] text-forno-text-secondary">{order.userEmail || '-'}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <OrderItemThumbs items={order.items} size={32} />
                      <span className="text-[13px] text-forno-text-secondary">{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-sm text-forno-text-primary text-right">₹{order.total.toFixed(0)}</td>
                  <td className="px-4 py-3.5 relative" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setOpenDropdown(openDropdown === order._id ? null : order._id)}
                      className={`px-2.5 py-1 rounded-pill text-[11px] font-semibold ${statusColors[order.status]} cursor-pointer hover:opacity-80 transition-opacity`}>
                      {statusLabel(order.status)}
                    </button>
                    {openDropdown === order._id && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-full left-4 mt-1 z-30 glass-card-elevated py-1 min-w-[150px]">
                        <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-forno-text-muted">Move to…</p>
                        {CAN_TRANSITION[order.status].map(s => (
                          <button key={s} onClick={() => handleStatusUpdate(order._id, s)}
                            className="w-full text-left px-3 py-1.5 text-xs text-forno-text-secondary hover:text-forno-text-primary hover:bg-white/[0.03] transition-colors">
                            {statusLabel(s)}
                          </button>
                        ))}
                        {CAN_TRANSITION[order.status].length === 0 && (
                          <p className="px-3 py-1.5 text-xs text-forno-text-muted">
                            {order.status === 'completed' ? 'Delivered — no further steps.' : 'Cancelled — order closed.'}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-forno-text-muted whitespace-nowrap">{new Date(order.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3.5"><button onClick={() => setDetailOrder(order)} className="text-forno-text-muted hover:text-[#FF6B35]"><MoreHorizontal size={16} /></button></td>
                </motion.tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-forno-text-muted">No orders found</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-forno-border">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 text-forno-text-muted hover:text-forno-text-primary disabled:opacity-40"><ChevronLeft size={16} /></button>
            <span className="text-sm font-mono text-forno-text-muted">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 text-forno-text-muted hover:text-forno-text-primary disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {openDropdown && <div className="fixed inset-0 z-20" onClick={() => setOpenDropdown(null)} />}

      {/* ─── Order detail modal ─── */}
      <AnimatePresence>
        {detailOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setDetailOrder(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="glass-card-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-forno-bg-secondary/95 backdrop-blur px-6 py-4 border-b border-forno-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-mono text-lg text-forno-text-primary">{detailOrder.orderId}</h3>
                  <span className={`px-2.5 py-1 rounded-pill text-[11px] font-semibold ${statusColors[detailOrder.status]}`}>{statusLabel(detailOrder.status)}</span>
                </div>
                <button onClick={() => setDetailOrder(null)} className="text-forno-text-muted hover:text-forno-text-primary"><X size={18} /></button>
              </div>

              <div className="p-6 space-y-6">
                {/* Items */}
                <div>
                  <h4 className="text-xs uppercase tracking-[0.06em] text-forno-text-muted font-medium mb-3">Items ({detailOrder.items.length})</h4>
                  <div className="space-y-3">
                    {detailOrder.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-4 bg-forno-bg-tertiary/50 border border-forno-border rounded-lg p-3">
                        <OrderItemThumbs items={[item]} size={56} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-forno-text-primary">{item.name}</p>
                          <p className="text-xs text-forno-text-muted truncate">
                            {item.type === 'custom'
                              ? `Custom build${item.base ? ` • ${item.base}` : ''}${item.sauce ? ` + ${item.sauce}` : ''}${item.cheese ? ` + ${item.cheese}` : ''}${(item.veggies ?? []).length ? ` + ${item.veggies!.length} veggie(s)` : ''}`
                              : 'Catalogue pizza'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-mono text-forno-text-primary">₹{item.totalPrice.toFixed(2)}</p>
                          <p className="text-[11px] text-forno-text-muted">× {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Money */}
                <div className="bg-forno-bg-tertiary/50 border border-forno-border rounded-lg p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-forno-text-secondary"><span>Subtotal</span><span className="font-mono">₹{detailOrder.subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-forno-text-secondary"><span>Tax</span><span className="font-mono">₹{detailOrder.tax.toFixed(2)}</span></div>
                  <div className="flex justify-between text-forno-text-secondary"><span>Delivery fee</span><span className="font-mono">₹{detailOrder.deliveryFee.toFixed(2)}</span></div>
                  <div className="flex justify-between text-forno-text-primary font-semibold pt-1.5 border-t border-forno-border"><span>Total</span><span className="font-mono">₹{detailOrder.total.toFixed(2)}</span></div>
                </div>

                {/* Delivery + time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-forno-bg-tertiary/50 border border-forno-border rounded-lg p-4">
                    <p className="text-xs uppercase tracking-wide text-forno-text-muted mb-2 flex items-center gap-1.5"><MapPin size={12} /> Delivery Address</p>
                    <p className="text-sm text-forno-text-primary">{detailOrder.deliveryAddress.street}</p>
                    <p className="text-sm text-forno-text-secondary">{detailOrder.deliveryAddress.city}, {detailOrder.deliveryAddress.state} — {detailOrder.deliveryAddress.pincode}</p>
                  </div>
                  <div className="bg-forno-bg-tertiary/50 border border-forno-border rounded-lg p-4">
                    <p className="text-xs uppercase tracking-wide text-forno-text-muted mb-2 flex items-center gap-1.5"><Clock size={12} /> Timeline</p>
                    {(detailOrder.statusHistory ?? []).map((h, i) => (
                      <p key={i} className="text-xs text-forno-text-secondary mb-1">
                        <span className="text-forno-text-primary">{statusLabel(h.status)}</span> — {new Date(h.timestamp).toLocaleString()}
                      </p>
                    ))}
                    {!detailOrder.statusHistory?.length && <p className="text-xs text-forno-text-muted">Placed {new Date(detailOrder.createdAt).toLocaleString()}</p>}
                  </div>
                </div>

                {/* Next action */}
                {CAN_TRANSITION[detailOrder.status].length > 0 && (
                  <div className="bg-[#FF6B35]/5 border border-[#FF6B35]/20 rounded-lg p-4 flex flex-wrap items-center gap-3">
                    <CheckCircle2 size={16} className="text-[#FF6B35]" />
                    <span className="text-sm text-forno-text-secondary flex-1">Advance this order to the next stage:</span>
                    <div className="flex gap-2">
                      {CAN_TRANSITION[detailOrder.status].map(s => (
                        <button key={s} onClick={() => handleStatusUpdate(detailOrder._id, s)}
                          className="px-3 py-1.5 text-xs font-medium accent-gradient text-white rounded-pill hover:brightness-110 transition-all">
                          {statusLabel(s)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
