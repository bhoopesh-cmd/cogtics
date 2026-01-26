"""
Deferred revenue balance calculations ported from packages/revrec/src/deferred.ts

Computes period-end deferred revenue balances.
"""

from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from .schedules import SchedulePeriod
from .recognition import RecognitionEvent
from ..models.revrec import RecognitionEventType


class DeferredBalance:
    """Deferred revenue balance for a period."""
    
    def __init__(
        self,
        period_end: date,
        opening_balance: Decimal,
        additions: Decimal,
        recognized: Decimal,
        adjustments: Decimal,
        closing_balance: Decimal,
    ):
        self.period_end = period_end
        self.opening_balance = opening_balance
        self.additions = additions
        self.recognized = recognized
        self.adjustments = adjustments
        self.closing_balance = closing_balance


def compute_deferred_balances(
    schedules: list[SchedulePeriod],
    events: list[RecognitionEvent],
    total_transaction_price: Decimal,
) -> list[DeferredBalance]:
    """
    Compute deferred revenue balances by period.
    
    Port of computeDeferredBalances() from deferred.ts
    
    The deferred balance rollforward:
    Opening Balance + Additions - Recognized +/- Adjustments = Closing Balance
    """
    if not schedules:
        return []
    
    # Get unique period ends sorted chronologically
    period_ends = sorted(set(s.period_end for s in schedules))
    
    balances = []
    running_balance = total_transaction_price  # Start with full deferred
    
    for i, period_end in enumerate(period_ends):
        prev_period_end = period_ends[i - 1] if i > 0 else None
        
        # For first period, additions are 0 (revenue already deferred)
        additions = Decimal("0")
        
        # Calculate recognized (from events in this period)
        if i == 0:
            # First period: include all events <= period_end
            recognized_in_period = sum(
                e.recognized_amount
                for e in events
                if e.event_date <= period_end
                and e.event_type in (
                    RecognitionEventType.SCHEDULED,
                    RecognitionEventType.USAGE,
                    RecognitionEventType.MILESTONE,
                )
            )
            adjustments = sum(
                e.recognized_amount
                for e in events
                if e.event_date <= period_end
                and e.event_type in (
                    RecognitionEventType.ADJUSTMENT,
                    RecognitionEventType.CANCELLATION,
                    RecognitionEventType.AMENDMENT,
                )
            )
        else:
            # Subsequent periods: events > prev_period_end and <= period_end
            recognized_in_period = sum(
                e.recognized_amount
                for e in events
                if prev_period_end < e.event_date <= period_end
                and e.event_type in (
                    RecognitionEventType.SCHEDULED,
                    RecognitionEventType.USAGE,
                    RecognitionEventType.MILESTONE,
                )
            )
            adjustments = sum(
                e.recognized_amount
                for e in events
                if prev_period_end < e.event_date <= period_end
                and e.event_type in (
                    RecognitionEventType.ADJUSTMENT,
                    RecognitionEventType.CANCELLATION,
                    RecognitionEventType.AMENDMENT,
                )
            )
        
        opening_balance = running_balance
        closing_balance = opening_balance + additions - recognized_in_period + adjustments
        
        balances.append(
            DeferredBalance(
                period_end=period_end,
                opening_balance=_round(opening_balance, 2),
                additions=_round(additions, 2),
                recognized=_round(recognized_in_period, 2),
                adjustments=_round(adjustments, 2),
                closing_balance=_round(closing_balance, 2),
            )
        )
        
        running_balance = closing_balance
    
    return balances


def compute_period_balance(
    period_end: date,
    opening_balance: Decimal,
    schedules: list[SchedulePeriod],
    events: list[RecognitionEvent],
) -> DeferredBalance:
    """Compute a single period's deferred balance."""
    # Get schedules for this period
    period_schedules = [s for s in schedules if s.period_end == period_end]
    
    # Sum scheduled amounts as additions
    additions = sum(s.scheduled_amount for s in period_schedules)
    
    # Get events for this period
    period_events = [e for e in events if e.event_date == period_end]
    
    recognized = sum(
        e.recognized_amount
        for e in period_events
        if e.event_type in (
            RecognitionEventType.SCHEDULED,
            RecognitionEventType.USAGE,
            RecognitionEventType.MILESTONE,
        )
    )
    
    adjustments = sum(
        e.recognized_amount
        for e in period_events
        if e.event_type in (
            RecognitionEventType.ADJUSTMENT,
            RecognitionEventType.CANCELLATION,
            RecognitionEventType.AMENDMENT,
        )
    )
    
    closing_balance = opening_balance + additions - recognized + adjustments
    
    return DeferredBalance(
        period_end=period_end,
        opening_balance=_round(opening_balance, 2),
        additions=_round(additions, 2),
        recognized=_round(recognized, 2),
        adjustments=_round(adjustments, 2),
        closing_balance=_round(closing_balance, 2),
    )


def validate_balance_rollforward(
    balances: list[DeferredBalance],
    tolerance: Decimal = Decimal("0.01"),
) -> tuple[bool, list[str]]:
    """Validate that deferred balance rollforward is correct."""
    errors = []
    
    for i, balance in enumerate(balances):
        # Check rollforward formula
        expected = (
            balance.opening_balance
            + balance.additions
            - balance.recognized
            + balance.adjustments
        )
        if abs(expected - balance.closing_balance) > tolerance:
            errors.append(
                f"Period {balance.period_end}: Rollforward mismatch. "
                f"Expected {expected:.2f}, got {balance.closing_balance:.2f}"
            )
        
        # Check continuity with previous period
        if i > 0:
            prev_balance = balances[i - 1]
            if abs(prev_balance.closing_balance - balance.opening_balance) > tolerance:
                errors.append(
                    f"Period {balance.period_end}: Opening balance "
                    f"{balance.opening_balance:.2f} doesn't match previous "
                    f"closing {prev_balance.closing_balance:.2f}"
                )
    
    return len(errors) == 0, errors


def get_balance_as_of(
    balances: list[DeferredBalance],
    as_of_date: date,
) -> Optional[DeferredBalance]:
    """Get the deferred balance as of a specific date."""
    applicable = [b for b in balances if b.period_end <= as_of_date]
    if not applicable:
        return None
    return max(applicable, key=lambda b: b.period_end)


def _round(value: Decimal, decimals: int) -> Decimal:
    """Round a Decimal to specified decimal places."""
    quantize_str = "0." + "0" * decimals
    # Ensure value is a Decimal
    if not isinstance(value, Decimal):
        value = Decimal(str(value)) if value is not None else Decimal("0")
    return value.quantize(Decimal(quantize_str), rounding=ROUND_HALF_UP)
