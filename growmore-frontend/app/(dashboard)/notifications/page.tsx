'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { ListItemSkeleton, AlertsSkeleton } from '@/components/common/skeletons';
import { EmptyState } from '@/components/common/empty-state';
import {
  Bell,
  BellOff,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Newspaper,
  Wallet,
  Target,
  Settings,
  Plus,
  Edit,
  Pause,
  Play,
  Volume2,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  Search,
  BarChart3,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PriceAlert, AlertCondition, AlertConditionInfo, Notification } from '@/types/notification';
import { ExportDropdown } from '@/components/common/export-dropdown';

// Alert condition descriptions
const ALERT_CONDITION_INFO: Record<AlertCondition, { label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  price_above: { label: 'Price Above', description: 'Alert when price rises above target', icon: ArrowUpCircle },
  price_below: { label: 'Price Below', description: 'Alert when price falls below target', icon: ArrowDownCircle },
  change_above: { label: 'Change Above %', description: 'Alert when daily change exceeds threshold', icon: TrendingUp },
  change_below: { label: 'Change Below %', description: 'Alert when daily change drops below threshold', icon: TrendingDown },
  volume_spike: { label: 'Volume Spike', description: 'Alert on unusual trading volume', icon: Volume2 },
  new_high: { label: '52-Week High', description: 'Alert when stock reaches new 52-week high', icon: ArrowUpCircle },
  new_low: { label: '52-Week Low', description: 'Alert when stock reaches new 52-week low', icon: ArrowDownCircle },
};

const notificationIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  price_alert: TrendingUp,
  news: Newspaper,
  news_alert: Newspaper,
  portfolio: Wallet,
  portfolio_update: Wallet,
  goal: Target,
  goal_milestone: Target,
  system: AlertCircle,
  security_alert: AlertCircle,
};

const notificationColors: Record<string, string> = {
  price_alert: 'bg-blue-500/10 text-blue-500',
  news: 'bg-purple-500/10 text-purple-500',
  news_alert: 'bg-purple-500/10 text-purple-500',
  portfolio: 'bg-green-500/10 text-green-500',
  portfolio_update: 'bg-green-500/10 text-green-500',
  goal: 'bg-yellow-500/10 text-yellow-500',
  goal_milestone: 'bg-yellow-500/10 text-yellow-500',
  system: 'bg-gray-500/10 text-gray-500',
  security_alert: 'bg-red-500/10 text-red-500',
};

interface Stock {
  symbol: string;
  name: string;
  price: number;
}

export default function NotificationsPage() {
  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);

  // Alerts state
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [alertConditions, setAlertConditions] = useState<AlertConditionInfo[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  // Create alert dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newAlert, setNewAlert] = useState({
    symbol: '',
    condition: 'price_above' as AlertCondition,
    target_value: '',
    notes: '',
  });

  // Stock search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState('notifications');
  const [notificationFilter, setNotificationFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
    fetchAlerts();
    fetchAlertConditions();
  }, []);

  useEffect(() => {
    if (showAllAlerts) {
      fetchAlerts(false);
    } else {
      fetchAlerts(true);
    }
  }, [showAllAlerts]);

  // Debounced stock search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchStocks(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchNotifications = async () => {
    try {
      setIsLoadingNotifications(true);
      const response = await api.get('/notifications');
      const data = response.data?.notifications || response.data?.items || response.data || [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const fetchAlerts = async (activeOnly: boolean = true) => {
    try {
      setIsLoadingAlerts(true);
      const response = await api.get('/notifications/alerts', {
        params: { active_only: activeOnly }
      });
      setAlerts(response.data?.alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  const fetchAlertConditions = async () => {
    try {
      const response = await api.get('/notifications/alerts/conditions');
      setAlertConditions(response.data?.conditions || []);
    } catch (error) {
      console.error('Error fetching alert conditions:', error);
    }
  };

  const searchStocks = async (query: string) => {
    try {
      setIsSearching(true);
      const response = await api.get('/stocks', {
        params: { search: query, limit: 10 }
      });
      const stocks = response.data?.stocks || response.data?.items || response.data || [];
      setSearchResults(Array.isArray(stocks) ? stocks : []);
    } catch (error) {
      console.error('Error searching stocks:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const createAlert = async () => {
    if (!newAlert.symbol || !newAlert.target_value) return;

    try {
      setIsCreating(true);
      await api.post('/notifications/alerts', {
        symbol: newAlert.symbol.toUpperCase(),
        condition: newAlert.condition,
        target_value: parseFloat(newAlert.target_value),
        notes: newAlert.notes || null,
      });

      setIsCreateDialogOpen(false);
      setNewAlert({ symbol: '', condition: 'price_above', target_value: '', notes: '' });
      setSelectedStock(null);
      setSearchQuery('');
      fetchAlerts(!showAllAlerts);
    } catch (error: any) {
      console.error('Error creating alert:', error);
      alert(error.response?.data?.detail || 'Failed to create alert');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      await api.post(`/notifications/alerts/${alertId}/toggle`, null, {
        params: { is_active: isActive }
      });
      setAlerts(alerts.map(a =>
        a.id === alertId ? { ...a, is_active: isActive } : a
      ));
    } catch (error) {
      console.error('Error toggling alert:', error);
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      await api.delete(`/notifications/alerts/${alertId}`);
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.post('/notifications/mark-read', { notification_ids: [notificationId] });
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const selectStock = (stock: Stock) => {
    setSelectedStock(stock);
    setNewAlert({ ...newAlert, symbol: stock.symbol });
    setSearchQuery(stock.symbol);
    setSearchResults([]);
  };

  const filteredNotifications = notificationFilter === 'all'
    ? notifications
    : notificationFilter === 'unread'
      ? notifications.filter(n => !n.is_read)
      : notifications.filter(n => n.type === notificationFilter);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const activeAlertsCount = alerts.filter(a => a.is_active).length;
  const triggeredAlertsCount = alerts.filter(a => a.triggered_at).length;

  const getConditionValueLabel = (condition: AlertCondition) => {
    if (condition === 'change_above' || condition === 'change_below') {
      return 'Threshold (%)';
    }
    if (condition === 'volume_spike') {
      return 'Multiplier (e.g., 2 = 2x average)';
    }
    if (condition === 'new_high' || condition === 'new_low') {
      return 'Days to check (default 252)';
    }
    return 'Target Price (Rs.)';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Notifications & Alerts</h1>
          <p className="text-muted-foreground">
            Manage your notifications and set up price alerts
          </p>
        </div>
        <div className="flex gap-2">
          <ExportDropdown type="alerts" />
          <Button variant="outline" asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Notifications</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <AlertCircle className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unread</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <BellRing className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold">{activeAlertsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Check className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Triggered</p>
                <p className="text-2xl font-bold">{triggeredAlertsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-1">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <BellRing className="h-4 w-4" />
            Price Alerts
            <Badge variant="secondary" className="ml-1">{activeAlertsCount}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center gap-4">
                <Select value={notificationFilter} onValueChange={setNotificationFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Notifications</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="price_alert">Price Alerts</SelectItem>
                    <SelectItem value="news_alert">News</SelectItem>
                    <SelectItem value="portfolio_update">Portfolio</SelectItem>
                    <SelectItem value="goal_milestone">Goals</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button variant="outline" size="sm" onClick={markAllAsRead}>
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Mark All Read
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingNotifications ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ListItemSkeleton key={i} />
                  ))}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <EmptyState
                  icon={BellOff}
                  title="No Notifications"
                  description={
                    notificationFilter === 'all'
                      ? "You're all caught up! No notifications yet."
                      : `No ${notificationFilter === 'unread' ? 'unread' : notificationFilter.replace('_', ' ')} notifications`
                  }
                />
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => {
                    const Icon = notificationIcons[notification.type] || Bell;
                    const colorClass = notificationColors[notification.type] || 'bg-gray-500/10 text-gray-500';

                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          'flex items-start gap-4 p-4 rounded-lg border transition-colors',
                          notification.is_read ? 'bg-background' : 'bg-muted/50'
                        )}
                      >
                        <div className={cn('p-2 rounded-full', colorClass)}>
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-medium">{notification.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                            </div>
                            {!notification.is_read && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                            <div className="flex gap-1">
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteNotification(notification.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Price Alerts</CardTitle>
                <CardDescription>
                  Get notified when stocks reach your target prices
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-all"
                    checked={showAllAlerts}
                    onCheckedChange={setShowAllAlerts}
                  />
                  <Label htmlFor="show-all" className="text-sm">Show triggered</Label>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Alert
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Create Price Alert</DialogTitle>
                      <DialogDescription>
                        Set up an alert to be notified when a stock reaches your target
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* Stock Search */}
                      <div className="space-y-2">
                        <Label>Stock Symbol</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search stocks (e.g., OGDC, HBL)"
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setNewAlert({ ...newAlert, symbol: e.target.value });
                            }}
                            className="pl-10"
                          />
                        </div>
                        {isSearching && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Searching...
                          </div>
                        )}
                        {searchResults.length > 0 && (
                          <div className="border rounded-lg max-h-48 overflow-y-auto">
                            {searchResults.map((stock) => (
                              <button
                                key={stock.symbol}
                                type="button"
                                className="w-full px-3 py-2 text-left hover:bg-muted flex justify-between items-center"
                                onClick={() => selectStock(stock)}
                              >
                                <div>
                                  <span className="font-medium">{stock.symbol}</span>
                                  <span className="text-sm text-muted-foreground ml-2">{stock.name}</span>
                                </div>
                                <span className="text-sm">Rs. {stock.price?.toFixed(2)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {selectedStock && (
                          <div className="p-3 rounded-lg bg-muted/50 flex justify-between items-center">
                            <div>
                              <span className="font-medium">{selectedStock.symbol}</span>
                              <span className="text-sm text-muted-foreground ml-2">{selectedStock.name}</span>
                            </div>
                            <span className="text-sm font-medium">Rs. {selectedStock.price?.toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      {/* Condition Type */}
                      <div className="space-y-2">
                        <Label>Alert Condition</Label>
                        <Select
                          value={newAlert.condition}
                          onValueChange={(value) => setNewAlert({ ...newAlert, condition: value as AlertCondition })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ALERT_CONDITION_INFO).map(([key, info]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <info.icon className="h-4 w-4" />
                                  <span>{info.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {ALERT_CONDITION_INFO[newAlert.condition]?.description}
                        </p>
                      </div>

                      {/* Target Value */}
                      <div className="space-y-2">
                        <Label>{getConditionValueLabel(newAlert.condition)}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={
                            newAlert.condition.includes('change') ? 'e.g., 5 for 5%' :
                            newAlert.condition === 'volume_spike' ? 'e.g., 2' :
                            'e.g., 100.50'
                          }
                          value={newAlert.target_value}
                          onChange={(e) => setNewAlert({ ...newAlert, target_value: e.target.value })}
                        />
                      </div>

                      {/* Notes */}
                      <div className="space-y-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea
                          placeholder="Add any notes for this alert..."
                          value={newAlert.notes}
                          onChange={(e) => setNewAlert({ ...newAlert, notes: e.target.value })}
                          rows={2}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={createAlert}
                        disabled={isCreating || !newAlert.symbol || !newAlert.target_value}
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Alert'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingAlerts ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <ListItemSkeleton key={i} />
                  ))}
                </div>
              ) : alerts.length === 0 ? (
                <EmptyState
                  icon={BellRing}
                  title="No Price Alerts"
                  description="Create your first price alert to get notified when stocks reach your targets"
                  actionLabel="Create Alert"
                  onAction={() => setIsCreateDialogOpen(true)}
                />
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => {
                    const conditionInfo = ALERT_CONDITION_INFO[alert.condition];
                    const Icon = conditionInfo?.icon || BellRing;
                    const isTriggered = !!alert.triggered_at;

                    return (
                      <div
                        key={alert.id}
                        className={cn(
                          'flex items-center gap-4 p-4 rounded-lg border transition-colors',
                          !alert.is_active && 'opacity-60',
                          isTriggered && 'bg-green-500/5 border-green-500/20'
                        )}
                      >
                        <div className={cn(
                          'p-2 rounded-full',
                          isTriggered ? 'bg-green-500/10 text-green-500' :
                          alert.is_active ? 'bg-blue-500/10 text-blue-500' :
                          'bg-gray-500/10 text-gray-500'
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">{alert.symbol}</span>
                            <Badge variant={isTriggered ? 'default' : alert.is_active ? 'secondary' : 'outline'}>
                              {isTriggered ? 'Triggered' : alert.is_active ? 'Active' : 'Paused'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            <span>{conditionInfo?.label}</span>
                            <span className="mx-2">•</span>
                            <span className="font-medium text-foreground">
                              {alert.condition.includes('change') ? `${alert.target_value}%` :
                               alert.condition === 'volume_spike' ? `${alert.target_value}x` :
                               `Rs. ${alert.target_value.toLocaleString()}`}
                            </span>
                          </div>
                          {alert.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{alert.notes}</p>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">
                            Created {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                            {isTriggered && alert.triggered_at && (
                              <span className="ml-2">
                                • Triggered {formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isTriggered && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleAlert(alert.id, !alert.is_active)}
                            >
                              {alert.is_active ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Alert</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this alert for {alert.symbol}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteAlert(alert.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alert Conditions Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alert Types Reference</CardTitle>
              <CardDescription>Available conditions for your price alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(ALERT_CONDITION_INFO).map(([key, info]) => (
                  <div key={key} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="p-2 rounded-full bg-primary/10">
                      <info.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{info.label}</p>
                      <p className="text-xs text-muted-foreground">{info.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
