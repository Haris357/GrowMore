'use client';

import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { Check, Sparkles, ShieldCheck } from 'lucide-react';

const HIGHLIGHTS = [
  'Live PSX stocks, gold, silver & crypto',
  'A screener that handles complex filters in one click',
  'AI that explains the move — not predicts it',
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-primary/[0.06]">
      {/* Ambient liquid-glass orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 h-[32rem] w-[32rem] rounded-full bg-primary/25 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-40 h-[34rem] w-[34rem] rounded-full bg-emerald-400/20 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-44 left-1/4 h-[30rem] w-[30rem] rounded-full bg-teal-400/20 blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="absolute right-5 top-5 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* Brand / marketing panel */}
        <div className="hidden flex-col p-12 lg:flex xl:p-16">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandLogo className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold tracking-tight">GrowMore</span>
          </Link>

          <div className="flex flex-1 flex-col justify-center">
            <div className="max-w-md space-y-7">
              <div className="inline-flex items-center gap-2 rounded-full glass-panel px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Your multi-asset command center
              </div>
              <h2 className="text-4xl font-bold leading-[1.1] tracking-tight xl:text-[2.9rem]">
                Every market,
                <br />
                one calm screen.
              </h2>
              <div className="space-y-3.5">
                {HIGHLIGHTS.map((h) => (
                  <div key={h} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[15px] text-muted-foreground">{h}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-[420px]">
            <Link href="/" className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
              <BrandLogo className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold tracking-tight">GrowMore</span>
            </Link>

            <div className="glass-panel rounded-3xl p-7 sm:p-9">
              <div className="mb-6 space-y-1.5 text-center">
                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              </div>
              {children}
            </div>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60">
              <ShieldCheck className="h-3 w-3" />
              Protected by 256-bit SSL encryption
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
