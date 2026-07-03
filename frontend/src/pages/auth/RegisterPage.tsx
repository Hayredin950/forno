import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Flame } from 'lucide-react';
import { authApi } from '@/services/api';
import { useToast } from '@/components/shared/Toaster';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  const getPwStrength = (pw: string) => {
    let s = 0;
    if (pw.length >= 6) s++;
    if (pw.length >= 10) s++;
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) s++;
    return s;
  };

  const strength = getPwStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName || !email || !password || !confirmPw) { setError('Please fill in all fields'); return; }
    if (password !== confirmPw) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await authApi.register({ fullName, email, password });
      if (res.success) {
        toast('Account created! Please sign in.');
        navigate('/login');
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
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <div className="glass-card-elevated p-8 lg:p-10">
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-1 text-xl font-semibold tracking-[0.1em] text-forno-text-primary" style={{ fontFamily: 'Inter' }}>
                FORN<span className="relative">O<span className="absolute -right-1.5 -top-0.5 text-[#FF6B35]"><Flame size={10} /></span></span>
              </Link>
            </div>
            <form onSubmit={handleSubmit}>
              <h3 className="text-2xl font-semibold text-forno-text-primary mb-6 text-center">Create Account</h3>
              <div className="mb-4">
                <label className="block text-xs uppercase tracking-[0.06em] text-forno-text-muted mb-2">Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-3 text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50 transition-colors" placeholder="John Doe" />
              </div>
              <div className="mb-4">
                <label className="block text-xs uppercase tracking-[0.06em] text-forno-text-muted mb-2">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-3 text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50 transition-colors" placeholder="you@example.com" />
              </div>
              <div className="mb-4">
                <label className="block text-xs uppercase tracking-[0.06em] text-forno-text-muted mb-2">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-3 pr-12 text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50 transition-colors" placeholder="Min 6 characters" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-forno-text-muted hover:text-forno-text-primary">{showPw ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
                {password && (
                  <div className="flex gap-1 mt-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? (strength === 1 ? 'bg-forno-accent-red' : strength === 2 ? 'bg-forno-status-warning' : 'bg-forno-status-success') : 'bg-forno-bg-tertiary'}`} />
                    ))}
                  </div>
                )}
              </div>
              <div className="mb-6">
                <label className="block text-xs uppercase tracking-[0.06em] text-forno-text-muted mb-2">Confirm Password</label>
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-3 text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50 transition-colors" placeholder="Repeat password" />
              </div>
              {error && <p className="text-sm text-forno-accent-red mb-4">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-3.5 accent-gradient rounded-button text-white font-semibold hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Account'}
              </button>
              <p className="text-center text-sm text-forno-text-secondary mt-6">Already have an account? <Link to="/login" className="text-[#FF6B35] hover:underline">Sign In</Link></p>

              <div className="text-center mt-4">
                <Link to="/dashboard" className="text-sm text-forno-text-muted hover:text-forno-text-primary transition-colors">
                  Already logged in? Go to Dashboard
                </Link>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
