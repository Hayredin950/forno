import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Flame, Shield } from 'lucide-react';
import { authApi } from '@/services/api';
import { useToast } from '@/components/shared/Toaster';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('admin@forno.com');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    const res = await authApi.adminLogin({ email, password });
    if (res.success) {
      toast('Admin login successful');
      navigate('/admin');
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-forno-bg-primary flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="glass-card-elevated p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1 text-xl font-semibold tracking-[0.1em] text-forno-text-primary mb-1">
              FORN<span className="relative">O<span className="absolute -right-1.5 -top-0.5 text-[#FF6B35]"><Flame size={10} /></span></span>
              <span className="ml-2 text-xs tracking-[0.08em] text-[#FF6B35] font-normal">ADMIN</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-forno-text-muted mt-4">
              <Shield size={16} />
              <span className="text-sm">Authorized personnel only</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-xs uppercase tracking-[0.06em] text-forno-text-muted mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-3 text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50 transition-colors text-sm" />
            </div>
            <div className="mb-6">
              <label className="block text-xs uppercase tracking-[0.06em] text-forno-text-muted mb-2">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-3 pr-12 text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50 transition-colors text-sm"
                  placeholder="Enter admin password" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-forno-text-muted hover:text-forno-text-primary">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p initial={{ x: 0 }} animate={{ x: [-8, 8, -4, 4, 0] }} transition={{ duration: 0.4 }} className="text-sm text-forno-accent-red mb-4">
                {error}
              </motion.p>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 accent-gradient rounded-button text-white font-semibold hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Sign In'}
            </button>

            <p className="text-center text-xs text-forno-text-muted mt-4">Default: admin@forno.com / admin123</p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
