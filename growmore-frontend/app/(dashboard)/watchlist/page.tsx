'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableSkeleton, StatCardSkeleton } from '@/components/common/skeletons';
import { PriceDisplay } from '@/components/common/price-display';
import { EmptyState } from '@/components/common/empty-state';
import { Eye, Plus, Trash2, Bell, BellOff, Search, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { useWatchlistStore } from '@/stores/watchlistStore';
import { ExportDropdown } from '@/components/common/export-dropdown';

interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  change_amount: number;
  change_percentage: number;
  volume?: number;
  price_alert_above?: number;
  price_alert_below?: number;
  item_type: string;
  added_at: string;
}

interface Watchlist {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  items_count: number;
  items: WatchlistItem[];
}

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState<Watchlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isSetAlertOpen, setIsSetAlertOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null);

  // Add item form
  const [searchSymbol, setSearchSymbol] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Alert form
  const [alertAbove, setAlertAbove] = useState('');
  const [alertBelow, setAlertBelow] = useState('');

  useEffect(() => {
    fetchWatchlists();
  }, []);

  const fetchWatchlists = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/watchlists');
      // Backend might return items (paginated) or watchlists or direct array
      const rawData = response.data?.items || response.data?.watchlists || response.data || [];
      const data = Array.isArray(rawData) ? rawData : [];
      setWatchlists(data);

      if (data.length > 0) {
        const defaultWatchlist = data.find((w: Watchlist) => w.is_default) || data[0];
        await fetchWatchlistDetails(defaultWatchlist.id);
      }
    } catch (error) {
      console.error('Error fetching watchlists:', error);
      setWatchlists([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWatchlistDetails = async (watchlistId: string) => {
    try {
      const response = await api.get(`/watchlists/${watchlistId}`);
      setSelectedWatchlist(response.data);
    } catch (error) {
      console.error('Error fetching watchlist details:', error);
    }
  };

  const searchStocks = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get(`/search?q=${encodeURIComponent(query)}&include_stocks=true`);
      setSearchResults(response.data.stocks || []);
    } catch (error) {
      console.error('Error searching stocks:', error);
    }
  };

  const handleAddItem = async (stockId: string, symbol: string) => {
    if (!selectedWatchlist) return;

    try {
      await api.post(`/watchlists/${selectedWatchlist.id}/items`, {
        item_type: 'stock',
        item_id: stockId,
      });
      fetchWatchlistDetails(selectedWatchlist.id);
      setIsAddItemOpen(false);
      setSearchSymbol('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!selectedWatchlist) return;

    try {
      await api.delete(`/watchlists/${selectedWatchlist.id}/items/${itemId}`);
      fetchWatchlistDetails(selectedWatchlist.id);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const handleSetAlert = async () => {
    if (!selectedWatchlist || !selectedItem) return;

    try {
      await api.put(`/watchlists/${selectedWatchlist.id}/items/${selectedItem.id}/alerts`, {
        price_alert_above: alertAbove ? parseFloat(alertAbove) : null,
        price_alert_below: alertBelow ? parseFloat(alertBelow) : null,
      });
      fetchWatchlistDetails(selectedWatchlist.id);
      setIsSetAlertOpen(false);
      setSelectedItem(null);
      setAlertAbove('');
      setAlertBelow('');
    } catch (error) {
      console.error('Error setting alert:', error);
    }
  };

  const openAlertDialog = (item: WatchlistItem) => {
    setSelectedItem(item);
    setAlertAbove(item.price_alert_above?.toString() || '');
    setAlertBelow(item.price_alert_below?.toString() || '');
    setIsSetAlertOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-48 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-10 w-36 bg-muted animate-pulse rounded" />
        </div>
        <TableSkeleton rows={10} columns={6} />
      </div>
    );
  }

  if (watchlists.length === 0) {
    return (
      <EmptyState
        icon={Eye}
        title="No Watchlist Yet"
        description="Create a watchlist to track your favorite stocks"
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Watchlist
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Watchlist</h1>
          <p className="text-muted-foreground">
            Track stocks and set price alerts
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={selectedWatchlist?.id}
            onValueChange={(id) => fetchWatchlistDetails(id)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Watchlist" />
            </SelectTrigger>
            <SelectContent>
              {watchlists.map((watchlist) => (
                <SelectItem key={watchlist.id} value={watchlist.id}>
                  {watchlist.name} ({watchlist.items_count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedWatchlist && (
            <ExportDropdown type="watchlist" watchlistId={selectedWatchlist.id} />
          )}

          <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add to Watchlist</DialogTitle>
                <DialogDescription>
                  Search and add stocks to your watchlist
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by symbol or name..."
                    value={searchSymbol}
                    onChange={(e) => {
                      setSearchSymbol(e.target.value);
                      searchStocks(e.target.value);
                    }}
                    className="pl-10"
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {searchResults.map((stock) => (
                    <div
                      key={stock.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleAddItem(stock.id, stock.symbol)}
                    >
                      <div>
                        <p className="font-medium">{stock.symbol}</p>
                        <p className="text-sm text-muted-foreground">{stock.name}</p>
                      </div>
                      <p className="font-mono">Rs. {parseFloat(String(stock.current_price || 0)).toFixed(2)}</p>
                    </div>
                  ))}
                  {searchSymbol.length >= 2 && searchResults.length === 0 && (
                    <p className="text-center py-4 text-muted-foreground">
                      No stocks found
                    </p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Watchlist Items */}
      <Card>
        <CardHeader>
          <CardTitle>{selectedWatchlist?.name}</CardTitle>
          {selectedWatchlist?.description && (
            <CardDescription>{selectedWatchlist.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Symbol</th>
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-right py-3 px-4 font-medium">Price</th>
                  <th className="text-right py-3 px-4 font-medium">Change</th>
                  <th className="text-right py-3 px-4 font-medium">Volume</th>
                  <th className="text-center py-3 px-4 font-medium">Alerts</th>
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedWatchlist?.items?.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-medium">{item.symbol}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {item.name}
                    </td>
                    <td className="text-right py-3 px-4 font-mono">
                      Rs. {parseFloat(String(item.current_price || 0)).toFixed(2)}
                    </td>
                    <td className="text-right py-3 px-4">
                      <PriceDisplay
                        value={0}
                        change={item.change_amount}
                        changePercent={item.change_percentage}
                        size="sm"
                        showValue={false}
                      />
                    </td>
                    <td className="text-right py-3 px-4 font-mono text-sm">
                      {item.volume?.toLocaleString() || '-'}
                    </td>
                    <td className="text-center py-3 px-4">
                      {(item.price_alert_above || item.price_alert_below) ? (
                        <Badge variant="secondary" className="gap-1">
                          <Bell className="h-3 w-3" />
                          {item.price_alert_above && `↑${item.price_alert_above}`}
                          {item.price_alert_above && item.price_alert_below && ' / '}
                          {item.price_alert_below && `↓${item.price_alert_below}`}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <BellOff className="h-3 w-3" />
                          None
                        </Badge>
                      )}
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openAlertDialog(item)}
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(!selectedWatchlist?.items || selectedWatchlist.items.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                No items in this watchlist. Add some stocks to track!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Set Alert Dialog */}
      <Dialog open={isSetAlertOpen} onOpenChange={setIsSetAlertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Price Alert</DialogTitle>
            <DialogDescription>
              Get notified when {selectedItem?.symbol} reaches your target price
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Current Price</p>
              <p className="text-2xl font-bold">Rs. {parseFloat(String(selectedItem?.current_price || 0)).toFixed(2)}</p>
            </div>
            <div className="space-y-2">
              <Label>Alert when price goes above</Label>
              <Input
                type="number"
                value={alertAbove}
                onChange={(e) => setAlertAbove(e.target.value)}
                placeholder="e.g., 150.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Alert when price goes below</Label>
              <Input
                type="number"
                value={alertBelow}
                onChange={(e) => setAlertBelow(e.target.value)}
                placeholder="e.g., 100.00"
              />
            </div>
            <Button onClick={handleSetAlert} className="w-full">
              Save Alerts
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
