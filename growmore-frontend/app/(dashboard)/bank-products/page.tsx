'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BankProductsSkeleton, DialogSkeleton } from '@/components/common/skeletons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2, Percent, Calculator, Search, Filter, ChevronRight,
  Clock, Coins, CheckCircle, ArrowLeft, ExternalLink, Info
} from 'lucide-react';
import { api } from '@/lib/api';

interface Bank {
  id: string;
  name: string;
  code: string;
  logo_url?: string;
  website_url?: string;
  description?: string;
}

interface ProductType {
  id: string;
  name: string;
  category: string;
  description?: string;
}

interface BankProduct {
  id: string;
  bank_id: string;
  bank?: Bank;
  product_type_id?: string;
  name: string;
  description?: string;
  interest_rate: number;
  min_deposit: number;
  max_deposit?: number;
  tenure_min_days: number;
  tenure_max_days?: number;
  features?: string[];
  terms_conditions?: string;
  is_active?: boolean;
  last_updated?: string;
  product_type?: ProductType;
}

export default function BankProductsPage() {
  const [products, setProducts] = useState<BankProduct[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
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

  // Detail views
  const [selectedProduct, setSelectedProduct] = useState<BankProduct | null>(null);
  const [selectedBankDetails, setSelectedBankDetails] = useState<{ bank: Bank; products: BankProduct[] } | null>(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const [isBankDetailOpen, setIsBankDetailOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [productsRes, banksRes, typesRes] = await Promise.all([
        api.get('/bank-products'),
        api.get('/bank-products/banks'),
        api.get('/bank-products/types'),
      ]);
      // Backend returns PaginatedResponse with 'items' key for products, direct array for banks
      const productsData = productsRes.data?.items || productsRes.data?.products || productsRes.data || [];
      const banksData = banksRes.data?.banks || banksRes.data || [];
      const typesData = typesRes.data?.types || typesRes.data || [];
      setProducts(Array.isArray(productsData) ? productsData : []);
      setBanks(Array.isArray(banksData) ? banksData : []);
      setProductTypes(Array.isArray(typesData) ? typesData : []);
    } catch (error) {
      console.error('Error fetching bank products:', error);
      setProducts([]);
      setBanks([]);
      setProductTypes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProductDetails = async (productId: string) => {
    try {
      setIsLoadingDetails(true);
      const response = await api.get(`/bank-products/${productId}`);
      setSelectedProduct(response.data);
      setIsProductDetailOpen(true);
    } catch (error) {
      console.error('Error fetching product details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const fetchBankDetails = async (bankId: string) => {
    try {
      setIsLoadingDetails(true);
      const response = await api.get(`/bank-products/banks/${bankId}`);
      setSelectedBankDetails({
        bank: response.data,
        products: response.data.products || [],
      });
      setIsBankDetailOpen(true);
    } catch (error) {
      console.error('Error fetching bank details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    if (selectedBank !== 'all' && product.bank_id !== selectedBank) return false;
    if (selectedType !== 'all' && product.product_type_id !== selectedType && product.product_type?.category !== selectedType) return false;
    const rate = parseFloat(String(product.interest_rate || 0));
    if (rate < minRate) return false;
    if (searchQuery && !(product.name || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '-';
    if (amount >= 10000000) {
      return `Rs. ${(amount / 10000000).toFixed(1)} Cr`;
    } else if (amount >= 100000) {
      return `Rs. ${(amount / 100000).toFixed(1)} L`;
    }
    return `Rs. ${amount.toLocaleString()}`;
  };

  const formatTenure = (minDays: number | undefined, maxDays: number | undefined) => {
    if (!minDays && !maxDays) return '-';
    const min = minDays || 0;
    const max = maxDays;

    if (min >= 365) {
      const minYears = (min / 365).toFixed(0);
      const maxYears = max ? (max / 365).toFixed(0) : '∞';
      return `${minYears} - ${maxYears} years`;
    } else if (min >= 30) {
      const minMonths = Math.round(min / 30);
      const maxMonths = max ? Math.round(max / 30) : null;
      return `${minMonths} - ${maxMonths || '∞'} months`;
    }
    return `${min} - ${max || '∞'} days`;
  };

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
    return <BankProductsSkeleton />;
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
                  {productTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
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
                      <tr
                        key={product.id}
                        className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => fetchProductDetails(product.id)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {product.bank?.logo_url ? (
                              <img src={product.bank.logo_url} alt={product.bank.name} className="w-6 h-6 rounded object-contain" />
                            ) : (
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            )}
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
                            {parseFloat(String(product.interest_rate || 0)).toFixed(2)}%
                          </span>
                        </td>
                        <td className="text-right py-3 px-4 font-mono text-sm">
                          {formatCurrency(product.min_deposit)}
                        </td>
                        <td className="text-right py-3 px-4 text-sm">
                          <div className="flex items-center justify-end gap-1">
                            {formatTenure(product.tenure_min_days, product.tenure_max_days)}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
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
          {banks.map((bank) => {
            const bankProducts = products.filter(p => p.bank_id === bank.id);
            const maxRate = Math.max(...bankProducts.map(p => parseFloat(String(p.interest_rate || 0))), 0);

            return (
              <Card
                key={bank.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => fetchBankDetails(bank.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    {bank.logo_url ? (
                      <img src={bank.logo_url} alt={bank.name} className="w-10 h-10 rounded-full object-contain bg-muted p-1" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">{bank.name}</CardTitle>
                      <CardDescription>{bank.code}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Best Rate:</span>
                    <span className="font-bold text-green-600">{maxRate.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-muted-foreground">Products:</span>
                    <span className="font-medium">{bankProducts.length}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full mt-3">
                    View Details <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Product Types Section */}
      {productTypes.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Product Types</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {productTypes.map((type) => {
              const typeProducts = products.filter(p => p.product_type_id === type.id);
              const avgRate = typeProducts.length > 0
                ? typeProducts.reduce((sum, p) => sum + parseFloat(String(p.interest_rate || 0)), 0) / typeProducts.length
                : 0;

              return (
                <Card key={type.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Coins className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{type.name}</h3>
                        {type.description && (
                          <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Products: </span>
                            <span className="font-medium">{typeProducts.length}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Avg Rate: </span>
                            <span className="font-medium text-green-600">{avgRate.toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Product Detail Dialog */}
      <Dialog open={isProductDetailOpen} onOpenChange={setIsProductDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {isLoadingDetails ? (
            <DialogSkeleton />
          ) : selectedProduct ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedProduct.bank?.logo_url ? (
                    <img src={selectedProduct.bank.logo_url} alt="" className="w-8 h-8 rounded object-contain" />
                  ) : (
                    <Building2 className="h-6 w-6" />
                  )}
                  {selectedProduct.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedProduct.bank?.name} - {selectedProduct.product_type?.name || 'Deposit Product'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Key Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-green-500/10 text-center">
                    <p className="text-sm text-muted-foreground">Interest Rate</p>
                    <p className="text-2xl font-bold text-green-600">
                      {parseFloat(String(selectedProduct.interest_rate || 0)).toFixed(2)}%
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted text-center">
                    <p className="text-sm text-muted-foreground">Min Deposit</p>
                    <p className="text-xl font-bold">{formatCurrency(selectedProduct.min_deposit)}</p>
                  </div>
                </div>

                {/* Details List */}
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Tenure
                    </span>
                    <span className="font-medium">
                      {formatTenure(selectedProduct.tenure_min_days, selectedProduct.tenure_max_days)}
                    </span>
                  </div>
                  {selectedProduct.max_deposit && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Max Deposit</span>
                      <span className="font-medium">{formatCurrency(selectedProduct.max_deposit)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Product Type</span>
                    <Badge variant="secondary">{selectedProduct.product_type?.name || 'Deposit'}</Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={selectedProduct.is_active !== false ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}>
                      {selectedProduct.is_active !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                {selectedProduct.description && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                  </div>
                )}

                {/* Features */}
                {selectedProduct.features && selectedProduct.features.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Features</h4>
                    <ul className="space-y-2">
                      {selectedProduct.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Terms & Conditions */}
                {selectedProduct.terms_conditions && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Terms & Conditions</h4>
                    <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                      {selectedProduct.terms_conditions}
                    </p>
                  </div>
                )}

                {/* Quick Calculator */}
                <div className="p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Quick Calculation
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground">If you invest</p>
                      <p className="font-bold">Rs. 1,00,000</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">For 1 year</p>
                      <p className="font-bold text-green-600">
                        +Rs. {(100000 * parseFloat(String(selectedProduct.interest_rate || 0)) / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">You get</p>
                      <p className="font-bold text-primary">
                        Rs. {(100000 + 100000 * parseFloat(String(selectedProduct.interest_rate || 0)) / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">Product not found</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Bank Detail Dialog */}
      <Dialog open={isBankDetailOpen} onOpenChange={setIsBankDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {isLoadingDetails ? (
            <DialogSkeleton />
          ) : selectedBankDetails ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {selectedBankDetails.bank.logo_url ? (
                    <img src={selectedBankDetails.bank.logo_url} alt="" className="w-10 h-10 rounded-full object-contain bg-muted p-1" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  {selectedBankDetails.bank.name}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  {selectedBankDetails.bank.code}
                  {selectedBankDetails.bank.website_url && (
                    <a
                      href={selectedBankDetails.bank.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Visit Website <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Bank Description */}
                {selectedBankDetails.bank.description && (
                  <p className="text-sm text-muted-foreground">{selectedBankDetails.bank.description}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted text-center">
                    <p className="text-sm text-muted-foreground">Total Products</p>
                    <p className="text-2xl font-bold">{selectedBankDetails.products.length}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-500/10 text-center">
                    <p className="text-sm text-muted-foreground">Best Rate</p>
                    <p className="text-2xl font-bold text-green-600">
                      {Math.max(...selectedBankDetails.products.map(p => parseFloat(String(p.interest_rate || 0))), 0).toFixed(2)}%
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-500/10 text-center">
                    <p className="text-sm text-muted-foreground">Min Deposit</p>
                    <p className="text-xl font-bold text-blue-600">
                      {formatCurrency(Math.min(...selectedBankDetails.products.map(p => p.min_deposit || Infinity).filter(x => x !== Infinity)))}
                    </p>
                  </div>
                </div>

                {/* Products List */}
                <div>
                  <h4 className="font-medium mb-3">Available Products ({selectedBankDetails.products.length})</h4>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {selectedBankDetails.products.map((product) => (
                      <div
                        key={product.id}
                        className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          setIsBankDetailOpen(false);
                          fetchProductDetails(product.id);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {product.product_type?.name || 'Deposit'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTenure(product.tenure_min_days, product.tenure_max_days)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              {parseFloat(String(product.interest_rate || 0)).toFixed(2)}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Min: {formatCurrency(product.min_deposit)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">Bank not found</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
