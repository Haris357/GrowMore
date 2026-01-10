'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  BarChart3,
  Coins,
  Building2,
  Newspaper,
  Target,
  Calculator,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: BarChart3,
      title: 'PSX Stock Tracking',
      description: 'Real-time prices, company fundamentals, and comprehensive market data',
    },
    {
      icon: Coins,
      title: 'Gold & Silver Prices',
      description: 'Live rates in PKR per tola with historical charts and trends',
    },
    {
      icon: Building2,
      title: 'Bank Products',
      description: 'Compare FD rates and savings accounts across Pakistani banks',
    },
    {
      icon: Newspaper,
      title: 'AI News Analysis',
      description: 'Sentiment analysis on market news to inform your decisions',
    },
    {
      icon: TrendingUp,
      title: 'Portfolio Management',
      description: 'Track all your investments across stocks, gold, and deposits',
    },
    {
      icon: Calculator,
      title: 'Investment Calculators',
      description: 'Stock returns, FD maturity, gold zakat, and more',
    },
  ];

  const stats = [
    { value: '10,000+', label: 'Active Investors' },
    { value: '500+', label: 'Stocks Tracked' },
    { value: '15+', label: 'Banks Listed' },
    { value: '24/7', label: 'Real-time Updates' },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">GrowMore</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium hover:text-primary transition-smooth">
              Features
            </Link>
            <Link href="#about" className="text-sm font-medium hover:text-primary transition-smooth">
              About
            </Link>
            <Link href="/login" className="text-sm font-medium hover:text-primary transition-smooth">
              Sign In
            </Link>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </nav>
          <div className="flex md:hidden gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 md:py-32 text-center">
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            Grow Your Wealth with Pakistan&apos;s Smartest Investment Tracker
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Track PSX stocks, gold prices, bank deposits, and more - all in one place. Make informed investment decisions with real-time data and AI-powered insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button asChild size="lg" className="text-lg">
              <Link href="/register">
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg">
              <Link href="/dashboard">View Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="text-3xl md:text-4xl font-bold text-primary">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need to manage your investments
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive tools and insights to help you make smarter investment decisions
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="transition-smooth hover:shadow-lg hover:-translate-y-1"
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Card className="border-primary/20">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl md:text-3xl">
                  Trusted by thousands of Pakistani investors
                </CardTitle>
                <CardDescription className="text-base">
                  Join our growing community of smart investors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    'Real-time market data',
                    'Portfolio tracking',
                    'Price alerts',
                    'Investment calculators',
                    'News & analysis',
                    'Secure & private',
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-secondary" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 text-center">
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href="/register">
                      Start Tracking Your Investments
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">GrowMore</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Pakistan&apos;s smartest investment tracking platform
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-primary transition-smooth">Features</Link></li>
                <li><Link href="/dashboard" className="hover:text-primary transition-smooth">Dashboard</Link></li>
                <li><Link href="/stocks" className="hover:text-primary transition-smooth">Stocks</Link></li>
                <li><Link href="/calculators" className="hover:text-primary transition-smooth">Calculators</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#about" className="hover:text-primary transition-smooth">About</Link></li>
                <li><Link href="/contact" className="hover:text-primary transition-smooth">Contact</Link></li>
                <li><Link href="/terms" className="hover:text-primary transition-smooth">Terms</Link></li>
                <li><Link href="/privacy" className="hover:text-primary transition-smooth">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/news" className="hover:text-primary transition-smooth">Market News</Link></li>
                <li><Link href="/help" className="hover:text-primary transition-smooth">Help Center</Link></li>
                <li><Link href="/api" className="hover:text-primary transition-smooth">API Docs</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 GrowMore. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
