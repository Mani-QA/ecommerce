import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  UserPlus,
  AlertCircle,
  User,
  Mail,
  Phone,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { SignupInput } from '@qademo/shared';
import { useAuthStore } from '@/stores/authStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card, { CardContent } from '@/components/ui/Card';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

interface SignupFormValues {
  username?: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, isAuthenticated, error: authError, clearError } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    mode: 'onBlur',
  });

  const watchPassword = watch('password', '');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/catalog', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (authError) {
      setError(authError);
      clearError();
    }
  }, [authError, clearError]);

  const passwordValidation = {
    hasLength: watchPassword.length >= 8,
    hasUpper: /[A-Z]/.test(watchPassword),
    hasNumber: /[0-9]/.test(watchPassword),
  };

  const onSubmit = async (data: SignupFormValues) => {
    setError(null);
    try {
      const payload: SignupInput = {
        email: data.email.trim(),
        phone: data.phone.trim(),
        password: data.password,
        username: data.username?.trim() || undefined,
      };
      await signup(payload);
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4" data-testid="signup-page">
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
          <h1 className="text-3xl font-bold text-slate-900" data-testid="signup-heading">
            Create an Account
          </h1>
          <p className="mt-2 text-slate-600">Join QA Demo with your email and phone</p>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
            data-testid="signup-error"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-600 text-sm font-medium" data-testid="signup-error-message">
              {error}
            </p>
          </motion.div>
        )}

        {/* Signup Form Card */}
        <Card data-testid="signup-form-card">
          <CardContent className="p-6">
            {/* Google Sign-In option */}
            <div className="mb-6">
              <GoogleSignInButton
                mode="signup"
                onSuccess={() => navigate('/catalog', { replace: true })}
                onError={(msg) => setError(msg)}
              />
            </div>

            <div className="relative flex py-2 items-center mb-6">
              <div className="flex-grow border-t border-slate-200" />
              <span className="flex-shrink mx-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                or register with email
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              data-testid="signup-form"
              role="form"
              aria-label="Registration form"
            >
              {/* Email */}
              <div className="relative">
                <Input
                  label="Email Address"
                  type="email"
                  {...register('email', {
                    required: 'Email address is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Please enter a valid email address',
                    },
                  })}
                  error={errors.email?.message}
                  placeholder="john@example.com"
                  data-testid="email-input"
                  aria-label="Email address"
                  autoComplete="email"
                />
                <Mail className="absolute right-4 top-[42px] w-5 h-5 text-slate-400" aria-hidden="true" />
              </div>

              {/* Phone */}
              <div className="relative">
                <Input
                  label="Phone Number"
                  type="tel"
                  {...register('phone', {
                    required: 'Phone number is required',
                    minLength: {
                      value: 7,
                      message: 'Phone number must be at least 7 digits',
                    },
                    pattern: {
                      value: /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/,
                      message: 'Please enter a valid phone number',
                    },
                  })}
                  error={errors.phone?.message}
                  placeholder="+1 (555) 123-4567"
                  data-testid="phone-input"
                  aria-label="Phone number"
                  autoComplete="tel"
                />
                <Phone className="absolute right-4 top-[42px] w-5 h-5 text-slate-400" aria-hidden="true" />
              </div>

              {/* Optional Username */}
              <div className="relative">
                <Input
                  label="Username (Optional)"
                  {...register('username', {
                    minLength: {
                      value: 3,
                      message: 'Username must be at least 3 characters',
                    },
                    maxLength: {
                      value: 30,
                      message: 'Username cannot exceed 30 characters',
                    },
                    pattern: {
                      value: /^[a-zA-Z0-9_-]+$/,
                      message: 'Only letters, numbers, hyphens, and underscores are allowed',
                    },
                  })}
                  error={errors.username?.message}
                  placeholder="johndoe (auto-generated if empty)"
                  data-testid="username-input"
                  aria-label="Username"
                  autoComplete="username"
                />
                <User className="absolute right-4 top-[42px] w-5 h-5 text-slate-400" aria-hidden="true" />
              </div>

              {/* Password */}
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                    validate: {
                      hasUpper: (val) =>
                        /[A-Z]/.test(val) || 'Password must contain at least one uppercase letter',
                      hasNumber: (val) =>
                        /[0-9]/.test(val) || 'Password must contain at least one number',
                    },
                  })}
                  error={errors.password?.message}
                  placeholder="Create a strong password"
                  data-testid="password-input"
                  aria-label="Password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-[42px] text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Requirements Checklist */}
              {watchPassword && (
                <div className="p-3 bg-slate-50 rounded-lg space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        passwordValidation.hasLength ? 'text-emerald-500' : 'text-slate-300'
                      }`}
                    />
                    <span className={passwordValidation.hasLength ? 'text-slate-900 font-medium' : ''}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        passwordValidation.hasUpper ? 'text-emerald-500' : 'text-slate-300'
                      }`}
                    />
                    <span className={passwordValidation.hasUpper ? 'text-slate-900 font-medium' : ''}>
                      At least one uppercase letter (A-Z)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        passwordValidation.hasNumber ? 'text-emerald-500' : 'text-slate-300'
                      }`}
                    />
                    <span className={passwordValidation.hasNumber ? 'text-slate-900 font-medium' : ''}>
                      At least one number (0-9)
                    </span>
                  </div>
                </div>
              )}

              {/* Confirm Password */}
              <div className="relative">
                <Input
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (val) => val === watchPassword || 'Passwords do not match',
                  })}
                  error={errors.confirmPassword?.message}
                  placeholder="Re-enter your password"
                  data-testid="confirm-password-input"
                  aria-label="Confirm password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-[42px] text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full mt-2"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                data-testid="signup-submit-button"
                aria-label="Create account"
              >
                <UserPlus className="w-5 h-5 mr-2" aria-hidden="true" />
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing Account Footer */}
        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-brand-600 hover:text-brand-700 font-semibold transition-colors"
            data-testid="sign-in-link"
          >
            Sign In
          </Link>
        </p>

        {/* Back to Home */}
        <p className="mt-3 text-center text-sm text-slate-500">
          <Link to="/" className="hover:text-slate-700 transition-colors" data-testid="back-to-home-link">
            ← Back to Home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
