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
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { User, Bell, Shield, Palette, Globe, Key, Save, Upload, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from 'next-themes';

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

interface SecuritySettings {
  two_factor_enabled: boolean;
  last_password_change?: string;
  login_history: { ip: string; device: string; timestamp: string }[];
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();

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

  // Security state
  const [security, setSecurity] = useState<SecuritySettings | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Preferences
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('PKR');
  const [timezone, setTimezone] = useState('Asia/Karachi');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const [profileRes, prefsRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/auth/preferences'),
      ]);

      const profileData = profileRes.data;
      setProfile(profileData);
      setDisplayName(profileData.display_name || '');
      setPhone(profileData.phone || '');

      const prefsData = prefsRes.data;
      if (prefsData.notifications) {
        setNotifications(prefsData.notifications);
      }
      if (prefsData.language) setLanguage(prefsData.language);
      if (prefsData.currency) setCurrency(prefsData.currency);
      if (prefsData.timezone) setTimezone(prefsData.timezone);
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
      await api.put('/auth/preferences', {
        notifications,
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
      if (security?.two_factor_enabled) {
        await api.delete('/security/2fa');
      } else {
        await api.post('/security/2fa/enable');
      }
      fetchSettings();
    } catch (error) {
      console.error('Error toggling 2FA:', error);
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" />;
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
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
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

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-6">
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
                      {security?.two_factor_enabled ? '2FA is enabled' : '2FA is disabled'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {security?.two_factor_enabled
                        ? 'Your account is protected with two-factor authentication'
                        : 'Enable 2FA for additional security'}
                    </p>
                  </div>
                  <Button
                    variant={security?.two_factor_enabled ? 'destructive' : 'default'}
                    onClick={toggle2FA}
                  >
                    {security?.two_factor_enabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </Button>
                </div>
              </CardContent>
            </Card>
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
