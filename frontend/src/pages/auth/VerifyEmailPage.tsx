import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MailCheck, MailX, Flame } from 'lucide-react';
import { passwordApi } from '@/services/api';

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('Missing verification token.');
      return;
    }
    passwordApi.verifyEmail(token).then((res) => {
      if (res.success) {
        setState('success');
        setMessage(res.message);
      } else {
        setState('error');
        setMessage(res.message);
      }
    });
  }, [token]);

  return (
    <div className="min-h-screen bg-forno-bg-primary flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="glass-card-elevated p-8 lg:p-10 text-center">
          <div className="mb-6">
            <Link to="/" className="inline-flex items-center gap-1 text-xl font-semibold tracking-[0.1em] text-forno-text-primary" style={{ fontFamily: 'Inter' }}>
              FORN<span className="relative">O<span className="absolute -right-1.5 -top-0.5 text-[#FF6B35]"><Flame size={10} /></span></span>
            </Link>
          </div>

          {state === 'loading' && (
            <div className="py-8">
              <div className="w-10 h-10 border-2 border-[#FF6B35]/30 border-t-[#FF6B35] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-forno-text-secondary text-sm">Verifying your email...</p>
            </div>
          )}

          {state === 'success' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <MailCheck size={48} className="mx-auto mb-4 text-forno-status-success" />
              <h3 className="text-2xl font-semibold text-forno-text-primary mb-2">Email Verified!</h3>
              <p className="text-sm text-forno-text-secondary mb-6">{message}</p>
              <Link to="/login" className="inline-block px-8 py-3 accent-gradient rounded-button text-white font-semibold hover:brightness-110 transition-all">
                Continue to Sign In
              </Link>
            </motion.div>
          )}

          {state === 'error' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <MailX size={48} className="mx-auto mb-4 text-forno-accent-red" />
              <h3 className="text-2xl font-semibold text-forno-text-primary mb-2">Verification Failed</h3>
              <p className="text-sm text-forno-text-secondary mb-6">{message}</p>
              <Link to="/register" className="inline-block px-8 py-3 accent-gradient rounded-button text-white font-semibold hover:brightness-110 transition-all">
                Back to Sign Up
              </Link>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
