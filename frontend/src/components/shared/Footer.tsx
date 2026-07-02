import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-forno-bg-primary border-t border-forno-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <Link to="/" className="flex items-center gap-1 mb-4">
              <span className="text-lg font-semibold tracking-[0.1em] text-forno-text-primary">
                FORN<span className="relative">O<span className="absolute -right-1.5 -top-0.5 text-[#FF6B35]"><Flame size={9} /></span></span>
              </span>
            </Link>
            <p className="text-xs uppercase tracking-[0.08em] text-forno-text-muted mb-6">Fire. Dough. Perfection.</p>
            <div className="flex gap-4">
              {['Instagram', 'Twitter', 'Facebook'].map(social => (
                <a key={social} href="#" className="text-forno-text-muted hover:text-forno-text-primary transition-colors text-sm">{social}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-[0.08em] text-forno-text-muted mb-4">Explore</h4>
            <div className="flex flex-col gap-3">
              {[{ label: 'Home', path: '/' }, { label: 'Menu', path: '/dashboard' }, { label: 'Build Your Own', path: '/dashboard/builder' }, { label: 'My Orders', path: '/dashboard/orders' }].map(link => (
                <Link key={link.path} to={link.path} className="text-sm text-forno-text-secondary hover:text-forno-text-primary transition-colors">{link.label}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-[0.08em] text-forno-text-muted mb-4">Account</h4>
            <div className="flex flex-col gap-3">
              {[{ label: 'Sign In', path: '/login' }, { label: 'Register', path: '/register' }, { label: 'My Orders', path: '/dashboard/orders' }, { label: 'Profile', path: '/dashboard' }].map(link => (
                <Link key={link.path} to={link.path} className="text-sm text-forno-text-secondary hover:text-forno-text-primary transition-colors">{link.label}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-[0.08em] text-forno-text-muted mb-4">Newsletter</h4>
            <p className="text-sm text-forno-text-secondary mb-4">Get fresh drops</p>
            <div className="flex gap-2">
              <input type="email" placeholder="your@email.com" className="flex-1 bg-forno-bg-tertiary border border-forno-border rounded-lg px-3 py-2 text-sm text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50" />
              <button className="px-4 py-2 accent-gradient rounded-lg text-white text-sm font-medium hover:brightness-110 transition-all">→</button>
            </div>
            <p className="text-xs text-forno-text-muted mt-2">No spam, just pizza.</p>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-forno-border text-center">
          <p className="text-xs text-forno-text-muted">© 2025 Forno. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
