'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { DealerDto, LoginResponse, AuthUser } from './types';
import { api, configureApi, ApiRequestError } from './api';

interface AuthState {
  user: AuthUser | null;
  dealer: DealerDto | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (fpsId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getStored() {
  try {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const user = localStorage.getItem('auth_user');
    const dealer = localStorage.getItem('auth_dealer');
    return {
      accessToken,
      refreshToken,
      user: user ? JSON.parse(user) as AuthUser : null,
      dealer: dealer ? JSON.parse(dealer) as DealerDto : null,
    };
  } catch {
    return { accessToken: null, refreshToken: null, user: null, dealer: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = getStored();
  const [state, setState] = useState<AuthState>({
    user: stored.user,
    dealer: stored.dealer,
    accessToken: stored.accessToken,
    refreshToken: stored.refreshToken,
    isLoading: false,
  });

  const storeTokens = useCallback((access: string, refresh: string) => {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }, []);

  const storeAuth = useCallback((access: string, refresh: string, user: AuthUser, dealer: DealerDto) => {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('auth_dealer', JSON.stringify(dealer));
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_dealer');
  }, []);

  useEffect(() => {
    configureApi({
      getAccessToken: () => getStored().accessToken,
      getRefreshToken: () => getStored().refreshToken,
      onTokenRefresh: (access, refresh) => {
        storeTokens(access, refresh);
        setState(prev => ({ ...prev, accessToken: access, refreshToken: refresh }));
      },
      onLogout: () => {
        clearAuth();
        setState({ user: null, dealer: null, accessToken: null, refreshToken: null, isLoading: false });
        window.location.href = '/login';
      },
    });
  }, [storeTokens, clearAuth]);

  const login = useCallback(async (fpsId: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const result = await api.post<LoginResponse>('/auth/login', { fps_id: fpsId, password }, { skipAuth: true });
      const user: AuthUser = { id: result.dealer.id, role: result.dealer.role, fps_id: result.dealer.fps_id };
      storeAuth(result.access_token, result.refresh_token, user, result.dealer);
      setState({ user, dealer: result.dealer, accessToken: result.access_token, refreshToken: result.refresh_token, isLoading: false });
    } catch (err) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw err;
    }
  }, [storeAuth]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { }
    clearAuth();
    setState({ user: null, dealer: null, accessToken: null, refreshToken: null, isLoading: false });
    window.location.href = '/login';
  }, [clearAuth]);

  const refreshAuth = useCallback(async (): Promise<boolean> => {
    const stored = getStored();
    if (!stored.refreshToken) return false;
    try {
      const result = await api.post<{ access_token: string; refresh_token: string }>(
        '/auth/refresh',
        { refresh_token: stored.refreshToken },
        { skipAuth: true }
      );
      storeTokens(result.access_token, result.refresh_token);
      setState(prev => ({ ...prev, accessToken: result.access_token, refreshToken: result.refresh_token }));
      return true;
    } catch {
      clearAuth();
      setState({ user: null, dealer: null, accessToken: null, refreshToken: null, isLoading: false });
      return false;
    }
  }, [storeTokens, clearAuth]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
