'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  Coins,
  Building2,
  Newspaper,
  Briefcase,
  Menu,
  X,
  Leaf,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Simplified navigation - only main pages
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Stocks', href: '/stocks', icon: TrendingUp },
  { name: 'Commodities', href: '/commodities', icon: Coins },
  { name: 'Bank Products', href: '/bank-products', icon: Building2 },
  { name: 'News', href: '/news', icon: Newspaper },
  { name: 'Portfolio', href: '/portfolio', icon: Briefcase },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      {/* Backdrop overlay when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar - Overlay style */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-card border-r shadow-xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Leaf className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold">GrowMore</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-smooth',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            GrowMore v1.0
          </p>
        </div>
      </aside>
    </TooltipProvider>
  );
}

// Collapsed sidebar with icon buttons (always visible on left edge)
export function CollapsedSidebar({ onOpen }: { onOpen: () => void }) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={100}>
      <aside className="fixed inset-y-0 left-0 z-20 flex flex-col w-16 bg-background border-r">
        {/* Menu toggle */}
        <div className="flex items-center justify-center h-14 border-b">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpen}
                className="h-9 w-9"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Menu</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Icon navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-smooth',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.name}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Logo at bottom */}
        <div className="py-4 flex justify-center border-t">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/dashboard">
                <Leaf className="h-6 w-6 text-primary" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>GrowMore</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
