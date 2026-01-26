"""
Schedule reconciliation ported from packages/revrec/src/reconciliation.ts

Reconciles revenue schedules with invoices.
"""

from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional

from .schedules import SchedulePeriod
from ..models.revrec import ReconciliationStatus


class ReconciliationResult:
    """Result of reconciling schedules with invoices."""
    
    def __init__(
        self,
        contract_id: str,
        period_start: date,
        period_end: date,
        status: ReconciliationStatus,
        scheduled_amount: Decimal,
        invoiced_amount: Decimal,
        variance_amount: Decimal,
        variance_pct: Optional[Decimal] = None,
        details: Optional[dict[str, Any]] = None,
    ):
        self.contract_id = contract_id
        self.period_start = period_start
        self.period_end = period_end
        self.status = status
        self.scheduled_amount = scheduled_amount
        self.invoiced_amount = invoiced_amount
        self.variance_amount = variance_amount
        self.variance_pct = variance_pct
        self.details = details or {}


class ReconciliationConfig:
    """Configuration for reconciliation."""
    
    def __init__(
        self,
        amount_tolerance_pct: Decimal = Decimal("0.05"),
        amount_tolerance_abs: Decimal = Decimal("1.00"),
        timing_tolerance_days: int = 5,
    ):
        self.amount_tolerance_pct = amount_tolerance_pct
        self.amount_tolerance_abs = amount_tolerance_abs
        self.timing_tolerance_days = timing_tolerance_days


DEFAULT_RECONCILIATION_CONFIG = ReconciliationConfig()


def reconcile_schedules_with_invoices(
    schedules: list[SchedulePeriod],
    invoices: list[dict[str, Any]],
    contract_id: str,
    config: Optional[ReconciliationConfig] = None,
) -> list[ReconciliationResult]:
    """
    Reconcile revenue schedules with invoices.
    
    Port of reconcileSchedulesWithInvoices() from reconciliation.ts
    
    Args:
        schedules: List of schedule periods
        invoices: List of invoice dictionaries with 'invoice_date', 'total', etc.
        contract_id: Contract ID
        config: Reconciliation configuration
        
    Returns:
        List of reconciliation results
    """
    if config is None:
        config = DEFAULT_RECONCILIATION_CONFIG
    
    results = []
    
    for schedule in schedules:
        # Find invoices that overlap with this schedule period
        period_invoices = [
            inv for inv in invoices
            if _invoice_in_period(inv, schedule.period_start, schedule.period_end)
        ]
        
        # Calculate invoiced amount for period
        invoiced_amount = sum(
            Decimal(str(inv.get("total", 0)))
            for inv in period_invoices
        )
        
        # Calculate variance
        scheduled_amount = schedule.scheduled_amount
        variance_amount = invoiced_amount - scheduled_amount
        
        # Calculate variance percentage
        if scheduled_amount > 0:
            variance_pct = (variance_amount / scheduled_amount) * 100
        else:
            variance_pct = Decimal("0") if invoiced_amount == 0 else Decimal("100")
        
        # Determine status
        status = _determine_status(
            scheduled_amount,
            invoiced_amount,
            variance_amount,
            variance_pct,
            period_invoices,
            config,
        )
        
        results.append(
            ReconciliationResult(
                contract_id=contract_id,
                period_start=schedule.period_start,
                period_end=schedule.period_end,
                status=status,
                scheduled_amount=_round(scheduled_amount, 2),
                invoiced_amount=_round(invoiced_amount, 2),
                variance_amount=_round(variance_amount, 2),
                variance_pct=_round(variance_pct, 2),
                details={
                    "invoice_count": len(period_invoices),
                    "invoice_ids": [inv.get("id") for inv in period_invoices],
                },
            )
        )
    
    return results


def _invoice_in_period(
    invoice: dict[str, Any],
    period_start: date,
    period_end: date,
) -> bool:
    """Check if invoice falls within a period."""
    invoice_date = invoice.get("invoice_date")
    if invoice_date is None:
        return False
    
    if isinstance(invoice_date, str):
        invoice_date = date.fromisoformat(invoice_date[:10])
    
    return period_start <= invoice_date <= period_end


def _determine_status(
    scheduled_amount: Decimal,
    invoiced_amount: Decimal,
    variance_amount: Decimal,
    variance_pct: Decimal,
    invoices: list[dict[str, Any]],
    config: ReconciliationConfig,
) -> ReconciliationStatus:
    """Determine reconciliation status based on amounts and tolerances."""
    # No invoices found
    if not invoices:
        if scheduled_amount > 0:
            return ReconciliationStatus.MISSING_INVOICE
        return ReconciliationStatus.MATCHED
    
    # Check if within tolerance
    abs_variance = abs(variance_amount)
    abs_pct = abs(variance_pct)
    
    if (
        abs_variance <= config.amount_tolerance_abs
        or abs_pct <= config.amount_tolerance_pct * 100
    ):
        return ReconciliationStatus.MATCHED
    
    # Determine type of variance
    if abs_variance > 0:
        return ReconciliationStatus.AMOUNT_VARIANCE
    
    return ReconciliationStatus.UNMATCHED


def get_reconciliation_summary(
    results: list[ReconciliationResult]
) -> dict[str, int]:
    """Get summary of reconciliation results by status."""
    summary = {
        "matched": 0,
        "timing_variance": 0,
        "amount_variance": 0,
        "missing_invoice": 0,
        "unmatched": 0,
    }
    
    for result in results:
        status_key = result.status.value
        if status_key in summary:
            summary[status_key] += 1
    
    return summary


def _round(value: Decimal, decimals: int) -> Decimal:
    """Round a Decimal to specified decimal places."""
    quantize_str = "0." + "0" * decimals
    # Ensure value is a Decimal
    if not isinstance(value, Decimal):
        value = Decimal(str(value)) if value is not None else Decimal("0")
    return value.quantize(Decimal(quantize_str), rounding=ROUND_HALF_UP)
