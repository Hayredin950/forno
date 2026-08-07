import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/services/api";
import { useToast } from "@/components/shared/Toaster";

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

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleCredential = async (credential: string) => {
    setLoading(true);
    try {
      const res = await authApi.googleLogin(credential);
      if (res.success) {
        toast("Signed in with Google!");
        navigate("/dashboard");
      } else {
        toast(res.message || "Google sign-in failed", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    }
    setLoading(false);
  };

  // Load the GIS script ONCE per page (shared across Login/Register mounts)
  // and render the official (clickable) button into a visible container — the
  // real Google button opens its own popup, which a bare prompt() call often
  // gets suppressed as One Tap. Previously a new <script> tag was appended on
  // every mount, piling up duplicate scripts and re-initializing GSI.
  const renderOfficial = (el: HTMLDivElement | null) => {
    if (!el || el.dataset.gsiMounted === "1") return;
    el.dataset.gsiMounted = "1";

    const initButton = () => {
      const google = window.google;
      if (!google?.accounts?.id || !el.isConnected) return;
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp: { credential?: string }) => {
          if (resp.credential) handleCredential(resp.credential);
        },
      });
      // width must be a pixel number — a "100%" string is invalid per the GSI
      // API and can prevent the button from rendering. CSS below stretches it.
      google.accounts.id.renderButton(el, {
        theme: "outline",
        size: "large",
        width: 360,
        text: "continue_with",
      });
    };

    if (window.google?.accounts?.id) {
      // Script already loaded by an earlier mount — initialize directly.
      initButton();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      // Script tag present but still loading — hook into its load event.
      existing.addEventListener("load", initButton, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initButton;
    script.onerror = () => {
      setScriptFailed(true);
      toast("Could not load Google sign-in. Check your connection.", "error");
    };
    document.head.appendChild(script);
  };

  if (!GOOGLE_CLIENT_ID) {
    return (
      <button
        disabled
        className="w-full py-3 border border-forno-border rounded-button text-sm font-medium text-forno-text-muted flex items-center justify-center gap-3 cursor-not-allowed"
      >
        <GoogleIcon />
        Google Sign-In (not configured)
      </button>
    );
  }

  if (scriptFailed) {
    return (
      <button
        disabled
        className="w-full py-3 border border-forno-border rounded-button text-sm font-medium text-forno-text-muted flex items-center justify-center gap-3 cursor-not-allowed"
      >
        <GoogleIcon />
        Google Sign-In unavailable
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Official button is the actual interactive element — fully visible,
          no duplicated styled clone. */}
      <div
        ref={renderOfficial}
        className="google-btn-container flex justify-center [&>div]:!w-full [&>div>div]:!w-full"
      />
      <p className="text-center text-xs text-forno-text-muted">
        {loading ? "Signing in with Google..." : "Continue with Google accounts"}
      </p>
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