'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { signUpWithEmail, signInWithGoogle } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import { Leaf, Eye, EyeOff, Loader2, ArrowRight, Mail, Lock, User, Shield, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/common/theme-toggle';

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
  const verifyAndSyncUser = useAuthStore(state => state.verifyAndSyncUser);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password', '');

  const passwordChecks = [
    { label: '8+ chars', valid: password.length >= 8 },
    { label: 'Number', valid: /\d/.test(password) },
    { label: 'Uppercase', valid: /[A-Z]/.test(password) },
  ];

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      const userCredential = await signUpWithEmail(data.email, data.password, data.displayName);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[400px] space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Leaf className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">GrowMore</span>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground">Start tracking your investments in minutes</p>
        </div>

        {/* Google Sign Up */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 rounded-xl font-medium"
          onClick={handleGoogleSignIn}
          disabled={isLoading || isGoogleLoading}
        >
          {isGoogleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2.5 h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          {isGoogleLoading ? 'Creating account...' : 'Continue with Google'}
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs text-muted-foreground uppercase tracking-wider">or</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-sm font-medium">Full name</Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="displayName"
                type="text"
                placeholder="Your name"
                className={cn(
                  'h-11 pl-10 rounded-xl',
                  errors.displayName && 'border-destructive focus-visible:ring-destructive'
                )}
                {...register('displayName')}
                disabled={isLoading || isGoogleLoading}
              />
            </div>
            {errors.displayName && (
              <p className="text-xs text-destructive">{errors.displayName.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className={cn(
                  'h-11 pl-10 rounded-xl',
                  errors.email && 'border-destructive focus-visible:ring-destructive'
                )}
                {...register('email')}
                disabled={isLoading || isGoogleLoading}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                className={cn(
                  'h-11 pl-10 pr-10 rounded-xl',
                  errors.password && 'border-destructive focus-visible:ring-destructive'
                )}
                {...register('password')}
                disabled={isLoading || isGoogleLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
            {/* Password strength */}
            {password && (
              <div className="flex gap-1.5 pt-0.5">
                {passwordChecks.map((c, i) => (
                  <span
                    key={i}
                    className={cn(
                      'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full',
                      c.valid ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {c.valid && <Check className="h-2.5 w-2.5" />}
                    {c.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                className={cn(
                  'h-11 pl-10 pr-10 rounded-xl',
                  errors.confirmPassword && 'border-destructive focus-visible:ring-destructive'
                )}
                {...register('confirmPassword')}
                disabled={isLoading || isGoogleLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Terms */}
          <div className="space-y-1.5">
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="terms"
                {...register('acceptTerms')}
                className="h-4 w-4 mt-0.5 rounded border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer select-none leading-relaxed">
                I agree to the{' '}
                <Link href="/terms" className="text-primary hover:text-primary/80 font-medium">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-primary hover:text-primary/80 font-medium">Privacy Policy</Link>
              </label>
            </div>
            {errors.acceptTerms && (
              <p className="text-xs text-destructive">{errors.acceptTerms.message}</p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-11 rounded-xl font-semibold gap-2"
            disabled={isLoading || isGoogleLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                Create account
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* Sign In Link */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:text-primary/80 font-semibold">
            Sign in
          </Link>
        </p>

        {/* Security */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60">
          <Shield className="h-3 w-3" />
          <span>Your data is protected with 256-bit encryption</span>
        </div>
      </div>
    </div>
  );
}
