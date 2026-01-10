export interface Bank {
  id: string;
  name: string;
  code: string;
  logo_url?: string;
  website?: string;
  market_id: string;
}

export interface ProductType {
  id: string;
  name: string;
  description?: string;
}

export interface BankProduct {
  id: string;
  bank_id: string;
  bank_name: string;
  bank_logo_url?: string;
  product_type_id: string;
  product_type_name: string;
  name: string;
  description?: string;
  interest_rate: number;
  min_deposit?: number;
  max_deposit?: number;
  min_tenure_days?: number;
  max_tenure_days?: number;
  compounding_frequency?: string;
  features?: string[];
  terms_conditions?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankWithProducts extends Bank {
  products: BankProduct[];
}
