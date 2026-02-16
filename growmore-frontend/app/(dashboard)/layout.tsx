'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CollapsedSidebar, Sidebar } from '@/components/layout/sidebar';
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

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
      <div className="flex min-h-screen bg-background">
        {/* Sidebar skeleton */}
        <div className="hidden lg:flex w-64 flex-col border-r p-4 space-y-4">
          <Skeleton className="h-10 w-32" />
          <div className="space-y-2 mt-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        {/* Main content skeleton */}
        <div className="flex-1 flex flex-col">
          <div className="h-16 border-b flex items-center justify-between px-6">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
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
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Collapsed sidebar - always visible */}
      <CollapsedSidebar onOpen={() => setIsSidebarOpen(true)} />

      {/* Full sidebar - overlay with blur */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Notification panel - right side overlay */}
      <NotificationPanel
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      {/* Main content area - offset by collapsed sidebar width */}
      <div className="flex flex-col flex-1 ml-16 min-w-0 min-h-screen">
        <Header onNotificationClick={() => setIsNotificationOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
