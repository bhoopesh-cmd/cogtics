"""
Core rule-based generators for revenue recognition and billing.
Ported from Cogtics TypeScript packages/revrec/ and packages/rules/.
"""

from .obligations import identify_obligations, ObligationType, AllocationMethod
from .allocation import allocate_prices, validate_allocations
from .schedules import generate_schedule, generate_straight_line_schedule
from .recognition import create_recognition_events, RecognitionEventType
from .deferred import compute_deferred_balances, compute_period_balance
from .reconciliation import reconcile_schedules_with_invoices
from .billing import (
    calculate_expected_amount,
    get_expected_billing_periods,
    calculate_invoice_expected,
)

__all__ = [
    "identify_obligations",
    "ObligationType",
    "AllocationMethod",
    "allocate_prices",
    "validate_allocations",
    "generate_schedule",
    "generate_straight_line_schedule",
    "create_recognition_events",
    "RecognitionEventType",
    "compute_deferred_balances",
    "compute_period_balance",
    "reconcile_schedules_with_invoices",
    "calculate_expected_amount",
    "get_expected_billing_periods",
    "calculate_invoice_expected",
]
