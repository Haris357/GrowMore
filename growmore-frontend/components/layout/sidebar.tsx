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
  Eye,
  Calculator,
  Target,
  Filter,
  Bell,
  Settings,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Stocks', href: '/stocks', icon: TrendingUp },
  { name: 'Commodities', href: '/commodities', icon: Coins },
  { name: 'Bank Products', href: '/bank-products', icon: Building2 },
  { name: 'News', href: '/news', icon: Newspaper },
  { name: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { name: 'Watchlist', href: '/watchlist', icon: Eye },
  { name: 'Calculators', href: '/calculators', icon: Calculator },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'Screener', href: '/screener', icon: Filter },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r bg-card">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 h-16 px-6 border-b">
          <TrendingUp className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">GrowMore</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-smooth',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
