import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number | string;
              locale?: string;
            }
          ) => void;
          prompt?: () => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  mode?: 'signin' | 'signup';
  onSuccess?: () => void;
  onError?: (errMessage: string) => void;
}

export default function GoogleSignInButton({
  mode = 'signin',
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const { loginWithGoogle } = useAuthStore();
  const [clientId, setClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [configChecked, setConfigChecked] = useState(false);
  const [showConfigNotice, setShowConfigNotice] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Google Client ID from backend
  useEffect(() => {
    let isMounted = true;
    api
      .getGoogleConfig()
      .then((res) => {
        if (isMounted) {
          if (res.clientId) {
            setClientId(res.clientId);
          }
          setConfigChecked(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setConfigChecked(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load Google Identity Services script and render GIS button if clientId is present
  useEffect(() => {
    if (!clientId) return;

    const handleCredential = async (credential: string) => {
      setIsLoading(true);
      try {
        await loginWithGoogle(credential);
        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Google authentication failed';
        onError?.(msg);
      } finally {
        setIsLoading(false);
      }
    };

    const scriptId = 'google-identity-services';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const initGis = () => {
      if (!window.google?.accounts?.id || !googleBtnContainerRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) {
            handleCredential(response.credential);
          }
        },
      });

      window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: mode === 'signup' ? 'signup_with' : 'signin_with',
        shape: 'rectangular',
        width: googleBtnContainerRef.current.clientWidth || 360,
      });
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => initGis();
      document.body.appendChild(script);
    } else if (window.google?.accounts?.id) {
      initGis();
    }
  }, [clientId, mode, loginWithGoogle, onSuccess, onError]);

  const handleFallbackClick = () => {
    if (!clientId) {
      setShowConfigNotice(true);
      onError?.('Google OAuth is ready on the backend. Please provide GOOGLE_CLIENT_ID in your Cloudflare settings to enable live Google account sign-in.');
    }
  };

  return (
    <div className="w-full" data-testid="google-signin-container">
      {/* Container where GIS renders the official Google Button if configured */}
      {clientId && (
        <div
          ref={googleBtnContainerRef}
          className="w-full flex justify-center min-h-[44px]"
          data-testid="google-gis-button"
        />
      )}

      {/* Styled fallback button when GIS is loading or clientId is pending configuration */}
      {(!clientId || !configChecked) && (
        <button
          type="button"
          onClick={handleFallbackClick}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          data-testid="google-signin-button"
          aria-label={mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
        >
          {/* Google Multicolor SVG Icon */}
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span className="text-sm font-semibold">
            {isLoading
              ? 'Connecting to Google...'
              : mode === 'signup'
                ? 'Sign up with Google'
                : 'Sign in with Google'}
          </span>
        </button>
      )}

      {showConfigNotice && !clientId && (
        <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 text-center" data-testid="google-config-notice">
          Google OAuth is active on backend. Set <code className="font-mono font-semibold">GOOGLE_CLIENT_ID</code> in Cloudflare variables to enable live Google One-Tap.
        </p>
      )}
    </div>
  );
}
