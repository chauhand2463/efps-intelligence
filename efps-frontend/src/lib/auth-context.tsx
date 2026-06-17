'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { DealerDto, AuthUser } from './types';
import { api, setAccessToken } from './api';

interface AuthState {
  user: AuthUser | null;
  dealer: DealerDto | null;
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthContextType extends AuthState {
  login: (fpsId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    dealer: null,
    isLoading: true,
    isInitialized: false,
  });

  useEffect(() => {
    let cancelled = false;
    const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

    async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = 8000): Promise<T> {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeoutMs);
      try {
        const res = await fetch(url, { ...init, signal: ac.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<T>;
      } finally {
        clearTimeout(timer);
      }
    }

    async function restore() {
      try {
        const json = await fetchJson<{ data: { access_token?: string; dealer?: DealerDto } }>(
          `${API}/auth/refresh`,
          { method: 'POST', credentials: 'include' }
        );

        const newToken = json?.data?.access_token;
        if (!newToken) {
          if (cancelled) return;
          setState({ user: null, dealer: null, isLoading: false, isInitialized: true });
          return;
        }

        setAccessToken(newToken);

        const meJson = await fetchJson<{ data: DealerDto }>(
          `${API}/auth/me`,
          { method: 'GET', credentials: 'include', headers: { 'Authorization': `Bearer ${newToken}`, 'Content-Type': 'application/json' } }
        );

        const dealer = meJson?.data;
        if (!dealer) {
          if (cancelled) return;
          setState({ user: null, dealer: null, isLoading: false, isInitialized: true });
          return;
        }

        if (cancelled) return;
        const user: AuthUser = { id: dealer.id, role: dealer.role, fps_id: dealer.fps_id };
        setState({ user, dealer, isLoading: false, isInitialized: true });
      } catch (err) {
        if (cancelled) return;
        console.error('[Auth] restore failed:', err);
        setState({ user: null, dealer: null, isLoading: false, isInitialized: true });
      }
    }
    restore();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (fpsId: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const result = await api.post<{ dealer: DealerDto; access_token: string }>(
        '/auth/login',
        { fps_id: fpsId, password },
        { skipAuth: true }
      );
      setAccessToken(result.access_token);
      const user: AuthUser = { id: result.dealer.id, role: result.dealer.role, fps_id: result.dealer.fps_id };
      setState({ user, dealer: result.dealer, isLoading: false, isInitialized: true });
    } catch (err) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    setAccessToken(null);
    setState({ user: null, dealer: null, isLoading: false, isInitialized: true });
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
