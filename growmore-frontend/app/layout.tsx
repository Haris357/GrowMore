import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'GrowMore — The Complete Investment Platform',
  description: 'Track PSX stocks, gold and silver, crypto, and your full portfolio in one dashboard. Built for Pakistan, powered by AI.',
  openGraph: {
    title: 'GrowMore — The Complete Investment Platform',
    description: 'Stocks, commodities, crypto, portfolio, and AI news — one platform.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GrowMore — The Complete Investment Platform',
    description: 'Stocks, commodities, crypto, portfolio, and AI news — one platform.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
            <Sonner />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
