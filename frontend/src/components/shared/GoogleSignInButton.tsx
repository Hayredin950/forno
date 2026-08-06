import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/api';
import { useToast } from '@/components/shared/Toaster';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          prompt?: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleCredential = async (credential: string) => {
    setLoading(true);
    try {
      const res = await authApi.googleLogin(credential);
      if (res.success) {
        toast('Signed in with Google!');
        navigate('/dashboard');
      } else {
        toast(res.message || 'Google sign-in failed', 'error');
      }
    } catch {
      toast('Something went wrong', 'error');
    }
    setLoading(false);
  };

  const handleClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      toast('Google sign-in is not configured yet. Contact the admin.', 'error');
      return;
    }
    if (loading) return;
    // Use the GIS popup flow via the button element already rendered by
    // initialize/renderButton — fall back to a manual ID token fetch.
    const google = window.google;
    if (google?.accounts?.id) {
      // google.accounts.id already rendered a button into this ref below;
      // clicking here triggers that button's popup. To keep it simple we
      // directly prompt for a credential.
      google.accounts.id.prompt?.();
    }
  };

  // Simple approach: load the GIS script on mount and render the official
  // Google button, which returns a credential we send to our backend.
  const [btnRef, setBtnRef] = useState<HTMLDivElement | null>(null);

  return (
    <div className="space-y-3">
      {!GOOGLE_CLIENT_ID ? (
        <button
          onClick={handleClick}
          disabled
          className="w-full py-3 border border-forno-border rounded-button text-sm font-medium text-forno-text-muted flex items-center justify-center gap-3 cursor-not-allowed"
        >
          <GoogleIcon />
          Google Sign-In (not configured)
        </button>
      ) : (
        <button
          onClick={handleClick}
          disabled={loading}
          className="w-full py-3 border border-forno-border rounded-button text-sm font-medium text-forno-text-primary hover:border-[#FF6B35]/40 hover:bg-white/[0.02] transition-all flex items-center justify-center gap-3 disabled:opacity-60"
        >
          <GoogleIcon />
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>
      )}

      {/* Hidden container where GIS renders the official button */}
      <div
        ref={(el) => {
          if (el && GOOGLE_CLIENT_ID && !btnRef) {
            setBtnRef(el);
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.onload = () => {
              const google = window.google;
              if (google?.accounts?.id) {
                google.accounts.id.initialize({
                  client_id: GOOGLE_CLIENT_ID,
                  callback: (resp: { credential?: string }) => {
                    if (resp.credential) handleCredential(resp.credential);
                  },
                });
                google.accounts.id.renderButton(el, {
                  theme: 'outline',
                  size: 'large',
                  width: '100%',
                  text: 'continue_with',
                });
              }
            };
            document.head.appendChild(script);
          }
        }}
        className="hidden google-btn-container [&>div]:!w-full [&>div>div]:!w-full"
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
