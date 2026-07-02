import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Flame } from 'lucide-react';
import { authApi } from '@/services/api';
import { useToast } from '@/components/shared/Toaster';

export default function LoginPage() {
  const [email, setEmail] = useState('');
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
    try {
      const res = await authApi.login({ email, password });
      if (res.success) {
        toast('Login successful!');
        navigate('/dashboard');
      } else {
        setError(res.message);
      }
    } catch { setError('Something went wrong'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-forno-bg-primary flex">
      <div className="hidden lg:block w-1/2 relative">
        <img src={import.meta.env.BASE_URL + 'images/auth-pizza.jpg'} alt="Pizza" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D0B0A]/40 to-[#0D0B0A]/90" />
        <div className="absolute bottom-12 left-12">
          <h3 className="text-2xl font-semibold text-forno-text-primary mb-2">Fire. Dough. Perfection.</h3>
          <p className="text-forno-text-secondary">Join thousands of pizza lovers.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="glass-card-elevated p-8 lg:p-10">
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-1 text-xl font-semibold tracking-[0.1em] text-forno-text-primary" style={{ fontFamily: 'Inter' }}>
                FORN<span className="relative">O<span className="absolute -right-1.5 -top-0.5 text-[#FF6B35]"><Flame size={10} /></span></span>
              </Link>
            </div>

            <AnimatePresence mode="wait">
              <motion.form key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleSubmit}>
                <h3 className="text-2xl font-semibold text-forno-text-primary mb-6 text-center">Welcome Back</h3>

                <div className="mb-4">
                  <label className="block text-xs uppercase tracking-[0.06em] text-forno-text-muted mb-2">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-3 text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50 transition-colors"
                    placeholder="you@example.com" />
                </div>

                <div className="mb-2">
                  <label className="block text-xs uppercase tracking-[0.06em] text-forno-text-muted mb-2">Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-3 pr-12 text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50 transition-colors"
                      placeholder="Enter password" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-forno-text-muted hover:text-forno-text-primary">
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="mb-6 text-right">
                  <Link to="/forgot-password" className="text-sm text-[#FF6B35] hover:underline">Forgot password?</Link>
                </div>

                {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-forno-accent-red mb-4">{error}</motion.p>}

                <button type="submit" disabled={loading}
                  className="w-full py-3.5 accent-gradient rounded-button text-white font-semibold hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Sign In'}
                </button>

                <p className="text-center text-sm text-forno-text-secondary mt-6">
                  Don't have an account? <Link to="/register" className="text-[#FF6B35] hover:underline">Sign Up</Link>
                </p>
              </motion.form>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
