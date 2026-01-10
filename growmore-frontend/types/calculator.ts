export interface StockReturnInput {
  buy_price: number;
  sell_price: number;
  quantity: number;
  holding_period_days?: number;
  buy_commission?: number;
  sell_commission?: number;
  cgt_rate?: number;
}

export interface StockReturnResult {
  total_invested: number;
  total_received: number;
  gross_profit_loss: number;
  capital_gains_tax: number;
  net_profit_loss: number;
  return_percent: number;
  annualized_return_percent?: number;
}

export interface DividendIncomeInput {
  price_per_share: number;
  quantity: number;
  dividend_yield_percent: number;
  years: number;
  reinvest_dividends: boolean;
  expected_price_growth_percent?: number;
}

export interface DividendIncomeResult {
  total_dividend_income: number;
  yearly_breakdown: {
    year: number;
    dividend_received: number;
    shares_owned: number;
    portfolio_value: number;
  }[];
  final_portfolio_value: number;
}

export interface GoldReturnInput {
  buy_price_per_tola: number;
  sell_price_per_tola: number;
  weight_tola?: number;
  weight_gram?: number;
  purity: '24K' | '22K' | '21K' | '18K';
}

export interface GoldReturnResult {
  total_invested: number;
  total_received: number;
  profit_loss: number;
  return_percent: number;
}

export interface GoldZakatInput {
  weight_tola?: number;
  weight_gram?: number;
  current_price_per_tola: number;
  purity: '24K' | '22K' | '21K' | '18K';
}

export interface GoldZakatResult {
  total_value: number;
  nisab_threshold: number;
  is_above_nisab: boolean;
  zakat_amount: number;
  zakat_percent: number;
}

export interface FDMaturityInput {
  principal: number;
  interest_rate_percent: number;
  tenure_days: number;
  compounding: 'simple' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
}

export interface FDMaturityResult {
  maturity_amount: number;
  total_interest: number;
  effective_annual_rate: number;
  breakdown?: {
    period: string;
    principal: number;
    interest: number;
    balance: number;
  }[];
}

export interface SavingsGrowthInput {
  initial_deposit: number;
  monthly_deposit: number;
  interest_rate_percent: number;
  period_months: number;
}

export interface SavingsGrowthResult {
  final_balance: number;
  total_deposits: number;
  total_interest: number;
  monthly_breakdown: {
    month: number;
    deposit: number;
    interest: number;
    balance: number;
  }[];
}

export interface LoanEMIInput {
  loan_amount: number;
  interest_rate_percent: number;
  tenure_months: number;
}

export interface LoanEMIResult {
  monthly_emi: number;
  total_payment: number;
  total_interest: number;
  amortization_schedule: {
    month: number;
    principal: number;
    interest: number;
    balance: number;
  }[];
}

export interface InvestmentComparisonInput {
  investment_amount: number;
  period_years: number;
  options: {
    name: string;
    type: string;
    expected_return_percent: number;
  }[];
}

export interface InvestmentComparisonResult {
  options: {
    name: string;
    type: string;
    expected_return_percent: number;
    final_value: number;
    total_gain: number;
  }[];
  best_option: string;
}
