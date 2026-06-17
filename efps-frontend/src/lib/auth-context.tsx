'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { DealerDto, AuthUser } from './types';
import { api } from './api';

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
    async function restore() {
      try {
        await api.post('/auth/refresh', undefined, { skipAuth: true });
        const dealer = await api.get<DealerDto>('/auth/me', { skipAuth: true });
        if (cancelled) return;
        const user: AuthUser = { id: dealer.id, role: dealer.role, fps_id: dealer.fps_id };
        setState({ user, dealer, isLoading: false, isInitialized: true });
      } catch {
        if (cancelled) return;
        setState({ user: null, dealer: null, isLoading: false, isInitialized: true });
      }
    }
    restore();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (fpsId: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const result = await api.post<{ dealer: DealerDto }>('/auth/login', { fps_id: fpsId, password }, { skipAuth: true });
      const user: AuthUser = { id: result.dealer.id, role: result.dealer.role, fps_id: result.dealer.fps_id };
      setState({ user, dealer: result.dealer, isLoading: false, isInitialized: true });
    } catch (err) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { }
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
