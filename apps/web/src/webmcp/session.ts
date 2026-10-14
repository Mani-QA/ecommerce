import { useAuthStore } from '@/stores/authStore';
import { isToolFailure, toolError, type ToolFailure } from './result';

interface SignedInUser {
  id: number;
  username: string;
  userType: string;
  email?: string;
}

export function requireUser(): SignedInUser | ToolFailure {
  const { user, isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated || !user) {
    return toolError('AUTH_REQUIRED', 'Sign in with sign_in before using this tool.');
  }
  return user;
}

export function requireAdmin(): SignedInUser | ToolFailure {
  const user = requireUser();
  if (isToolFailure(user)) {
    return user;
  }
  if (user.userType !== 'admin') {
    return toolError('FORBIDDEN', 'This tool is available to admin accounts.');
  }
  return user;
}
