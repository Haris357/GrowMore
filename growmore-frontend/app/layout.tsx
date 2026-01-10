import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GrowMore - Pakistan\'s Smartest Investment Tracker',
  description: 'Track PSX stocks, gold prices, bank deposits, and more - all in one place',
  openGraph: {
    title: 'GrowMore - Pakistan\'s Smartest Investment Tracker',
    description: 'Track PSX stocks, gold prices, bank deposits, and more',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GrowMore - Pakistan\'s Smartest Investment Tracker',
    description: 'Track PSX stocks, gold prices, bank deposits, and more',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
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
