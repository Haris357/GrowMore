'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
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
import { BrandLogo } from '@/components/brand-logo';
import {
  BarChart3,
  Gem,
  Bitcoin,
  Newspaper,
  PieChart,
  ArrowRight,
  Menu,
  X,
  Moon,
  Sun,
  Check,
  Shield,
  Sparkles,
  ChevronRight,
  Zap,
  Globe,
  Layers,
  Brain,
  Play,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

// ─── Reveal hook ─────────────────────────────────────────────────────────────

function useOnScreen(ref: React.RefObject<Element>, once = true) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
        else if (!once) setVisible(false);
      },
      { threshold: 0.1 }
    );
    const el = ref.current;
    if (el) obs.observe(el);
    return () => { if (el) obs.unobserve(el); };
  }, [ref, once]);
  return visible;
}

type RevealDir = 'up' | 'left' | 'right' | 'fade';
function Reveal({ children, delay = 0, dir = 'up', className }: {
  children: React.ReactNode; delay?: number; dir?: RevealDir; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(ref);
  const offset = !visible
    ? dir === 'up'
      ? 'translate-y-6 opacity-0'
      : dir === 'left'
        ? '-translate-x-6 opacity-0'
        : dir === 'right'
          ? 'translate-x-6 opacity-0'
          : 'opacity-0'
    : 'translate-y-0 translate-x-0 opacity-100';
  return (
    <div
      ref={ref}
      className={cn(
        'transition-[transform,opacity] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
        offset,
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >{children}</div>
  );
}

// ─── Logo ────────────────────────────────────────────────────────────────────

function Logo({ size = 24 }: { size?: number }) {
  return (
    <div className="relative transition-transform duration-300 group-hover:scale-110">
      <BrandLogo className="text-primary" style={{ height: size, width: size }} />
    </div>
  );
}

// ─── Live pulse dot ─────────────────────────────────────────────────────────

function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex h-2 w-2', className)}>
      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
}

// ─── Marquee ticker ─────────────────────────────────────────────────────────

const tickerItems = [
  { s: 'KSE-100', p: '78,420', c: '+1.24%', up: true },
  { s: 'OGDC', p: '124.50', c: '+2.40%', up: true },
  { s: 'GOLD 24K', p: '232,140', c: '+0.80%', up: true },
  { s: 'BTC', p: '67,420', c: '+1.80%', up: true },
  { s: 'HBL', p: '89.30', c: '-0.80%', up: false },
  { s: 'SILVER', p: '2,810', c: '+1.40%', up: true },
  { s: 'ETH', p: '3,540', c: '+2.40%', up: true },
  { s: 'LUCK', p: '567.80', c: '+3.10%', up: true },
  { s: 'PSO', p: '210.15', c: '-1.20%', up: false },
  { s: 'SOL', p: '182', c: '-0.60%', up: false },
  { s: 'EFERT', p: '95.20', c: '+1.60%', up: true },
  { s: 'BNB', p: '612', c: '+0.90%', up: true },
];

function Marquee() {
  const items = useMemo(() => [...tickerItems, ...tickerItems], []);
  return (
    <div className="relative overflow-hidden border-y border-border/40 bg-background/60 backdrop-blur-sm py-3">
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      <div className="flex animate-[marquee_45s_linear_infinite] whitespace-nowrap">
        {items.map((t, i) => (
          <div key={i} className="flex items-center gap-2 px-6 text-[12.5px]">
            <span className="font-bold tracking-wide text-foreground/90">{t.s}</span>
            <span className="text-muted-foreground tabular-nums">{t.p}</span>
            <span className={cn('font-semibold tabular-nums', t.up ? 'text-emerald-500' : 'text-red-500')}>
              {t.c}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────

type DemoKey = 'stocks' | 'commodities' | 'crypto' | 'portfolio' | 'news';

const demoTabs: { key: DemoKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'stocks', label: 'Stocks', icon: BarChart3 },
  { key: 'commodities', label: 'Commodities', icon: Gem },
  { key: 'crypto', label: 'Crypto', icon: Bitcoin },
  { key: 'portfolio', label: 'Portfolio', icon: PieChart },
  { key: 'news', label: 'GrowNews', icon: Newspaper },
];

const products = [
  {
    icon: BarChart3,
    color: 'emerald',
    title: 'Stocks',
    tag: 'PSX, decoded',
    desc: 'Real-time prices, fundamentals, and a screener that handles complex filters in one click. No clunky terminal energy.',
    points: ['Live PSX feed', 'Server-side screener', 'Fundamentals & charts'],
  },
  {
    icon: Gem,
    color: 'amber',
    title: 'Commodities',
    tag: 'Gold & silver, explained',
    desc: 'Live local prices for gold and silver, paired with an AI commentary that tells you why the chart moved — not just that it did.',
    points: ['24K & 22K gold', 'Live silver pricing', 'AI market commentary'],
  },
  {
    icon: Bitcoin,
    color: 'orange',
    title: 'Crypto',
    tag: 'Beside everything else',
    desc: 'BTC, ETH, SOL, and the rest of the majors — on the same screen as your stocks and gold. Finally.',
    points: ['Top coins by market cap', 'Live price & change', 'Unified watchlist'],
  },
  {
    icon: PieChart,
    color: 'rose',
    title: 'Portfolio',
    tag: 'All of it, allocated',
    desc: 'See your real exposure across stocks, gold, silver, crypto, and cash. Spot the gap before it costs you.',
    points: ['Multi-asset allocation', 'P&L tracking', 'Goals & watchlists'],
  },
  {
    icon: Newspaper,
    color: 'violet',
    title: 'GrowNews',
    tag: 'The newsroom, for you',
    desc: 'Finance feeds aggregated, scored for sentiment, and summarized into a single morning brief. Wake up informed.',
    points: ['Curated RSS network', 'AI sentiment scores', 'Daily market brief'],
  },
];

const why = [
  {
    icon: Layers,
    title: 'Every market, one screen',
    desc: 'Stop bouncing between five apps and three Telegram groups. Your watchlists live where your portfolio lives.',
  },
  {
    icon: Brain,
    title: 'AI that explains, not predicts',
    desc: 'We use AI for what it is actually good at — summarizing news, scoring sentiment, surfacing context. Not fortune-telling.',
  },
  {
    icon: Globe,
    title: 'Built locally, on purpose',
    desc: 'PSX-native. Local commodity feeds. Designed around how investing actually works in Pakistan.',
  },
];

const steps = [
  { n: '01', title: 'Sign up', desc: 'Email, password, done. No card. No brokerage credentials. No nonsense.' },
  { n: '02', title: 'Build your watchlists', desc: 'Add the tickers, coins, and commodities you actually care about. Set alerts on your levels.' },
  { n: '03', title: 'Open the dashboard', desc: 'Prices, sentiment, news, and your portfolio — together. Decide. Move on with your day.' },
];

const faqs = [
  { q: 'What does GrowMore actually cover?', a: 'A single dashboard for PSX stocks, gold and silver commodities, major cryptocurrencies, your full portfolio across all of those, and a curated finance news network with AI sentiment.' },
  { q: 'Is it free?', a: 'Yes. The core platform is free forever. Track stocks, commodities, crypto, build watchlists, and read the AI news brief without paying.' },
  { q: 'Where does the data come from?', a: 'Stock data from the PSX. Gold and silver from market feeds. Crypto from public market data. News from public RSS feeds, analyzed with AI.' },
  { q: 'Do you connect to my broker or bank?', a: 'No. GrowMore is a tracking and analytics platform. We never ask for brokerage credentials or bank logins. You enter holdings manually for portfolio analytics.' },
  { q: 'Is the AI making predictions I should trade on?', a: 'No. The AI summarizes news, scores sentiment, and explains context. It is decision support, not a trading signal. You make the call.' },
  { q: 'Mobile app?', a: 'The web app is fully responsive and works great on phones. Native iOS and Android apps are on the roadmap.' },
];

const navLinks = ['Products', 'Demo', 'How it works', 'FAQ'];

// ─── Demo panels ─────────────────────────────────────────────────────────────

function Sparkline({ up, animate }: { up: boolean; animate?: boolean }) {
  const d = up ? 'M0,16 L12,12 L24,14 L36,8 L48,5 L60,2' : 'M0,4 L12,8 L24,6 L36,12 L48,15 L60,17';
  return (
    <svg viewBox="0 0 60 20" className="w-14 h-5" fill="none">
      <path
        d={d}
        stroke={up ? 'hsl(160,73%,46%)' : 'hsl(0,72%,55%)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="200"
        style={animate ? { animation: 'draw-line 1.4s ease-out forwards' } : undefined}
      />
    </svg>
  );
}

function DemoStocks() {
  const rows = [
    { s: 'OGDC', n: 'Oil & Gas Dev', p: '124.50', c: '+2.4%', v: '12.3M', up: true },
    { s: 'LUCK', n: 'Lucky Cement', p: '567.80', c: '+3.1%', v: '5.4M', up: true },
    { s: 'HBL', n: 'Habib Bank', p: '89.30', c: '-0.8%', v: '8.1M', up: false },
    { s: 'EFERT', n: 'Engro Fert', p: '95.20', c: '+1.6%', v: '6.7M', up: true },
    { s: 'PSO', n: 'Pak State Oil', p: '210.15', c: '-1.2%', v: '4.9M', up: false },
  ];
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Screener</p>
          <h4 className="text-sm font-semibold">PSX — Top movers today</h4>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <LiveDot /> Market open
        </div>
      </div>
      <div className="rounded-lg border border-border/40 overflow-hidden">
        <div className="grid grid-cols-12 text-[10px] font-medium text-muted-foreground px-4 py-2 border-b border-border/30 bg-muted/20">
          <span className="col-span-3">Symbol</span>
          <span className="col-span-3">Price</span>
          <span className="col-span-2">Change</span>
          <span className="col-span-2">Volume</span>
          <span className="col-span-2 text-right">Trend</span>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.s}
            className="grid grid-cols-12 items-center text-[12px] px-4 py-2.5 border-b border-border/20 last:border-0 hover:bg-muted/15 transition-colors opacity-0"
            style={{ animation: `fade-up 0.5s ease-out ${i * 60}ms forwards` }}
          >
            <div className="col-span-3 flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-muted/40 flex items-center justify-center text-[9px] font-bold">{r.s.slice(0, 2)}</div>
              <div>
                <p className="font-semibold leading-none">{r.s}</p>
                <p className="text-[10px] text-muted-foreground">{r.n}</p>
              </div>
            </div>
            <span className="col-span-3 font-medium tabular-nums">Rs. {r.p}</span>
            <span className={cn('col-span-2 font-semibold tabular-nums', r.up ? 'text-emerald-500' : 'text-red-500')}>{r.c}</span>
            <span className="col-span-2 text-muted-foreground tabular-nums">{r.v}</span>
            <div className="col-span-2 flex justify-end">
              <Sparkline up={r.up} animate />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DemoCommodities() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Gold 24K · 10g', value: 'Rs. 232,140', change: '+0.8%', up: true, bar: '88%' },
          { label: 'Silver · 10g', value: 'Rs. 2,810', change: '+1.4%', up: true, bar: '62%' },
        ].map((c, i) => (
          <div
            key={c.label}
            className="rounded-lg border border-border/40 bg-muted/15 p-4 opacity-0"
            style={{ animation: `fade-up 0.5s ease-out ${i * 100}ms forwards` }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground">{c.label}</p>
              <Gem className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-xl font-bold tracking-tight tabular-nums">{c.value}</p>
            <p className={cn('text-[11px] font-semibold mt-0.5', c.up ? 'text-emerald-500' : 'text-red-500')}>{c.change} today</p>
            <div className="h-1 mt-3 bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500/60 rounded-full"
                style={{ width: '0%', animation: `grow-bar 1s ease-out ${300 + i * 100}ms forwards`, ['--w' as any]: c.bar }}
              />
            </div>
          </div>
        ))}
      </div>
      <div
        className="rounded-lg border border-border/40 p-4 opacity-0"
        style={{ animation: 'fade-up 0.5s ease-out 250ms forwards' }}
      >
        <div className="flex items-start gap-3">
          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="text-[12px] font-semibold">AI Market Brief</p>
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-primary/10 text-primary border-0">Live</Badge>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Gold extended gains as the dollar weakened on softer US inflation data. Silver outperformed on industrial demand. Watch resistance near recent highs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoCrypto() {
  const rows = [
    { s: 'BTC', n: 'Bitcoin', p: '$67,420', c: '+1.8%', cap: '$1.32T', up: true },
    { s: 'ETH', n: 'Ethereum', p: '$3,540', c: '+2.4%', cap: '$425B', up: true },
    { s: 'SOL', n: 'Solana', p: '$182', c: '-0.6%', cap: '$84B', up: false },
    { s: 'BNB', n: 'BNB', p: '$612', c: '+0.9%', cap: '$92B', up: true },
  ];
  return (
    <div className="p-4 md:p-6 space-y-3">
      {rows.map((r, i) => (
        <div
          key={r.s}
          className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/10 px-4 py-3 hover:border-orange-500/30 transition-colors opacity-0"
          style={{ animation: `fade-up 0.5s ease-out ${i * 80}ms forwards` }}
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-orange-500/10 flex items-center justify-center text-[10px] font-bold text-orange-500">{r.s}</div>
            <div>
              <p className="text-[13px] font-semibold leading-none">{r.n}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Mkt cap {r.cap}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Sparkline up={r.up} animate />
            <div className="text-right">
              <p className="text-[13px] font-semibold leading-none tabular-nums">{r.p}</p>
              <p className={cn('text-[11px] font-semibold mt-1 tabular-nums', r.up ? 'text-emerald-500' : 'text-red-500')}>{r.c}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DemoPortfolio() {
  const rows = [
    { color: 'bg-emerald-500', label: 'Stocks', pct: '48%', sub: 'PSX equities', dash: '48 100', off: '0' },
    { color: 'bg-amber-500', label: 'Gold & Silver', pct: '22%', sub: 'Commodities', dash: '22 100', off: '-48' },
    { color: 'bg-orange-500', label: 'Crypto', pct: '20%', sub: 'BTC, ETH, SOL', dash: '20 100', off: '-70' },
    { color: 'bg-blue-500', label: 'Cash', pct: '10%', sub: 'Reserves', dash: '10 100', off: '-90' },
  ];
  return (
    <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-5 gap-4">
      <div
        className="md:col-span-2 rounded-lg border border-border/40 p-4 flex flex-col items-center justify-center opacity-0"
        style={{ animation: 'fade-up 0.5s ease-out forwards' }}
      >
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Allocation</p>
        <div className="relative h-32 w-32">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            <circle cx="18" cy="18" r="14" fill="none" strokeWidth="4" className="stroke-muted/30" />
            {rows.map((r, i) => (
              <circle
                key={r.label}
                cx="18"
                cy="18"
                r="14"
                fill="none"
                strokeWidth="4"
                strokeDasharray={r.dash}
                strokeDashoffset={r.off}
                strokeLinecap="round"
                className={r.color.replace('bg-', 'stroke-')}
                style={{ animation: `donut-in 1s ease-out ${i * 150}ms backwards` }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[9px] text-muted-foreground">Total</p>
            <p className="text-sm font-bold">Diversified</p>
          </div>
        </div>
      </div>
      <div className="md:col-span-3 space-y-2">
        {rows.map((a, i) => (
          <div
            key={a.label}
            className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/10 px-4 py-2.5 opacity-0"
            style={{ animation: `fade-up 0.5s ease-out ${i * 80 + 100}ms forwards` }}
          >
            <div className="flex items-center gap-3">
              <div className={cn('h-2.5 w-2.5 rounded-full', a.color)} />
              <div>
                <p className="text-[12px] font-semibold leading-none">{a.label}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{a.sub}</p>
              </div>
            </div>
            <p className="text-[13px] font-bold tabular-nums">{a.pct}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DemoNews() {
  const items = [
    { title: 'PSX gains 380 points on strong institutional buying', src: 'Business Recorder', tag: 'Bullish', tone: 'text-emerald-600 bg-emerald-500/10' },
    { title: 'SBP keeps policy rate unchanged at 12%', src: 'Dawn', tag: 'Neutral', tone: 'text-amber-600 bg-amber-500/10' },
    { title: 'Bitcoin breaks above resistance as ETF inflows accelerate', src: 'CoinDesk', tag: 'Bullish', tone: 'text-emerald-600 bg-emerald-500/10' },
    { title: 'Cement sector faces demand slowdown into Q2', src: 'The News', tag: 'Bearish', tone: 'text-red-600 bg-red-500/10' },
  ];
  return (
    <div className="p-4 md:p-6 space-y-3">
      <div
        className="rounded-lg border border-primary/30 bg-primary/[0.04] p-4 opacity-0"
        style={{ animation: 'fade-up 0.5s ease-out forwards' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Daily Market Brief</p>
        </div>
        <p className="text-[12px] leading-relaxed text-foreground/85">
          KSE-100 closed higher led by oil and cement names. Gold steady on softer dollar. Crypto majors firm with BTC reclaiming a key level. Watch policy commentary tomorrow.
        </p>
      </div>
      <div className="space-y-2">
        {items.map((n, i) => (
          <div
            key={n.title}
            className="flex items-start gap-3 rounded-lg border border-border/40 px-4 py-3 hover:bg-muted/15 hover:border-primary/30 transition-colors opacity-0"
            style={{ animation: `fade-up 0.5s ease-out ${100 + i * 80}ms forwards` }}
          >
            <Badge variant="secondary" className={cn('text-[9px] px-1.5 py-0 h-4 shrink-0 font-semibold border-0 mt-0.5', n.tone)}>{n.tag}</Badge>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold leading-snug">{n.title}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{n.src}</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDemo, setActiveDemo] = useState<DemoKey>('stocks');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16);
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
          background: linear-gradient(120deg, hsl(160 83% 35%) 0%, hsl(160 73% 50%) 50%, hsl(160 70% 60%) 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer-text 8s ease-in-out infinite;
        }
        .dark .text-grad {
          background: linear-gradient(120deg, hsl(160 73% 52%) 0%, hsl(160 80% 64%) 50%, hsl(150 70% 70%) 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer-text 8s ease-in-out infinite;
        }
        .grid-bg {
          background-size: 56px 56px;
          background-image:
            linear-gradient(hsl(var(--border) / 0.35) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border) / 0.35) 1px, transparent 1px);
          mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 80%);
        }
        .aurora-blob {
          will-change: transform;
        }
        .magnetic-btn {
          position: relative;
          overflow: hidden;
        }
        .magnetic-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, transparent 30%, hsl(var(--primary) / 0.4) 50%, transparent 70%);
          transform: translateX(-100%);
          transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .magnetic-btn:hover::before {
          transform: translateX(100%);
        }
        .card-hover {
          transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s, border-color 0.3s;
        }
        .card-hover:hover {
          transform: translateY(-4px);
        }
        .icon-spin-on-hover {
          transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .group:hover .icon-spin-on-hover {
          transform: rotate(8deg) scale(1.1);
        }
        @keyframes aurora-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(80px, -50px) scale(1.15); }
          66% { transform: translate(-60px, 40px) scale(0.9); }
        }
        @keyframes aurora-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-90px, 60px) scale(1.2); }
        }
        @keyframes shimmer-text {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes draw-line {
          from { stroke-dashoffset: 200; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes grow-bar {
          from { width: 0%; }
          to { width: var(--w); }
        }
        @keyframes donut-in {
          from { stroke-dasharray: 0 100; }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes float-slower {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(8px) rotate(-2deg); }
        }
        .float-slow { animation: float-slow 6s ease-in-out infinite; }
        .float-slower { animation: float-slower 7s ease-in-out 1.5s infinite; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* Liquid-glass ambient background */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-gradient-to-b from-background via-background to-primary/[0.04]">
        <div className="absolute -top-40 -left-32 h-[38rem] w-[38rem] rounded-full bg-primary/[0.18] blur-3xl animate-blob" />
        <div className="absolute top-[45%] -right-40 h-[40rem] w-[40rem] rounded-full bg-emerald-400/[0.13] blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/3 h-[34rem] w-[34rem] rounded-full bg-teal-400/[0.12] blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <header className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-card/55 backdrop-blur-2xl backdrop-saturate-150 border-b border-border/50 shadow-lg shadow-black/[0.06]'
          : ''
      )}>
        <div className="max-w-[1200px] mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-2.5">
            <Logo size={22} />
            <span className="font-bold text-[16px] tracking-tight">GrowMore</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <button
                key={l}
                onClick={() => go(l.toLowerCase().replace(/\s+/g, '-'))}
                className="relative px-3.5 py-1.5 text-[13.5px] text-muted-foreground hover:text-foreground rounded-md transition-colors font-medium group"
              >
                <span className="relative z-10">{l}</span>
                <span className="absolute inset-0 bg-muted/50 rounded-md scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300" />
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-md hover:bg-muted/50 transition-all hover:rotate-12"
              aria-label="Theme"
            >
              {mounted && (
                <>
                  <Sun className="h-4 w-4 hidden dark:block" />
                  <Moon className="h-4 w-4 dark:hidden" />
                </>
              )}
            </button>
            <Link href="/login"><Button variant="ghost" size="sm" className="text-[13.5px] h-9 font-medium">Sign in</Button></Link>
            <Link href="/register">
              <Button size="sm" className="magnetic-btn text-[13.5px] h-9 px-5 font-semibold gap-1.5 rounded-md shadow-sm shadow-primary/30 hover:shadow-md hover:shadow-primary/40 transition-all">
                Get started <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <button className="md:hidden p-2 rounded-md hover:bg-muted/50" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-b border-border/40 bg-background/95 backdrop-blur-xl">
            <div className="max-w-[1200px] mx-auto px-5 py-3 space-y-1">
              {navLinks.map(l => (
                <button
                  key={l}
                  onClick={() => go(l.toLowerCase().replace(/\s+/g, '-'))}
                  className="block w-full text-left px-3 py-2 text-[14px] text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50"
                >{l}</button>
              ))}
              <Separator className="my-2" />
              <div className="flex gap-2">
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-md hover:bg-muted/50">
                  {mounted && (
                    <>
                      <Sun className="h-4 w-4 hidden dark:block" />
                      <Moon className="h-4 w-4 dark:hidden" />
                    </>
                  )}
                </button>
                <Link href="/login" className="flex-1"><Button variant="outline" size="sm" className="w-full text-[13.5px]">Sign in</Button></Link>
                <Link href="/register" className="flex-1"><Button size="sm" className="w-full text-[13.5px]">Get started</Button></Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 md:pt-40 pb-12 md:pb-16">
        <div className="absolute inset-0 grid-bg pointer-events-none" />

        <div className="max-w-[1200px] mx-auto px-5 relative">
          <div className="max-w-[820px] mx-auto text-center space-y-6">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/25 bg-primary/[0.06] text-primary text-[11px] font-semibold uppercase tracking-wider hover:scale-105 transition-transform">
                <Sparkles className="h-3 w-3" /> Pakistan&apos;s home for serious investors
              </div>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="text-[2.75rem] sm:text-[3.5rem] md:text-[4.5rem] font-bold tracking-tight leading-[1.02]">
                Track everything.<br />
                <span className="text-grad">Miss nothing.</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-muted-foreground text-base sm:text-[17px] leading-relaxed max-w-[620px] mx-auto">
                PSX stocks, gold, silver, crypto, and your full portfolio — together with an AI news desk that tells you what actually matters today.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link href="/register">
                  <Button className="magnetic-btn group h-12 px-7 text-[14px] font-semibold gap-2 rounded-md shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all w-full sm:w-auto">
                    Start free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="group h-12 px-7 text-[14px] font-semibold rounded-md hover:bg-muted/50 hover:border-primary/40 transition-all w-full sm:w-auto"
                  onClick={() => go('demo')}
                >
                  <Play className="h-3.5 w-3.5 mr-2 fill-current transition-transform group-hover:scale-110" />
                  Watch the demo
                </Button>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12.5px] text-muted-foreground pt-2">
                {['Free forever', 'Real-time data', 'No card', 'No broker logins'].map(t => (
                  <span key={t} className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-primary" />{t}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Live ticker ──────────────────────────────────────────────────────── */}
      <Reveal delay={100}>
        <Marquee />
      </Reveal>

      {/* ── Product Demo ─────────────────────────────────────────────────────── */}
      <section id="demo" className="relative py-16 md:py-24">
        <div className="max-w-[1200px] mx-auto px-5">
          <Reveal>
            <div className="text-center max-w-xl mx-auto mb-10 space-y-3">
              <p className="text-primary text-[12px] font-semibold uppercase tracking-wider">See it in action</p>
              <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight leading-[1.05]">
                Not a screenshot.<br />
                <span className="text-grad">Click around.</span>
              </h2>
              <p className="text-muted-foreground text-[15px] pt-1">
                Five tools, one tab away. Pick a product to preview.
              </p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="relative">
              <div className="absolute -inset-6 bg-primary/[0.05] rounded-[2rem] blur-3xl pointer-events-none" />

              <div className="relative rounded-2xl border border-border/50 bg-card/70 backdrop-blur-2xl backdrop-saturate-150 shadow-2xl overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/20">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/60 hover:bg-red-400 transition-colors cursor-pointer" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60 hover:bg-amber-400 transition-colors cursor-pointer" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/60 hover:bg-green-400 transition-colors cursor-pointer" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 bg-background/60 rounded-md px-3 py-1 border border-border/40 transition-all">
                      <Shield className="h-3 w-3" />
                      <span className="transition-all">growmore.pk/{activeDemo}</span>
                    </div>
                  </div>
                </div>

                {/* Tab strip */}
                <div className="flex items-center gap-1 px-3 py-2 border-b border-border/40 bg-background overflow-x-auto">
                  {demoTabs.map(t => {
                    const Icon = t.icon;
                    const active = activeDemo === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setActiveDemo(t.key)}
                        className={cn(
                          'relative flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium rounded-md transition-all whitespace-nowrap',
                          active
                            ? 'text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {active && (
                          <span className="absolute inset-0 bg-primary/10 rounded-md" />
                        )}
                        <Icon className={cn('h-3.5 w-3.5 relative z-10 transition-transform', active && 'scale-110')} />
                        <span className="relative z-10">{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Panel — keyed for animation re-trigger */}
                <div key={activeDemo} className="min-h-[420px] bg-background animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {activeDemo === 'stocks' && <DemoStocks />}
                  {activeDemo === 'commodities' && <DemoCommodities />}
                  {activeDemo === 'crypto' && <DemoCrypto />}
                  {activeDemo === 'portfolio' && <DemoPortfolio />}
                  {activeDemo === 'news' && <DemoNews />}
                </div>
              </div>

              {/* Floating decorative chips */}
              <div className="absolute -top-4 -right-2 md:-right-8 float-slow z-10 hidden sm:block">
                <div className="glass-panel rounded-lg shadow-xl px-3 py-1.5 flex items-center gap-2">
                  <LiveDot />
                  <span className="text-[10.5px] font-semibold">Live data</span>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-2 md:-left-8 float-slower z-10 hidden sm:block">
                <div className="glass-panel rounded-lg shadow-xl px-3 py-1.5 flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-2.5 w-2.5 text-primary" />
                  </div>
                  <span className="text-[10.5px] font-semibold">AI-powered</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Products ─────────────────────────────────────────────────────────── */}
      <section id="products" className="relative py-16 md:py-24">
        <div className="max-w-[1200px] mx-auto px-5">
          <Reveal>
            <div className="max-w-2xl mb-12 space-y-2">
              <p className="text-primary text-[12px] font-semibold uppercase tracking-wider">What you get</p>
              <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight leading-[1.05]">
                Five tools.<br />
                <span className="text-grad">Acts like one.</span>
              </h2>
              <p className="text-muted-foreground text-[15px] max-w-lg pt-1">
                Each product stands alone. Together, they replace half your tabs.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p, i) => {
              const Icon = p.icon;
              const colorMap: Record<string, { bg: string; border: string; glow: string }> = {
                emerald: { bg: 'bg-emerald-500/10 text-emerald-500', border: 'hover:border-emerald-500/40', glow: 'group-hover:shadow-emerald-500/10' },
                amber: { bg: 'bg-amber-500/10 text-amber-500', border: 'hover:border-amber-500/40', glow: 'group-hover:shadow-amber-500/10' },
                orange: { bg: 'bg-orange-500/10 text-orange-500', border: 'hover:border-orange-500/40', glow: 'group-hover:shadow-orange-500/10' },
                rose: { bg: 'bg-rose-500/10 text-rose-500', border: 'hover:border-rose-500/40', glow: 'group-hover:shadow-rose-500/10' },
                violet: { bg: 'bg-violet-500/10 text-violet-500', border: 'hover:border-violet-500/40', glow: 'group-hover:shadow-violet-500/10' },
              };
              const c = colorMap[p.color];
              return (
                <Reveal key={p.title} delay={i * 70}>
                  <div className={cn(
                    'group card-hover h-full rounded-2xl border border-border/50 bg-card/45 backdrop-blur-xl backdrop-saturate-150 p-6 hover:shadow-xl',
                    c.border, c.glow
                  )}>
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center', c.bg)}>
                        <Icon className="h-5 w-5 icon-spin-on-hover" />
                      </div>
                      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity">{p.tag}</span>
                    </div>
                    <h3 className="font-bold text-lg mb-2">{p.title}</h3>
                    <p className="text-muted-foreground text-[13.5px] leading-relaxed mb-4">{p.desc}</p>
                    <ul className="space-y-1.5">
                      {p.points.map(pt => (
                        <li key={pt} className="flex items-center gap-2 text-[12.5px] text-foreground/80">
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why GrowMore ─────────────────────────────────────────────────────── */}
      <section className="relative py-16 md:py-24 bg-muted/20 border-y border-border/40 overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" />
        <div className="max-w-[1200px] mx-auto px-5 relative">
          <Reveal>
            <div className="max-w-2xl mb-12 space-y-2">
              <p className="text-primary text-[12px] font-semibold uppercase tracking-wider">Why GrowMore</p>
              <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight leading-[1.05]">
                We built the tool<br />
                <span className="text-grad">we wanted to use.</span>
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {why.map((w, i) => {
              const Icon = w.icon;
              return (
                <Reveal key={w.title} delay={i * 100} dir={i === 0 ? 'left' : i === 2 ? 'right' : 'up'}>
                  <div className="group card-hover h-full rounded-2xl bg-card/45 backdrop-blur-xl backdrop-saturate-150 border border-border/50 p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5 text-primary icon-spin-on-hover" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{w.title}</h3>
                    <p className="text-muted-foreground text-[13.5px] leading-relaxed">{w.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 md:py-24">
        <div className="max-w-[1200px] mx-auto px-5">
          <Reveal>
            <div className="text-center max-w-xl mx-auto mb-14 space-y-2">
              <p className="text-primary text-[12px] font-semibold uppercase tracking-wider">From zero to insight</p>
              <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight leading-[1.05]">
                Live in <span className="text-grad">three steps.</span>
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 relative">
            <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <div className="relative bg-background group">
                  <div className="relative h-16 w-16 rounded-2xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center mx-auto mb-5 z-10 transition-all duration-300 group-hover:scale-110 group-hover:ring-primary/40 group-hover:shadow-lg group-hover:shadow-primary/20">
                    <span className="text-primary font-bold text-base tabular-nums">{s.n}</span>
                    <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-center space-y-2 px-2">
                    <h3 className="font-semibold text-[17px]">{s.title}</h3>
                    <p className="text-muted-foreground text-[13.5px] leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-16 md:py-24 border-t border-border/40">
        <div className="max-w-[1200px] mx-auto px-5">
          <div className="grid md:grid-cols-3 gap-12">
            <Reveal dir="left">
              <div className="space-y-3 md:sticky md:top-24 self-start">
                <p className="text-primary text-[12px] font-semibold uppercase tracking-wider">FAQ</p>
                <h2 className="text-3xl md:text-[2.25rem] font-bold tracking-tight leading-tight">
                  Things people ask.
                </h2>
                <p className="text-muted-foreground text-[14px]">
                  Still curious? We&apos;re happy to answer anything.
                </p>
              </div>
            </Reveal>

            <Reveal delay={120} dir="right" className="md:col-span-2">
              <div className="glass-panel rounded-2xl px-5 sm:px-6">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((f, i) => (
                    <AccordionItem key={i} value={`q-${i}`} className="border-border/40 group">
                      <AccordionTrigger className="text-left text-[15px] font-semibold hover:no-underline py-5 hover:text-primary transition-colors">{f.q}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-[13.5px] leading-relaxed pb-5">{f.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="pb-16 md:pb-24">
        <div className="max-w-[1200px] mx-auto px-5">
          <Reveal>
            <div className="relative rounded-3xl overflow-hidden border border-border/50 bg-gradient-to-br from-primary/[0.14] via-card/55 to-card/45 backdrop-blur-2xl backdrop-saturate-150 shadow-xl group">
              <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
              <div
                className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/[0.08] rounded-full blur-[120px] pointer-events-none"
                style={{ animation: 'aurora-1 18s ease-in-out infinite' }}
              />
              <div className="relative px-6 py-14 md:px-16 md:py-20 text-center max-w-2xl mx-auto space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/25 bg-primary/[0.08] text-primary text-[11px] font-semibold uppercase tracking-wider">
                  <Zap className="h-3 w-3" /> 60-second setup
                </div>
                <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight leading-[1.05]">
                  The market&apos;s open.<br />
                  <span className="text-grad">So is your account.</span>
                </h2>
                <p className="text-muted-foreground text-[15px] max-w-md mx-auto">
                  Free forever. No card. No catch. Built for Pakistan.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Link href="/register">
                    <Button className="magnetic-btn group h-12 px-7 text-[14px] font-semibold gap-2 rounded-md shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all w-full sm:w-auto">
                      Create your free account
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="ghost" className="h-12 px-5 text-[14px] font-medium hover:text-primary w-full sm:w-auto">
                      Sign in instead
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/40">
        <div className="max-w-[1200px] mx-auto px-5 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2">
              <Link href="/" className="group flex items-center gap-2.5 mb-3">
                <Logo size={20} />
                <span className="font-bold text-[15px] tracking-tight">GrowMore</span>
              </Link>
              <p className="text-[12.5px] text-muted-foreground max-w-xs leading-relaxed">
                The complete investment platform for Pakistan. Stocks, commodities, crypto, portfolio, and AI news — together.
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-[10.5px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Product</p>
              <div className="space-y-2 text-[13px]">
                <button onClick={() => go('products')} className="block text-muted-foreground hover:text-primary transition-colors">Products</button>
                <button onClick={() => go('demo')} className="block text-muted-foreground hover:text-primary transition-colors">Demo</button>
                <button onClick={() => go('how-it-works')} className="block text-muted-foreground hover:text-primary transition-colors">How it works</button>
                <button onClick={() => go('faq')} className="block text-muted-foreground hover:text-primary transition-colors">FAQ</button>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[10.5px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Account</p>
              <div className="space-y-2 text-[13px]">
                <Link href="/login" className="block text-muted-foreground hover:text-primary transition-colors">Sign in</Link>
                <Link href="/register" className="block text-muted-foreground hover:text-primary transition-colors">Register</Link>
              </div>
            </div>
          </div>
          <Separator className="opacity-40" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-6 text-[11.5px] text-muted-foreground">
            <span>&copy; {new Date().getFullYear()} GrowMore. All rights reserved.</span>
            <Badge variant="outline" className="text-[9.5px] font-semibold h-5">Made in Pakistan</Badge>
          </div>
        </div>
      </footer>
    </div>
  );
}
