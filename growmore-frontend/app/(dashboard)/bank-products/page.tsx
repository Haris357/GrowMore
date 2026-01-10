'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Building2, Percent, Calculator, Search, Filter } from 'lucide-react';
import { api } from '@/lib/api';

interface Bank {
  id: string;
  name: string;
  code: string;
  logo_url?: string;
}

interface BankProduct {
  id: string;
  bank_id: string;
  bank?: Bank;
  name: string;
  description?: string;
  interest_rate: number;
  min_deposit: number;
  max_deposit?: number;
  tenure_min_days: number;
  tenure_max_days?: number;
  product_type?: {
    name: string;
    category: string;
  };
}

export default function BankProductsPage() {
  const [products, setProducts] = useState<BankProduct[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [minRate, setMinRate] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Calculator
  const [calcPrincipal, setCalcPrincipal] = useState<string>('100000');
  const [calcRate, setCalcRate] = useState<string>('15');
  const [calcTenure, setCalcTenure] = useState<string>('365');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [productsRes, banksRes] = await Promise.all([
        api.get('/bank-products'),
        api.get('/bank-products/banks'),
      ]);
      // Backend returns PaginatedResponse with 'items' key for products, direct array for banks
      const productsData = productsRes.data?.items || productsRes.data?.products || productsRes.data || [];
      const banksData = banksRes.data?.banks || banksRes.data || [];
      setProducts(Array.isArray(productsData) ? productsData : []);
      setBanks(Array.isArray(banksData) ? banksData : []);
    } catch (error) {
      console.error('Error fetching bank products:', error);
      setProducts([]);
      setBanks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    if (selectedBank !== 'all' && product.bank_id !== selectedBank) return false;
    if (selectedType !== 'all' && product.product_type?.category !== selectedType) return false;
    const rate = parseFloat(String(product.interest_rate || 0));
    if (rate < minRate) return false;
    if (searchQuery && !(product.name || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const calculateMaturity = () => {
    const principal = parseFloat(calcPrincipal) || 0;
    const rate = parseFloat(calcRate) || 0;
    const days = parseInt(calcTenure) || 0;

    const interest = (principal * rate * days) / (365 * 100);
    const maturity = principal + interest;

    return { interest, maturity };
  };

  const { interest, maturity } = calculateMaturity();

  if (isLoading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Bank Deposit Rates</h1>
        <p className="text-muted-foreground">
          Compare Fixed Deposits & Savings Accounts across Pakistani banks
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bank</Label>
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger>
                  <SelectValue placeholder="All Banks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Banks</SelectItem>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Product Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="fixed_deposit">Fixed Deposit</SelectItem>
                  <SelectItem value="savings_account">Savings Account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Min Interest Rate: {minRate}%</Label>
              <Slider
                value={[minRate]}
                onValueChange={([value]) => setMinRate(value)}
                max={25}
                step={0.5}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Products Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Available Products ({filteredProducts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Bank</th>
                      <th className="text-left py-3 px-4 font-medium">Product</th>
                      <th className="text-right py-3 px-4 font-medium">Rate</th>
                      <th className="text-right py-3 px-4 font-medium">Min Deposit</th>
                      <th className="text-right py-3 px-4 font-medium">Tenure</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{product.bank?.name || 'Unknown Bank'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {product.product_type?.name || 'Deposit'}
                            </Badge>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className="font-bold text-green-600 dark:text-green-400">
                            {parseFloat(String(product.interest_rate || 0)).toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right py-3 px-4 font-mono text-sm">
                          {product.min_deposit ? `Rs. ${parseFloat(String(product.min_deposit)).toLocaleString()}` : '-'}
                        </td>
                        <td className="text-right py-3 px-4 text-sm">
                          {product.tenure_min_days || 0} - {product.tenure_max_days || '∞'} days
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredProducts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No products match your criteria
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FD Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              FD Calculator
            </CardTitle>
            <CardDescription>
              Calculate maturity amount
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="principal">Principal Amount (Rs.)</Label>
              <Input
                id="principal"
                type="number"
                value={calcPrincipal}
                onChange={(e) => setCalcPrincipal(e.target.value)}
                placeholder="100000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">Interest Rate (%)</Label>
              <Input
                id="rate"
                type="number"
                step="0.1"
                value={calcRate}
                onChange={(e) => setCalcRate(e.target.value)}
                placeholder="15"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenure">Tenure (Days)</Label>
              <Input
                id="tenure"
                type="number"
                value={calcTenure}
                onChange={(e) => setCalcTenure(e.target.value)}
                placeholder="365"
              />
            </div>

            <div className="pt-4 space-y-3 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Principal:</span>
                <span className="font-medium">
                  Rs. {parseFloat(calcPrincipal || '0').toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Interest Earned:</span>
                <span className="font-medium text-green-600">
                  Rs. {interest.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">Maturity Amount:</span>
                <span className="font-bold text-lg text-primary">
                  Rs. {maturity.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Banks Cards */}
      <div>
        <h2 className="text-xl font-bold mb-4">Banks Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {banks.slice(0, 4).map((bank) => {
            const bankProducts = products.filter(p => p.bank_id === bank.id);
            const maxRate = Math.max(...bankProducts.map(p => parseFloat(String(p.interest_rate || 0))), 0);

            return (
              <Card key={bank.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{bank.name}</CardTitle>
                      <CardDescription>{bank.code}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Best Rate:</span>
                    <span className="font-bold text-green-600">{maxRate}%</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-muted-foreground">Products:</span>
                    <span className="font-medium">{bankProducts.length}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
