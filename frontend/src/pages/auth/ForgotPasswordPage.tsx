import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { passwordApi } from '@/services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await passwordApi.forgot(email);
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-forno-bg-primary flex">
      <div className="hidden lg:block w-1/2 relative">
        <img src={import.meta.env.BASE_URL + 'images/auth-pizza.jpg'} alt="Pizza" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D0B0A]/40 to-[#0D0B0A]/90" />
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="glass-card-elevated p-8 lg:p-10">
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-1">
                <img src="/logo.png" alt="Forno" className="h-10 w-10 rounded-lg" />
              </Link>
            </div>

            {!sent ? (
              <form onSubmit={handleSubmit}>
                <h3 className="text-2xl font-semibold text-forno-text-primary mb-2 text-center">Reset Password</h3>
                <p className="text-sm text-forno-text-secondary text-center mb-6">Enter your email and we'll send you a reset link.</p>
                <div className="mb-6">
                  <label className="block text-xs uppercase tracking-[0.06em] text-forno-text-muted mb-2">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-3 text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50 transition-colors" placeholder="you@example.com" />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 accent-gradient rounded-button text-white font-semibold hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send Reset Link'}
                </button>
              </form>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity }} className="inline-flex mb-4">
                  <Mail size={48} className="text-[#FF6B35]" />
                </motion.div>
                <h3 className="text-2xl font-semibold text-forno-text-primary mb-2">Check your email</h3>
                <p className="text-sm text-forno-text-secondary mb-6">We've sent a password reset link to {email}</p>
                <Link to="/login" className="text-[#FF6B35] hover:underline text-sm">Back to Sign In</Link>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
