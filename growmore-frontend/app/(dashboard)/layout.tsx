'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { NotificationPanel } from '@/components/layout/notification-panel';
import { useAuthStore } from '@/stores/authStore';
import { useMarketStore } from '@/stores/marketStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const fetchMarkets = useMarketStore(state => state.fetchMarkets);
  const fetchUnreadCount = useNotificationStore(state => state.fetchUnreadCount);

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Run API calls in parallel for faster loading
      Promise.all([
        fetchMarkets(),
        fetchUnreadCount()
      ]).catch(console.error);
    }
  }, [isAuthenticated, user, fetchMarkets, fetchUnreadCount]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        {/* Top navbar skeleton */}
        <div className="h-14 border-b flex items-center justify-between px-4 md:px-6">
          <Skeleton className="h-8 w-32" />
          <div className="hidden lg:flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24" />
            ))}
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        {/* Content skeleton */}
        <div className="flex-1 p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Notification panel - right side overlay */}
      <NotificationPanel
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      {/* Top navbar */}
      <Header onNotificationClick={() => setIsNotificationOpen(true)} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 min-w-0">
        {children}
      </main>
    </div>
  );
}
