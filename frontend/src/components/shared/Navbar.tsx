import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Menu, X, Flame, LogOut, User } from 'lucide-react';
import { authApi, cartApi } from '@/services/api';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState(authApi.getCurrentUser());
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(location.pathname);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const updateCart = async () => {
      const res = await cartApi.getCart();
      setCartCount(res.data.items.reduce((sum, i) => sum + i.quantity, 0));
    };
    updateCart();
    const interval = setInterval(updateCart, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setUser(authApi.getCurrentUser()); }, [location.pathname]);

  const handleLogout = () => { authApi.logout(); setUser(null); navigate('/'); };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Menu', path: '/dashboard' },
    { label: 'Build Your Own', path: '/dashboard/builder' },
    ...(user ? [{ label: 'My Orders', path: '/dashboard/orders' }] : []),
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#0D0B0A]/85 backdrop-blur-glass border-b border-forno-border' : 'bg-transparent'
        }`}
        style={{ height: scrolled ? 60 : 72 }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1 group">
            <span className="text-xl font-semibold tracking-[0.1em] text-forno-text-primary" style={{ fontFamily: 'Inter' }}>
              FORN<span className="relative">O<span className="absolute -right-1.5 -top-0.5 text-[#FF6B35]"><Flame size={10} /></span></span>
            </span>
          </Link>

          {!isAuthPage && (
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map(link => (
                <Link key={link.path} to={link.path} className="relative text-sm font-medium text-forno-text-secondary hover:text-forno-text-primary transition-colors duration-200 py-1">
                  {link.label}
                  {location.pathname === link.path && (
                    <motion.div layoutId="nav-underline" className="absolute bottom-0 left-0 right-0 h-0.5 accent-gradient rounded-full" />
                  )}
                </Link>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4">
            {!isAuthPage && (
              <>
                <Link to="/dashboard/checkout" className="relative p-2 text-forno-text-secondary hover:text-forno-text-primary transition-colors">
                  <ShoppingCart size={20} strokeWidth={1.5} />
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 w-5 h-5 accent-gradient rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </Link>

                {user ? (
                  <div className="hidden md:flex items-center gap-3">
                    <Link to="/dashboard/profile" title="My profile" className="flex items-center gap-2 text-sm text-forno-text-secondary hover:text-forno-text-primary transition-colors">
                      <User size={16} />
                      <span className="max-w-[100px] truncate">{user.fullName}</span>
                    </Link>
                    <button onClick={handleLogout} className="p-2 text-forno-text-muted hover:text-forno-accent-red transition-colors">
                      <LogOut size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="hidden md:flex items-center gap-3">
                    <Link to="/login" className="text-sm font-medium text-forno-text-secondary hover:text-forno-text-primary transition-colors">Sign In</Link>
                    <Link to="/register" className="px-4 py-2 text-sm font-semibold text-white accent-gradient rounded-button hover:brightness-110 transition-all">
                      Get Started
                    </Link>
                  </div>
                )}
              </>
            )}

            {!isAuthPage && (
              <button className="md:hidden p-2 text-forno-text-secondary" onClick={() => setMobileOpen(true)}>
                <Menu size={24} />
              </button>
            )}
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-[#0D0B0A]/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8"
          >
            <button className="absolute top-6 right-6 text-forno-text-secondary" onClick={() => setMobileOpen(false)}>
              <X size={28} />
            </button>
            {!isAuthPage && (
              <>
                {navLinks.map((link, i) => (
                  <motion.div key={link.path} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link to={link.path} onClick={() => setMobileOpen(false)} className="text-2xl font-medium text-forno-text-primary hover:text-[#FF6B35] transition-colors">
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                {user && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (navLinks.length) * 0.05 }}>
                    <Link to="/dashboard/profile" onClick={() => setMobileOpen(false)} className="text-xl text-forno-text-secondary hover:text-[#FF6B35] transition-colors">
                      My Profile
                    </Link>
                  </motion.div>
                )}
                {user ? (
                  <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                    onClick={() => { handleLogout(); setMobileOpen(false); }}
                    className="text-lg text-forno-accent-red">Logout</motion.button>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-col gap-4 items-center">
                    <Link to="/login" onClick={() => setMobileOpen(false)} className="text-lg text-forno-text-primary">Sign In</Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)} className="px-6 py-3 text-lg font-semibold accent-gradient rounded-button text-white">Get Started</Link>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
