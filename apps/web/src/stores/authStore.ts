import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserType, SignupInput } from '@qademo/shared';
import { api } from '@/lib/api';

interface AuthUser {
  id: number;
  username: string;
  userType: UserType;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (data: SignupInput) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.login(username, password);
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      signup: async (data: SignupInput) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.signup(data);
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Signup failed';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      loginWithGoogle: async (credential: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.loginWithGoogle(credential);
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Google sign-in failed';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.logout();
        } catch {
          // Ignore logout errors
        } finally {
          api.setAccessToken(null);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      checkAuth: async () => {
        const state = get();
        if (!state.user) {
          set({ isLoading: false });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await api.refreshToken();
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          api.setAccessToken(null);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: import.meta.env.VITE_AUTH_STORAGE_KEY || 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      skipHydration: false, // Ensure state hydration happens correctly
    }
  )
);

// Initialize auth on app load
if (typeof window !== 'undefined') {
  useAuthStore.getState().checkAuth();
}

