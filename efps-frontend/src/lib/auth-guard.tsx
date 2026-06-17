'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import type { RoleType } from './types';

export function RequireAuth({ children, roles }: { children: ReactNode; roles?: RoleType[] }) {
  const { user, isLoading, isInitialized } = useAuth();
  const router = useRouter();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user && !redirectedRef.current) {
      redirectedRef.current = true;
      router.replace('/login');
    } else if (user && roles && !roles.includes(user.role) && !redirectedRef.current) {
      redirectedRef.current = true;
      router.replace('/dashboard');
    }
  }, [user, isLoading, isInitialized, roles, router]);

  if (!isInitialized || isLoading) {
    return <LoadingScreen message="Authenticating..." />;
  }

  if (!user) {
    return null;
  }

  if (roles && !roles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
