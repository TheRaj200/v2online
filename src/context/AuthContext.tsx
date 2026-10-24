import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { Provider } from 'react-redux';
import type { User } from '../types/auth';
import { store } from '../store';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchProfile, loginUser, logoutUser } from '../store/slices/authSlice';
import { fetchWallet } from '../store/slices/walletSlice';
import { fetchComplaints } from '../store/slices/complaintsSlice';
import { fetchShops } from '../store/slices/shopsSlice';
import { fetchServices } from '../store/slices/servicesSlice';

// In roles ke paas Shop management pages hain (GET /shops access)
const SHOP_ROLES = ['super_admin', 'sub_admin', 'manager', 'distributor'];

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (mobile: string, password: string) => Promise<{ success: boolean; message: string; redirectUrl?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth state Redux (`auth` slice) me rehta hai; ye provider sirf purana `useAuth()` API deta hai
 * aur login / app start par user ke role ke hisaab se data stores sync karta hai.
 */
const AuthBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);
  const token = useAppSelector(s => s.auth.token);
  const isInitializing = useAppSelector(s => s.auth.isInitializing);

  const syncUserData = useCallback(
    (role?: string) => {
      dispatch(fetchWallet());
      dispatch(fetchComplaints());
      dispatch(fetchServices());
      if (role && SHOP_ROLES.includes(role)) dispatch(fetchShops());
    },
    [dispatch]
  );

  const refreshProfile = useCallback(async () => {
    const result = await dispatch(fetchProfile());
    if (fetchProfile.fulfilled.match(result)) syncUserData(result.payload.role);
  }, [dispatch, syncUserData]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = useCallback(
    async (mobile: string, password: string) => {
      const result = await dispatch(loginUser({ mobile, password }));
      if (loginUser.fulfilled.match(result)) {
        syncUserData(result.payload.user?.role);
        return { success: true, message: result.payload.message, redirectUrl: result.payload.redirectUrl };
      }
      return { success: false, message: result.payload || 'Login failed' };
    },
    [dispatch, syncUserData]
  );

  const logout = useCallback(async () => {
    await dispatch(logoutUser());
    window.location.href = '/login';
  }, [dispatch]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading: isInitializing,
      login,
      logout,
      refreshProfile
    }),
    [user, token, isInitializing, login, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={store}>
    <AuthBridge>{children}</AuthBridge>
  </Provider>
);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
