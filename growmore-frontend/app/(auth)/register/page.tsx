'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { signUpWithEmail, signInWithGoogle } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import {
  Leaf,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Mail,
  Lock,
  User,
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  Sparkles,
  Check,
  CheckCircle2,
  Gift
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const registerSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const verifyAndSyncUser = useAuthStore(state => state.verifyAndSyncUser);

  // Mouse tracking for interactive background
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password', '');

  // Password strength indicators
  const passwordChecks = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'Contains a number', valid: /\d/.test(password) },
    { label: 'Contains uppercase', valid: /[A-Z]/.test(password) },
  ];

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      const userCredential = await signUpWithEmail(
        data.email,
        data.password,
        data.displayName
      );
      const token = await userCredential.user.getIdToken();
      await verifyAndSyncUser(token);
      toast.success('Account created successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      const userCredential = await signInWithGoogle();
      const token = await userCredential.user.getIdToken();
      await verifyAndSyncUser(token);
      toast.success('Welcome to GrowMore!');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast.error(error.message || 'Failed to sign in with Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const benefits = [
    { icon: BarChart3, text: 'Track 500+ PSX stocks in real-time' },
    { icon: TrendingUp, text: 'Smart alerts for price movements' },
    { icon: Shield, text: 'Bank-grade security for your data' },
    { icon: Gift, text: 'Free forever plan available' },
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-background">
      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
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
        @keyframes slide-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes check-pop {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-soft { animation: pulse-soft 4s ease-in-out infinite; }
        .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 8s ease infinite; }
        .animate-slide-up { animation: slide-up 0.6s ease-out forwards; }
        .animate-check-pop { animation: check-pop 0.3s ease-out forwards; }
        .text-gradient {
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(145 63% 60%), hsl(180 70% 50%));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .bg-grid {
          background-image:
            linear-gradient(hsl(var(--border) / 0.3) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border) / 0.3) 1px, transparent 1px);
          background-size: 60px 60px;
        }
      `}</style>

      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse-soft"
          style={{
            left: `calc(${mousePosition.x * 0.02}px - 300px)`,
            top: `calc(${mousePosition.y * 0.02}px - 300px)`,
            transition: 'left 0.5s ease-out, top 0.5s ease-out'
          }}
        />
        <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] animate-pulse-soft" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-[10%] left-[20%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] animate-pulse-soft" style={{ animationDelay: '2s' }} />
      </div>

      {/* Left Panel - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative bg-muted/30 border-r border-border/50">
        <div className="absolute inset-0 bg-grid opacity-30" />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-12 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/30 transition-colors" />
              <div className="relative bg-primary/10 p-3 rounded-xl transition-all duration-300 group-hover:scale-110">
                <Leaf className="h-8 w-8 text-primary" />
              </div>
            </div>
            <span className="text-2xl font-bold tracking-tight">GrowMore</span>
          </Link>

          {/* Main Content */}
          <div className="space-y-6 max-w-lg">
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight" style={{ letterSpacing: '-0.03em' }}>
              Start your journey to
              <br />
              <span className="text-gradient animate-gradient-x">smarter investing</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Join 50,000+ Pakistani investors who are already tracking their wealth and making smarter financial decisions.
            </p>

            {/* Benefits */}
            <div className="space-y-4 pt-4">
              {benefits.map((benefit, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 animate-slide-up"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-foreground font-medium">{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Floating Cards */}
          <div className="absolute bottom-20 right-20 animate-float hidden xl:block">
            <Card className="bg-card/90 backdrop-blur-xl border-border/50 shadow-xl p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Free Forever</p>
                  <p className="text-xs text-muted-foreground">No credit card required</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="absolute top-32 right-32 animate-float hidden xl:block" style={{ animationDelay: '1s' }}>
            <Card className="bg-card/90 backdrop-blur-xl border-border/50 shadow-xl p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">50,000+</p>
                  <p className="text-xs text-muted-foreground">Active investors</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Bottom Text */}
          <div className="absolute bottom-12 left-12 xl:left-20">
            <p className="text-sm text-muted-foreground">
              Setup takes less than <span className="text-foreground font-semibold">2 minutes</span>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <Leaf className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-bold tracking-tight">GrowMore</span>
            </Link>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
              Create your account
            </h2>
            <p className="text-muted-foreground">
              Start tracking your investments in minutes
            </p>
          </div>

          {/* Google Sign Up */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full h-12 rounded-xl border-border/50 bg-background hover:bg-muted transition-all duration-300 group"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-sm text-muted-foreground">
                or register with email
              </span>
            </div>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm font-medium">
                Full name
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Ahmed Khan"
                  className={cn(
                    "h-12 pl-12 rounded-xl border-border/50 bg-background focus:border-primary/50 focus:ring-primary/20 transition-all",
                    errors.displayName && "border-destructive focus:border-destructive"
                  )}
                  {...register('displayName')}
                  disabled={isLoading || isGoogleLoading}
                />
              </div>
              {errors.displayName && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-destructive" />
                  {errors.displayName.message}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className={cn(
                    "h-12 pl-12 rounded-xl border-border/50 bg-background focus:border-primary/50 focus:ring-primary/20 transition-all",
                    errors.email && "border-destructive focus:border-destructive"
                  )}
                  {...register('email')}
                  disabled={isLoading || isGoogleLoading}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-destructive" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  className={cn(
                    "h-12 pl-12 pr-12 rounded-xl border-border/50 bg-background focus:border-primary/50 focus:ring-primary/20 transition-all",
                    errors.password && "border-destructive focus:border-destructive"
                  )}
                  {...register('password')}
                  disabled={isLoading || isGoogleLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted rounded-lg"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || isGoogleLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-destructive" />
                  {errors.password.message}
                </p>
              )}

              {/* Password Strength Indicators */}
              {password && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {passwordChecks.map((check, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-all",
                        check.valid
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {check.valid ? (
                        <Check className="h-3 w-3 animate-check-pop" />
                      ) : (
                        <span className="h-3 w-3 rounded-full border border-current" />
                      )}
                      {check.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm password
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  className={cn(
                    "h-12 pl-12 pr-12 rounded-xl border-border/50 bg-background focus:border-primary/50 focus:ring-primary/20 transition-all",
                    errors.confirmPassword && "border-destructive focus:border-destructive"
                  )}
                  {...register('confirmPassword')}
                  disabled={isLoading || isGoogleLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted rounded-lg"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading || isGoogleLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-destructive" />
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  {...register('acceptTerms')}
                  className="h-5 w-5 mt-0.5 rounded-md border-border/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground cursor-pointer select-none leading-relaxed"
                >
                  I agree to the{' '}
                  <Link href="/terms" className="text-primary hover:text-primary/80 font-medium transition-colors">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-primary hover:text-primary/80 font-medium transition-colors">
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {errors.acceptTerms && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-destructive" />
                  {errors.acceptTerms.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 group"
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          {/* Sign In Link */}
          <p className="text-center text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-primary hover:text-primary/80 font-semibold transition-colors"
            >
              Sign in
            </Link>
          </p>

          {/* Security Note */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
            <Shield className="h-3.5 w-3.5" />
            <span>Your data is protected with 256-bit encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}
