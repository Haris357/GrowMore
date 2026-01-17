'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Button
} from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Badge
} from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Coins,
  Building2,
  Newspaper,
  ArrowRight,
  CheckCircle2,
  Shield,
  Zap,
  Smartphone,
  LineChart,
  PieChart,
  Menu,
  X,
  Wallet,
  Gem,
  LayoutDashboard,
  BellRing,
  Lock,
  Play,
  Star,
  Users,
  Globe,
  Clock,
  Target,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
  ChevronDown,
  MousePointer2,
  Leaf,
  Check,
  CreditCard,
  Crown,
  Rocket,
  Eye,
  EyeOff,
  RefreshCw,
  Fingerprint,
  ShieldCheck,
  ServerCrash,
  Award,
  HeartHandshake,
  CircleDollarSign,
  Banknote,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NewsletterSignup } from '@/components/common/newsletter-signup';


// --- Custom Hooks & Animation Utilities ---

const useOnScreen = (ref: React.RefObject<Element>, rootMargin = "0px") => {
  const [isIntersecting, setIntersecting] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIntersecting(true);
        }
      },
      { rootMargin, threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [ref, rootMargin]);
  return isIntersecting;
};

// Parallax scroll hook
const useParallax = (speed: number = 0.5) => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.scrollY * speed);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return offset;
};

// Animated counter hook
const useCounter = (end: number, duration: number = 2000, start: boolean = true) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, start]);

  return count;
};

// FadeIn Component
const FadeIn = ({ children, delay = 0, className, direction = 'up' }: { children: React.ReactNode, delay?: number, className?: string, direction?: 'up' | 'down' | 'left' | 'right' | 'none' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(ref, "-100px");

  const getTransform = () => {
    if (direction === 'up') return 'translate-y-12';
    if (direction === 'down') return '-translate-y-12';
    if (direction === 'left') return 'translate-x-12';
    if (direction === 'right') return '-translate-x-12';
    return '';
  };

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-1000 ease-out",
        onScreen ? "opacity-100 translate-x-0 translate-y-0" : `opacity-0 ${getTransform()}`,
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// Animated stat component
const AnimatedStat = ({ value, suffix = '', label }: { value: number, suffix?: string, label: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(ref, "-50px");
  const count = useCounter(value, 2000, onScreen);

  return (
    <div ref={ref} className="text-center space-y-2">
      <h3 className="text-4xl md:text-5xl font-bold tracking-tighter text-foreground">
        {count}{suffix}
      </h3>
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">{label}</p>
    </div>
  );
};

// Floating element animation
const FloatingElement = ({ children, delay = 0, className }: { children: React.ReactNode, delay?: number, className?: string }) => {
  return (
    <div
      className={cn("animate-float", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// FAQ Accordion Item
const FAQItem = ({ question, answer, isOpen, onClick }: { question: string, answer: string, isOpen: boolean, onClick: () => void }) => {
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={onClick}
        className="w-full py-5 flex items-center justify-between text-left group"
      >
        <span className="font-semibold text-foreground group-hover:text-primary transition-colors pr-4">{question}</span>
        <ChevronDown className={cn(
          "h-5 w-5 text-muted-foreground transition-transform duration-300 flex-shrink-0",
          isOpen && "rotate-180 text-primary"
        )} />
      </button>
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        isOpen ? "max-h-96 pb-5" : "max-h-0"
      )}>
        <p className="text-muted-foreground leading-relaxed">{answer}</p>
      </div>
    </div>
  );
};

// Market Ticker Item
const TickerItem = ({ symbol, price, change, positive }: { symbol: string, price: string, change: string, positive: boolean }) => (
  <div className="inline-flex items-center gap-3 px-6 h-10 border-r border-border/30 whitespace-nowrap flex-shrink-0">
    <span className="font-semibold text-foreground text-sm">{symbol}</span>
    <span className="font-mono text-sm text-muted-foreground">{price}</span>
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
      positive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
    )}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {change}
    </span>
  </div>
);

// Pricing Card
interface PricingFeature {
  text: string;
  included: boolean;
}

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: PricingFeature[];
  popular: boolean;
  icon: LucideIcon;
  cta: string;
}

const PricingCard = ({ tier, index }: { tier: PricingTier, index: number }) => {
  const Icon = tier.icon;

  return (
    <FadeIn delay={index * 100}>
      <Card className={cn(
        "relative h-full transition-all duration-500 hover:-translate-y-2",
        tier.popular
          ? "bg-gradient-to-b from-primary/10 to-card border-primary/30 shadow-xl shadow-primary/10"
          : "bg-card/50 border-border/50 hover:border-primary/20"
      )}>
        {tier.popular && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground shadow-lg px-4 py-1">
              <Star className="w-3 h-3 mr-1.5 fill-current" />
              Most Popular
            </Badge>
          </div>
        )}

        <CardHeader className="text-center pb-4">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform hover:scale-110",
            tier.popular ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <Icon className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl">{tier.name}</CardTitle>
          <CardDescription className="text-sm">{tier.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold tracking-tight">{tier.price}</span>
              <span className="text-muted-foreground text-sm">{tier.period}</span>
            </div>
          </div>

          <ul className="space-y-3">
            {tier.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                  feature.included ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {feature.included ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                </div>
                <span className={cn(
                  "text-sm",
                  feature.included ? "text-foreground" : "text-muted-foreground line-through"
                )}>
                  {feature.text}
                </span>
              </li>
            ))}
          </ul>

          <Button
            className={cn(
              "w-full rounded-full h-12 font-semibold transition-all",
              tier.popular
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            {tier.cta}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </FadeIn>
  );
};

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState('stocks');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);
  const [showOldView, setShowOldView] = useState(true);
  const parallaxOffset = useParallax(0.3);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mouse tracking for interactive effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Auto-toggle comparison view
  useEffect(() => {
    const interval = setInterval(() => {
      setShowOldView(prev => !prev);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const marketData = [
    { symbol: 'KSE-100', price: '72,456', change: '+1.2%', positive: true },
    { symbol: 'OGDC', price: 'Rs. 124.50', change: '+2.4%', positive: true },
    { symbol: 'HBL', price: 'Rs. 89.30', change: '-0.8%', positive: false },
    { symbol: 'Gold 24K', price: 'Rs. 234,500', change: '+0.5%', positive: true },
    { symbol: 'LUCK', price: 'Rs. 567.80', change: '+3.1%', positive: true },
    { symbol: 'ENGRO', price: 'Rs. 312.40', change: '-1.2%', positive: false },
    { symbol: 'Silver', price: 'Rs. 2,890', change: '+1.8%', positive: true },
    { symbol: 'PSO', price: 'Rs. 198.60', change: '+0.9%', positive: true },
  ];

  const features = [
    {
      icon: LayoutDashboard,
      title: 'Unified Dashboard',
      description: 'All your investments in one beautiful, real-time interface. Stocks, commodities, and savings at a glance.',
      color: 'text-primary',
      bg: 'bg-primary/10',
      gradient: 'from-primary/20 to-emerald-500/20'
    },
    {
      icon: Gem,
      title: 'Commodity Tracking',
      description: 'Live gold and silver prices with historical charts. Never miss a buying opportunity.',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      gradient: 'from-amber-500/20 to-orange-500/20'
    },
    {
      icon: Building2,
      title: 'Bank Rate Comparison',
      description: 'Compare savings rates across all major banks. Find the best returns for your money.',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      gradient: 'from-blue-500/20 to-cyan-500/20'
    },
    {
      icon: Newspaper,
      title: 'AI-Powered News',
      description: 'Smart news feed filtered by relevance. Stay informed with sentiment analysis.',
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      gradient: 'from-violet-500/20 to-purple-500/20'
    },
    {
      icon: PieChart,
      title: 'Portfolio Analytics',
      description: 'Deep insights into your asset allocation, performance metrics, and growth projections.',
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      gradient: 'from-rose-500/20 to-pink-500/20'
    },
    {
      icon: BellRing,
      title: 'Smart Alerts',
      description: 'Custom price alerts and notifications. Get notified the moment markets move.',
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
      gradient: 'from-cyan-500/20 to-teal-500/20'
    },
  ];

  const testimonials = [
    {
      quote: "GrowMore transformed how I track my investments. The unified dashboard saves me hours every week.",
      author: "Ahmed Khan",
      role: "Private Investor",
      avatar: "AK"
    },
    {
      quote: "Finally, a platform that understands Pakistani markets. The gold price alerts are incredibly accurate.",
      author: "Sara Malik",
      role: "Finance Professional",
      avatar: "SM"
    },
    {
      quote: "The bank rate comparison feature helped me find 2% higher returns on my savings. Highly recommended!",
      author: "Rizwan Ali",
      role: "Business Owner",
      avatar: "RA"
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Create Your Account",
      description: "Sign up in seconds with email or Google. No credit card required to start.",
      icon: Users
    },
    {
      number: "02",
      title: "Connect Your Assets",
      description: "Add your stocks, commodities, and savings accounts to build your portfolio view.",
      icon: Wallet
    },
    {
      number: "03",
      title: "Track & Grow",
      description: "Monitor real-time prices, set alerts, and make informed decisions to grow your wealth.",
      icon: TrendingUp
    }
  ];

  const faqs = [
    {
      question: "Is GrowMore free to use?",
      answer: "Yes! GrowMore offers a generous free plan that includes tracking up to 10 assets, basic analytics, and real-time price updates. For power users, we offer Pro and Enterprise plans with advanced features."
    },
    {
      question: "How do you get real-time stock prices?",
      answer: "We source our data directly from the Pakistan Stock Exchange (PSX) and trusted market data providers. Prices are updated every 15 seconds during market hours to ensure you always have accurate information."
    },
    {
      question: "Is my financial data secure?",
      answer: "Absolutely. We use bank-grade 256-bit encryption, secure data centers, and never store your actual brokerage credentials. Your data is protected with the same security standards used by major financial institutions."
    },
    {
      question: "Can I track gold and silver prices?",
      answer: "Yes! GrowMore tracks live gold and silver prices from major Pakistani markets including Karachi, Lahore, and Islamabad. You can set price alerts and view historical charts for commodities."
    },
    {
      question: "Do you have a mobile app?",
      answer: "We're currently building native iOS and Android apps. In the meantime, our web app is fully responsive and works beautifully on all mobile devices. Sign up to get notified when our apps launch!"
    },
    {
      question: "How does the bank rate comparison work?",
      answer: "We aggregate savings account and fixed deposit rates from 20+ Pakistani banks and update them weekly. You can compare rates side-by-side, filter by deposit amount, and find the best returns for your savings."
    }
  ];

  const pricingTiers: PricingTier[] = [
    {
      name: "Free",
      price: "Rs. 0",
      period: "forever",
      description: "Perfect for getting started",
      icon: Rocket,
      popular: false,
      cta: "Get Started",
      features: [
        { text: "Track up to 10 assets", included: true },
        { text: "Basic portfolio analytics", included: true },
        { text: "Real-time price updates", included: true },
        { text: "Email price alerts", included: true },
        { text: "Advanced charts", included: false },
        { text: "Priority support", included: false },
      ]
    },
    {
      name: "Pro",
      price: "Rs. 499",
      period: "/month",
      description: "For serious investors",
      icon: Crown,
      popular: true,
      cta: "Start Free Trial",
      features: [
        { text: "Unlimited assets", included: true },
        { text: "Advanced analytics & insights", included: true },
        { text: "Real-time price updates", included: true },
        { text: "SMS & email alerts", included: true },
        { text: "Advanced charts & indicators", included: true },
        { text: "Priority support", included: true },
      ]
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      description: "For teams & institutions",
      icon: Building2,
      popular: false,
      cta: "Contact Sales",
      features: [
        { text: "Everything in Pro", included: true },
        { text: "Multi-user access", included: true },
        { text: "Custom integrations", included: true },
        { text: "API access", included: true },
        { text: "Dedicated account manager", included: true },
        { text: "SLA guarantee", included: true },
      ]
    }
  ];

  const securityFeatures = [
    {
      icon: ShieldCheck,
      title: "256-bit Encryption",
      description: "Bank-grade encryption for all data"
    },
    {
      icon: Fingerprint,
      title: "2FA Authentication",
      description: "Extra layer of account security"
    },
    {
      icon: ServerCrash,
      title: "99.9% Uptime",
      description: "Reliable access when you need it"
    },
    {
      icon: Lock,
      title: "No Credential Storage",
      description: "We never store your brokerage logins"
    }
  ];

  const partners = [
    { name: 'PSX', description: 'Pakistan Stock Exchange' },
    { name: 'PMEX', description: 'Pakistan Mercantile Exchange' },
    { name: 'SECP', description: 'Securities Commission' },
    { name: 'SBP', description: 'State Bank of Pakistan' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20 selection:text-primary">

      {/* --- Advanced CSS Animations --- */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-10px) rotate(1deg); }
          75% { transform: translateY(-5px) rotate(-1deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        @keyframes gradient-x {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px hsl(var(--primary) / 0.3); }
          50% { box-shadow: 0 0 40px hsl(var(--primary) / 0.5); }
        }
        @keyframes border-dance {
          0%, 100% { border-color: hsl(var(--primary) / 0.3); }
          50% { border-color: hsl(var(--primary) / 0.6); }
        }
        @keyframes slide-up-fade {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes phone-float {
          0%, 100% { transform: translateY(0) rotateY(-5deg) rotateX(5deg); }
          50% { transform: translateY(-15px) rotateY(-5deg) rotateX(5deg); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-pulse-soft { animation: pulse-soft 4s ease-in-out infinite; }
        .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 8s ease infinite; }
        .animate-shimmer { background-size: 200% 100%; animation: shimmer 2s linear infinite; }
        .animate-glow { animation: glow 2s ease-in-out infinite; }
        .animate-border-dance { animation: border-dance 2s ease-in-out infinite; }
        .animate-slide-up-fade { animation: slide-up-fade 0.6s ease-out forwards; }
        .animate-scale-in { animation: scale-in 0.5s ease-out forwards; }
        .animate-marquee { animation: marquee 40s linear infinite; }
        .animate-phone-float { animation: phone-float 6s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }

        /* Smooth scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }

        /* Text gradient utility */
        .text-gradient {
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(145 63% 60%), hsl(180 70% 50%));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Card hover glow */
        .card-glow {
          position: relative;
        }
        .card-glow::before {
          content: '';
          position: absolute;
          inset: -1px;
          background: linear-gradient(135deg, hsl(var(--primary) / 0.3), transparent, hsl(var(--primary) / 0.3));
          border-radius: inherit;
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: -1;
        }
        .card-glow:hover::before {
          opacity: 1;
        }

        /* Grid pattern */
        .bg-grid {
          background-image:
            linear-gradient(hsl(var(--border) / 0.3) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border) / 0.3) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        /* Dot pattern */
        .bg-dots {
          background-image: radial-gradient(hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px);
          background-size: 20px 20px;
        }

        /* Perspective for 3D effects */
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>

      {/* --- Dynamic Background --- */}
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        {/* Gradient Orbs */}
        <div
          className="absolute w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] animate-pulse-soft"
          style={{
            left: `calc(${mousePosition.x * 0.02}px - 400px)`,
            top: `calc(${mousePosition.y * 0.02}px - 400px)`,
            transition: 'left 0.5s ease-out, top 0.5s ease-out'
          }}
        />
        <div className="absolute top-[30%] -right-[10%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] animate-pulse-soft" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-[10%] left-[10%] w-[700px] h-[700px] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse-soft" style={{ animationDelay: '2s' }} />

        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay">
          <svg className="w-full h-full">
            <filter id="noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)"/>
          </svg>
        </div>
      </div>

      {/* --- Navbar --- */}
      <header className={cn(
        "fixed top-0 w-full z-50 transition-all duration-500",
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm py-3"
          : "bg-transparent py-5"
      )}>
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/30 transition-colors" />
              <div className="relative bg-primary/10 p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                <Leaf className="h-6 w-6 text-primary" />
              </div>
            </div>
            <span className="text-xl font-bold tracking-tight">GrowMore</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {['Features', 'How it Works', 'Pricing', 'FAQ'].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase().replace(/\s/g, '-')}`}
                className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="font-medium hover:bg-primary/5">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 rounded-full px-6 font-medium transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden p-2 text-foreground hover:bg-muted rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={cn(
          "md:hidden absolute top-full left-0 w-full bg-background/95 backdrop-blur-xl border-b border-border transition-all duration-300",
          isMobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
        )}>
          <div className="container mx-auto px-6 py-6 space-y-4">
            {['Features', 'How it Works', 'Pricing', 'FAQ'].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase().replace(/\s/g, '-')}`}
                className="block py-2 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item}
              </Link>
            ))}
            <div className="pt-4 flex flex-col gap-3">
              <Link href="/login">
                <Button variant="outline" className="w-full">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button className="w-full bg-primary">Get Started Free</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* --- Live Market Ticker --- */}
      <div className={cn(
        "fixed top-[72px] left-0 right-0 z-40 bg-muted/80 backdrop-blur-md border-b border-border/50 overflow-hidden transition-all duration-500",
        scrolled ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <div className="inline-flex items-center animate-marquee whitespace-nowrap">
          {[...marketData, ...marketData].map((item, i) => (
            <TickerItem key={i} {...item} />
          ))}
        </div>
      </div>

      {/* --- Hero Section --- */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">

            {/* Text Content */}
            <div className="flex-1 space-y-8 text-center lg:text-left z-10">
              <FadeIn delay={0}>
                <Badge
                  variant="outline"
                  className="px-4 py-2 border-primary/30 bg-primary/5 text-primary rounded-full font-medium hover:bg-primary/10 transition-colors cursor-default inline-flex items-center gap-2"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  Now tracking 500+ PSX stocks
                </Badge>
              </FadeIn>

              <FadeIn delay={100}>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1]" style={{ letterSpacing: '-0.04em' }}>
                  Track your wealth
                  <br />
                  <span className="text-gradient animate-gradient-x">with precision</span>
                </h1>
              </FadeIn>

              <FadeIn delay={200}>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  The all-in-one platform for Pakistani investors. Track PSX stocks, gold prices,
                  and bank deposits in real-time. Make smarter decisions, grow faster.
                </p>
              </FadeIn>

              <FadeIn delay={300}>
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-4">
                  <Link href="/register">
                    <Button
                      size="lg"
                      className="h-14 px-8 text-base rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/25 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1 active:translate-y-0 w-full sm:w-auto group"
                    >
                      Start Tracking Free
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-14 px-8 text-base rounded-full border-border/50 bg-background/50 backdrop-blur-sm hover:bg-muted hover:border-border transition-all w-full sm:w-auto group"
                  >
                    <Play className="mr-2 h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                    Watch Demo
                  </Button>
                </div>
              </FadeIn>

              <FadeIn delay={400}>
                <div className="pt-8 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
                  {[
                    { icon: CheckCircle2, text: 'Free forever plan' },
                    { icon: Shield, text: 'Bank-grade security' },
                    { icon: Zap, text: 'Real-time updates' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-primary" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>

            {/* Dashboard Preview */}
            <FadeIn direction="right" delay={200} className="flex-1 w-full max-w-[580px] z-10">
              <div className="relative" style={{ transform: `translateY(${parallaxOffset * 0.1}px)` }}>
                {/* Glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-emerald-500/20 to-blue-500/20 rounded-[2.5rem] blur-3xl opacity-50 animate-pulse-soft" />

                {/* Main Dashboard Card */}
                <FloatingElement>
                  <Card className="relative bg-card/90 backdrop-blur-xl border-border/50 shadow-2xl rounded-[2rem] overflow-hidden ring-1 ring-white/10">
                    {/* Glass reflection */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />

                    <CardHeader className="border-b border-border/50 pb-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <LayoutDashboard className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">Portfolio Overview</CardTitle>
                            <CardDescription className="text-xs">Live updates</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="text-xs font-medium text-emerald-500">Live</span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-5">
                      {/* Total Balance */}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Balance</p>
                        <div className="flex items-baseline gap-3">
                          <h2 className="text-3xl font-bold tracking-tight font-mono">Rs. 2,45,892</h2>
                          <span className="text-emerald-500 font-medium text-sm bg-emerald-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3" /> 12.4%
                          </span>
                        </div>
                      </div>

                      {/* Tabs */}
                      <div className="flex p-1 bg-muted/50 rounded-xl">
                        {['Stocks', 'Gold', 'Savings'].map((tab) => (
                          <button
                            key={tab}
                            className={cn(
                              "flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-300",
                              activeTab === tab.toLowerCase()
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => setActiveTab(tab.toLowerCase())}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>

                      {/* Asset List */}
                      <div className="space-y-2">
                        {[
                          { name: 'OGDC', fullName: 'Oil & Gas Dev Co', val: 'Rs. 98,500', change: '+2.4%', positive: true, color: 'text-primary', bg: 'bg-primary/10' },
                          { name: 'Gold 24K', fullName: '10 Grams', val: 'Rs. 75,200', change: '+0.8%', positive: true, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                          { name: 'HBL Savings', fullName: '12% APY', val: 'Rs. 72,192', change: '+1.2%', positive: true, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                        ].map((item, i) => (
                          <div
                            key={i}
                            className="group flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-all cursor-pointer border border-transparent hover:border-border/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center font-bold text-xs transition-transform group-hover:scale-110", item.bg, item.color)}>
                                {item.name.slice(0, 2)}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.fullName}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-sm font-medium">{item.val}</p>
                              <p className={cn("text-xs font-medium", item.positive ? "text-emerald-500" : "text-red-500")}>
                                {item.change}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </FloatingElement>

                {/* Floating notification card */}
                <FloatingElement delay={500} className="absolute -right-4 top-1/4 hidden lg:block">
                  <Card className="bg-card/95 backdrop-blur-xl border-border/50 shadow-xl p-3 rounded-xl animate-slide-up-fade" style={{ animationDelay: '1s' }}>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">LUCK +5.2%</p>
                        <p className="text-[10px] text-muted-foreground">Price alert triggered</p>
                      </div>
                    </div>
                  </Card>
                </FloatingElement>

                {/* Floating stats card */}
                <FloatingElement delay={800} className="absolute -left-4 bottom-1/4 hidden lg:block">
                  <Card className="bg-card/95 backdrop-blur-xl border-border/50 shadow-xl p-3 rounded-xl animate-slide-up-fade" style={{ animationDelay: '1.5s' }}>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <Gem className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">Gold at Rs. 234,500</p>
                        <p className="text-[10px] text-muted-foreground">Per tola</p>
                      </div>
                    </div>
                  </Card>
                </FloatingElement>
              </div>
            </FadeIn>
          </div>
        </div>

        {/* Scroll indicator */}
        <FadeIn delay={800} className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-2 text-muted-foreground">
          <span className="text-xs font-medium">Scroll to explore</span>
          <MousePointer2 className="h-4 w-4 animate-bounce" />
        </FadeIn>
      </section>

      {/* --- Trusted By / Stats Section --- */}
      <section className="py-16 border-y border-border/50 bg-muted/30">
        <div className="container mx-auto px-6">
          <FadeIn className="text-center mb-12">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Trusted by Pakistani investors</p>
          </FadeIn>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <AnimatedStat value={500} suffix="+" label="PSX Stocks" />
            <AnimatedStat value={50} suffix="K+" label="Active Users" />
            <AnimatedStat value={99} suffix="%" label="Uptime" />
            <AnimatedStat value={24} suffix="/7" label="Live Updates" />
          </div>
        </div>
      </section>

      {/* --- Before/After Comparison Section --- */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <FadeIn className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 text-primary">
              <RefreshCw className="w-3 h-3 mr-2" />
              The Difference
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold" style={{ letterSpacing: '-0.03em' }}>
              Stop juggling <span className="text-gradient">multiple apps</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              See how GrowMore simplifies your investment tracking
            </p>
          </FadeIn>

          <div className="max-w-5xl mx-auto">
            <div className="relative grid md:grid-cols-2 gap-8">
              {/* Before - Old Way */}
              <FadeIn delay={100} direction="left">
                <Card className={cn(
                  "relative overflow-hidden transition-all duration-500 border-2",
                  showOldView ? "border-red-500/30 bg-red-500/5" : "border-border/50 bg-card/30 opacity-60"
                )}>
                  <div className="absolute top-4 left-4">
                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                      <X className="w-3 h-3 mr-1" />
                      Before GrowMore
                    </Badge>
                  </div>
                  <CardContent className="pt-16 pb-8 px-6">
                    <div className="space-y-4">
                      {[
                        { icon: Globe, text: 'Multiple browser tabs open', color: 'text-red-500' },
                        { icon: RefreshCw, text: 'Manual price checking', color: 'text-red-500' },
                        { icon: Eye, text: 'Scattered spreadsheets', color: 'text-red-500' },
                        { icon: Clock, text: 'Hours wasted daily', color: 'text-red-500' },
                        { icon: Target, text: 'Missing price opportunities', color: 'text-red-500' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                          <item.icon className={cn("h-5 w-5", item.color)} />
                          <span className="text-muted-foreground">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>

              {/* After - With GrowMore */}
              <FadeIn delay={200} direction="right">
                <Card className={cn(
                  "relative overflow-hidden transition-all duration-500 border-2",
                  !showOldView ? "border-primary/30 bg-primary/5 shadow-lg shadow-primary/10" : "border-border/50 bg-card/30 opacity-60"
                )}>
                  <div className="absolute top-4 left-4">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      <Check className="w-3 h-3 mr-1" />
                      With GrowMore
                    </Badge>
                  </div>
                  <CardContent className="pt-16 pb-8 px-6">
                    <div className="space-y-4">
                      {[
                        { icon: LayoutDashboard, text: 'One unified dashboard', color: 'text-primary' },
                        { icon: Zap, text: 'Real-time auto updates', color: 'text-primary' },
                        { icon: PieChart, text: 'Organized portfolio view', color: 'text-primary' },
                        { icon: Clock, text: 'Hours saved weekly', color: 'text-primary' },
                        { icon: BellRing, text: 'Never miss an opportunity', color: 'text-primary' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                          <item.icon className={cn("h-5 w-5", item.color)} />
                          <span className="text-foreground font-medium">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>

              {/* Toggle indicator */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex">
                <button
                  onClick={() => setShowOldView(!showOldView)}
                  className="h-14 w-14 rounded-full bg-background border-2 border-border shadow-xl flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <ArrowRight className={cn(
                    "h-6 w-6 transition-transform duration-500",
                    showOldView ? "" : "rotate-180"
                  )} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Features Section --- */}
      <section id="features" className="py-24 md:py-32 relative overflow-hidden bg-muted/30">
        <div className="absolute inset-0 bg-dots opacity-50" />

        <div className="container mx-auto px-6 relative z-10">
          <FadeIn className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 text-primary">
              <Sparkles className="w-3 h-3 mr-2" />
              Powerful Features
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold" style={{ letterSpacing: '-0.03em' }}>
              Everything you need to
              <br />
              <span className="text-gradient">grow your wealth</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built specifically for Pakistani investors. Track all your investments in one place with powerful tools and real-time insights.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <FadeIn key={idx} delay={idx * 80}>
                <Card className="group h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 overflow-hidden card-glow">
                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", feature.gradient)} />

                  <CardHeader className="relative">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg",
                      feature.bg, feature.color
                    )}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* --- How It Works Section --- */}
      <section id="how-it-works" className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />

        <div className="container mx-auto px-6 relative z-10">
          <FadeIn className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 text-primary">
              <Target className="w-3 h-3 mr-2" />
              Simple Process
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold" style={{ letterSpacing: '-0.03em' }}>
              Get started in
              <span className="text-gradient"> 3 easy steps</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Start tracking your investments in minutes. No complicated setup required.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, idx) => (
              <FadeIn key={idx} delay={idx * 150}>
                <div className="relative group">
                  {/* Connector line */}
                  {idx < steps.length - 1 && (
                    <div className="hidden md:block absolute top-16 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                  )}

                  <div className="text-center space-y-6">
                    <div className="relative inline-flex">
                      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20 group-hover:shadow-xl group-hover:shadow-primary/20">
                        <step.icon className="h-8 w-8 text-primary" />
                      </div>
                      <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-lg">
                        {step.number}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">{step.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* --- Mobile App Preview Section --- */}
      <section className="py-24 md:py-32 relative overflow-hidden bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Phone Mockup */}
            <FadeIn direction="left" className="order-2 lg:order-1">
              <div className="relative perspective-1000 flex justify-center">
                {/* Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-blue-500/30 blur-[100px] opacity-50" />

                {/* Phone Frame */}
                <div className="relative animate-phone-float">
                  <div className="relative w-[280px] h-[580px] bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-[3rem] p-2 shadow-2xl">
                    {/* Screen */}
                    <div className="relative w-full h-full bg-background rounded-[2.5rem] overflow-hidden">
                      {/* Notch */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-10" />

                      {/* Screen Content */}
                      <div className="pt-10 px-4 pb-4 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Leaf className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-bold text-sm">GrowMore</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] text-emerald-500 font-medium">Live</span>
                          </div>
                        </div>

                        <div className="bg-muted/50 rounded-xl p-3 mb-3">
                          <p className="text-[10px] text-muted-foreground mb-1">Total Portfolio</p>
                          <p className="text-xl font-bold font-mono">Rs. 2,45,892</p>
                          <p className="text-[10px] text-emerald-500 font-medium">+12.4% this month</p>
                        </div>

                        <div className="flex-1 space-y-2">
                          {[
                            { name: 'OGDC', price: 'Rs. 124.50', change: '+2.4%', positive: true },
                            { name: 'Gold 24K', price: 'Rs. 234,500', change: '+0.5%', positive: true },
                            { name: 'HBL', price: 'Rs. 89.30', change: '-0.8%', positive: false },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-card/50 border border-border/30">
                              <span className="font-medium text-xs">{item.name}</span>
                              <div className="text-right">
                                <p className="font-mono text-xs">{item.price}</p>
                                <p className={cn("text-[10px]", item.positive ? "text-emerald-500" : "text-red-500")}>{item.change}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Bottom Nav */}
                        <div className="flex justify-around pt-3 border-t border-border/30">
                          {[LayoutDashboard, LineChart, BellRing, Users].map((Icon, i) => (
                            <div key={i} className={cn(
                              "p-2 rounded-lg",
                              i === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"
                            )}>
                              <Icon className="h-4 w-4" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reflection */}
                  <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-primary/10 blur-3xl rounded-full" />
                </div>
              </div>
            </FadeIn>

            {/* Content */}
            <div className="order-1 lg:order-2 space-y-8">
              <FadeIn>
                <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 text-primary">
                  <Smartphone className="w-3 h-3 mr-2" />
                  Coming Soon
                </Badge>
              </FadeIn>

              <FadeIn delay={100}>
                <h2 className="text-4xl md:text-5xl font-bold" style={{ letterSpacing: '-0.03em' }}>
                  Track anywhere with our
                  <span className="text-gradient"> mobile app</span>
                </h2>
              </FadeIn>

              <FadeIn delay={200}>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Native iOS and Android apps are in development. Get real-time price alerts,
                  portfolio updates, and market news right on your phone.
                </p>
              </FadeIn>

              <FadeIn delay={300}>
                <ul className="space-y-4">
                  {[
                    { icon: BellRing, text: 'Push notifications for price alerts' },
                    { icon: Fingerprint, text: 'Biometric authentication' },
                    { icon: Zap, text: 'Offline portfolio access' },
                    { icon: PieChart, text: 'Quick glance widgets' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-medium">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </FadeIn>

              <FadeIn delay={400}>
                <div className="flex flex-wrap gap-4 pt-4">
                  <Button size="lg" className="rounded-full bg-primary text-primary-foreground h-12 px-8 group">
                    Join Waitlist
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full h-12 px-8">
                    Learn More
                  </Button>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* --- Security & Trust Section --- */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <FadeIn className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 text-primary">
              <Shield className="w-3 h-3 mr-2" />
              Security First
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold" style={{ letterSpacing: '-0.03em' }}>
              Your data is <span className="text-gradient">safe with us</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Bank-grade security measures to protect your financial information
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {securityFeatures.map((feature, idx) => (
              <FadeIn key={idx} delay={idx * 100}>
                <Card className="text-center p-6 bg-card/50 border-border/50 hover:border-primary/20 transition-all hover:-translate-y-1">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              </FadeIn>
            ))}
          </div>

          {/* Partners/Compliance */}
          <FadeIn delay={400}>
            <div className="bg-muted/30 rounded-2xl p-8 md:p-12">
              <p className="text-center text-sm text-muted-foreground uppercase tracking-widest mb-8">
                Data sourced from trusted partners
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {partners.map((partner, i) => (
                  <div key={i} className="text-center group">
                    <div className="h-16 w-16 rounded-2xl bg-background border border-border/50 flex items-center justify-center mx-auto mb-3 transition-all group-hover:border-primary/30 group-hover:shadow-lg">
                      <span className="text-xl font-bold text-muted-foreground group-hover:text-primary transition-colors">{partner.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{partner.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* --- Testimonials Section --- */}
      <section id="testimonials" className="py-24 md:py-32 relative overflow-hidden bg-muted/30">
        <div className="container mx-auto px-6">
          <FadeIn className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 text-primary">
              <Star className="w-3 h-3 mr-2 fill-current" />
              Testimonials
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold" style={{ letterSpacing: '-0.03em' }}>
              Loved by <span className="text-gradient">investors</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              See what our users are saying about GrowMore
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, idx) => (
              <FadeIn key={idx} delay={idx * 100}>
                <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-amber-500 fill-amber-500" />
                      ))}
                    </div>
                    <p className="text-muted-foreground leading-relaxed italic">
                      &ldquo;{testimonial.quote}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 pt-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{testimonial.author}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* --- Pricing Section --- */}
      <section id="pricing" className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />

        <div className="container mx-auto px-6 relative z-10">
          <FadeIn className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 text-primary">
              <CreditCard className="w-3 h-3 mr-2" />
              Simple Pricing
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold" style={{ letterSpacing: '-0.03em' }}>
              Choose your <span className="text-gradient">plan</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Start free, upgrade when you need more power
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.map((tier, idx) => (
              <PricingCard key={idx} tier={tier} index={idx} />
            ))}
          </div>

          <FadeIn delay={400} className="text-center mt-12">
            <p className="text-sm text-muted-foreground">
              All plans include 14-day money-back guarantee. No questions asked.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* --- FAQ Section --- */}
      <section id="faq" className="py-24 md:py-32 relative overflow-hidden bg-muted/30">
        <div className="container mx-auto px-6">
          <FadeIn className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 text-primary">
              <HeartHandshake className="w-3 h-3 mr-2" />
              FAQ
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold" style={{ letterSpacing: '-0.03em' }}>
              Frequently asked <span className="text-gradient">questions</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about GrowMore
            </p>
          </FadeIn>

          <FadeIn delay={100}>
            <Card className="max-w-3xl mx-auto bg-card/50 border-border/50">
              <CardContent className="p-6 md:p-8">
                {faqs.map((faq, idx) => (
                  <FAQItem
                    key={idx}
                    question={faq.question}
                    answer={faq.answer}
                    isOpen={openFAQ === idx}
                    onClick={() => setOpenFAQ(openFAQ === idx ? null : idx)}
                  />
                ))}
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={200} className="text-center mt-12">
            <p className="text-muted-foreground mb-4">Still have questions?</p>
            <Button variant="outline" className="rounded-full">
              Contact Support
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </FadeIn>
        </div>
      </section>

      {/* --- CTA Section --- */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <FadeIn>
            <div className="relative bg-gradient-to-br from-primary via-primary/90 to-emerald-600 rounded-[2.5rem] p-12 md:p-20 text-center overflow-hidden">
              {/* Background effects */}
              <div className="absolute inset-0 bg-grid opacity-10" />
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl" />

              {/* Floating elements */}
              <div className="absolute top-10 left-10 animate-float-slow hidden lg:block">
                <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <CircleDollarSign className="h-6 w-6 text-white/80" />
                </div>
              </div>
              <div className="absolute bottom-10 right-10 animate-float-slow hidden lg:block" style={{ animationDelay: '1s' }}>
                <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <Banknote className="h-6 w-6 text-white/80" />
                </div>
              </div>

              <div className="relative z-10 max-w-3xl mx-auto space-y-8">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-2 text-white/90 text-sm font-medium">
                  <Award className="h-4 w-4" />
                  Join 50,000+ investors
                </div>

                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white" style={{ letterSpacing: '-0.03em' }}>
                  Ready to grow your wealth?
                </h2>
                <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
                  Join thousands of Pakistani investors who are already tracking their investments smarter with GrowMore.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Link href="/register">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="h-14 px-10 text-base rounded-full font-semibold shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
                    >
                      Get Started Free
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-14 px-10 text-base rounded-full bg-transparent border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all"
                    >
                      Sign In
                    </Button>
                  </Link>
                </div>
                <p className="text-sm text-white/60 pt-2">
                  No credit card required • Free forever plan available
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-card border-t border-border/50 pt-20 pb-10">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
            {/* Brand */}
            <div className="lg:col-span-2 space-y-6">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="bg-primary/10 p-2 rounded-xl">
                  <Leaf className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xl font-bold tracking-tight">GrowMore</span>
              </Link>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
                Pakistan&apos;s smartest investment tracking platform. Track stocks, gold, and savings all in one place.
              </p>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                  <Globe className="w-3 h-3 mr-1.5" />
                  Made in Pakistan
                </Badge>
              </div>

              {/* Newsletter */}
              <div className="pt-4">
                <p className="text-sm font-medium mb-3">Subscribe to our newsletter</p>
                <NewsletterSignup variant="inline" source="landing-footer" />
              </div>
            </div>

            {/* Links */}
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap', 'API'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press', 'Contact'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Security'] },
            ].map((group, i) => (
              <div key={i}>
                <h4 className="font-semibold mb-4 text-foreground">{group.title}</h4>
                <ul className="space-y-3">
                  {group.links.map((link, j) => (
                    <li key={j}>
                      <Link
                        href="#"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 GrowMore. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
