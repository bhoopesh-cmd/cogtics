"""
Billing calculator ported from packages/rules/src/rules/billing/index.ts

Provides functions to calculate expected billing amounts and periods
based on contract terms.
"""

from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Optional

from dateutil.relativedelta import relativedelta

from ..models.contracts import Contract, BillingFrequency


def get_expected_billing_periods(
    contract: Contract,
    as_of: date
) -> list[dict[str, date]]:
    """
    Get expected billing periods for a contract up to a given date.
    
    Port of getExpectedBillingPeriods() from billing/index.ts
    
    Args:
        contract: Contract with start_date and billing_frequency
        as_of: Date to calculate periods up to
        
    Returns:
        List of period dictionaries with 'start' and 'end' dates
    """
    periods = []
    
    if not contract.start_date:
        return periods
    
    frequency = contract.billing_frequency or BillingFrequency.MONTHLY
    
    # Determine months per period
    if frequency == BillingFrequency.ANNUALLY:
        months_per_period = 12
    elif frequency == BillingFrequency.QUARTERLY:
        months_per_period = 3
    elif frequency == BillingFrequency.ONE_TIME:
        # One-time billing - single period for entire contract
        if contract.end_date:
            periods.append({
                "start": contract.start_date,
                "end": contract.end_date,
            })
        return periods
    else:  # Monthly
        months_per_period = 1
    
    # Generate periods
    period_start = contract.start_date
    while period_start < as_of:
        period_end = period_start + relativedelta(months=months_per_period)
        
        # Check if period is within contract term
        if contract.end_date and period_start > contract.end_date:
            break
        
        # Only include completed periods
        if period_end <= as_of:
            periods.append({
                "start": period_start,
                "end": period_end,
            })
        
        period_start = period_end
    
    return periods


def calculate_expected_amount(
    contract: Contract,
    period: dict[str, date]
) -> Decimal:
    """
    Calculate expected invoice amount for a billing period.
    
    Port of calculateExpectedAmount() from billing/index.ts
    
    Args:
        contract: Contract with ARR and billing frequency
        period: Period dictionary with 'start' and 'end' dates
        
    Returns:
        Expected invoice amount for the period (rounded to 2 decimal places)
    """
    arr = Decimal(str(contract.arr or 0))
    frequency = contract.billing_frequency or BillingFrequency.MONTHLY
    
    if frequency == BillingFrequency.ANNUALLY:
        return arr.quantize(Decimal("0.01"))
    elif frequency == BillingFrequency.QUARTERLY:
        return (arr / 4).quantize(Decimal("0.01"))
    elif frequency == BillingFrequency.ONE_TIME:
        return arr.quantize(Decimal("0.01"))
    else:  # Monthly
        return (arr / 12).quantize(Decimal("0.01"))


def calculate_invoice_expected(
    contract: Contract,
    invoice_date: date
) -> Decimal:
    """
    Calculate expected amount for an invoice on a specific date.
    
    Port of calculateInvoiceExpected() from billing/index.ts
    
    Args:
        contract: Contract with ARR and billing frequency
        invoice_date: Date of the invoice
        
    Returns:
        Expected invoice amount
    """
    # For simplicity, use the standard period amount
    # In production, would need to handle prorations
    arr = contract.arr or Decimal("0")
    frequency = contract.billing_frequency or BillingFrequency.MONTHLY
    
    if frequency == BillingFrequency.ANNUALLY:
        return arr
    elif frequency == BillingFrequency.QUARTERLY:
        return arr / 4
    elif frequency == BillingFrequency.ONE_TIME:
        return arr
    else:  # Monthly
        return arr / 12


def find_expected_price(
    terms: list[dict[str, Any]],
    product_id: Optional[str] = None
) -> Optional[Decimal]:
    """
    Find expected unit price from contract terms.
    
    Port of findExpectedPrice() from billing/index.ts
    
    Args:
        terms: List of contract terms
        product_id: Optional product ID to match
        
    Returns:
        Expected unit price or None if not found
    """
    for term in terms:
        term_type = term.get("term_type", "")
        if term_type not in ("unit_price", "pricing_model"):
            continue
        
        value = term.get("value", {})
        if isinstance(value, dict):
            # Check if this term matches the product
            term_product = value.get("productId") or value.get("product_id")
            if product_id and term_product and term_product != product_id:
                continue
            
            # Get unit price
            unit_price = value.get("unitPrice") or value.get("unit_price")
            if unit_price is not None:
                return Decimal(str(unit_price))
    
    return None


def find_expected_quantity(
    terms: list[dict[str, Any]],
    product_id: Optional[str] = None
) -> Optional[int]:
    """
    Find expected quantity from contract terms.
    
    Port of findExpectedQuantity() from billing/index.ts
    
    Args:
        terms: List of contract terms
        product_id: Optional product ID to match
        
    Returns:
        Expected quantity or None if not found
    """
    for term in terms:
        term_type = term.get("term_type", "")
        if term_type not in ("quantity", "seats", "licenses"):
            continue
        
        value = term.get("value", {})
        if isinstance(value, dict):
            # Check if this term matches the product
            term_product = value.get("productId") or value.get("product_id")
            if product_id and term_product and term_product != product_id:
                continue
            
            # Get quantity
            quantity = value.get("quantity")
            if quantity is not None:
                return int(quantity)
        elif isinstance(value, (int, float)):
            return int(value)
    
    return None


def get_months_between(date1: date, date2: date) -> int:
    """Calculate months between two dates."""
    return (date2.year - date1.year) * 12 + (date2.month - date1.month)


def get_expected_months_between(frequency: str) -> int:
    """Get expected months between invoices for a billing frequency."""
    if frequency == "annually":
        return 12
    elif frequency == "quarterly":
        return 3
    else:
        return 1


def calculate_proration(
    arr: Decimal,
    frequency: BillingFrequency,
    start_date: date,
    end_date: date,
    period_start: date,
    period_end: date
) -> Decimal:
    """
    Calculate prorated amount for a partial period.
    
    Args:
        arr: Annual recurring revenue
        frequency: Billing frequency
        start_date: Contract start date
        end_date: Contract end date
        period_start: Start of billing period
        period_end: End of billing period
        
    Returns:
        Prorated amount for the period
    """
    # Get full period amount
    if frequency == BillingFrequency.ANNUALLY:
        full_amount = arr
    elif frequency == BillingFrequency.QUARTERLY:
        full_amount = arr / 4
    elif frequency == BillingFrequency.ONE_TIME:
        return arr
    else:
        full_amount = arr / 12
    
    # Calculate days in period vs days of service
    total_days = (period_end - period_start).days
    if total_days <= 0:
        return Decimal("0")
    
    # Adjust for contract boundaries
    service_start = max(period_start, start_date)
    service_end = min(period_end, end_date) if end_date else period_end
    
    service_days = (service_end - service_start).days
    if service_days <= 0:
        return Decimal("0")
    
    # Calculate proration
    if service_days >= total_days:
        return full_amount
    
    return (full_amount * service_days) / total_days


def generate_expected_invoices(
    contract: Contract,
    as_of: date,
    include_future: bool = False
) -> list[dict[str, Any]]:
    """
    Generate expected invoices for a contract.
    
    Args:
        contract: Contract to generate invoices for
        as_of: Reference date
        include_future: Whether to include future invoices
        
    Returns:
        List of expected invoice dictionaries
    """
    invoices = []
    
    periods = get_expected_billing_periods(contract, as_of)
    
    for i, period in enumerate(periods):
        amount = calculate_expected_amount(contract, period)
        
        invoices.append({
            "period_index": i,
            "period_start": period["start"],
            "period_end": period["end"],
            "invoice_date": period["start"],
            "due_date": period["start"] + timedelta(days=30),
            "expected_amount": amount,
            "currency": contract.currency,
            "contract_id": contract.id,
            "customer_id": contract.customer_id,
        })
    
    return invoices
