'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Calculator, TrendingUp, PiggyBank, Percent, Target,
  Coins, Building2, CreditCard, BarChart3, Scale,
  ArrowRightLeft, Banknote, Sparkles, Loader2
} from 'lucide-react';
import { api } from '@/lib/api';

export default function CalculatorsPage() {
  const [activeTab, setActiveTab] = useState('stock');
  const [isCalculating, setIsCalculating] = useState(false);

  // Stock Return Calculator
  const [stockInputs, setStockInputs] = useState({
    buy_price: 100,
    sell_price: 120,
    quantity: 100,
    holding_days: 365,
    buy_commission: 0,
    sell_commission: 0,
    cgt_rate: 0.15,
  });
  const [stockResult, setStockResult] = useState<any>(null);

  // Dividend Income Calculator
  const [dividendInputs, setDividendInputs] = useState({
    price_per_share: 100,
    quantity: 100,
    dividend_yield: 5,
    years: 5,
    reinvest: false,
    expected_price_growth: 5,
  });
  const [dividendResult, setDividendResult] = useState<any>(null);

  // Gold Return Calculator
  const [goldInputs, setGoldInputs] = useState({
    buy_price: 250000,
    sell_price: 280000,
    weight: 1,
    weight_unit: 'tola',
    purity: '24k',
  });
  const [goldResult, setGoldResult] = useState<any>(null);

  // Gold Zakat Calculator
  const [zakatInputs, setZakatInputs] = useState({
    weight: 10,
    weight_unit: 'tola',
    current_price: 280000,
    purity: '24k',
  });
  const [zakatResult, setZakatResult] = useState<any>(null);

  // FD Maturity Calculator
  const [fdInputs, setFdInputs] = useState({
    principal: 100000,
    annual_rate: 15,
    tenure_days: 365,
    compounding: 'quarterly',
  });
  const [fdResult, setFdResult] = useState<any>(null);

  // Savings Growth Calculator
  const [savingsInputs, setSavingsInputs] = useState({
    initial_deposit: 50000,
    monthly_deposit: 10000,
    annual_rate: 12,
    months: 24,
  });
  const [savingsResult, setSavingsResult] = useState<any>(null);

  // Loan EMI Calculator
  const [loanInputs, setLoanInputs] = useState({
    principal: 1000000,
    annual_rate: 18,
    tenure_months: 36,
  });
  const [loanResult, setLoanResult] = useState<any>(null);

  // Goal Calculator (client-side)
  const [goalInputs, setGoalInputs] = useState({
    targetAmount: 10000000,
    years: 10,
    expectedReturn: 15,
  });
  const [goalResult, setGoalResult] = useState<any>(null);

  // Compare Investments
  const [compareInputs, setCompareInputs] = useState({
    amount: 100000,
    period_years: 5,
    options: [
      { name: 'Fixed Deposit', type: 'fd', rate: 15 },
      { name: 'Stocks', type: 'stock', rate: 20 },
      { name: 'Gold', type: 'gold', rate: 10 },
    ],
  });
  const [compareResult, setCompareResult] = useState<any>(null);

  // Real Return Calculator
  const [realReturnInputs, setRealReturnInputs] = useState({
    nominal_return: 15,
    inflation_rate: 10,
  });
  const [realReturnResult, setRealReturnResult] = useState<any>(null);

  // DCA Simulation
  const [dcaInputs, setDcaInputs] = useState({
    monthly_amount: 10000,
    months: 12,
    price_history: [100, 105, 98, 110, 95, 115, 120, 105, 125, 130, 128, 135],
  });
  const [dcaResult, setDcaResult] = useState<any>(null);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `Rs. ${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `Rs. ${(amount / 100000).toFixed(2)} L`;
    }
    return `Rs. ${amount.toLocaleString('en-PK')}`;
  };

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  // API Calculator Functions
  const calculateStockReturn = async () => {
    setIsCalculating(true);
    try {
      const response = await api.post('/calculators/stock-return', stockInputs);
      setStockResult(response.data);
    } catch (error) {
      console.error('Error calculating stock return:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateDividendIncome = async () => {
    setIsCalculating(true);
    try {
      const response = await api.post('/calculators/dividend-income', dividendInputs);
      setDividendResult(response.data);
    } catch (error) {
      console.error('Error calculating dividend income:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateGoldReturn = async () => {
    setIsCalculating(true);
    try {
      const response = await api.post('/calculators/gold-return', goldInputs);
      setGoldResult(response.data);
    } catch (error) {
      console.error('Error calculating gold return:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateZakat = async () => {
    setIsCalculating(true);
    try {
      const response = await api.post('/calculators/gold-zakat', zakatInputs);
      setZakatResult(response.data);
    } catch (error) {
      console.error('Error calculating zakat:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateFDMaturity = async () => {
    setIsCalculating(true);
    try {
      const response = await api.post('/calculators/fd-maturity', fdInputs);
      setFdResult(response.data);
    } catch (error) {
      console.error('Error calculating FD maturity:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateSavingsGrowth = async () => {
    setIsCalculating(true);
    try {
      const response = await api.post('/calculators/savings-growth', savingsInputs);
      setSavingsResult(response.data);
    } catch (error) {
      console.error('Error calculating savings growth:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateLoanEMI = async () => {
    setIsCalculating(true);
    try {
      const response = await api.post('/calculators/loan-emi', loanInputs);
      setLoanResult(response.data);
    } catch (error) {
      console.error('Error calculating loan EMI:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateGoal = () => {
    const { targetAmount, years, expectedReturn } = goalInputs;
    const monthlyRate = expectedReturn / 12 / 100;
    const months = years * 12;

    // Monthly SIP required
    const monthlySip = targetAmount / (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));

    // Lumpsum required
    const lumpsumRequired = targetAmount / Math.pow(1 + expectedReturn / 100, years);

    setGoalResult({
      monthlySip: Math.round(monthlySip),
      lumpsumRequired: Math.round(lumpsumRequired),
      totalSipInvestment: Math.round(monthlySip * months),
      sipReturns: Math.round(targetAmount - monthlySip * months),
      lumpsumReturns: Math.round(targetAmount - lumpsumRequired),
    });
  };

  const calculateCompareInvestments = async () => {
    setIsCalculating(true);
    try {
      const response = await api.post('/calculators/compare-investments', compareInputs);
      setCompareResult(response.data);
    } catch (error) {
      console.error('Error comparing investments:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateRealReturn = async () => {
    setIsCalculating(true);
    try {
      const response = await api.get('/calculators/real-return', {
        params: realReturnInputs
      });
      setRealReturnResult(response.data);
    } catch (error) {
      console.error('Error calculating real return:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateDCA = async () => {
    setIsCalculating(true);
    try {
      const response = await api.post('/calculators/dca-simulation', dcaInputs);
      setDcaResult(response.data);
    } catch (error) {
      console.error('Error calculating DCA:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Financial Calculators</h1>
        <p className="text-muted-foreground">
          Plan your investments with our powerful calculators integrated with real-time data
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="stock" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Stock Return</span>
            <span className="sm:hidden">Stock</span>
          </TabsTrigger>
          <TabsTrigger value="dividend" className="gap-2">
            <Banknote className="h-4 w-4" />
            <span className="hidden sm:inline">Dividend</span>
            <span className="sm:hidden">Div</span>
          </TabsTrigger>
          <TabsTrigger value="gold" className="gap-2">
            <Coins className="h-4 w-4" />
            <span className="hidden sm:inline">Gold</span>
          </TabsTrigger>
          <TabsTrigger value="zakat" className="gap-2">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Zakat</span>
          </TabsTrigger>
          <TabsTrigger value="fd" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">FD</span>
          </TabsTrigger>
          <TabsTrigger value="savings" className="gap-2">
            <PiggyBank className="h-4 w-4" />
            <span className="hidden sm:inline">Savings</span>
          </TabsTrigger>
          <TabsTrigger value="loan" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Loan EMI</span>
            <span className="sm:hidden">Loan</span>
          </TabsTrigger>
          <TabsTrigger value="goal" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Goal</span>
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Compare</span>
          </TabsTrigger>
          <TabsTrigger value="real-return" className="gap-2">
            <Percent className="h-4 w-4" />
            <span className="hidden sm:inline">Real Return</span>
          </TabsTrigger>
          <TabsTrigger value="dca" className="gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            <span className="hidden sm:inline">DCA</span>
          </TabsTrigger>
        </TabsList>

        {/* Stock Return Calculator */}
        <TabsContent value="stock">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Stock Return Calculator
                </CardTitle>
                <CardDescription>
                  Calculate your stock investment returns including CGT
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Buy Price (Rs.)</Label>
                    <Input
                      type="number"
                      value={stockInputs.buy_price}
                      onChange={(e) => setStockInputs({ ...stockInputs, buy_price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sell Price (Rs.)</Label>
                    <Input
                      type="number"
                      value={stockInputs.sell_price}
                      onChange={(e) => setStockInputs({ ...stockInputs, sell_price: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={stockInputs.quantity}
                      onChange={(e) => setStockInputs({ ...stockInputs, quantity: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Holding Period (Days)</Label>
                    <Input
                      type="number"
                      value={stockInputs.holding_days}
                      onChange={(e) => setStockInputs({ ...stockInputs, holding_days: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Buy Commission (Rs.)</Label>
                    <Input
                      type="number"
                      value={stockInputs.buy_commission}
                      onChange={(e) => setStockInputs({ ...stockInputs, buy_commission: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sell Commission (Rs.)</Label>
                    <Input
                      type="number"
                      value={stockInputs.sell_commission}
                      onChange={(e) => setStockInputs({ ...stockInputs, sell_commission: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>CGT Rate</Label>
                    <span className="text-sm font-medium">{(stockInputs.cgt_rate * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[stockInputs.cgt_rate * 100]}
                    onValueChange={([value]) => setStockInputs({ ...stockInputs, cgt_rate: value / 100 })}
                    min={0}
                    max={30}
                    step={1}
                  />
                </div>

                <Button onClick={calculateStockReturn} className="w-full" disabled={isCalculating}>
                  {isCalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                  Calculate Return
                </Button>
              </CardContent>
            </Card>

            {stockResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Stock Return Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted text-center">
                      <p className="text-sm text-muted-foreground">Total Invested</p>
                      <p className="text-xl font-bold">{formatCurrency(stockResult.total_invested)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted text-center">
                      <p className="text-sm text-muted-foreground">Total Received</p>
                      <p className="text-xl font-bold">{formatCurrency(stockResult.total_received)}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gross Profit</span>
                      <span className={`font-medium ${stockResult.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(stockResult.gross_profit)} ({formatPercent(stockResult.gross_return_percentage)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Capital Gains Tax</span>
                      <span className="font-medium text-red-600">-{formatCurrency(stockResult.capital_gains_tax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Commissions</span>
                      <span className="font-medium text-red-600">-{formatCurrency(stockResult.total_commissions)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-medium">Net Profit</span>
                      <span className={`text-xl font-bold ${stockResult.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(stockResult.net_profit)}
                      </span>
                    </div>
                    {stockResult.annualized_return && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Annualized Return</span>
                        <Badge variant="secondary">{formatPercent(stockResult.annualized_return)}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Dividend Income Calculator */}
        <TabsContent value="dividend">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" />
                  Dividend Income Calculator
                </CardTitle>
                <CardDescription>
                  Calculate expected dividend income over time
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price per Share (Rs.)</Label>
                    <Input
                      type="number"
                      value={dividendInputs.price_per_share}
                      onChange={(e) => setDividendInputs({ ...dividendInputs, price_per_share: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={dividendInputs.quantity}
                      onChange={(e) => setDividendInputs({ ...dividendInputs, quantity: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dividend Yield (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={dividendInputs.dividend_yield}
                      onChange={(e) => setDividendInputs({ ...dividendInputs, dividend_yield: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Investment Period (Years)</Label>
                    <Input
                      type="number"
                      value={dividendInputs.years}
                      onChange={(e) => setDividendInputs({ ...dividendInputs, years: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Expected Price Growth (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={dividendInputs.expected_price_growth}
                    onChange={(e) => setDividendInputs({ ...dividendInputs, expected_price_growth: Number(e.target.value) })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Reinvest Dividends (DRIP)</Label>
                    <p className="text-sm text-muted-foreground">Automatically reinvest dividends to buy more shares</p>
                  </div>
                  <Switch
                    checked={dividendInputs.reinvest}
                    onCheckedChange={(checked) => setDividendInputs({ ...dividendInputs, reinvest: checked })}
                  />
                </div>

                <Button onClick={calculateDividendIncome} className="w-full" disabled={isCalculating}>
                  {isCalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                  Calculate Income
                </Button>
              </CardContent>
            </Card>

            {dividendResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Dividend Income Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted text-center">
                      <p className="text-sm text-muted-foreground">Initial Investment</p>
                      <p className="text-xl font-bold">{formatCurrency(dividendResult.initial_investment)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-500/10 text-center">
                      <p className="text-sm text-muted-foreground">Total Dividends</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(dividendResult.total_dividends)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-primary/10 text-center">
                      <p className="text-sm text-muted-foreground">Final Portfolio Value</p>
                      <p className="text-xl font-bold text-primary">{formatCurrency(dividendResult.final_value)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted text-center">
                      <p className="text-sm text-muted-foreground">Total Return</p>
                      <p className="text-xl font-bold">{formatPercent(dividendResult.total_return_percentage)}</p>
                    </div>
                  </div>

                  {dividendResult.yearly_breakdown && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Yearly Breakdown</h4>
                      <div className="max-h-[200px] overflow-y-auto space-y-2">
                        {dividendResult.yearly_breakdown.map((item: any) => (
                          <div key={item.year} className="flex justify-between items-center text-sm p-2 rounded bg-muted/50">
                            <span>Year {item.year}</span>
                            <div className="text-right">
                              <span className="font-medium text-green-600">{formatCurrency(item.dividend)}</span>
                              <span className="text-muted-foreground ml-2">({item.shares.toFixed(0)} shares)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Gold Return Calculator */}
        <TabsContent value="gold">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-yellow-500" />
                  Gold Return Calculator
                </CardTitle>
                <CardDescription>
                  Calculate your gold investment returns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Buy Price (Rs. per tola)</Label>
                    <Input
                      type="number"
                      value={goldInputs.buy_price}
                      onChange={(e) => setGoldInputs({ ...goldInputs, buy_price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sell Price (Rs. per tola)</Label>
                    <Input
                      type="number"
                      value={goldInputs.sell_price}
                      onChange={(e) => setGoldInputs({ ...goldInputs, sell_price: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Weight</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={goldInputs.weight}
                      onChange={(e) => setGoldInputs({ ...goldInputs, weight: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select value={goldInputs.weight_unit} onValueChange={(value) => setGoldInputs({ ...goldInputs, weight_unit: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tola">Tola</SelectItem>
                        <SelectItem value="gram">Gram</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Purity</Label>
                  <Select value={goldInputs.purity} onValueChange={(value) => setGoldInputs({ ...goldInputs, purity: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24k">24K (Pure Gold)</SelectItem>
                      <SelectItem value="22k">22K</SelectItem>
                      <SelectItem value="21k">21K</SelectItem>
                      <SelectItem value="18k">18K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={calculateGoldReturn} className="w-full" disabled={isCalculating}>
                  {isCalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                  Calculate Return
                </Button>
              </CardContent>
            </Card>

            {goldResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Gold Return Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted text-center">
                      <p className="text-sm text-muted-foreground">Total Invested</p>
                      <p className="text-xl font-bold">{formatCurrency(goldResult.total_invested)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-yellow-500/10 text-center">
                      <p className="text-sm text-muted-foreground">Total Received</p>
                      <p className="text-xl font-bold text-yellow-600">{formatCurrency(goldResult.total_received)}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-primary/10 text-center">
                    <p className="text-sm text-muted-foreground">Profit/Loss</p>
                    <p className={`text-2xl font-bold ${goldResult.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(goldResult.profit_loss)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Return: {formatPercent(goldResult.return_percentage)}
                    </p>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Weight in Grams</span>
                    <span className="font-medium">{goldResult.weight_grams?.toFixed(2)}g</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Zakat Calculator */}
        <TabsContent value="zakat">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  Gold Zakat Calculator
                </CardTitle>
                <CardDescription>
                  Calculate Zakat on your gold holdings (Nisab: 7.5 tola)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gold Weight</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={zakatInputs.weight}
                      onChange={(e) => setZakatInputs({ ...zakatInputs, weight: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select value={zakatInputs.weight_unit} onValueChange={(value) => setZakatInputs({ ...zakatInputs, weight_unit: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tola">Tola</SelectItem>
                        <SelectItem value="gram">Gram</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Current Gold Price (Rs. per tola)</Label>
                  <Input
                    type="number"
                    value={zakatInputs.current_price}
                    onChange={(e) => setZakatInputs({ ...zakatInputs, current_price: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Purity</Label>
                  <Select value={zakatInputs.purity} onValueChange={(value) => setZakatInputs({ ...zakatInputs, purity: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24k">24K (Pure Gold)</SelectItem>
                      <SelectItem value="22k">22K</SelectItem>
                      <SelectItem value="21k">21K</SelectItem>
                      <SelectItem value="18k">18K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={calculateZakat} className="w-full" disabled={isCalculating}>
                  {isCalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                  Calculate Zakat
                </Button>
              </CardContent>
            </Card>

            {zakatResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Zakat Calculation Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`p-4 rounded-lg ${zakatResult.is_nisab_applicable ? 'bg-green-500/10' : 'bg-muted'} text-center`}>
                    <p className="text-sm text-muted-foreground">Nisab Status</p>
                    <p className={`text-xl font-bold ${zakatResult.is_nisab_applicable ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {zakatResult.is_nisab_applicable ? 'Zakat Applicable' : 'Below Nisab Threshold'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted text-center">
                      <p className="text-sm text-muted-foreground">Total Gold Value</p>
                      <p className="text-xl font-bold">{formatCurrency(zakatResult.total_value)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-primary/10 text-center">
                      <p className="text-sm text-muted-foreground">Zakat Amount (2.5%)</p>
                      <p className="text-xl font-bold text-primary">{formatCurrency(zakatResult.zakat_amount)}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weight in Tola</span>
                      <span className="font-medium">{zakatResult.weight_tola?.toFixed(2)} tola</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weight in Grams</span>
                      <span className="font-medium">{zakatResult.weight_grams?.toFixed(2)}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nisab Threshold</span>
                      <span className="font-medium">7.5 tola (87.48g)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* FD Calculator */}
        <TabsContent value="fd">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Fixed Deposit Calculator
                </CardTitle>
                <CardDescription>
                  Calculate maturity amount for your FD
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Principal Amount (Rs.)</Label>
                  <Input
                    type="number"
                    value={fdInputs.principal}
                    onChange={(e) => setFdInputs({ ...fdInputs, principal: Number(e.target.value) })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Annual Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={fdInputs.annual_rate}
                      onChange={(e) => setFdInputs({ ...fdInputs, annual_rate: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tenure (Days)</Label>
                    <Input
                      type="number"
                      value={fdInputs.tenure_days}
                      onChange={(e) => setFdInputs({ ...fdInputs, tenure_days: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Compounding Frequency</Label>
                  <Select value={fdInputs.compounding} onValueChange={(value) => setFdInputs({ ...fdInputs, compounding: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple Interest</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="semi_annually">Semi-Annually</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={calculateFDMaturity} className="w-full" disabled={isCalculating}>
                  {isCalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                  Calculate Maturity
                </Button>
              </CardContent>
            </Card>

            {fdResult && (
              <Card>
                <CardHeader>
                  <CardTitle>FD Maturity Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted text-center">
                      <p className="text-sm text-muted-foreground">Principal</p>
                      <p className="text-lg font-bold">{formatCurrency(fdResult.principal)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-500/10 text-center">
                      <p className="text-sm text-muted-foreground">Interest</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(fdResult.total_interest)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-primary/10 text-center">
                      <p className="text-sm text-muted-foreground">Maturity</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(fdResult.maturity_amount)}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Effective Annual Rate</span>
                      <Badge variant="secondary">{formatPercent(fdResult.effective_annual_rate)}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tenure</span>
                      <span className="font-medium">{fdResult.tenure_days} days ({(fdResult.tenure_days / 30).toFixed(1)} months)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Savings Growth Calculator */}
        <TabsContent value="savings">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PiggyBank className="h-5 w-5 text-primary" />
                  Savings Growth Calculator
                </CardTitle>
                <CardDescription>
                  Calculate how your savings will grow with regular deposits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Initial Deposit (Rs.)</Label>
                    <Input
                      type="number"
                      value={savingsInputs.initial_deposit}
                      onChange={(e) => setSavingsInputs({ ...savingsInputs, initial_deposit: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Deposit (Rs.)</Label>
                    <Input
                      type="number"
                      value={savingsInputs.monthly_deposit}
                      onChange={(e) => setSavingsInputs({ ...savingsInputs, monthly_deposit: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Annual Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={savingsInputs.annual_rate}
                      onChange={(e) => setSavingsInputs({ ...savingsInputs, annual_rate: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Period (Months)</Label>
                    <Input
                      type="number"
                      value={savingsInputs.months}
                      onChange={(e) => setSavingsInputs({ ...savingsInputs, months: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <Button onClick={calculateSavingsGrowth} className="w-full" disabled={isCalculating}>
                  {isCalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                  Calculate Growth
                </Button>
              </CardContent>
            </Card>

            {savingsResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Savings Growth Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted text-center">
                      <p className="text-sm text-muted-foreground">Total Deposits</p>
                      <p className="text-lg font-bold">{formatCurrency(savingsResult.total_deposits)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-500/10 text-center">
                      <p className="text-sm text-muted-foreground">Interest Earned</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(savingsResult.total_interest)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-primary/10 text-center">
                      <p className="text-sm text-muted-foreground">Final Balance</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(savingsResult.final_balance)}</p>
                    </div>
                  </div>

                  {savingsResult.monthly_breakdown && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Monthly Progress (Last 6 months)</h4>
                      <div className="max-h-[200px] overflow-y-auto space-y-2">
                        {savingsResult.monthly_breakdown.slice(-6).map((item: any) => (
                          <div key={item.month} className="flex justify-between items-center text-sm p-2 rounded bg-muted/50">
                            <span>Month {item.month}</span>
                            <div className="text-right">
                              <span className="font-medium">{formatCurrency(item.balance)}</span>
                              <span className="text-green-600 ml-2">(+{formatCurrency(item.interest)})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Loan EMI Calculator */}
        <TabsContent value="loan">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Loan EMI Calculator
                </CardTitle>
                <CardDescription>
                  Calculate your monthly loan installment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Loan Amount (Rs.)</Label>
                  <Input
                    type="number"
                    value={loanInputs.principal}
                    onChange={(e) => setLoanInputs({ ...loanInputs, principal: Number(e.target.value) })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Annual Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={loanInputs.annual_rate}
                      onChange={(e) => setLoanInputs({ ...loanInputs, annual_rate: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tenure (Months)</Label>
                    <Input
                      type="number"
                      value={loanInputs.tenure_months}
                      onChange={(e) => setLoanInputs({ ...loanInputs, tenure_months: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <Button onClick={calculateLoanEMI} className="w-full" disabled={isCalculating}>
                  {isCalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                  Calculate EMI
                </Button>
              </CardContent>
            </Card>

            {loanResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Loan EMI Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-6 rounded-lg bg-primary/10 text-center">
                    <p className="text-sm text-muted-foreground">Monthly EMI</p>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(loanResult.monthly_emi)}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted text-center">
                      <p className="text-sm text-muted-foreground">Principal</p>
                      <p className="text-lg font-bold">{formatCurrency(loanResult.principal)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-red-500/10 text-center">
                      <p className="text-sm text-muted-foreground">Total Interest</p>
                      <p className="text-lg font-bold text-red-600">{formatCurrency(loanResult.total_interest)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted text-center">
                      <p className="text-sm text-muted-foreground">Total Payment</p>
                      <p className="text-lg font-bold">{formatCurrency(loanResult.total_payment)}</p>
                    </div>
                  </div>

                  {loanResult.amortization_schedule && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Amortization Schedule (First 12 months)</h4>
                      <div className="max-h-[200px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="p-2 text-left">Month</th>
                              <th className="p-2 text-right">Principal</th>
                              <th className="p-2 text-right">Interest</th>
                              <th className="p-2 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loanResult.amortization_schedule.map((item: any) => (
                              <tr key={item.month} className="border-b">
                                <td className="p-2">{item.month}</td>
                                <td className="p-2 text-right">{formatCurrency(item.principal_component)}</td>
                                <td className="p-2 text-right text-red-600">{formatCurrency(item.interest_component)}</td>
                                <td className="p-2 text-right">{formatCurrency(item.remaining_balance)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Goal Calculator */}
        <TabsContent value="goal">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Goal Calculator
                </CardTitle>
                <CardDescription>
                  Calculate how much you need to invest to reach your goal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Target Amount</Label>
                    <span className="text-sm font-medium">{formatCurrency(goalInputs.targetAmount)}</span>
                  </div>
                  <Slider
                    value={[goalInputs.targetAmount]}
                    onValueChange={([value]) => setGoalInputs({ ...goalInputs, targetAmount: value })}
                    min={100000}
                    max={100000000}
                    step={100000}
                  />
                  <Input
                    type="number"
                    value={goalInputs.targetAmount}
                    onChange={(e) => setGoalInputs({ ...goalInputs, targetAmount: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Time Period (Years)</Label>
                    <span className="text-sm font-medium">{goalInputs.years} years</span>
                  </div>
                  <Slider
                    value={[goalInputs.years]}
                    onValueChange={([value]) => setGoalInputs({ ...goalInputs, years: value })}
                    min={1}
                    max={30}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Expected Annual Return (%)</Label>
                    <span className="text-sm font-medium">{goalInputs.expectedReturn}%</span>
                  </div>
                  <Slider
                    value={[goalInputs.expectedReturn]}
                    onValueChange={([value]) => setGoalInputs({ ...goalInputs, expectedReturn: value })}
                    min={1}
                    max={30}
                    step={0.5}
                  />
                </div>

                <Button onClick={calculateGoal} className="w-full">
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate Required Investment
                </Button>
              </CardContent>
            </Card>

            {goalResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Investment Required</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-6 rounded-lg bg-primary/10 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Target Goal</p>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(goalInputs.targetAmount)}</p>
                    <p className="text-sm text-muted-foreground mt-2">in {goalInputs.years} years @ {goalInputs.expectedReturn}% return</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-green-500/10 text-center">
                      <p className="text-sm text-muted-foreground">Monthly SIP Required</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(goalResult.monthlySip)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Investment: {formatCurrency(goalResult.totalSipInvestment)}
                      </p>
                      <p className="text-xs text-green-600">
                        Returns: {formatCurrency(goalResult.sipReturns)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-500/10 text-center">
                      <p className="text-sm text-muted-foreground">Lumpsum Required</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(goalResult.lumpsumRequired)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        One-time investment
                      </p>
                      <p className="text-xs text-green-600">
                        Returns: {formatCurrency(goalResult.lumpsumReturns)}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground text-center">
                    Invest {formatCurrency(goalResult.monthlySip)}/month via SIP or {formatCurrency(goalResult.lumpsumRequired)} as one-time investment to reach your goal.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Compare Investments Calculator */}
        <TabsContent value="compare">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Compare Investments
                </CardTitle>
                <CardDescription>
                  Compare returns across different investment options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Investment Amount (Rs.)</Label>
                    <Input
                      type="number"
                      value={compareInputs.amount}
                      onChange={(e) => setCompareInputs({ ...compareInputs, amount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Period (Years)</Label>
                    <Input
                      type="number"
                      value={compareInputs.period_years}
                      onChange={(e) => setCompareInputs({ ...compareInputs, period_years: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Investment Options</Label>
                  {compareInputs.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option.name}
                        onChange={(e) => {
                          const newOptions = [...compareInputs.options];
                          newOptions[index].name = e.target.value;
                          setCompareInputs({ ...compareInputs, options: newOptions });
                        }}
                        placeholder="Name"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={option.rate}
                        onChange={(e) => {
                          const newOptions = [...compareInputs.options];
                          newOptions[index].rate = Number(e.target.value);
                          setCompareInputs({ ...compareInputs, options: newOptions });
                        }}
                        placeholder="Rate %"
                        className="w-24"
                      />
                    </div>
                  ))}
                </div>

                <Button onClick={calculateCompareInvestments} className="w-full" disabled={isCalculating}>
                  {isCalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                  Compare Options
                </Button>
              </CardContent>
            </Card>

            {compareResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Comparison Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {compareResult.results?.map((result: any, index: number) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${index === 0 ? 'bg-green-500/10 border-green-500/30' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{result.name}</p>
                            <p className="text-xs text-muted-foreground">@ {result.rate}% p.a.</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{formatCurrency(result.final_value)}</p>
                            <p className="text-sm text-green-600">+{formatCurrency(result.total_returns)}</p>
                          </div>
                        </div>
                        {index === 0 && <Badge className="mt-2" variant="default">Best Option</Badge>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Real Return Calculator */}
        <TabsContent value="real-return">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-primary" />
                  Real Return Calculator
                </CardTitle>
                <CardDescription>
                  Calculate inflation-adjusted returns to see your actual purchasing power
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nominal Return (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={realReturnInputs.nominal_return}
                    onChange={(e) => setRealReturnInputs({ ...realReturnInputs, nominal_return: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">The stated return on your investment</p>
                </div>

                <div className="space-y-2">
                  <Label>Inflation Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={realReturnInputs.inflation_rate}
                    onChange={(e) => setRealReturnInputs({ ...realReturnInputs, inflation_rate: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Current inflation rate in Pakistan is ~10-12%</p>
                </div>

                <Button onClick={calculateRealReturn} className="w-full" disabled={isCalculating}>
                  {isCalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                  Calculate Real Return
                </Button>
              </CardContent>
            </Card>

            {realReturnResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Real Return Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted text-center">
                      <p className="text-sm text-muted-foreground">Nominal Return</p>
                      <p className="text-xl font-bold">{formatPercent(realReturnResult.nominal_return)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-red-500/10 text-center">
                      <p className="text-sm text-muted-foreground">Inflation</p>
                      <p className="text-xl font-bold text-red-600">-{formatPercent(realReturnResult.inflation_rate)}</p>
                    </div>
                    <div className={`p-4 rounded-lg text-center ${realReturnResult.real_return >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <p className="text-sm text-muted-foreground">Real Return</p>
                      <p className={`text-xl font-bold ${realReturnResult.real_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(realReturnResult.real_return)}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-center">
                      {realReturnResult.real_return >= 0 ? (
                        <>Your investment is growing faster than inflation. Your purchasing power increases by <span className="font-bold text-green-600">{formatPercent(realReturnResult.real_return)}</span> annually.</>
                      ) : (
                        <>Your investment is losing value to inflation. Your purchasing power decreases by <span className="font-bold text-red-600">{formatPercent(Math.abs(realReturnResult.real_return))}</span> annually.</>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* DCA Simulation Calculator */}
        <TabsContent value="dca">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-primary" />
                  DCA Simulation
                </CardTitle>
                <CardDescription>
                  Simulate Dollar Cost Averaging strategy with historical price data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monthly Investment (Rs.)</Label>
                    <Input
                      type="number"
                      value={dcaInputs.monthly_amount}
                      onChange={(e) => setDcaInputs({ ...dcaInputs, monthly_amount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Months</Label>
                    <Input
                      type="number"
                      value={dcaInputs.months}
                      onChange={(e) => setDcaInputs({ ...dcaInputs, months: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Price History (comma-separated)</Label>
                  <Input
                    value={dcaInputs.price_history.join(', ')}
                    onChange={(e) => {
                      const prices = e.target.value.split(',').map(p => Number(p.trim())).filter(p => !isNaN(p) && p > 0);
                      if (prices.length > 0) {
                        setDcaInputs({ ...dcaInputs, price_history: prices });
                      }
                    }}
                    placeholder="100, 105, 98, 110..."
                  />
                  <p className="text-xs text-muted-foreground">Enter monthly prices for the simulation period</p>
                </div>

                <Button onClick={calculateDCA} className="w-full" disabled={isCalculating}>
                  {isCalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                  Run DCA Simulation
                </Button>
              </CardContent>
            </Card>

            {dcaResult && (
              <Card>
                <CardHeader>
                  <CardTitle>DCA Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted text-center">
                      <p className="text-sm text-muted-foreground">Total Invested</p>
                      <p className="text-xl font-bold">{formatCurrency(dcaResult.total_invested)}</p>
                    </div>
                    <div className={`p-4 rounded-lg text-center ${dcaResult.total_return >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <p className="text-sm text-muted-foreground">Final Value</p>
                      <p className={`text-xl font-bold ${dcaResult.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(dcaResult.final_value)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-muted text-center">
                      <p className="text-xs text-muted-foreground">Shares</p>
                      <p className="font-bold">{dcaResult.total_shares?.toFixed(2)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted text-center">
                      <p className="text-xs text-muted-foreground">Avg Cost</p>
                      <p className="font-bold">Rs. {dcaResult.average_cost?.toFixed(2)}</p>
                    </div>
                    <div className={`p-3 rounded-lg text-center ${dcaResult.return_percentage >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <p className="text-xs text-muted-foreground">Return</p>
                      <p className={`font-bold ${dcaResult.return_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {dcaResult.return_percentage >= 0 ? '+' : ''}{dcaResult.return_percentage?.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground text-center">
                    DCA helped you buy at an average price of Rs. {dcaResult.average_cost?.toFixed(2)} per share.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
