// ============================================================
// Clyptus Job Portal - Shared Platform Authentication Store
// Used by Platform Super Admin and Platform Admin.
// ============================================================

import { create } from 'zustand';
import { AuthService, AuthUser } from '../services/auth.service';
import {
  clearPlatformAccessToken,
  getPlatformAccessToken,
  setPlatformAccessToken,
} from '../services/auth-session';

interface AuthState {
  user: AuthUser | null;
  notificationsCount: number;
  isHydrating: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  restoreSession: () => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => void;
  clearAuthError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  notificationsCount: 0,
  isHydrating: Boolean(getPlatformAccessToken()),
  isAuthenticating: false,
  authError: null,

  login: async (email, password) => {
    set({ isAuthenticating: true, authError: null });
    try {
      const result = await AuthService.login(email, password);
      setPlatformAccessToken(result.accessToken);
      set({
        user: result.user,
        isAuthenticating: false,
        isHydrating: false,
        authError: null,
      });
      return result.user;
    } catch (error: any) {
      clearPlatformAccessToken();
      const message = error?.message || 'Unable to sign in to the Platform Portal';
      set({
        user: null,
        isAuthenticating: false,
        isHydrating: false,
        authError: message,
      });
      throw error;
    }
  },

  restoreSession: async () => {
    const token = getPlatformAccessToken();
    if (!token) {
      set({ user: null, isHydrating: false });
      return;
    }

    set({ isHydrating: true });
    try {
      const user = await AuthService.me();
      set({ user, isHydrating: false, authError: null });
    } catch {
      clearPlatformAccessToken();
      set({ user: null, isHydrating: false });
    }
  },

  logout: async () => {
    try {
      if (getPlatformAccessToken()) {
        await AuthService.logout();
      }
    } catch {
      // Local logout must still complete if the server session already expired/revoked.
    } finally {
      clearPlatformAccessToken();
      set({ user: null, notificationsCount: 0, authError: null });
    }
  },

  clearSession: () => {
    clearPlatformAccessToken();
    set({ user: null, notificationsCount: 0, isHydrating: false });
  },

  clearAuthError: () => set({ authError: null }),
}));
