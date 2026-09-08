import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { LogIn, AlertCircle, User, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card, { CardContent } from '@/components/ui/Card';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, error: authError, clearError } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/catalog';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    if (authError) {
      setError(authError);
      clearError();
    }
  }, [authError, clearError]);

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      await login(data.username, data.password);
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4" data-testid="login-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6" data-testid="logo-link">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/25">
              <span className="text-white font-bold text-xl">QA</span>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900" data-testid="login-heading">Welcome Back</h1>
          <p className="mt-2 text-slate-600">Sign in to continue to QA Demo</p>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
            data-testid="login-error"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-600" data-testid="login-error-message">{error}</p>
          </motion.div>
        )}

        {/* Login Form */}
        <Card data-testid="login-form-card">
          <CardContent className="p-6">
            {/* Google Sign-In */}
            <div className="mb-6">
              <GoogleSignInButton
                mode="signin"
                onSuccess={() => navigate(from, { replace: true })}
                onError={(msg) => setError(msg)}
              />
            </div>

            <div className="relative flex py-2 items-center mb-6">
              <div className="flex-grow border-t border-slate-200" />
              <span className="flex-shrink mx-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                or sign in with password
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" data-testid="login-form" role="form" aria-label="Login form">
              <div className="relative">
                <Input
                  label="Username or Email"
                  {...register('username', { required: 'Username or email is required' })}
                  error={errors.username?.message}
                  placeholder="Enter your username or email"
                  data-testid="username-input"
                  aria-label="Username or email"
                  autoComplete="username"
                />
                <User className="absolute right-4 top-[42px] w-5 h-5 text-slate-400" aria-hidden="true" />
              </div>

              <div className="relative">
                <Input
                  label="Password"
                  type="password"
                  {...register('password', { required: 'Password is required' })}
                  error={errors.password?.message}
                  placeholder="Enter your password"
                  data-testid="password-input"
                  aria-label="Password"
                  autoComplete="current-password"
                />
                <Lock className="absolute right-4 top-[42px] w-5 h-5 text-slate-400" aria-hidden="true" />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                data-testid="login-submit-button"
                aria-label="Sign in"
              >
                <LogIn className="w-5 h-5 mr-2" aria-hidden="true" />
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Create Account Link */}
        <p className="mt-6 text-center text-sm text-slate-600">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="text-brand-600 hover:text-brand-700 font-semibold transition-colors"
            data-testid="sign-up-link"
          >
            Create Account
          </Link>
        </p>

        {/* Back to Home */}
        <p className="mt-6 text-center text-sm text-slate-600">
          <Link to="/" className="text-brand-600 hover:text-brand-700 font-medium" data-testid="back-to-home-link">
            ← Back to Home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

