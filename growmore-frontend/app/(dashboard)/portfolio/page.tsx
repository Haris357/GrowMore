'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { StatCard } from '@/components/common/stat-card';
import { PriceDisplay } from '@/components/common/price-display';
import { EmptyState } from '@/components/common/empty-state';
import {
  Wallet, TrendingUp, TrendingDown, Plus, PieChart, BarChart3,
  Pencil, Trash2, ArrowUpDown
} from 'lucide-react';
import { api } from '@/lib/api';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Holding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avg_buy_price: number;
  current_price: number;
  total_invested: number;
  current_value: number;
  profit_loss: number;
  profit_loss_percent: number;
  holding_type: string;
}

interface Portfolio {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  total_invested: number;
  current_value: number;
  holdings: Holding[];
}

interface Transaction {
  id: string;
  transaction_type: 'buy' | 'sell';
  symbol: string;
  quantity: number;
  price: number;
  total_amount: number;
  fees: number;
  transaction_date: string;
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function PortfolioPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddHoldingOpen, setIsAddHoldingOpen] = useState(false);

  // Add holding form
  const [holdingType, setHoldingType] = useState<string>('stock');
  const [holdingSymbol, setHoldingSymbol] = useState('');
  const [holdingQty, setHoldingQty] = useState('');
  const [holdingPrice, setHoldingPrice] = useState('');

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const fetchPortfolios = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/portfolios');
      // Backend might return items (paginated) or portfolios or direct array
      const rawData = response.data?.items || response.data?.portfolios || response.data || [];
      const data = Array.isArray(rawData) ? rawData : [];
      setPortfolios(data);

      if (data.length > 0) {
        const defaultPortfolio = data.find((p: Portfolio) => p.is_default) || data[0];
        setSelectedPortfolio(defaultPortfolio);
        fetchTransactions(defaultPortfolio.id);
      }
    } catch (error) {
      console.error('Error fetching portfolios:', error);
      setPortfolios([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async (portfolioId: string) => {
    try {
      const response = await api.get(`/portfolios/${portfolioId}/transactions`);
      // Backend might return items (paginated) or transactions or direct array
      const data = response.data?.items || response.data?.transactions || response.data || [];
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    }
  };

  const handleAddHolding = async () => {
    if (!selectedPortfolio || !holdingSymbol || !holdingQty || !holdingPrice) return;

    try {
      await api.post(`/portfolios/${selectedPortfolio.id}/holdings`, {
        holding_type: holdingType,
        symbol: holdingSymbol.toUpperCase(),
        quantity: parseFloat(holdingQty),
        avg_buy_price: parseFloat(holdingPrice),
      });
      fetchPortfolios();
      setIsAddHoldingOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding holding:', error);
    }
  };

  const handleDeleteHolding = async (holdingId: string) => {
    if (!selectedPortfolio) return;

    try {
      await api.delete(`/portfolios/${selectedPortfolio.id}/holdings/${holdingId}`);
      fetchPortfolios();
    } catch (error) {
      console.error('Error deleting holding:', error);
    }
  };

  const resetForm = () => {
    setHoldingType('stock');
    setHoldingSymbol('');
    setHoldingQty('');
    setHoldingPrice('');
  };

  const getAllocationData = () => {
    if (!selectedPortfolio?.holdings) return [];

    const typeAllocation: Record<string, number> = {};
    selectedPortfolio.holdings.forEach((h) => {
      const type = h.holding_type || 'other';
      typeAllocation[type] = (typeAllocation[type] || 0) + h.current_value;
    });

    return Object.entries(typeAllocation).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" />;
  }

  if (portfolios.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No Portfolio Yet"
        description="Create your first portfolio to start tracking your investments"
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Portfolio
          </Button>
        }
      />
    );
  }

  const totalValue = selectedPortfolio?.current_value || 0;
  const totalInvested = selectedPortfolio?.total_invested || 0;
  const totalPL = totalValue - totalInvested;
  const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Portfolio</h1>
          <p className="text-muted-foreground">
            Track and manage your investments
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={selectedPortfolio?.id}
            onValueChange={(id) => {
              const portfolio = portfolios.find(p => p.id === id);
              setSelectedPortfolio(portfolio || null);
              if (portfolio) fetchTransactions(portfolio.id);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Portfolio" />
            </SelectTrigger>
            <SelectContent>
              {portfolios.map((portfolio) => (
                <SelectItem key={portfolio.id} value={portfolio.id}>
                  {portfolio.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isAddHoldingOpen} onOpenChange={setIsAddHoldingOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Holding
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Holding</DialogTitle>
                <DialogDescription>
                  Add a new investment to your portfolio
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={holdingType} onValueChange={setHoldingType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock">Stock</SelectItem>
                      <SelectItem value="commodity">Commodity</SelectItem>
                      <SelectItem value="bank_product">Bank Product</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Symbol</Label>
                  <Input
                    value={holdingSymbol}
                    onChange={(e) => setHoldingSymbol(e.target.value)}
                    placeholder="e.g., OGDC"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={holdingQty}
                      onChange={(e) => setHoldingQty(e.target.value)}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Avg. Buy Price</Label>
                    <Input
                      type="number"
                      value={holdingPrice}
                      onChange={(e) => setHoldingPrice(e.target.value)}
                      placeholder="150.00"
                    />
                  </div>
                </div>
                <Button onClick={handleAddHolding} className="w-full">
                  Add Holding
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Value"
          value={`Rs. ${totalValue.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`}
          icon={Wallet}
          trend={totalPL >= 0 ? 'up' : 'down'}
        />
        <StatCard
          title="Total Invested"
          value={`Rs. ${totalInvested.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`}
          icon={TrendingUp}
        />
        <StatCard
          title="Total P&L"
          value={`Rs. ${totalPL.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`}
          change={totalPLPercent}
          icon={totalPL >= 0 ? TrendingUp : TrendingDown}
          trend={totalPL >= 0 ? 'up' : 'down'}
        />
        <StatCard
          title="Holdings"
          value={selectedPortfolio?.holdings?.length || 0}
          icon={PieChart}
        />
      </div>

      <Tabs defaultValue="holdings">
        <TabsList>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="holdings" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Asset</th>
                      <th className="text-right py-3 px-4 font-medium">Qty</th>
                      <th className="text-right py-3 px-4 font-medium">Avg Cost</th>
                      <th className="text-right py-3 px-4 font-medium">Current</th>
                      <th className="text-right py-3 px-4 font-medium">Invested</th>
                      <th className="text-right py-3 px-4 font-medium">Value</th>
                      <th className="text-right py-3 px-4 font-medium">P&L</th>
                      <th className="text-right py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPortfolio?.holdings?.map((holding) => (
                      <tr key={holding.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <span className="font-medium">{holding.symbol}</span>
                            <p className="text-xs text-muted-foreground">{holding.name}</p>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 font-mono">
                          {holding.quantity}
                        </td>
                        <td className="text-right py-3 px-4 font-mono">
                          Rs. {parseFloat(String(holding.avg_buy_price || 0)).toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-4 font-mono">
                          Rs. {parseFloat(String(holding.current_price || 0)).toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-4 font-mono">
                          Rs. {parseFloat(String(holding.total_invested || 0)).toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4 font-mono">
                          Rs. {parseFloat(String(holding.current_value || 0)).toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4">
                          <PriceDisplay
                            value={0}
                            change={holding.profit_loss}
                            changePercent={holding.profit_loss_percent}
                            size="sm"
                            showValue={false}
                          />
                        </td>
                        <td className="text-right py-3 px-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteHolding(holding.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {(!selectedPortfolio?.holdings || selectedPortfolio.holdings.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground">
                    No holdings yet. Add your first investment!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={getAllocationData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {getAllocationData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `Rs. ${value.toLocaleString()}`}
                    />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getAllocationData().map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-mono">Rs. {item.value.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {((item.value / totalValue) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-left py-3 px-4 font-medium">Type</th>
                      <th className="text-left py-3 px-4 font-medium">Asset</th>
                      <th className="text-right py-3 px-4 font-medium">Qty</th>
                      <th className="text-right py-3 px-4 font-medium">Price</th>
                      <th className="text-right py-3 px-4 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 text-sm">
                          {new Date(tx.transaction_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={tx.transaction_type === 'buy' ? 'default' : 'destructive'}>
                            {tx.transaction_type.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-medium">{tx.symbol}</td>
                        <td className="text-right py-3 px-4 font-mono">{tx.quantity}</td>
                        <td className="text-right py-3 px-4 font-mono">
                          Rs. {parseFloat(String(tx.price || 0)).toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-4 font-mono">
                          Rs. {parseFloat(String(tx.total_amount || 0)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {transactions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No transactions recorded yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
