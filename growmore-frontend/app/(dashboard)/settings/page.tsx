'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { SettingsSkeleton, SecuritySkeleton, ListItemSkeleton } from '@/components/common/skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  User, Bell, Shield, Palette, Key, Save, Upload, Eye, EyeOff,
  Monitor, Smartphone, Tablet, LogOut, Trash2, CheckCircle, XCircle,
  AlertTriangle, Clock, MapPin, Globe, History, ShieldCheck, ShieldAlert,
  Mail, Newspaper, TrendingUp, BarChart3, Sparkles
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useSecurityStore } from '@/stores/securityStore';
import { useTheme } from 'next-themes';
import { formatDistanceToNow, format } from 'date-fns';

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
}

interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  price_alerts: boolean;
  news_alerts: boolean;
  portfolio_updates: boolean;
  weekly_summary: boolean;
}

interface NewsletterSubscription {
  subscribed: boolean;
  subscribed_at?: string;
  preferences?: {
    market_updates?: boolean;
    stock_picks?: boolean;
    weekly_digest?: boolean;
    breaking_news?: boolean;
    educational_content?: boolean;
  };
}

// Device icon helper
const getDeviceIcon = (deviceType: string | null) => {
  switch (deviceType?.toLowerCase()) {
    case 'mobile':
      return <Smartphone className="h-5 w-5" />;
    case 'tablet':
      return <Tablet className="h-5 w-5" />;
    default:
      return <Monitor className="h-5 w-5" />;
  }
};

// Severity badge helper
const getSeverityBadge = (severity: string) => {
  switch (severity.toLowerCase()) {
    case 'high':
      return <Badge variant="destructive">{severity}</Badge>;
    case 'medium':
      return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">{severity}</Badge>;
    default:
      return <Badge variant="outline">{severity}</Badge>;
  }
};

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [securitySubTab, setSecuritySubTab] = useState('overview');

  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();

  // Security store
  const {
    sessions,
    devices,
    loginHistory,
    securityEvents,
    securitySettings,
    suspiciousActivity,
    isLoadingSessions,
    isLoadingDevices,
    isLoadingHistory,
    isLoadingEvents,
    fetchSessions,
    fetchDevices,
    fetchLoginHistory,
    fetchSecurityEvents,
    fetchSecuritySettings,
    revokeSession,
    revokeAllSessions,
    trustDevice,
    removeDevice,
    updateSecuritySettings,
    checkSuspiciousActivity,
  } = useSecurityStore();

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');

  // Notification preferences
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    email_notifications: true,
    push_notifications: true,
    price_alerts: true,
    news_alerts: false,
    portfolio_updates: true,
    weekly_summary: true,
  });

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Preferences
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('PKR');
  const [timezone, setTimezone] = useState('Asia/Karachi');

  // Newsletter state
  const [newsletter, setNewsletter] = useState<NewsletterSubscription>({
    subscribed: false,
    preferences: {
      market_updates: true,
      stock_picks: true,
      weekly_digest: true,
      breaking_news: false,
      educational_content: true,
    },
  });
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [unsubscribeReason, setUnsubscribeReason] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  // Load security data when security tab is active
  useEffect(() => {
    if (activeTab === 'security') {
      Promise.all([
        fetchSessions(),
        fetchDevices(),
        fetchLoginHistory(),
        fetchSecurityEvents(),
        fetchSecuritySettings(),
        checkSuspiciousActivity(),
      ]).catch(console.error);
    }
    // Load newsletter status when tab is active and profile is available
    if (activeTab === 'newsletter' && profile?.email) {
      fetchNewsletterStatus();
    }
  }, [activeTab, profile?.email]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const [profileRes, prefsRes, notifPrefsRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/auth/preferences'),
        api.get('/notifications/preferences').catch(() => ({ data: { preferences: null } })),
      ]);

      const profileData = profileRes.data;
      setProfile(profileData);
      setDisplayName(profileData.display_name || '');
      setPhone(profileData.phone || '');

      const prefsData = prefsRes.data;
      if (prefsData.language) setLanguage(prefsData.language);
      if (prefsData.currency) setCurrency(prefsData.currency);
      if (prefsData.timezone) setTimezone(prefsData.timezone);

      // Use notification preferences from dedicated endpoint
      const notifData = notifPrefsRes.data?.preferences;
      if (notifData) {
        setNotifications({
          email_notifications: notifData.email_enabled ?? true,
          push_notifications: notifData.push_enabled ?? true,
          price_alerts: notifData.price_alerts ?? true,
          news_alerts: notifData.news_alerts ?? false,
          portfolio_updates: notifData.portfolio_updates ?? true,
          weekly_summary: notifData.market_updates ?? true,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setIsSaving(true);
      await api.put('/auth/profile', {
        display_name: displayName,
        phone,
      });
      fetchSettings();
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const saveNotifications = async () => {
    try {
      setIsSaving(true);
      // Use the dedicated notifications preferences endpoint
      await api.put('/notifications/preferences', {
        email_enabled: notifications.email_notifications,
        push_enabled: notifications.push_notifications,
        price_alerts: notifications.price_alerts,
        news_alerts: notifications.news_alerts,
        portfolio_updates: notifications.portfolio_updates,
        market_updates: notifications.weekly_summary,
      });
    } catch (error) {
      console.error('Error saving notifications:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const savePreferences = async () => {
    try {
      setIsSaving(true);
      await api.put('/auth/preferences', {
        language,
        currency,
        timezone,
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    try {
      setIsSaving(true);
      await api.put('/security/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert('Password changed successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Failed to change password. Please check your current password.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggle2FA = async () => {
    try {
      if (securitySettings?.two_factor_enabled) {
        await api.delete('/security/2fa');
      } else {
        await api.post('/security/2fa/enable');
      }
      fetchSecuritySettings();
    } catch (error) {
      console.error('Error toggling 2FA:', error);
    }
  };

  // Newsletter functions
  const fetchNewsletterStatus = async () => {
    try {
      if (!profile?.email) return;
      const response = await api.get(`/newsletter/subscription/status?email=${encodeURIComponent(profile.email)}`);
      setNewsletter({
        subscribed: response.data.subscribed,
        subscribed_at: response.data.subscribed_at,
        preferences: response.data.preferences || {
          market_updates: true,
          stock_picks: true,
          weekly_digest: true,
          breaking_news: false,
          educational_content: true,
        },
      });
    } catch (error) {
      console.error('Error fetching newsletter status:', error);
    }
  };

  const subscribeToNewsletter = async () => {
    try {
      setNewsletterLoading(true);
      await api.post('/newsletter/subscribe', {
        email: profile?.email,
        preferences: newsletter.preferences,
        source: 'settings_page',
      });
      setNewsletter(prev => ({ ...prev, subscribed: true, subscribed_at: new Date().toISOString() }));
    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
    } finally {
      setNewsletterLoading(false);
    }
  };

  const unsubscribeFromNewsletter = async () => {
    try {
      setNewsletterLoading(true);
      await api.post('/newsletter/unsubscribe', {
        email: profile?.email,
        reason: unsubscribeReason || undefined,
      });
      setNewsletter(prev => ({ ...prev, subscribed: false }));
      setUnsubscribeReason('');
    } catch (error) {
      console.error('Error unsubscribing from newsletter:', error);
    } finally {
      setNewsletterLoading(false);
    }
  };

  const updateNewsletterPreferences = async () => {
    try {
      setNewsletterLoading(true);
      await api.put(`/newsletter/subscription/preferences?email=${encodeURIComponent(profile?.email || '')}`, {
        preferences: newsletter.preferences,
      });
    } catch (error) {
      console.error('Error updating newsletter preferences:', error);
    } finally {
      setNewsletterLoading(false);
    }
  };

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="newsletter" className="gap-2">
            <Mail className="h-4 w-4" />
            Newsletter
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Palette className="h-4 w-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="text-2xl">
                    {displayName?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    JPG, PNG or GIF. Max 2MB.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={profile?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Member Since</Label>
                  <Input
                    value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : ''}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <Button onClick={saveProfile} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email_notifications}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, email_notifications: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications in browser
                    </p>
                  </div>
                  <Switch
                    checked={notifications.push_notifications}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, push_notifications: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Price Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when stocks hit your target price
                    </p>
                  </div>
                  <Switch
                    checked={notifications.price_alerts}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, price_alerts: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>News Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about important market news
                    </p>
                  </div>
                  <Switch
                    checked={notifications.news_alerts}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, news_alerts: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Portfolio Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Daily portfolio performance summary
                    </p>
                  </div>
                  <Switch
                    checked={notifications.portfolio_updates}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, portfolio_updates: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Weekly Summary</Label>
                    <p className="text-sm text-muted-foreground">
                      Weekly market and portfolio recap
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weekly_summary}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, weekly_summary: checked })
                    }
                  />
                </div>
              </div>

              <Button onClick={saveNotifications} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Newsletter Tab */}
        <TabsContent value="newsletter">
          <div className="space-y-6">
            {/* Subscription Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Newsletter Subscription
                </CardTitle>
                <CardDescription>
                  Stay updated with market insights, stock picks, and investment tips
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${newsletter.subscribed ? 'bg-green-500/10' : 'bg-muted'}`}>
                      {newsletter.subscribed ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <Mail className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {newsletter.subscribed ? 'You are subscribed' : 'Not subscribed'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {newsletter.subscribed
                          ? `Subscribed since ${newsletter.subscribed_at ? new Date(newsletter.subscribed_at).toLocaleDateString() : 'recently'}`
                          : 'Subscribe to receive our newsletter'}
                      </p>
                    </div>
                  </div>
                  {!newsletter.subscribed ? (
                    <Button onClick={subscribeToNewsletter} disabled={newsletterLoading}>
                      {newsletterLoading ? 'Subscribing...' : 'Subscribe'}
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" disabled={newsletterLoading}>
                          Unsubscribe
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Unsubscribe from newsletter?</AlertDialogTitle>
                          <AlertDialogDescription>
                            You will no longer receive our newsletter emails. You can resubscribe at any time.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                          <Label>Reason for unsubscribing (optional)</Label>
                          <Select value={unsubscribeReason} onValueChange={setUnsubscribeReason}>
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="too_many_emails">Too many emails</SelectItem>
                              <SelectItem value="not_relevant">Content not relevant</SelectItem>
                              <SelectItem value="no_longer_interested">No longer interested</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={unsubscribeFromNewsletter}>
                            Unsubscribe
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Newsletter Preferences */}
            {newsletter.subscribed && (
              <Card>
                <CardHeader>
                  <CardTitle>Newsletter Preferences</CardTitle>
                  <CardDescription>
                    Choose what content you want to receive in your newsletter
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <div>
                          <Label>Market Updates</Label>
                          <p className="text-sm text-muted-foreground">
                            Daily market summary and index movements
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={newsletter.preferences?.market_updates ?? true}
                        onCheckedChange={(checked) =>
                          setNewsletter(prev => ({
                            ...prev,
                            preferences: { ...prev.preferences, market_updates: checked },
                          }))
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-5 w-5 text-yellow-500" />
                        <div>
                          <Label>Stock Picks & Recommendations</Label>
                          <p className="text-sm text-muted-foreground">
                            Expert picks and investment recommendations
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={newsletter.preferences?.stock_picks ?? true}
                        onCheckedChange={(checked) =>
                          setNewsletter(prev => ({
                            ...prev,
                            preferences: { ...prev.preferences, stock_picks: checked },
                          }))
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="h-5 w-5 text-blue-500" />
                        <div>
                          <Label>Weekly Digest</Label>
                          <p className="text-sm text-muted-foreground">
                            Weekly summary of your portfolio and market performance
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={newsletter.preferences?.weekly_digest ?? true}
                        onCheckedChange={(checked) =>
                          setNewsletter(prev => ({
                            ...prev,
                            preferences: { ...prev.preferences, weekly_digest: checked },
                          }))
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Newspaper className="h-5 w-5 text-red-500" />
                        <div>
                          <Label>Breaking News Alerts</Label>
                          <p className="text-sm text-muted-foreground">
                            Immediate alerts for major market events
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={newsletter.preferences?.breaking_news ?? false}
                        onCheckedChange={(checked) =>
                          setNewsletter(prev => ({
                            ...prev,
                            preferences: { ...prev.preferences, breaking_news: checked },
                          }))
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-green-500" />
                        <div>
                          <Label>Educational Content</Label>
                          <p className="text-sm text-muted-foreground">
                            Investment guides, tutorials, and learning resources
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={newsletter.preferences?.educational_content ?? true}
                        onCheckedChange={(checked) =>
                          setNewsletter(prev => ({
                            ...prev,
                            preferences: { ...prev.preferences, educational_content: checked },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <Button onClick={updateNewsletterPreferences} disabled={newsletterLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    {newsletterLoading ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Newsletter Info */}
            <Card>
              <CardHeader>
                <CardTitle>What You'll Receive</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <TrendingUp className="h-5 w-5 mt-0.5 text-primary" />
                    <div>
                      <p className="font-medium">Daily Market Summary</p>
                      <p className="text-sm text-muted-foreground">
                        KSE-100, top gainers/losers, sector performance
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <Sparkles className="h-5 w-5 mt-0.5 text-yellow-500" />
                    <div>
                      <p className="font-medium">Stock Recommendations</p>
                      <p className="text-sm text-muted-foreground">
                        Expert analysis and investment opportunities
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <Newspaper className="h-5 w-5 mt-0.5 text-blue-500" />
                    <div>
                      <p className="font-medium">Market News</p>
                      <p className="text-sm text-muted-foreground">
                        Important news affecting Pakistani markets
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <BarChart3 className="h-5 w-5 mt-0.5 text-green-500" />
                    <div>
                      <p className="font-medium">Portfolio Insights</p>
                      <p className="text-sm text-muted-foreground">
                        Personalized tips based on your holdings
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-6">
            {/* Suspicious Activity Warning */}
            {suspiciousActivity?.has_suspicious_activity && (
              <Card className="border-destructive bg-destructive/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Suspicious Activity Detected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1">
                    {suspiciousActivity.warnings.map((warning, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{warning}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Security Sub-tabs */}
            <div className="flex flex-wrap gap-2 border-b pb-4">
              {['overview', 'sessions', 'devices', 'history', 'events'].map((tab) => (
                <Button
                  key={tab}
                  variant={securitySubTab === tab ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSecuritySubTab(tab)}
                  className="capitalize"
                >
                  {tab === 'overview' && <ShieldCheck className="mr-2 h-4 w-4" />}
                  {tab === 'sessions' && <Monitor className="mr-2 h-4 w-4" />}
                  {tab === 'devices' && <Smartphone className="mr-2 h-4 w-4" />}
                  {tab === 'history' && <History className="mr-2 h-4 w-4" />}
                  {tab === 'events' && <ShieldAlert className="mr-2 h-4 w-4" />}
                  {tab}
                </Button>
              ))}
            </div>

            {/* Overview Sub-tab */}
            {securitySubTab === 'overview' && (
              <div className="space-y-6">
                {/* Security Stats */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                          <Monitor className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{securitySettings?.active_sessions_count || sessions.length}</p>
                          <p className="text-sm text-muted-foreground">Active Sessions</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-green-500/10">
                          <Smartphone className="h-6 w-6 text-green-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{securitySettings?.trusted_devices_count || devices.filter(d => d.is_trusted).length}</p>
                          <p className="text-sm text-muted-foreground">Trusted Devices</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${securitySettings?.two_factor_enabled ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                          <Shield className={`h-6 w-6 ${securitySettings?.two_factor_enabled ? 'text-green-500' : 'text-yellow-500'}`} />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{securitySettings?.two_factor_enabled ? 'Enabled' : 'Disabled'}</p>
                          <p className="text-sm text-muted-foreground">2FA Status</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-blue-500/10">
                          <Key className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">
                            {securitySettings?.last_password_change
                              ? formatDistanceToNow(new Date(securitySettings.last_password_change), { addSuffix: true })
                              : 'Never'}
                          </p>
                          <p className="text-sm text-muted-foreground">Password Changed</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Change Password Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>
                      Update your password regularly to keep your account secure
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Current Password</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>New Password</Label>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm New Password</Label>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>

                    <Button onClick={changePassword} disabled={isSaving}>
                      <Key className="mr-2 h-4 w-4" />
                      {isSaving ? 'Changing...' : 'Change Password'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Security Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle>Security Preferences</CardTitle>
                    <CardDescription>Configure your security notification preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Login Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when someone logs into your account
                        </p>
                      </div>
                      <Switch
                        checked={securitySettings?.login_alerts_enabled ?? true}
                        onCheckedChange={(checked) =>
                          updateSecuritySettings({ login_alerts_enabled: checked })
                        }
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>New Device Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when a new device accesses your account
                        </p>
                      </div>
                      <Switch
                        checked={securitySettings?.new_device_alerts_enabled ?? true}
                        onCheckedChange={(checked) =>
                          updateSecuritySettings({ new_device_alerts_enabled: checked })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 2FA Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                    <CardDescription>
                      Add an extra layer of security to your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {securitySettings?.two_factor_enabled ? '2FA is enabled' : '2FA is disabled'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {securitySettings?.two_factor_enabled
                            ? 'Your account is protected with two-factor authentication'
                            : 'Enable 2FA for additional security'}
                        </p>
                      </div>
                      <Button
                        variant={securitySettings?.two_factor_enabled ? 'destructive' : 'default'}
                        onClick={toggle2FA}
                      >
                        {securitySettings?.two_factor_enabled ? 'Disable 2FA' : 'Enable 2FA'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Sessions Sub-tab */}
            {securitySubTab === 'sessions' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Active Sessions</CardTitle>
                      <CardDescription>
                        Manage your active login sessions across devices
                      </CardDescription>
                    </div>
                    {sessions.length > 1 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out All Others
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Sign out of all other sessions?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will sign you out of all devices except this one.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => revokeAllSessions(true)}>
                              Sign Out All
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingSessions ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <ListItemSkeleton key={i} />
                      ))}
                    </div>
                  ) : sessions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No active sessions</p>
                  ) : (
                    <div className="space-y-4">
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          className={`flex items-center justify-between p-4 rounded-lg border ${
                            session.is_current ? 'border-primary bg-primary/5' : ''
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-full bg-muted">
                              {getDeviceIcon(session.device_type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {session.device_name || session.browser || 'Unknown Device'}
                                </p>
                                {session.is_current && (
                                  <Badge variant="secondary" className="text-xs">Current</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {session.ip_address && (
                                  <span className="flex items-center gap-1">
                                    <Globe className="h-3 w-3" />
                                    {session.ip_address}
                                  </span>
                                )}
                                {session.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {session.location}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                          </div>
                          {!session.is_current && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <LogOut className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Sign out this session?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will immediately sign out this device.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => revokeSession(session.id)}>
                                    Sign Out
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Devices Sub-tab */}
            {securitySubTab === 'devices' && (
              <Card>
                <CardHeader>
                  <CardTitle>Trusted Devices</CardTitle>
                  <CardDescription>
                    Manage devices that have accessed your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingDevices ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <ListItemSkeleton key={i} />
                      ))}
                    </div>
                  ) : devices.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No devices found</p>
                  ) : (
                    <div className="space-y-4">
                      {devices.map((device) => (
                        <div
                          key={device.id}
                          className="flex items-center justify-between p-4 rounded-lg border"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${device.is_trusted ? 'bg-green-500/10' : 'bg-muted'}`}>
                              {getDeviceIcon(device.device_type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {device.device_name || device.browser || 'Unknown Device'}
                                </p>
                                {device.is_trusted && (
                                  <Badge variant="secondary" className="bg-green-500/20 text-green-600 text-xs">
                                    Trusted
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {device.os && <span>{device.os}</span>}
                                {device.last_ip && (
                                  <span className="flex items-center gap-1">
                                    <Globe className="h-3 w-3" />
                                    {device.last_ip}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Last used {formatDistanceToNow(new Date(device.last_used), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => trustDevice(device.device_id, !device.is_trusted)}
                            >
                              {device.is_trusted ? (
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove this device?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove the device and sign out all sessions from it.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removeDevice(device.id)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Login History Sub-tab */}
            {securitySubTab === 'history' && (
              <Card>
                <CardHeader>
                  <CardTitle>Login History</CardTitle>
                  <CardDescription>
                    Recent login attempts to your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingHistory ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <ListItemSkeleton key={i} />
                      ))}
                    </div>
                  ) : loginHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No login history</p>
                  ) : (
                    <div className="space-y-3">
                      {loginHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-4 rounded-lg border"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${
                              entry.status === 'success' ? 'bg-green-500/10' : 'bg-destructive/10'
                            }`}>
                              {entry.status === 'success' ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-destructive" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium capitalize">{entry.status}</p>
                                {entry.failure_reason && (
                                  <span className="text-sm text-destructive">
                                    ({entry.failure_reason})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {entry.device_type && (
                                  <span className="flex items-center gap-1">
                                    {getDeviceIcon(entry.device_type)}
                                    {entry.browser}
                                  </span>
                                )}
                                {entry.ip_address && (
                                  <span className="flex items-center gap-1">
                                    <Globe className="h-3 w-3" />
                                    {entry.ip_address}
                                  </span>
                                )}
                                {entry.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {entry.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Security Events Sub-tab */}
            {securitySubTab === 'events' && (
              <Card>
                <CardHeader>
                  <CardTitle>Security Events</CardTitle>
                  <CardDescription>
                    Security-related activities on your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingEvents ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <ListItemSkeleton key={i} />
                      ))}
                    </div>
                  ) : securityEvents.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No security events</p>
                  ) : (
                    <div className="space-y-3">
                      {securityEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between p-4 rounded-lg border"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-full bg-muted">
                              <Shield className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{event.description}</p>
                                {getSeverityBadge(event.severity)}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="capitalize">{event.event_type.replace(/_/g, ' ')}</span>
                                {event.ip_address && (
                                  <span className="flex items-center gap-1">
                                    <Globe className="h-3 w-3" />
                                    {event.ip_address}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(event.created_at), 'MMM d, yyyy HH:mm')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>App Preferences</CardTitle>
              <CardDescription>
                Customize your app experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ur">Urdu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PKR">Pakistani Rupee (Rs.)</SelectItem>
                      <SelectItem value="USD">US Dollar ($)</SelectItem>
                      <SelectItem value="GBP">British Pound (£)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Karachi">Pakistan (PKT)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">US Eastern (EST)</SelectItem>
                      <SelectItem value="Europe/London">UK (GMT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={savePreferences} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
