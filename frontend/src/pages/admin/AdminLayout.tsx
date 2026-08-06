import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Package, ShoppingBag, BarChart3, Bell, LogOut, Flame, Pizza, Users } from 'lucide-react';
import { authApi } from '@/services/api';
import { inventoryApi } from '@/services/api';
import { useState, useEffect } from 'react';

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Pizzas', path: '/admin/pizzas', icon: Pizza },
  { label: 'Inventory', path: '/admin/inventory', icon: Package },
  { label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
  { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { label: 'Users', path: '/admin/users', icon: Users },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [lowStockCount, setLowStockCount] = useState(0);
  const admin = authApi.getCurrentAdmin();

  useEffect(() => {
    const checkStock = async () => {
      const res = await inventoryApi.getAll({ lowStock: true });
      setLowStockCount(res.data.items.length);
    };
    checkStock();
    const interval = setInterval(checkStock, 30000);
    return () => clearInterval(interval);
  }, []);

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

        {lowStockCount > 0 && (
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="mx-3 mb-3 p-3 rounded-lg bg-[#FF6B35]/5 border-l-2 border-[#F9A825]">
            <p className="text-xs text-forno-text-secondary"><span className="text-[#F9A825] font-semibold">{lowStockCount}</span> items low on stock</p>
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
              <Bell size={18} className="text-forno-text-muted" />
              {lowStockCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-forno-accent-red rounded-full" />}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-forno-bg-tertiary flex items-center justify-center text-xs font-semibold text-forno-text-primary">
                {admin?.name?.[0] || 'A'}
              </div>
              <span className="text-sm text-forno-text-primary hidden sm:block">{admin?.name || 'Admin'}</span>
            </div>
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
