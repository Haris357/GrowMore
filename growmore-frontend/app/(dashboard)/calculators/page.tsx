'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Calculator, TrendingUp, PiggyBank, Percent, IndianRupee, Target } from 'lucide-react';

interface CalculationResult {
  futureValue: number;
  totalInvestment: number;
  totalReturns: number;
  yearlyBreakdown?: { year: number; value: number; investment: number }[];
}

export default function CalculatorsPage() {
  const [activeTab, setActiveTab] = useState('sip');

  // SIP Calculator State
  const [sipAmount, setSipAmount] = useState<number>(5000);
  const [sipRate, setSipRate] = useState<number>(12);
  const [sipYears, setSipYears] = useState<number>(10);
  const [sipResult, setSipResult] = useState<CalculationResult | null>(null);

  // Lumpsum Calculator State
  const [lumpsumAmount, setLumpsumAmount] = useState<number>(100000);
  const [lumpsumRate, setLumpsumRate] = useState<number>(12);
  const [lumpsumYears, setLumpsumYears] = useState<number>(10);
  const [lumpsumResult, setLumpsumResult] = useState<CalculationResult | null>(null);

  // FD Calculator State
  const [fdAmount, setFdAmount] = useState<number>(100000);
  const [fdRate, setFdRate] = useState<number>(7);
  const [fdYears, setFdYears] = useState<number>(5);
  const [fdCompounding, setFdCompounding] = useState<string>('quarterly');
  const [fdResult, setFdResult] = useState<CalculationResult | null>(null);

  // Goal Calculator State
  const [goalAmount, setGoalAmount] = useState<number>(1000000);
  const [goalYears, setGoalYears] = useState<number>(10);
  const [goalRate, setGoalRate] = useState<number>(12);
  const [goalResult, setGoalResult] = useState<{ monthlySip: number; lumpsumRequired: number } | null>(null);

  const calculateSIP = () => {
    const monthlyRate = sipRate / 12 / 100;
    const months = sipYears * 12;
    const futureValue = sipAmount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    const totalInvestment = sipAmount * months;

    const yearlyBreakdown = [];
    for (let year = 1; year <= sipYears; year++) {
      const m = year * 12;
      const value = sipAmount * ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate) * (1 + monthlyRate);
      yearlyBreakdown.push({ year, value: Math.round(value), investment: sipAmount * m });
    }

    setSipResult({
      futureValue: Math.round(futureValue),
      totalInvestment,
      totalReturns: Math.round(futureValue - totalInvestment),
      yearlyBreakdown,
    });
  };

  const calculateLumpsum = () => {
    const futureValue = lumpsumAmount * Math.pow(1 + lumpsumRate / 100, lumpsumYears);

    const yearlyBreakdown = [];
    for (let year = 1; year <= lumpsumYears; year++) {
      const value = lumpsumAmount * Math.pow(1 + lumpsumRate / 100, year);
      yearlyBreakdown.push({ year, value: Math.round(value), investment: lumpsumAmount });
    }

    setLumpsumResult({
      futureValue: Math.round(futureValue),
      totalInvestment: lumpsumAmount,
      totalReturns: Math.round(futureValue - lumpsumAmount),
      yearlyBreakdown,
    });
  };

  const calculateFD = () => {
    const compoundingFrequency = fdCompounding === 'monthly' ? 12 : fdCompounding === 'quarterly' ? 4 : 1;
    const futureValue = fdAmount * Math.pow(1 + fdRate / 100 / compoundingFrequency, compoundingFrequency * fdYears);

    const yearlyBreakdown = [];
    for (let year = 1; year <= fdYears; year++) {
      const value = fdAmount * Math.pow(1 + fdRate / 100 / compoundingFrequency, compoundingFrequency * year);
      yearlyBreakdown.push({ year, value: Math.round(value), investment: fdAmount });
    }

    setFdResult({
      futureValue: Math.round(futureValue),
      totalInvestment: fdAmount,
      totalReturns: Math.round(futureValue - fdAmount),
      yearlyBreakdown,
    });
  };

  const calculateGoal = () => {
    const monthlyRate = goalRate / 12 / 100;
    const months = goalYears * 12;

    // Monthly SIP required
    const monthlySip = goalAmount / (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));

    // Lumpsum required
    const lumpsumRequired = goalAmount / Math.pow(1 + goalRate / 100, goalYears);

    setGoalResult({
      monthlySip: Math.round(monthlySip),
      lumpsumRequired: Math.round(lumpsumRequired),
    });
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `Rs. ${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `Rs. ${(amount / 100000).toFixed(2)} L`;
    }
    return `Rs. ${amount.toLocaleString('en-PK')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Financial Calculators</h1>
        <p className="text-muted-foreground">
          Plan your investments with our powerful calculators
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sip" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            SIP
          </TabsTrigger>
          <TabsTrigger value="lumpsum" className="gap-2">
            <PiggyBank className="h-4 w-4" />
            Lumpsum
          </TabsTrigger>
          <TabsTrigger value="fd" className="gap-2">
            <Percent className="h-4 w-4" />
            FD
          </TabsTrigger>
          <TabsTrigger value="goal" className="gap-2">
            <Target className="h-4 w-4" />
            Goal
          </TabsTrigger>
        </TabsList>

        {/* SIP Calculator */}
        <TabsContent value="sip">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>SIP Calculator</CardTitle>
                <CardDescription>
                  Calculate returns on your Systematic Investment Plan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Monthly Investment</Label>
                    <span className="text-sm font-medium">{formatCurrency(sipAmount)}</span>
                  </div>
                  <Slider
                    value={[sipAmount]}
                    onValueChange={([value]) => setSipAmount(value)}
                    min={500}
                    max={100000}
                    step={500}
                  />
                  <Input
                    type="number"
                    value={sipAmount}
                    onChange={(e) => setSipAmount(Number(e.target.value))}
                    className="mt-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Expected Annual Return (%)</Label>
                    <span className="text-sm font-medium">{sipRate}%</span>
                  </div>
                  <Slider
                    value={[sipRate]}
                    onValueChange={([value]) => setSipRate(value)}
                    min={1}
                    max={30}
                    step={0.5}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Investment Period (Years)</Label>
                    <span className="text-sm font-medium">{sipYears} years</span>
                  </div>
                  <Slider
                    value={[sipYears]}
                    onValueChange={([value]) => setSipYears(value)}
                    min={1}
                    max={30}
                    step={1}
                  />
                </div>

                <Button onClick={calculateSIP} className="w-full">
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate
                </Button>
              </CardContent>
            </Card>

            {sipResult && (
              <Card>
                <CardHeader>
                  <CardTitle>SIP Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Invested Amount</p>
                      <p className="text-xl font-bold text-primary">{formatCurrency(sipResult.totalInvestment)}</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Est. Returns</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(sipResult.totalReturns)}</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-primary/10">
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="text-xl font-bold text-primary">{formatCurrency(sipResult.futureValue)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Year-wise Breakdown</h4>
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                      {sipResult.yearlyBreakdown?.map((item) => (
                        <div key={item.year} className="flex justify-between text-sm p-2 rounded bg-muted/50">
                          <span>Year {item.year}</span>
                          <span className="font-medium">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Lumpsum Calculator */}
        <TabsContent value="lumpsum">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Lumpsum Calculator</CardTitle>
                <CardDescription>
                  Calculate returns on one-time investment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Investment Amount</Label>
                    <span className="text-sm font-medium">{formatCurrency(lumpsumAmount)}</span>
                  </div>
                  <Slider
                    value={[lumpsumAmount]}
                    onValueChange={([value]) => setLumpsumAmount(value)}
                    min={10000}
                    max={10000000}
                    step={10000}
                  />
                  <Input
                    type="number"
                    value={lumpsumAmount}
                    onChange={(e) => setLumpsumAmount(Number(e.target.value))}
                    className="mt-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Expected Annual Return (%)</Label>
                    <span className="text-sm font-medium">{lumpsumRate}%</span>
                  </div>
                  <Slider
                    value={[lumpsumRate]}
                    onValueChange={([value]) => setLumpsumRate(value)}
                    min={1}
                    max={30}
                    step={0.5}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Investment Period (Years)</Label>
                    <span className="text-sm font-medium">{lumpsumYears} years</span>
                  </div>
                  <Slider
                    value={[lumpsumYears]}
                    onValueChange={([value]) => setLumpsumYears(value)}
                    min={1}
                    max={30}
                    step={1}
                  />
                </div>

                <Button onClick={calculateLumpsum} className="w-full">
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate
                </Button>
              </CardContent>
            </Card>

            {lumpsumResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Lumpsum Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Invested Amount</p>
                      <p className="text-xl font-bold text-primary">{formatCurrency(lumpsumResult.totalInvestment)}</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Est. Returns</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(lumpsumResult.totalReturns)}</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-primary/10">
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="text-xl font-bold text-primary">{formatCurrency(lumpsumResult.futureValue)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Year-wise Breakdown</h4>
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                      {lumpsumResult.yearlyBreakdown?.map((item) => (
                        <div key={item.year} className="flex justify-between text-sm p-2 rounded bg-muted/50">
                          <span>Year {item.year}</span>
                          <span className="font-medium">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
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
                <CardTitle>Fixed Deposit Calculator</CardTitle>
                <CardDescription>
                  Calculate maturity amount for your FD
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Deposit Amount</Label>
                    <span className="text-sm font-medium">{formatCurrency(fdAmount)}</span>
                  </div>
                  <Slider
                    value={[fdAmount]}
                    onValueChange={([value]) => setFdAmount(value)}
                    min={10000}
                    max={10000000}
                    step={10000}
                  />
                  <Input
                    type="number"
                    value={fdAmount}
                    onChange={(e) => setFdAmount(Number(e.target.value))}
                    className="mt-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Interest Rate (%)</Label>
                    <span className="text-sm font-medium">{fdRate}%</span>
                  </div>
                  <Slider
                    value={[fdRate]}
                    onValueChange={([value]) => setFdRate(value)}
                    min={1}
                    max={15}
                    step={0.1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Tenure (Years)</Label>
                    <span className="text-sm font-medium">{fdYears} years</span>
                  </div>
                  <Slider
                    value={[fdYears]}
                    onValueChange={([value]) => setFdYears(value)}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Compounding Frequency</Label>
                  <Select value={fdCompounding} onValueChange={setFdCompounding}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={calculateFD} className="w-full">
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate
                </Button>
              </CardContent>
            </Card>

            {fdResult && (
              <Card>
                <CardHeader>
                  <CardTitle>FD Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Principal</p>
                      <p className="text-xl font-bold text-primary">{formatCurrency(fdResult.totalInvestment)}</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Interest Earned</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(fdResult.totalReturns)}</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-primary/10">
                      <p className="text-sm text-muted-foreground">Maturity Amount</p>
                      <p className="text-xl font-bold text-primary">{formatCurrency(fdResult.futureValue)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Year-wise Growth</h4>
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                      {fdResult.yearlyBreakdown?.map((item) => (
                        <div key={item.year} className="flex justify-between text-sm p-2 rounded bg-muted/50">
                          <span>Year {item.year}</span>
                          <span className="font-medium">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
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
                <CardTitle>Goal Calculator</CardTitle>
                <CardDescription>
                  Calculate how much you need to invest to reach your goal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Target Amount</Label>
                    <span className="text-sm font-medium">{formatCurrency(goalAmount)}</span>
                  </div>
                  <Slider
                    value={[goalAmount]}
                    onValueChange={([value]) => setGoalAmount(value)}
                    min={100000}
                    max={100000000}
                    step={100000}
                  />
                  <Input
                    type="number"
                    value={goalAmount}
                    onChange={(e) => setGoalAmount(Number(e.target.value))}
                    className="mt-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Time Period (Years)</Label>
                    <span className="text-sm font-medium">{goalYears} years</span>
                  </div>
                  <Slider
                    value={[goalYears]}
                    onValueChange={([value]) => setGoalYears(value)}
                    min={1}
                    max={30}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Expected Annual Return (%)</Label>
                    <span className="text-sm font-medium">{goalRate}%</span>
                  </div>
                  <Slider
                    value={[goalRate]}
                    onValueChange={([value]) => setGoalRate(value)}
                    min={1}
                    max={30}
                    step={0.5}
                  />
                </div>

                <Button onClick={calculateGoal} className="w-full">
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate
                </Button>
              </CardContent>
            </Card>

            {goalResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Investment Required</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center p-6 rounded-lg bg-primary/10">
                    <p className="text-sm text-muted-foreground mb-2">Target Goal</p>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(goalAmount)}</p>
                    <p className="text-sm text-muted-foreground mt-2">in {goalYears} years</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Monthly SIP Required</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(goalResult.monthlySip)}</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Lumpsum Required</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(goalResult.lumpsumRequired)}</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground text-center">
                    You can either invest {formatCurrency(goalResult.monthlySip)}/month via SIP or {formatCurrency(goalResult.lumpsumRequired)} as one-time investment to reach your goal.
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
