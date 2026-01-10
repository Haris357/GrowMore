"""
Investment Calculator API Endpoints.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.calculator_service import CalculatorService

router = APIRouter()
calculator = CalculatorService()


# ==================== Request Models ====================

class StockReturnRequest(BaseModel):
    buy_price: float = Field(..., gt=0)
    sell_price: float = Field(..., gt=0)
    quantity: int = Field(..., gt=0)
    holding_days: int = Field(default=0, ge=0)
    buy_commission: float = Field(default=0, ge=0)
    sell_commission: float = Field(default=0, ge=0)
    cgt_rate: float = Field(default=0.15, ge=0, le=1)


class DividendIncomeRequest(BaseModel):
    price_per_share: float = Field(..., gt=0)
    quantity: int = Field(..., gt=0)
    dividend_yield: float = Field(..., ge=0, description="Annual dividend yield percentage")
    years: int = Field(default=1, ge=1, le=30)
    reinvest: bool = Field(default=False)
    expected_price_growth: float = Field(default=0, description="Expected annual price growth %")


class DCARequest(BaseModel):
    monthly_amount: float = Field(..., gt=0)
    months: int = Field(..., ge=1, le=120)
    price_history: List[float] = Field(..., min_items=1)


class GoldReturnRequest(BaseModel):
    buy_price: float = Field(..., gt=0, description="Buy price per tola")
    sell_price: float = Field(..., gt=0, description="Sell price per tola")
    weight: float = Field(..., gt=0)
    weight_unit: str = Field(default="tola", pattern="^(tola|gram)$")
    purity: str = Field(default="24k")


class GoldZakatRequest(BaseModel):
    weight: float = Field(..., gt=0)
    weight_unit: str = Field(default="tola", pattern="^(tola|gram)$")
    current_price: float = Field(..., gt=0, description="Current price per tola")
    purity: str = Field(default="24k")


class FDMaturityRequest(BaseModel):
    principal: float = Field(..., gt=0)
    annual_rate: float = Field(..., gt=0, le=100)
    tenure_days: int = Field(..., ge=1, le=3650)
    compounding: str = Field(default="quarterly", pattern="^(simple|monthly|quarterly|semi_annually|annually)$")


class SavingsGrowthRequest(BaseModel):
    initial_deposit: float = Field(..., ge=0)
    monthly_deposit: float = Field(..., ge=0)
    annual_rate: float = Field(..., ge=0, le=100)
    months: int = Field(..., ge=1, le=360)


class LoanEMIRequest(BaseModel):
    principal: float = Field(..., gt=0)
    annual_rate: float = Field(..., gt=0, le=100)
    tenure_months: int = Field(..., ge=1, le=360)


class InvestmentOption(BaseModel):
    name: str
    type: str
    rate: float = Field(..., description="Expected annual return %")


class CompareInvestmentsRequest(BaseModel):
    amount: float = Field(..., gt=0)
    period_years: int = Field(..., ge=1, le=30)
    options: List[InvestmentOption]


# ==================== Stock Calculators ====================

@router.post("/stock-return")
async def calculate_stock_return(request: StockReturnRequest):
    """
    Calculate stock investment return.

    Includes:
    - Gross profit/loss
    - Capital gains tax
    - Net profit
    - Annualized return (if holding period provided)
    """
    return calculator.calculate_stock_return(
        buy_price=request.buy_price,
        sell_price=request.sell_price,
        quantity=request.quantity,
        holding_days=request.holding_days,
        buy_commission=request.buy_commission,
        sell_commission=request.sell_commission,
        cgt_rate=request.cgt_rate,
    )


@router.post("/dividend-income")
async def calculate_dividend_income(request: DividendIncomeRequest):
    """
    Calculate expected dividend income over time.

    Options:
    - With or without dividend reinvestment (DRIP)
    - Factor in expected price growth
    - Yearly breakdown of dividends
    """
    return calculator.calculate_dividend_income(
        price_per_share=request.price_per_share,
        quantity=request.quantity,
        dividend_yield=request.dividend_yield,
        years=request.years,
        reinvest=request.reinvest,
        expected_price_growth=request.expected_price_growth,
    )


@router.post("/dca-simulation")
async def calculate_dca_simulation(request: DCARequest):
    """
    Simulate Dollar Cost Averaging (DCA) strategy.

    Shows:
    - Shares accumulated each month
    - Average cost per share
    - Final value and return
    """
    return calculator.calculate_dca(
        monthly_amount=request.monthly_amount,
        months=request.months,
        price_history=request.price_history,
    )


# ==================== Gold/Silver Calculators ====================

@router.post("/gold-return")
async def calculate_gold_return(request: GoldReturnRequest):
    """
    Calculate gold investment return.

    Supports both tola and gram measurements.
    """
    return calculator.calculate_gold_return(
        buy_price=request.buy_price,
        sell_price=request.sell_price,
        weight=request.weight,
        weight_unit=request.weight_unit,
        purity=request.purity,
    )


@router.post("/gold-zakat")
async def calculate_gold_zakat(request: GoldZakatRequest):
    """
    Calculate Zakat on gold holdings.

    - Nisab threshold: 7.5 tola (87.48g)
    - Zakat rate: 2.5%
    """
    return calculator.calculate_gold_zakat(
        weight=request.weight,
        weight_unit=request.weight_unit,
        current_price=request.current_price,
        purity=request.purity,
    )


@router.get("/gold-conversion")
async def convert_gold_weight(
    value: float = Query(..., gt=0),
    from_unit: str = Query("tola", pattern="^(tola|gram)$"),
    to_unit: str = Query("gram", pattern="^(tola|gram)$"),
):
    """
    Convert gold weight between tola and grams.

    1 tola = 11.6638 grams
    """
    return calculator.convert_gold_weight(
        value=value,
        from_unit=from_unit,
        to_unit=to_unit,
    )


# ==================== Bank Product Calculators ====================

@router.post("/fd-maturity")
async def calculate_fd_maturity(request: FDMaturityRequest):
    """
    Calculate Fixed Deposit maturity value.

    Compounding options:
    - simple: No compounding
    - monthly: Compounded monthly
    - quarterly: Compounded quarterly (most common)
    - semi_annually: Compounded twice a year
    - annually: Compounded yearly
    """
    return calculator.calculate_fd_maturity(
        principal=request.principal,
        annual_rate=request.annual_rate,
        tenure_days=request.tenure_days,
        compounding=request.compounding,
    )


@router.post("/savings-growth")
async def calculate_savings_growth(request: SavingsGrowthRequest):
    """
    Calculate savings account growth with regular deposits.

    Shows monthly breakdown of:
    - Deposits
    - Interest earned
    - Running balance
    """
    return calculator.calculate_savings_growth(
        initial_deposit=request.initial_deposit,
        monthly_deposit=request.monthly_deposit,
        annual_rate=request.annual_rate,
        months=request.months,
    )


@router.post("/loan-emi")
async def calculate_loan_emi(request: LoanEMIRequest):
    """
    Calculate loan EMI (Equated Monthly Installment).

    Includes:
    - Monthly EMI amount
    - Total payment
    - Total interest
    - Amortization schedule (first 12 months)
    """
    return calculator.calculate_loan_emi(
        principal=request.principal,
        annual_rate=request.annual_rate,
        tenure_months=request.tenure_months,
    )


# ==================== Comparison Tools ====================

@router.post("/compare-investments")
async def compare_investments(request: CompareInvestmentsRequest):
    """
    Compare different investment options.

    Input multiple options with expected returns to see
    which performs best over the given period.
    """
    options = [opt.dict() for opt in request.options]
    return calculator.compare_investments(
        amount=request.amount,
        period_years=request.period_years,
        options=options,
    )


@router.get("/real-return")
async def calculate_real_return(
    nominal_return: float = Query(..., description="Nominal return percentage"),
    inflation_rate: float = Query(..., description="Inflation rate percentage"),
):
    """
    Calculate real return adjusted for inflation.

    Real Return = ((1 + nominal) / (1 + inflation)) - 1
    """
    return calculator.calculate_real_return(
        nominal_return=nominal_return,
        inflation_rate=inflation_rate,
    )


# ==================== Quick Calculators ====================

@router.get("/quick/stock-profit")
async def quick_stock_profit(
    buy: float = Query(..., gt=0, description="Buy price per share"),
    sell: float = Query(..., gt=0, description="Sell price per share"),
    qty: int = Query(..., gt=0, description="Number of shares"),
):
    """Quick stock profit calculation."""
    result = calculator.calculate_stock_return(
        buy_price=buy,
        sell_price=sell,
        quantity=qty,
    )
    return {
        "invested": result["total_invested"],
        "received": result["total_received"],
        "profit": result["gross_profit"],
        "return_pct": result["gross_return_percentage"],
    }


@router.get("/quick/gold-profit")
async def quick_gold_profit(
    buy: float = Query(..., gt=0, description="Buy price per tola"),
    sell: float = Query(..., gt=0, description="Sell price per tola"),
    tola: float = Query(..., gt=0, description="Weight in tola"),
):
    """Quick gold profit calculation."""
    result = calculator.calculate_gold_return(
        buy_price=buy,
        sell_price=sell,
        weight=tola,
        weight_unit="tola",
    )
    return {
        "invested": result["total_invested"],
        "received": result["total_received"],
        "profit": result["profit_loss"],
        "return_pct": result["return_percentage"],
    }


@router.get("/quick/fd-interest")
async def quick_fd_interest(
    principal: float = Query(..., gt=0),
    rate: float = Query(..., gt=0, description="Annual rate %"),
    months: int = Query(..., ge=1, le=60),
):
    """Quick FD interest calculation."""
    result = calculator.calculate_fd_maturity(
        principal=principal,
        annual_rate=rate,
        tenure_days=months * 30,
        compounding="quarterly",
    )
    return {
        "principal": result["principal"],
        "maturity": result["maturity_amount"],
        "interest": result["total_interest"],
        "effective_rate": result["effective_annual_rate"],
    }
