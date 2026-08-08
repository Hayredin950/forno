import { Link } from 'react-router-dom';
import { Flame, Mail, Phone, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { siteConfigApi, newsletterApi, type SiteConfigData } from '@/services/api';

const DEFAULT_SOCIAL = [
  { key: 'instagram', label: 'Instagram', base: 'https://instagram.com/' },
  { key: 'twitter', label: 'Twitter', base: 'https://twitter.com/' },
  { key: 'facebook', label: 'Facebook', base: 'https://facebook.com/' },
];

export default function Footer() {
  const [config, setConfig] = useState<SiteConfigData | null>(null);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    siteConfigApi.get().then((res) => {
      if (res.success) setConfig(res.data);
    }).catch(() => {});
  }, []);

  // Resolve a configured handle/link to a working URL. Admin can save either
  // a full URL (https://…) or a bare handle (@name) — handle the latter.
  const socialHref = (key: string, value: string): string => {
    if (!value) return '#';
    if (/^https?:\/\//.test(value)) return value;
    const clean = value.replace(/^@/, '');
    const base = DEFAULT_SOCIAL.find(s => s.key === key)?.base ?? '#';
    return `${base}${clean}`;
  };

  const handleSubscribe = async () => {
    if (!email) return;
    setStatus('loading');
    const res = await newsletterApi.subscribe(email);
    if (res.success) {
      setSubscribed(true);
      setStatus('idle');
      setEmail('');
    } else {
      setStatus('error');
    }
  };

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
            {config?.contactPhone && (
              <p className="flex items-center gap-2 text-sm text-forno-text-secondary mb-2">
                <Phone size={14} className="text-[#FF6B35]" /> {config.contactPhone}
              </p>
            )}
            {config?.supportEmail && (
              <p className="flex items-center gap-2 text-sm text-forno-text-secondary mb-4">
                <Mail size={14} className="text-[#FF6B35]" /> {config.supportEmail}
              </p>
            )}
            <div className="flex gap-4">
              {DEFAULT_SOCIAL.map(({ key, label }) => (
                <a
                  key={key}
                  href={socialHref(key, (config?.social as Record<string, string> | undefined)?.[key] ?? '')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-forno-text-muted hover:text-forno-text-primary transition-colors text-sm"
                >
                  {label}
                </a>
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
            {subscribed ? (
              <div className="flex items-center gap-2 text-sm text-[#7CB342]">
                <Check size={16} /> You're subscribed — welcome aboard!
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSubscribe(); }}
                    placeholder="your@email.com"
                    className="flex-1 bg-forno-bg-tertiary border border-forno-border rounded-lg px-3 py-2 text-sm text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50"
                  />
                  <button
                    onClick={handleSubscribe}
                    disabled={status === 'loading' || !email}
                    className="px-4 py-2 accent-gradient rounded-lg text-white text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    →
                  </button>
                </div>
                {status === 'error' && (
                  <p className="text-xs text-forno-accent-red mt-2">Couldn't subscribe. Please try again.</p>
                )}
                <p className="text-xs text-forno-text-muted mt-2">No spam, just pizza.</p>
              </>
            )}
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-forno-border text-center">
          <p className="text-xs text-forno-text-muted">© 2025 Forno. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
