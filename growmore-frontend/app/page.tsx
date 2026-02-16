'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import {
  BarChart3,
  Gem,
  Building2,
  Newspaper,
  PieChart,
  BellRing,
  ArrowRight,
  Leaf,
  Menu,
  X,
  Moon,
  Sun,
  TrendingUp,
  TrendingDown,
  Check,
  Shield,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

// ─── Fade-in on scroll ──────────────────────────────────────────────────────────

function useOnScreen(ref: React.RefObject<Element>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.08 }
    );
    const el = ref.current;
    if (el) obs.observe(el);
    return () => { if (el) obs.unobserve(el); };
  }, [ref]);
  return visible;
}

function Reveal({ children, delay = 0, className }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(ref);
  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-[800ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >{children}</div>
  );
}

// ─── Data ───────────────────────────────────────────────────────────────────────

const faqs = [
  { q: 'Is GrowMore free to use?', a: 'Yes. GrowMore is completely free with access to real-time stock tracking, gold prices, bank rate comparisons, and portfolio analytics. The core experience will always remain free.' },
  { q: 'Where does your market data come from?', a: 'We source real-time data directly from the Pakistan Stock Exchange (PSX), trusted commodity price providers, and official bank rate feeds. Stock prices are updated during market hours.' },
  { q: 'Is my financial data secure?', a: 'We use industry-standard encryption and security practices. GrowMore is a tracking and analytics tool — we never ask for or store your brokerage credentials or bank login information.' },
  { q: 'Can I track gold and silver prices?', a: 'Yes. GrowMore tracks live gold (24K, 22K) and silver prices from major Pakistani cities with custom price alerts and historical charts.' },
  { q: 'Do you have a mobile app?', a: 'We are building native iOS and Android apps. The web app is fully responsive and works great on mobile browsers. Sign up to get notified when apps launch.' },
];

const navLinks = ['Features', 'FAQ'];

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <style jsx global>{`
        .text-grad {
          background: linear-gradient(135deg, hsl(160 83% 35%), hsl(160 73% 52%));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .dark .text-grad {
          background: linear-gradient(135deg, hsl(160 73% 52%), hsl(160 80% 62%));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .grid-bg {
          background-size: 48px 48px;
          background-image:
            linear-gradient(hsl(var(--border) / 0.35) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border) / 0.35) 1px, transparent 1px);
        }
        .dot-bg {
          background-image: radial-gradient(hsl(var(--muted-foreground) / 0.1) 1px, transparent 1px);
          background-size: 16px 16px;
        }
        .glow-border {
          background: linear-gradient(135deg, hsl(var(--primary) / 0.15), transparent 60%);
        }
        @keyframes float-sm { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .float-sm { animation: float-sm 5s ease-in-out infinite; }
        .float-sm-d { animation: float-sm 5s ease-in-out 1.5s infinite; }
      `}</style>

      {/* Ambient */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/3 w-[700px] h-[500px] bg-primary/[0.03] rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -right-32 w-[500px] h-[500px] bg-blue-500/[0.025] rounded-full blur-[120px]" />
      </div>

      {/* ── Nav ────────────────────────────────────────────────────────────────── */}
      <header className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled ? 'bg-background/80 backdrop-blur-xl border-b border-border/40' : ''
      )}>
        <div className="max-w-[1120px] mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-lg"><Leaf className="h-[18px] w-[18px] text-primary" /></div>
            <span className="font-bold text-[15px] tracking-tight">GrowMore</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <button key={l} onClick={() => go(l.toLowerCase())} className="px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors">{l}</button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-1.5">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-md hover:bg-muted/50 transition-colors" aria-label="Theme">
              <Sun className="h-4 w-4 hidden dark:block" /><Moon className="h-4 w-4 dark:hidden" />
            </button>
            <Link href="/login"><Button variant="ghost" size="sm" className="text-[13px] h-8">Sign In</Button></Link>
            <Link href="/register"><Button size="sm" className="text-[13px] h-8 rounded-full px-4 gap-1">Get Started <ArrowRight className="h-3 w-3" /></Button></Link>
          </div>

          <button className="md:hidden p-2 rounded-md hover:bg-muted/50" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-b border-border/40 bg-background/95 backdrop-blur-xl">
            <div className="max-w-[1120px] mx-auto px-5 py-3 space-y-1">
              {navLinks.map(l => (
                <button key={l} onClick={() => go(l.toLowerCase())} className="block w-full text-left px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50">{l}</button>
              ))}
              <Separator className="my-2" />
              <div className="flex gap-2">
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-md hover:bg-muted/50"><Sun className="h-4 w-4 hidden dark:block" /><Moon className="h-4 w-4 dark:hidden" /></button>
                <Link href="/login" className="flex-1"><Button variant="outline" size="sm" className="w-full text-[13px]">Sign In</Button></Link>
                <Link href="/register" className="flex-1"><Button size="sm" className="w-full text-[13px] rounded-full">Get Started</Button></Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero — Centered, app-forward ───────────────────────────────────── */}
      <section className="relative pt-28 md:pt-32 overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

        <div className="max-w-[1120px] mx-auto px-5 relative">
          {/* Text — centered */}
          <div className="text-center max-w-[640px] mx-auto space-y-5 mb-12 md:mb-16">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/[0.06] text-primary text-[11px] font-semibold uppercase tracking-wider">
                <Sparkles className="h-3 w-3" /> Built for Pakistani Investors
              </div>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="text-[2.5rem] sm:text-5xl md:text-[3.25rem] font-bold tracking-tight leading-[1.1]">
                Your investments,<br />
                <span className="text-grad">one dashboard.</span>
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="text-muted-foreground text-[15px] sm:text-base leading-relaxed max-w-md mx-auto">
                Stocks, gold, silver, bank rates — track everything that matters to your wealth in a single view.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="flex items-center justify-center gap-3 pt-1">
                <Link href="/register">
                  <Button className="rounded-full h-11 px-7 text-sm font-semibold gap-2 shadow-lg shadow-primary/25">
                    Start Free <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Button variant="outline" className="rounded-full h-11 px-7 text-sm" onClick={() => go('features')}>
                  Explore
                </Button>
              </div>
            </Reveal>
            <Reveal delay={240}>
              <div className="flex items-center justify-center gap-5 text-[12px] text-muted-foreground pt-1">
                {['Free forever', 'Real-time data', 'No credit card'].map(t => (
                  <span key={t} className="flex items-center gap-1"><Check className="h-3 w-3 text-primary" />{t}</span>
                ))}
              </div>
            </Reveal>
          </div>

          {/* App preview — full width, perspective tilt */}
          <Reveal delay={200}>
            <div className="relative max-w-[960px] mx-auto" style={{ perspective: '1200px' }}>
              {/* Glow */}
              <div className="absolute -inset-6 bg-primary/[0.04] rounded-3xl blur-3xl" />

              <div
                className="relative rounded-xl border border-border/60 bg-card shadow-2xl overflow-hidden"
                style={{ transform: 'rotateX(2deg)', transformOrigin: 'center bottom' }}
              >
                {/* Chrome */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-muted/25">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/50" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 bg-muted/40 rounded px-3 py-0.5">
                      <Shield className="h-2.5 w-2.5" /> growmore.pk/dashboard
                    </div>
                  </div>
                </div>

                {/* Dashboard mockup */}
                <div className="p-4 md:p-5">
                  {/* Top nav bar */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center"><Leaf className="h-3.5 w-3.5 text-primary" /></div>
                      <div className="flex gap-4 text-[11px]">
                        <span className="text-foreground font-medium border-b-2 border-primary pb-0.5">Overview</span>
                        <span className="text-muted-foreground">Stocks</span>
                        <span className="text-muted-foreground">Gold</span>
                        <span className="text-muted-foreground">Banks</span>
                        <span className="text-muted-foreground hidden sm:inline">News</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Market Open</span>
                    </div>
                  </div>

                  {/* 3-column stat cards */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'PSX Stocks', value: '524', sub: 'listed', icon: BarChart3, color: 'text-emerald-500', bg: 'bg-emerald-500/8' },
                      { label: 'Gold 24K', value: 'Live', sub: 'tracking', icon: Gem, color: 'text-amber-500', bg: 'bg-amber-500/8' },
                      { label: 'Bank Rates', value: '20+', sub: 'banks', icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/8' },
                    ].map(c => (
                      <div key={c.label} className="rounded-lg border border-border/30 bg-muted/15 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className={cn('h-6 w-6 rounded-md flex items-center justify-center', c.bg)}>
                            <c.icon className={cn('h-3 w-3', c.color)} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{c.sub}</span>
                        </div>
                        <p className={cn('text-lg font-bold leading-none', c.color)}>{c.value}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{c.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Chart + watchlist side by side */}
                  <div className="grid grid-cols-5 gap-3">
                    {/* Chart area — 3 cols */}
                    <div className="col-span-5 md:col-span-3 rounded-lg border border-border/30 bg-muted/15 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold">KSE-100 Index</span>
                        <div className="flex items-center gap-1 text-emerald-500">
                          <TrendingUp className="h-3 w-3" />
                          <span className="text-[10px] font-semibold">Bullish</span>
                        </div>
                      </div>
                      <svg viewBox="0 0 400 80" className="w-full h-16 md:h-20" fill="none">
                        <defs>
                          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(160,73%,46%)" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="hsl(160,73%,46%)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,60 C30,55 50,62 80,50 C110,38 130,42 160,32 C190,22 210,28 240,18 C270,10 300,14 330,8 C360,3 380,6 400,2" stroke="hsl(160,73%,46%)" strokeWidth="1.5" />
                        <path d="M0,60 C30,55 50,62 80,50 C110,38 130,42 160,32 C190,22 210,28 240,18 C270,10 300,14 330,8 C360,3 380,6 400,2 L400,80 L0,80 Z" fill="url(#g1)" />
                      </svg>
                    </div>

                    {/* Watchlist — 2 cols */}
                    <div className="col-span-5 md:col-span-2 rounded-lg border border-border/30 bg-muted/15 p-3">
                      <span className="text-[11px] font-semibold block mb-2">Watchlist</span>
                      <div className="space-y-0.5">
                        {[
                          { s: 'OGDC', n: 'Oil & Gas Dev', up: true },
                          { s: 'HBL', n: 'Habib Bank', up: false },
                          { s: 'LUCK', n: 'Lucky Cement', up: true },
                          { s: 'EFERT', n: 'Engro Fert', up: true },
                        ].map(r => (
                          <div key={r.s} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-md bg-muted/40 flex items-center justify-center text-[8px] font-bold text-muted-foreground">{r.s.slice(0, 2)}</div>
                              <div>
                                <p className="text-[10px] font-semibold leading-none">{r.s}</p>
                                <p className="text-[8px] text-muted-foreground">{r.n}</p>
                              </div>
                            </div>
                            <div className={cn('flex items-center gap-0.5 text-[9px] font-semibold', r.up ? 'text-emerald-500' : 'text-red-500')}>
                              {r.up ? <ArrowUpRight className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                              {r.up ? '+' : '-'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-2 md:-right-6 float-sm z-10">
                <div className="bg-card border border-border/40 rounded-lg shadow-xl px-3 py-1.5 flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-amber-500/10 flex items-center justify-center"><Gem className="h-2.5 w-2.5 text-amber-500" /></div>
                  <span className="text-[10px] font-semibold">Gold Tracking</span>
                </div>
              </div>
              <div className="absolute -bottom-3 -left-2 md:-left-6 float-sm-d z-10">
                <div className="bg-card border border-border/40 rounded-lg shadow-xl px-3 py-1.5 flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center"><BellRing className="h-2.5 w-2.5 text-emerald-500" /></div>
                  <span className="text-[10px] font-semibold">Smart Alerts</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Fade out */}
          <div className="h-20 bg-gradient-to-t from-background to-transparent -mt-10 relative z-20" />
        </div>
      </section>

      {/* ── Bento Features ─────────────────────────────────────────────────── */}
      <section id="features" className="relative py-16 md:py-24">
        <div className="absolute inset-0 dot-bg opacity-30 pointer-events-none" />

        <div className="max-w-[1120px] mx-auto px-5 relative">
          <Reveal>
            <div className="text-center max-w-lg mx-auto mb-12 space-y-3">
              <p className="text-primary text-[12px] font-semibold uppercase tracking-wider">Features</p>
              <h2 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-tight">
                Everything in <span className="text-grad">one place</span>
              </h2>
              <p className="text-muted-foreground text-[15px]">
                Six powerful tools designed specifically for the Pakistani market.
              </p>
            </div>
          </Reveal>

          {/* Bento grid — asymmetric */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {/* Card 1 — PSX Stocks (large, 4 cols) */}
            <Reveal delay={0} className="md:col-span-4">
              <div className="group h-full rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-6 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg overflow-hidden relative">
                <div className="absolute top-0 right-0 w-40 h-40 glow-border rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
                        <BarChart3 className="h-5 w-5 text-emerald-500" />
                      </div>
                      <h3 className="font-bold text-lg mb-1">PSX Stock Tracking</h3>
                      <p className="text-muted-foreground text-sm max-w-sm">Track 500+ stocks with real-time OHLCV data, interactive charts, and fundamental analysis from the Pakistan Stock Exchange.</p>
                    </div>
                  </div>
                  {/* Mini visual — stock table */}
                  <div className="rounded-lg border border-border/30 bg-muted/10 overflow-hidden">
                    <div className="grid grid-cols-4 text-[10px] font-medium text-muted-foreground px-3 py-1.5 border-b border-border/20">
                      <span>Symbol</span><span>Price</span><span>Change</span><span>Volume</span>
                    </div>
                    {[
                      { s: 'OGDC', p: '124.50', c: '+2.4%', v: '12.3M', up: true },
                      { s: 'HBL', p: '89.30', c: '-0.8%', v: '8.1M', up: false },
                      { s: 'LUCK', p: '567.80', c: '+3.1%', v: '5.4M', up: true },
                    ].map(r => (
                      <div key={r.s} className="grid grid-cols-4 text-[11px] px-3 py-2 border-b border-border/10 last:border-0">
                        <span className="font-semibold">{r.s}</span>
                        <span>Rs. {r.p}</span>
                        <span className={r.up ? 'text-emerald-500 font-medium' : 'text-red-500 font-medium'}>{r.c}</span>
                        <span className="text-muted-foreground">{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Card 2 — Gold (2 cols) */}
            <Reveal delay={80} className="md:col-span-2">
              <div className="group h-full rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-6 hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg relative overflow-hidden">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
                  <Gem className="h-5 w-5 text-amber-500" />
                </div>
                <h3 className="font-bold text-lg mb-1">Gold & Silver</h3>
                <p className="text-muted-foreground text-sm mb-5">Live prices from major Pakistani cities with historical trends.</p>
                {/* Mini bars */}
                <div className="space-y-3">
                  {[
                    { label: 'Gold 24K', w: 'w-[85%]' },
                    { label: 'Gold 22K', w: 'w-[72%]' },
                    { label: 'Silver', w: 'w-[45%]' },
                  ].map(b => (
                    <div key={b.label}>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">{b.label}</span>
                        <span className="text-amber-500 font-medium">Live</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={cn('h-full bg-amber-500/40 rounded-full', b.w)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Card 3 — Bank Rates (2 cols) */}
            <Reveal delay={120} className="md:col-span-2">
              <div className="group h-full rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-6 hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg relative overflow-hidden">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
                  <Building2 className="h-5 w-5 text-blue-500" />
                </div>
                <h3 className="font-bold text-lg mb-1">Bank Rates</h3>
                <p className="text-muted-foreground text-sm mb-5">Compare savings rates across 20+ banks side-by-side.</p>
                {/* Mini bank comparison */}
                <div className="space-y-2">
                  {[
                    { bank: 'Meezan', rate: '18.5%' },
                    { bank: 'HBL', rate: '17.2%' },
                    { bank: 'MCB', rate: '16.8%' },
                  ].map(b => (
                    <div key={b.bank} className="flex items-center justify-between py-1.5 px-2.5 rounded-md bg-muted/15 border border-border/20">
                      <span className="text-[11px] font-medium">{b.bank}</span>
                      <span className="text-[11px] font-bold text-blue-500">{b.rate}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Card 4 — AI News (4 cols) */}
            <Reveal delay={160} className="md:col-span-4">
              <div className="group h-full rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-6 hover:border-violet-500/30 transition-all duration-300 hover:shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-violet-500/[0.06] to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex flex-col sm:flex-row gap-6">
                  <div className="flex-1">
                    <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-3">
                      <Newspaper className="h-5 w-5 text-violet-500" />
                    </div>
                    <h3 className="font-bold text-lg mb-1">AI-Powered News</h3>
                    <p className="text-muted-foreground text-sm">Curated financial news with AI sentiment analysis. Know instantly what&apos;s bullish, bearish, or neutral.</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[
                      { title: 'PSX gains 380 points on strong buying', sentiment: 'Bullish', color: 'text-emerald-500 bg-emerald-500/10' },
                      { title: 'SBP keeps policy rate unchanged', sentiment: 'Neutral', color: 'text-amber-500 bg-amber-500/10' },
                      { title: 'Cement sector faces demand slowdown', sentiment: 'Bearish', color: 'text-red-500 bg-red-500/10' },
                    ].map(n => (
                      <div key={n.title} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/10 border border-border/20">
                        <Badge variant="secondary" className={cn('text-[9px] px-1.5 py-0 h-4 shrink-0 font-medium', n.color)}>{n.sentiment}</Badge>
                        <span className="text-[11px] leading-tight">{n.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Card 5 — Portfolio (3 cols) */}
            <Reveal delay={200} className="md:col-span-3">
              <div className="group h-full rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-6 hover:border-rose-500/30 transition-all duration-300 hover:shadow-lg">
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center mb-3">
                  <PieChart className="h-5 w-5 text-rose-500" />
                </div>
                <h3 className="font-bold text-lg mb-1">Portfolio Analytics</h3>
                <p className="text-muted-foreground text-sm mb-5">Visualize allocation across all asset classes. Track gains, losses, and total performance.</p>
                {/* Donut-esque visual */}
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 shrink-0">
                    <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                      <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3" className="stroke-muted/30" />
                      <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3" strokeDasharray="50 100" className="stroke-emerald-500" strokeLinecap="round" />
                      <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3" strokeDasharray="25 100" strokeDashoffset="-50" className="stroke-amber-500" strokeLinecap="round" />
                      <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3" strokeDasharray="25 100" strokeDashoffset="-75" className="stroke-blue-500" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span>Stocks <span className="text-muted-foreground">50%</span></span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500" /><span>Gold <span className="text-muted-foreground">25%</span></span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /><span>Banks <span className="text-muted-foreground">25%</span></span></div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Card 6 — Alerts (3 cols) */}
            <Reveal delay={240} className="md:col-span-3">
              <div className="group h-full rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-6 hover:border-cyan-500/30 transition-all duration-300 hover:shadow-lg">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-3">
                  <BellRing className="h-5 w-5 text-cyan-500" />
                </div>
                <h3 className="font-bold text-lg mb-1">Smart Alerts</h3>
                <p className="text-muted-foreground text-sm mb-5">Custom price alerts for any stock or commodity. Get notified the moment prices hit your targets.</p>
                {/* Alert mockups */}
                <div className="space-y-2">
                  {[
                    { asset: 'OGDC', cond: 'above Rs. 130', active: true },
                    { asset: 'Gold 24K', cond: 'below Rs. 230K', active: true },
                    { asset: 'HBL', cond: 'above Rs. 95', active: false },
                  ].map(a => (
                    <div key={a.asset} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/10 border border-border/20">
                      <div>
                        <p className="text-[11px] font-semibold">{a.asset}</p>
                        <p className="text-[10px] text-muted-foreground">{a.cond}</p>
                      </div>
                      <div className={cn('h-2 w-2 rounded-full', a.active ? 'bg-cyan-500' : 'bg-muted-foreground/30')} />
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-16 md:py-24">
        <div className="max-w-[1120px] mx-auto px-5">
          <Reveal>
            <div className="text-center max-w-lg mx-auto mb-12 space-y-3">
              <p className="text-primary text-[12px] font-semibold uppercase tracking-wider">FAQ</p>
              <h2 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-tight">
                Common questions
              </h2>
            </div>
          </Reveal>

          <Reveal delay={60}>
            <div className="max-w-2xl mx-auto">
              <Accordion type="single" collapsible>
                {faqs.map((f, i) => (
                  <AccordionItem key={i} value={`q-${i}`} className="border-border/30">
                    <AccordionTrigger className="text-left text-[15px] font-semibold hover:no-underline py-4">{f.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="pb-16 md:pb-24">
        <div className="max-w-[1120px] mx-auto px-5">
          <Reveal>
            <div className="relative rounded-3xl overflow-hidden border border-border/40 bg-card">
              <div className="grid md:grid-cols-2 items-center">
                {/* Left — text */}
                <div className="px-8 py-12 md:px-12 md:py-16 space-y-4">
                  <p className="text-primary text-xs font-semibold uppercase tracking-wider">Get started today</p>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                    Start tracking your<br />investments for free.
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
                    Join Pakistani investors who use GrowMore to monitor stocks, gold, and bank deposits — all in one place.
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <Link href="/register">
                      <Button className="rounded-full h-11 px-7 font-semibold gap-2">
                        Create Free Account <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button variant="ghost" className="rounded-full h-11 px-5 text-muted-foreground hover:text-foreground font-medium">
                        Sign In
                      </Button>
                    </Link>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 pt-1">No credit card required · Free forever</p>
                </div>
                {/* Right — decorative mosaic */}
                <div className="hidden md:block relative h-full min-h-[320px]">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
                  <div className="absolute inset-0 p-8 grid grid-cols-2 gap-3">
                    {/* Mini stat cards */}
                    <div className="rounded-2xl bg-primary/10 border border-primary/15 p-5 flex flex-col justify-between">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-[22px] font-bold tracking-tight">500+</p>
                        <p className="text-[11px] text-muted-foreground">PSX Stocks</p>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-amber-500/10 border border-amber-500/15 p-5 flex flex-col justify-between">
                      <Gem className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="text-[22px] font-bold tracking-tight">Live</p>
                        <p className="text-[11px] text-muted-foreground">Gold & Silver</p>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-blue-500/10 border border-blue-500/15 p-5 flex flex-col justify-between">
                      <Building2 className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-[22px] font-bold tracking-tight">20+</p>
                        <p className="text-[11px] text-muted-foreground">Banks Compared</p>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-violet-500/10 border border-violet-500/15 p-5 flex flex-col justify-between">
                      <BellRing className="h-5 w-5 text-violet-500" />
                      <div>
                        <p className="text-[22px] font-bold tracking-tight">Instant</p>
                        <p className="text-[11px] text-muted-foreground">Smart Alerts</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/30">
        <div className="max-w-[1120px] mx-auto px-5 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-2">
                <div className="bg-primary/10 p-1.5 rounded-lg"><Leaf className="h-4 w-4 text-primary" /></div>
                <span className="font-bold text-sm tracking-tight">GrowMore</span>
              </Link>
              <p className="text-xs text-muted-foreground max-w-xs">Track PSX stocks, gold prices, and bank deposit rates — all in one platform built for Pakistan.</p>
            </div>
            <div className="flex gap-8 text-[13px]">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Product</p>
                {navLinks.map(l => (
                  <button key={l} onClick={() => go(l.toLowerCase())} className="block text-muted-foreground hover:text-foreground transition-colors">{l}</button>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Account</p>
                <Link href="/login" className="block text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
                <Link href="/register" className="block text-muted-foreground hover:text-foreground transition-colors">Register</Link>
              </div>
            </div>
          </div>
          <Separator className="opacity-30" />
          <div className="flex items-center justify-between pt-6 text-[11px] text-muted-foreground">
            <span>&copy; {new Date().getFullYear()} GrowMore</span>
            <Badge variant="outline" className="text-[9px] font-medium h-5">Made in Pakistan</Badge>
          </div>
        </div>
      </footer>
    </div>
  );
}
