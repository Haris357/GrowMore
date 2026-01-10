"""
Investment Calculator Service.
Provides various financial calculations for stocks, gold, and bank products.
"""

import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


# Constants
TOLA_TO_GRAM = Decimal("11.6638")  # 1 Tola = 11.6638 grams
GOLD_ZAKAT_NISAB_TOLA = Decimal("7.5")  # Zakat threshold: 7.5 tola of gold
SILVER_ZAKAT_NISAB_TOLA = Decimal("52.5")  # Zakat threshold: 52.5 tola of silver
ZAKAT_RATE = Decimal("0.025")  # 2.5%


class CalculatorService:
    """
    Financial calculator service for investment calculations.
    """

    # ==================== Stock Calculators ====================

    def calculate_stock_return(
        self,
        buy_price: float,
        sell_price: float,
        quantity: int,
        holding_days: int = 0,
        buy_commission: float = 0,
        sell_commission: float = 0,
        cgt_rate: float = 0.15,  # Capital Gains Tax rate
    ) -> Dict[str, Any]:
        """
        Calculate stock investment return.

        Args:
            buy_price: Price per share when bought
            sell_price: Price per share when sold
            quantity: Number of shares
            holding_days: Days held (for annualized return)
            buy_commission: Broker commission on buy
            sell_commission: Broker commission on sell
            cgt_rate: Capital gains tax rate (default 15%)

        Returns:
            Dictionary with return calculations
        """
        buy_price = Decimal(str(buy_price))
        sell_price = Decimal(str(sell_price))
        quantity = Decimal(str(quantity))

        # Total costs
        total_buy = buy_price * quantity + Decimal(str(buy_commission))
        total_sell = sell_price * quantity - Decimal(str(sell_commission))

        # Gross profit/loss
        gross_profit = total_sell - total_buy
        gross_return_pct = ((total_sell - total_buy) / total_buy * 100) if total_buy > 0 else Decimal("0")

        # Capital gains tax (only on profit)
        cgt = max(gross_profit * Decimal(str(cgt_rate)), Decimal("0")) if gross_profit > 0 else Decimal("0")

        # Net profit
        net_profit = gross_profit - cgt
        net_return_pct = (net_profit / total_buy * 100) if total_buy > 0 else Decimal("0")

        # Annualized return
        annualized_return = Decimal("0")
        if holding_days > 0 and total_buy > 0:
            years = Decimal(str(holding_days)) / Decimal("365")
            if years > 0:
                annualized_return = ((total_sell / total_buy) ** (Decimal("1") / years) - 1) * 100

        return {
            "buy_price": float(buy_price),
            "sell_price": float(sell_price),
            "quantity": int(quantity),
            "total_invested": float(total_buy.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "total_received": float(total_sell.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "gross_profit": float(gross_profit.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "gross_return_percentage": float(gross_return_pct.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "capital_gains_tax": float(cgt.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "net_profit": float(net_profit.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "net_return_percentage": float(net_return_pct.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "holding_days": holding_days,
            "annualized_return_percentage": float(annualized_return.quantize(Decimal("0.01"), ROUND_HALF_UP)),
        }

    def calculate_dividend_income(
        self,
        price_per_share: float,
        quantity: int,
        dividend_yield: float,
        years: int = 1,
        reinvest: bool = False,
        expected_price_growth: float = 0,
    ) -> Dict[str, Any]:
        """
        Calculate expected dividend income.

        Args:
            price_per_share: Current price per share
            quantity: Number of shares
            dividend_yield: Annual dividend yield (percentage)
            years: Investment period in years
            reinvest: Whether to reinvest dividends (DRIP)
            expected_price_growth: Expected annual price growth (percentage)

        Returns:
            Dictionary with dividend calculations
        """
        price = Decimal(str(price_per_share))
        qty = Decimal(str(quantity))
        yield_rate = Decimal(str(dividend_yield)) / 100
        growth_rate = Decimal(str(expected_price_growth)) / 100

        initial_investment = price * qty
        yearly_results = []
        total_dividends = Decimal("0")
        current_shares = qty
        current_price = price

        for year in range(1, years + 1):
            # Dividend for the year
            dividend_per_share = current_price * yield_rate
            annual_dividend = dividend_per_share * current_shares

            if reinvest and annual_dividend > 0:
                # Buy more shares with dividends
                new_shares = annual_dividend / current_price
                current_shares += new_shares

            total_dividends += annual_dividend

            # Price growth for next year
            current_price = current_price * (1 + growth_rate)

            yearly_results.append({
                "year": year,
                "shares": float(current_shares.quantize(Decimal("0.0001"), ROUND_HALF_UP)),
                "price": float(current_price.quantize(Decimal("0.01"), ROUND_HALF_UP)),
                "dividend_received": float(annual_dividend.quantize(Decimal("0.01"), ROUND_HALF_UP)),
                "cumulative_dividends": float(total_dividends.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            })

        final_value = current_shares * current_price
        total_return = final_value + total_dividends - initial_investment

        return {
            "initial_investment": float(initial_investment.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "initial_shares": int(qty),
            "dividend_yield": dividend_yield,
            "years": years,
            "reinvest_dividends": reinvest,
            "total_dividends_received": float(total_dividends.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "final_shares": float(current_shares.quantize(Decimal("0.0001"), ROUND_HALF_UP)),
            "final_value": float(final_value.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "total_return": float(total_return.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "total_return_percentage": float(((total_return / initial_investment) * 100).quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "yearly_breakdown": yearly_results,
        }

    def calculate_dca(
        self,
        monthly_amount: float,
        months: int,
        price_history: List[float],
    ) -> Dict[str, Any]:
        """
        Calculate Dollar Cost Averaging returns.

        Args:
            monthly_amount: Amount to invest monthly
            months: Number of months
            price_history: List of monthly prices

        Returns:
            DCA calculation results
        """
        monthly = Decimal(str(monthly_amount))
        total_invested = Decimal("0")
        total_shares = Decimal("0")
        purchases = []

        # Use available price history or repeat last price
        for month in range(months):
            price_idx = min(month, len(price_history) - 1)
            price = Decimal(str(price_history[price_idx] if price_history else 100))

            shares_bought = monthly / price
            total_shares += shares_bought
            total_invested += monthly

            purchases.append({
                "month": month + 1,
                "price": float(price),
                "shares_bought": float(shares_bought.quantize(Decimal("0.0001"), ROUND_HALF_UP)),
                "total_shares": float(total_shares.quantize(Decimal("0.0001"), ROUND_HALF_UP)),
                "total_invested": float(total_invested.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            })

        # Final value at last price
        final_price = Decimal(str(price_history[-1] if price_history else 100))
        final_value = total_shares * final_price
        avg_cost = total_invested / total_shares if total_shares > 0 else Decimal("0")
        profit = final_value - total_invested
        return_pct = (profit / total_invested * 100) if total_invested > 0 else Decimal("0")

        return {
            "monthly_amount": float(monthly),
            "months": months,
            "total_invested": float(total_invested.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "total_shares": float(total_shares.quantize(Decimal("0.0001"), ROUND_HALF_UP)),
            "average_cost_per_share": float(avg_cost.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "final_price": float(final_price),
            "final_value": float(final_value.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "profit_loss": float(profit.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "return_percentage": float(return_pct.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "purchases": purchases,
        }

    # ==================== Gold/Silver Calculators ====================

    def calculate_gold_return(
        self,
        buy_price: float,
        sell_price: float,
        weight: float,
        weight_unit: str = "tola",  # "tola" or "gram"
        purity: str = "24k",
    ) -> Dict[str, Any]:
        """
        Calculate gold investment return.
        """
        buy = Decimal(str(buy_price))
        sell = Decimal(str(sell_price))
        wt = Decimal(str(weight))

        # Convert to tola if gram
        if weight_unit == "gram":
            wt_tola = wt / TOLA_TO_GRAM
        else:
            wt_tola = wt

        total_buy = buy * wt_tola
        total_sell = sell * wt_tola
        profit = total_sell - total_buy
        return_pct = (profit / total_buy * 100) if total_buy > 0 else Decimal("0")

        return {
            "buy_price_per_tola": float(buy),
            "sell_price_per_tola": float(sell),
            "weight": float(weight),
            "weight_unit": weight_unit,
            "weight_in_tola": float(wt_tola.quantize(Decimal("0.0001"), ROUND_HALF_UP)),
            "purity": purity,
            "total_invested": float(total_buy.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "total_received": float(total_sell.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "profit_loss": float(profit.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "return_percentage": float(return_pct.quantize(Decimal("0.01"), ROUND_HALF_UP)),
        }

    def calculate_gold_zakat(
        self,
        weight: float,
        weight_unit: str = "tola",
        current_price: float = 0,
        purity: str = "24k",
    ) -> Dict[str, Any]:
        """
        Calculate Zakat on gold holdings.

        Zakat is obligatory if gold exceeds 7.5 tola (87.48g).
        Rate: 2.5% of total value.
        """
        wt = Decimal(str(weight))

        # Convert to tola
        if weight_unit == "gram":
            wt_tola = wt / TOLA_TO_GRAM
        else:
            wt_tola = wt

        # Check if Zakat applicable
        is_applicable = wt_tola >= GOLD_ZAKAT_NISAB_TOLA

        # Calculate Zakat
        price = Decimal(str(current_price)) if current_price > 0 else Decimal("0")
        total_value = wt_tola * price
        zakat_amount = total_value * ZAKAT_RATE if is_applicable else Decimal("0")

        return {
            "weight": float(weight),
            "weight_unit": weight_unit,
            "weight_in_tola": float(wt_tola.quantize(Decimal("0.0001"), ROUND_HALF_UP)),
            "weight_in_grams": float((wt_tola * TOLA_TO_GRAM).quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "purity": purity,
            "nisab_threshold_tola": float(GOLD_ZAKAT_NISAB_TOLA),
            "is_zakat_applicable": is_applicable,
            "current_price_per_tola": float(price),
            "total_value": float(total_value.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "zakat_rate": "2.5%",
            "zakat_amount": float(zakat_amount.quantize(Decimal("0.01"), ROUND_HALF_UP)),
        }

    def convert_gold_weight(
        self,
        value: float,
        from_unit: str,
        to_unit: str,
    ) -> Dict[str, Any]:
        """
        Convert gold weight between tola and grams.
        """
        val = Decimal(str(value))

        if from_unit == "tola" and to_unit == "gram":
            result = val * TOLA_TO_GRAM
        elif from_unit == "gram" and to_unit == "tola":
            result = val / TOLA_TO_GRAM
        else:
            result = val

        return {
            "input_value": float(value),
            "input_unit": from_unit,
            "output_value": float(result.quantize(Decimal("0.0001"), ROUND_HALF_UP)),
            "output_unit": to_unit,
            "conversion_rate": f"1 tola = {TOLA_TO_GRAM} grams",
        }

    # ==================== Bank Product Calculators ====================

    def calculate_fd_maturity(
        self,
        principal: float,
        annual_rate: float,
        tenure_days: int,
        compounding: str = "quarterly",  # "monthly", "quarterly", "annually", "simple"
    ) -> Dict[str, Any]:
        """
        Calculate Fixed Deposit maturity value.

        Args:
            principal: Initial deposit amount
            annual_rate: Annual interest rate (percentage)
            tenure_days: Deposit period in days
            compounding: Compounding frequency

        Returns:
            FD maturity calculations
        """
        p = Decimal(str(principal))
        r = Decimal(str(annual_rate)) / 100
        years = Decimal(str(tenure_days)) / Decimal("365")

        # Compounding periods per year
        n_map = {
            "simple": 0,
            "annually": 1,
            "semi_annually": 2,
            "quarterly": 4,
            "monthly": 12,
            "daily": 365,
        }
        n = n_map.get(compounding, 4)

        if n == 0:  # Simple interest
            interest = p * r * years
            maturity = p + interest
        else:
            # Compound interest: A = P(1 + r/n)^(nt)
            nt = n * years
            maturity = p * ((1 + r / n) ** nt)
            interest = maturity - p

        effective_rate = ((maturity / p) ** (1 / years) - 1) * 100 if years > 0 else r * 100

        return {
            "principal": float(p),
            "annual_rate": annual_rate,
            "tenure_days": tenure_days,
            "tenure_months": round(tenure_days / 30),
            "compounding": compounding,
            "maturity_amount": float(maturity.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "total_interest": float(interest.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "effective_annual_rate": float(effective_rate.quantize(Decimal("0.01"), ROUND_HALF_UP)),
        }

    def calculate_savings_growth(
        self,
        initial_deposit: float,
        monthly_deposit: float,
        annual_rate: float,
        months: int,
    ) -> Dict[str, Any]:
        """
        Calculate savings account growth with monthly deposits.
        """
        balance = Decimal(str(initial_deposit))
        monthly_rate = Decimal(str(annual_rate)) / 100 / 12
        total_deposits = Decimal(str(initial_deposit))
        monthly_data = []

        for month in range(1, months + 1):
            # Add monthly deposit
            if month > 1:
                balance += Decimal(str(monthly_deposit))
                total_deposits += Decimal(str(monthly_deposit))

            # Calculate interest for the month
            interest = balance * monthly_rate
            balance += interest

            monthly_data.append({
                "month": month,
                "deposit": float(monthly_deposit if month > 1 else initial_deposit),
                "interest": float(interest.quantize(Decimal("0.01"), ROUND_HALF_UP)),
                "balance": float(balance.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            })

        total_interest = balance - total_deposits

        return {
            "initial_deposit": float(initial_deposit),
            "monthly_deposit": float(monthly_deposit),
            "annual_rate": annual_rate,
            "months": months,
            "total_deposits": float(total_deposits.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "total_interest": float(total_interest.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "final_balance": float(balance.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "monthly_breakdown": monthly_data,
        }

    def calculate_loan_emi(
        self,
        principal: float,
        annual_rate: float,
        tenure_months: int,
    ) -> Dict[str, Any]:
        """
        Calculate Equated Monthly Installment (EMI) for a loan.

        Formula: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
        """
        p = Decimal(str(principal))
        r = Decimal(str(annual_rate)) / 100 / 12
        n = tenure_months

        if r == 0:
            emi = p / n
        else:
            emi = p * r * ((1 + r) ** n) / (((1 + r) ** n) - 1)

        total_payment = emi * n
        total_interest = total_payment - p

        # Amortization schedule
        schedule = []
        balance = p
        for month in range(1, n + 1):
            interest_payment = balance * r
            principal_payment = emi - interest_payment
            balance -= principal_payment

            schedule.append({
                "month": month,
                "emi": float(emi.quantize(Decimal("0.01"), ROUND_HALF_UP)),
                "principal": float(principal_payment.quantize(Decimal("0.01"), ROUND_HALF_UP)),
                "interest": float(interest_payment.quantize(Decimal("0.01"), ROUND_HALF_UP)),
                "balance": float(max(balance, 0).quantize(Decimal("0.01"), ROUND_HALF_UP)),
            })

        return {
            "principal": float(p),
            "annual_rate": annual_rate,
            "tenure_months": tenure_months,
            "emi": float(emi.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "total_payment": float(total_payment.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "total_interest": float(total_interest.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "amortization_schedule": schedule[:12],  # First 12 months only
        }

    # ==================== Comparison Tools ====================

    def compare_investments(
        self,
        amount: float,
        period_years: int,
        options: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Compare different investment options.

        options: List of dicts with 'name', 'type', 'rate' or 'expected_return'
        """
        results = []
        amount = Decimal(str(amount))
        years = Decimal(str(period_years))

        for opt in options:
            rate = Decimal(str(opt.get("rate", opt.get("expected_return", 0)))) / 100
            final_value = amount * ((1 + rate) ** years)
            profit = final_value - amount

            results.append({
                "name": opt.get("name", "Unknown"),
                "type": opt.get("type", "unknown"),
                "rate": float(rate * 100),
                "initial_amount": float(amount),
                "final_value": float(final_value.quantize(Decimal("0.01"), ROUND_HALF_UP)),
                "profit": float(profit.quantize(Decimal("0.01"), ROUND_HALF_UP)),
                "return_percentage": float(((profit / amount) * 100).quantize(Decimal("0.01"), ROUND_HALF_UP)),
            })

        # Sort by final value
        results.sort(key=lambda x: x["final_value"], reverse=True)

        return {
            "investment_amount": float(amount),
            "period_years": period_years,
            "comparison": results,
            "best_option": results[0] if results else None,
        }

    def calculate_real_return(
        self,
        nominal_return: float,
        inflation_rate: float,
    ) -> Dict[str, Any]:
        """
        Calculate real return adjusted for inflation.

        Formula: Real Return = ((1 + nominal) / (1 + inflation)) - 1
        """
        nominal = Decimal(str(nominal_return)) / 100
        inflation = Decimal(str(inflation_rate)) / 100

        real_return = ((1 + nominal) / (1 + inflation)) - 1
        real_return_pct = real_return * 100

        return {
            "nominal_return": nominal_return,
            "inflation_rate": inflation_rate,
            "real_return": float(real_return_pct.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "purchasing_power_change": "gain" if real_return > 0 else "loss" if real_return < 0 else "neutral",
        }
