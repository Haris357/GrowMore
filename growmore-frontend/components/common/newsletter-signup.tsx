'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface NewsletterSignupProps {
  variant?: 'inline' | 'card';
  source?: string;
  className?: string;
}

export function NewsletterSignup({
  variant = 'card',
  source = 'website',
  className = '',
}: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setStatus('idle');

    try {
      await api.post('/newsletter/subscribe', {
        email,
        source,
        preferences: {
          weekly_digest: true,
          market_updates: true,
          tips_and_tutorials: true,
        },
      });
      setStatus('success');
      setMessage('Successfully subscribed! Check your email for confirmation.');
      setEmail('');
    } catch (error: any) {
      setStatus('error');
      if (error.response?.status === 409) {
        setMessage('This email is already subscribed.');
      } else {
        setMessage('Failed to subscribe. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (variant === 'inline') {
    return (
      <div className={className}>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              disabled={isSubmitting || status === 'success'}
            />
          </div>
          <Button type="submit" disabled={isSubmitting || status === 'success'}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : status === 'success' ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Subscribed
              </>
            ) : (
              'Subscribe'
            )}
          </Button>
        </form>
        {status !== 'idle' && (
          <p className={`text-sm mt-2 ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Stay Updated
        </CardTitle>
        <CardDescription>
          Get weekly market insights, investment tips, and exclusive updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              disabled={isSubmitting || status === 'success'}
            />
          </div>

          {status !== 'idle' && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              status === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
            }`}>
              {status === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <p className="text-sm">{message}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting || status === 'success'}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subscribing...
              </>
            ) : status === 'success' ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Subscribed!
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Subscribe to Newsletter
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            No spam, unsubscribe anytime. We respect your privacy.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
