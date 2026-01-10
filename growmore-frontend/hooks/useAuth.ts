'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export function useAuth(requireAuth: boolean = true) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, requireAuth, router]);

  return {
    user,
    isLoading,
    isAuthenticated,
  };
}

export function useRequireAuth() {
  return useAuth(true);
}

export function useOptionalAuth() {
  return useAuth(false);
}
