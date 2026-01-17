'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCardSkeleton, CardSkeleton } from '@/components/common/skeletons';
import { PriceDisplay } from '@/components/common/price-display';
import { Coins, TrendingUp, TrendingDown, Calculator } from 'lucide-react';
import { api } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Commodity {
  id: string;
  name: string;
  current_price: number;
  change_amount: number;
  change_percentage: number;
  high_24h: number;
  low_24h: number;
  last_updated: string;
}

interface CommodityHistory {
  date: string;
  price: number;
}

export default function CommoditiesPage() {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [goldHistory, setGoldHistory] = useState<CommodityHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('1M');

  // Calculator state
  const [calcWeight, setCalcWeight] = useState<string>('1');
  const [calcUnit, setCalcUnit] = useState<'tola' | 'gram'>('tola');
  const [calcPurity, setCalcPurity] = useState<string>('24');

  useEffect(() => {
    fetchCommodities();
  }, []);

  useEffect(() => {
    if (commodities.length > 0) {
      fetchGoldHistory();
    }
  }, [selectedPeriod, commodities]);

  const fetchCommodities = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/commodities');
      // Backend returns PaginatedResponse with 'items' key
      const data = response.data?.items || response.data?.commodities || response.data || [];
      setCommodities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching commodities:', error);
      setCommodities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGoldHistory = async () => {
    try {
      const goldCommodity = commodities.find(c => c.name.toLowerCase().includes('gold') && c.name.includes('24'));
      if (goldCommodity) {
        const response = await api.get(`/commodities/${goldCommodity.id}/history?period=${selectedPeriod}`);
        setGoldHistory(response.data.history || []);
      }
    } catch (error) {
      console.error('Error fetching gold history:', error);
    }
  };

  // Safe array operations with null checks
  const gold24k = Array.isArray(commodities) ? commodities.find(c => c.name?.toLowerCase().includes('gold') && c.name?.includes('24')) : undefined;
  const gold22k = Array.isArray(commodities) ? commodities.find(c => c.name?.toLowerCase().includes('gold') && c.name?.includes('22')) : undefined;
  const silver = Array.isArray(commodities) ? commodities.find(c => c.name?.toLowerCase().includes('silver')) : undefined;

  const calculateValue = () => {
    if (!gold24k) return 0;
    const weight = parseFloat(calcWeight) || 0;
    const purityMultiplier = parseInt(calcPurity) / 24;
    const price = parseFloat(String(gold24k.current_price || 0));
    const pricePerTola = price * purityMultiplier;

    if (calcUnit === 'tola') {
      return weight * pricePerTola;
    } else {
      // 1 tola = 11.6638 grams
      return (weight / 11.6638) * pricePerTola;
    }
  };

  const calculateZakat = () => {
    const value = calculateValue();
    return value * 0.025; // 2.5% zakat
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gold & Silver Prices</h1>
        <p className="text-muted-foreground">
          Live precious metal rates in Pakistan (PKR per tola)
        </p>
      </div>

      {/* Main Price Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {gold24k && (
          <Card className="border-yellow-200 dark:border-yellow-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Coins className="h-5 w-5 text-yellow-500" />
                  24K Gold
                </CardTitle>
                <Badge variant="secondary">Per Tola</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <PriceDisplay
                value={gold24k.current_price}
                change={gold24k.change_amount}
                changePercent={gold24k.change_percentage}
                size="lg"
              />
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">High 24h:</span>
                  <span className="ml-2 font-medium">Rs. {gold24k.high_24h?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Low 24h:</span>
                  <span className="ml-2 font-medium">Rs. {gold24k.low_24h?.toLocaleString()}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Per gram: Rs. {(parseFloat(String(gold24k.current_price || 0)) / 11.6638).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        )}

        {gold22k && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Coins className="h-5 w-5 text-yellow-600" />
                  22K Gold
                </CardTitle>
                <Badge variant="secondary">Per Tola</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <PriceDisplay
                value={gold22k.current_price}
                change={gold22k.change_amount}
                changePercent={gold22k.change_percentage}
                size="lg"
              />
              <p className="text-xs text-muted-foreground mt-4">
                Per gram: Rs. {(parseFloat(String(gold22k.current_price || 0)) / 11.6638).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        )}

        {silver && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Coins className="h-5 w-5 text-gray-400" />
                  Silver
                </CardTitle>
                <Badge variant="secondary">Per Tola</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <PriceDisplay
                value={silver.current_price}
                change={silver.change_amount}
                changePercent={silver.change_percentage}
                size="lg"
              />
              <p className="text-xs text-muted-foreground mt-4">
                Per gram: Rs. {(parseFloat(String(silver.current_price || 0)) / 11.6638).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Price Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Price History</CardTitle>
              <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <TabsList>
                  <TabsTrigger value="1W">1W</TabsTrigger>
                  <TabsTrigger value="1M">1M</TabsTrigger>
                  <TabsTrigger value="3M">3M</TabsTrigger>
                  <TabsTrigger value="6M">6M</TabsTrigger>
                  <TabsTrigger value="1Y">1Y</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {goldHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={goldHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}
                    className="text-xs"
                  />
                  <YAxis
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    className="text-xs"
                  />
                  <Tooltip
                    formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, 'Price']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No historical data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Gold Calculator
            </CardTitle>
            <CardDescription>
              Calculate value and zakat
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                type="number"
                value={calcWeight}
                onChange={(e) => setCalcWeight(e.target.value)}
                placeholder="Enter weight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select value={calcUnit} onValueChange={(v: 'tola' | 'gram') => setCalcUnit(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tola">Tola</SelectItem>
                  <SelectItem value="gram">Gram</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purity">Purity</Label>
              <Select value={calcPurity} onValueChange={setCalcPurity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24K (Pure)</SelectItem>
                  <SelectItem value="22">22K</SelectItem>
                  <SelectItem value="21">21K</SelectItem>
                  <SelectItem value="18">18K</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 space-y-3 border-t">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Value:</span>
                <span className="font-bold text-lg">
                  Rs. {calculateValue().toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zakat (2.5%):</span>
                <span className="font-medium text-green-600">
                  Rs. {calculateZakat().toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Commodities Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Commodities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-right py-3 px-4 font-medium">Price (PKR)</th>
                  <th className="text-right py-3 px-4 font-medium">Change</th>
                  <th className="text-right py-3 px-4 font-medium">24h High</th>
                  <th className="text-right py-3 px-4 font-medium">24h Low</th>
                </tr>
              </thead>
              <tbody>
                {commodities.map((commodity) => (
                  <tr key={commodity.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-yellow-500" />
                        {commodity.name || '-'}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-mono">
                      Rs. {parseFloat(String(commodity.current_price || 0)).toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4">
                      <PriceDisplay
                        value={0}
                        currency=""
                        change={commodity.change_amount}
                        changePercent={commodity.change_percentage}
                        size="sm"
                      />
                    </td>
                    <td className="text-right py-3 px-4 font-mono text-sm">
                      {commodity.high_24h ? `Rs. ${parseFloat(String(commodity.high_24h)).toLocaleString()}` : '-'}
                    </td>
                    <td className="text-right py-3 px-4 font-mono text-sm">
                      {commodity.low_24h ? `Rs. ${parseFloat(String(commodity.low_24h)).toLocaleString()}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
