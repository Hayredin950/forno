import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { passwordApi } from '@/services/api';
import { useToast } from '@/components/shared/Toaster';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password || !confirmPw) { setError('Please fill in all fields'); return; }
    if (password !== confirmPw) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!token) { setError('Missing reset token.'); return; }

    setLoading(true);
    const res = await passwordApi.reset(token, password);
    setLoading(false);
    if (res.success) {
      setDone(true);
      toast('Password reset successfully!');
    } else {
      setError(res.message);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-forno-bg-primary flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="glass-card-elevated p-8 lg:p-10 text-center">
            <KeyRound size={48} className="mx-auto mb-4 text-forno-status-success" />
            <h3 className="text-2xl font-semibold text-forno-text-primary mb-2">Password Reset!</h3>
            <p className="text-sm text-forno-text-secondary mb-6">You can now sign in with your new password.</p>
            <button onClick={() => navigate('/login')} className="w-full py-3.5 accent-gradient rounded-button text-white font-semibold hover:brightness-110 transition-all">
              Sign In
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forno-bg-primary flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="glass-card-elevated p-8 lg:p-10">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-1">
              <img src="/logo.png" alt="Forno" className="h-10 w-10 rounded-lg" />
            </Link>
          </div>

          <form onSubmit={handleSubmit}>
            <h3 className="text-2xl font-semibold text-forno-text-primary mb-2 text-center">Set New Password</h3>
            <p className="text-sm text-forno-text-secondary text-center mb-6">Choose a strong password for your account.</p>

            <div className="mb-4">
              <label className="block text-xs uppercase tracking-[0.06em] text-forno-text-muted mb-2">New Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-3 pr-12 text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50 transition-colors"
                  placeholder="Min 8 characters" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-forno-text-muted hover:text-forno-text-primary">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs uppercase tracking-[0.06em] text-forno-text-muted mb-2">Confirm Password</label>
              <input type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-3 text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50 transition-colors"
                placeholder="Repeat password" />
            </div>

            {error && <p className="text-sm text-forno-accent-red mb-4">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 accent-gradient rounded-button text-white font-semibold hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Reset Password'}
            </button>

            <p className="text-center text-sm text-forno-text-secondary mt-6">
              Remembered it? <Link to="/login" className="text-[#FF6B35] hover:underline">Sign In</Link>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
