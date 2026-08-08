import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Package, ShoppingBag, BarChart3, Bell, LogOut, Flame, Pizza, Users, Settings } from 'lucide-react';
import { authApi, inventoryApi, adminOrderApi } from '@/services/api';
import { useState, useEffect } from 'react';
import type { InventoryItem, Order } from '@/types';

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Pizzas', path: '/admin/pizzas', icon: Pizza },
  { label: 'Inventory', path: '/admin/inventory', icon: Package },
  { label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
  { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [newOrders, setNewOrders] = useState<Order[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const admin = authApi.getCurrentAdmin();

  // Real notifications: inventory below its alert threshold + fresh orders.
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const [stockRes, ordersRes] = await Promise.all([
          inventoryApi.getAll({ lowStock: true }),
          adminOrderApi.getAll({ page: 1, limit: 10 }),
        ]);
        setLowStock(stockRes.data.items.slice(0, 6));
        // "Needs attention" = not yet in the kitchen pipeline's happy path.
        setNewOrders(ordersRes.data.orders
          .filter(o => o.status === 'received' || o.status === 'approved' || o.status === 'kitchen')
          .slice(0, 5));
      } catch { /* keep last known state */ }
    };
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const alertCount = lowStock.length + newOrders.length;

  const handleLogout = () => {
    authApi.adminLogout();
    navigate('/admin/login');
  };

  const pageTitle = navItems.find(n => n.path === location.pathname)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-forno-bg-primary flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[280px] bg-forno-bg-primary border-r border-forno-border flex-col fixed h-screen">
        <div className="p-5 pb-4 border-b border-forno-border">
          <div className="flex items-center gap-1 text-lg font-semibold tracking-[0.1em] text-forno-text-primary">
            FORN<span className="relative">O<span className="absolute -right-1.5 -top-0.5 text-[#FF6B35]"><Flame size={9} /></span></span>
            <span className="ml-2 text-xs tracking-[0.08em] text-[#FF6B35] font-normal">ADMIN</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all relative ${
                  isActive ? 'text-[#FF6B35] bg-[#FF6B35]/[0.08]' : 'text-forno-text-muted hover:text-forno-text-secondary hover:bg-white/[0.02]'
                }`}>
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 accent-gradient rounded-r" />}
                <item.icon size={17} strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {alertCount > 0 && (
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="mx-3 mb-3 p-3 rounded-lg bg-[#FF6B35]/5 border-l-2 border-[#F9A825]">
            <p className="text-xs text-forno-text-secondary"><span className="text-[#F9A825] font-semibold">{alertCount}</span> alert{alertCount === 1 ? '' : 's'} need attention</p>
            <Link to="/admin/inventory" className="text-xs text-[#FF6B35] hover:underline mt-1 inline-block">View Inventory →</Link>
          </motion.div>
        )}

        <div className="p-4 border-t border-forno-border">
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-forno-text-muted hover:text-forno-accent-red transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-[280px]">
        {/* Top Bar */}
        <header className="h-16 bg-forno-bg-secondary border-b border-forno-border fixed top-0 left-0 lg:left-[280px] right-0 z-40 flex items-center justify-between px-6 lg:px-8">
          <h1 className="text-lg font-semibold text-forno-text-primary" style={{ fontFamily: 'Inter' }}>{pageTitle}</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button onClick={() => setNotifOpen(o => !o)} title="Notifications" className="relative hover:text-[#FF6B35] transition-colors">
                <Bell size={18} className="text-forno-text-muted" />
                {alertCount > 0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-forno-accent-red rounded-full text-[9px] text-white font-semibold flex items-center justify-center">{alertCount}</span>}
              </button>

              {/* Notifications dropdown */}
              <AnimatePresence>
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                    <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }} transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 z-40 w-80 glass-card-elevated overflow-hidden">
                      <div className="px-4 py-3 border-b border-forno-border flex items-center justify-between">
                        <span className="text-sm font-semibold text-forno-text-primary">Notifications</span>
                        {alertCount > 0 && <span className="px-2 py-0.5 bg-[#FF6B35]/10 text-[#FF6B35] rounded-pill text-[10px] font-semibold">{alertCount} new</span>}
                      </div>
                      <div className="max-h-[320px] overflow-y-auto">
                        {lowStock.length > 0 && (
                          <div className="px-4 py-2">
                            <p className="text-[10px] uppercase tracking-wide text-forno-text-muted font-semibold mb-1.5">Low stock</p>
                            {lowStock.map(item => (
                              <button key={item._id} onClick={() => { setNotifOpen(false); navigate('/admin/inventory'); }}
                                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] text-left transition-colors">
                                <span className="text-sm text-forno-text-primary truncate">{item.name}</span>
                                <span className="font-mono text-xs text-forno-accent-red shrink-0">{item.currentStock} left</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {newOrders.length > 0 && (
                          <div className="px-4 py-2 border-t border-forno-border">
                            <p className="text-[10px] uppercase tracking-wide text-forno-text-muted font-semibold mb-1.5">New orders</p>
                            {newOrders.map(order => (
                              <button key={order._id} onClick={() => { setNotifOpen(false); navigate('/admin/orders'); }}
                                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] text-left transition-colors">
                                <span className="text-sm font-mono text-forno-text-primary truncate">{order.orderId}</span>
                                <span className="text-xs text-forno-text-muted shrink-0">₹{order.total.toFixed(0)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {alertCount === 0 && (
                          <p className="px-4 py-8 text-center text-sm text-forno-text-muted">All caught up — no alerts 🎉</p>
                        )}
                      </div>
                      <div className="px-4 py-2.5 border-t border-forno-border">
                        <button onClick={() => { setNotifOpen(false); navigate('/admin/inventory'); }} className="text-xs text-[#FF6B35] hover:underline">Manage inventory →</button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <Link to="/admin/settings" className="flex items-center gap-2 hover:opacity-80 transition-opacity" title="Site settings">
              <div className="w-8 h-8 rounded-full bg-forno-bg-tertiary flex items-center justify-center text-xs font-semibold text-forno-text-primary">
                {admin?.name?.[0] || 'A'}
              </div>
              <span className="text-sm text-forno-text-primary hidden sm:block">{admin?.name || 'Admin'}</span>
            </Link>
          </div>
        </header>

        {/* Mobile Nav — the sidebar is hidden below lg */}
        <nav className="lg:hidden fixed top-16 left-0 right-0 z-30 bg-forno-bg-secondary border-b border-forno-border">
          <div className="flex gap-1 overflow-x-auto px-3 py-2">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive ? 'text-[#FF6B35] bg-[#FF6B35]/[0.08]' : 'text-forno-text-muted hover:text-forno-text-secondary'
                  }`}>
                  <item.icon size={14} strokeWidth={1.5} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <main className="pt-28 lg:pt-24 pb-8 px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
