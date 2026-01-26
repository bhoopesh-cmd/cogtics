"""
Revenue schedule generation ported from packages/revrec/src/schedules.ts

Generates recognition schedules from obligations.
"""

from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
from calendar import monthrange

from .obligations import IdentifiedObligation
from .allocation import AllocationResult
from ..models.revrec import RecognitionMethod, ScheduleStatus


class SchedulePeriod:
    """A single period in a recognition schedule."""
    
    def __init__(
        self,
        period_start: date,
        period_end: date,
        scheduled_amount: Decimal,
        recognized_amount: Decimal,
        deferred_amount: Decimal,
        period_days: int,
        daily_rate: Decimal,
        recognition_method: RecognitionMethod,
        status: ScheduleStatus,
    ):
        self.period_start = period_start
        self.period_end = period_end
        self.scheduled_amount = scheduled_amount
        self.recognized_amount = recognized_amount
        self.deferred_amount = deferred_amount
        self.period_days = period_days
        self.daily_rate = daily_rate
        self.recognition_method = recognition_method
        self.status = status


def generate_schedule(
    obligation: IdentifiedObligation,
    allocation: AllocationResult,
    period_granularity: str = "monthly",
) -> list[SchedulePeriod]:
    """
    Generate recognition schedule for an obligation.
    
    Port of generateSchedule() from schedules.ts
    
    Args:
        obligation: The performance obligation
        allocation: The allocation result
        period_granularity: 'monthly' or 'quarterly'
        
    Returns:
        List of schedule periods
    """
    recognition_method = obligation.recognition_method
    allocated_amount = allocation.allocated_amount
    
    if recognition_method == RecognitionMethod.STRAIGHT_LINE:
        return generate_straight_line_schedule(
            obligation.service_start_date,
            obligation.service_end_date,
            allocated_amount,
            period_granularity,
        )
    elif recognition_method == RecognitionMethod.USAGE_BASED:
        return _generate_usage_based_schedule(
            obligation.service_start_date,
            obligation.service_end_date,
            allocated_amount,
            period_granularity,
        )
    elif recognition_method == RecognitionMethod.MILESTONE:
        return _generate_milestone_schedule(
            obligation.service_start_date,
            obligation.service_end_date,
            allocated_amount,
        )
    elif recognition_method == RecognitionMethod.AS_INVOICED:
        return _generate_as_invoiced_schedule(
            obligation.service_start_date,
            allocated_amount,
        )
    else:
        return generate_straight_line_schedule(
            obligation.service_start_date,
            obligation.service_end_date,
            allocated_amount,
            period_granularity,
        )


def generate_straight_line_schedule(
    service_start_date: date,
    service_end_date: date,
    total_amount: Decimal,
    period_granularity: str = "monthly",
) -> list[SchedulePeriod]:
    """
    Generate straight-line recognition schedule.
    
    Port of generateStraightLineSchedule() from schedules.ts
    """
    periods = []
    
    # Validate dates
    if service_end_date <= service_start_date:
        return [
            SchedulePeriod(
                period_start=service_start_date,
                period_end=service_end_date,
                scheduled_amount=_round(total_amount, 2),
                recognized_amount=Decimal("0"),
                deferred_amount=_round(total_amount, 2),
                period_days=1,
                daily_rate=_round(total_amount, 6),
                recognition_method=RecognitionMethod.STRAIGHT_LINE,
                status=ScheduleStatus.PENDING,
            )
        ]
    
    # Calculate total days
    total_days = (service_end_date - service_start_date).days
    
    if total_days == 0:
        return [
            SchedulePeriod(
                period_start=service_start_date,
                period_end=service_end_date,
                scheduled_amount=_round(total_amount, 2),
                recognized_amount=Decimal("0"),
                deferred_amount=_round(total_amount, 2),
                period_days=1,
                daily_rate=_round(total_amount, 6),
                recognition_method=RecognitionMethod.STRAIGHT_LINE,
                status=ScheduleStatus.PENDING,
            )
        ]
    
    daily_rate = total_amount / total_days
    
    # Generate periods
    current_start = service_start_date
    allocated_total = Decimal("0")
    
    while current_start <= service_end_date:
        # Calculate period end
        if period_granularity == "monthly":
            period_end = _end_of_month(current_start)
        else:
            period_end = _end_of_quarter(current_start)
        
        # Cap at service end date
        if period_end > service_end_date:
            period_end = service_end_date
        
        period_days = (period_end - current_start).days + 1
        
        # Calculate scheduled amount
        is_last_period = period_end >= service_end_date
        if is_last_period:
            scheduled_amount = _round(total_amount - allocated_total, 2)
        else:
            scheduled_amount = _round(daily_rate * period_days, 2)
        
        allocated_total += scheduled_amount
        
        periods.append(
            SchedulePeriod(
                period_start=current_start,
                period_end=period_end,
                scheduled_amount=scheduled_amount,
                recognized_amount=Decimal("0"),
                deferred_amount=scheduled_amount,
                period_days=period_days,
                daily_rate=_round(daily_rate, 6),
                recognition_method=RecognitionMethod.STRAIGHT_LINE,
                status=ScheduleStatus.PENDING,
            )
        )
        
        # Move to next period
        next_start = period_end + timedelta(days=1)
        if next_start > service_end_date:
            break
        current_start = next_start
    
    return periods


def _generate_usage_based_schedule(
    service_start_date: date,
    service_end_date: date,
    total_amount: Decimal,
    period_granularity: str,
) -> list[SchedulePeriod]:
    """Generate usage-based schedule (placeholder periods)."""
    periods = []
    current_start = service_start_date
    
    while current_start < service_end_date:
        if period_granularity == "monthly":
            period_end = _end_of_month(current_start)
        else:
            period_end = _end_of_quarter(current_start)
        
        if period_end > service_end_date:
            period_end = service_end_date
        
        period_days = (period_end - current_start).days + 1
        
        periods.append(
            SchedulePeriod(
                period_start=current_start,
                period_end=period_end,
                scheduled_amount=Decimal("0"),  # Placeholder
                recognized_amount=Decimal("0"),
                deferred_amount=Decimal("0"),
                period_days=period_days,
                daily_rate=Decimal("0"),
                recognition_method=RecognitionMethod.USAGE_BASED,
                status=ScheduleStatus.PENDING,
            )
        )
        
        current_start = period_end + timedelta(days=1)
    
    return periods


def _generate_milestone_schedule(
    service_start_date: date,
    service_end_date: date,
    total_amount: Decimal,
) -> list[SchedulePeriod]:
    """Generate milestone schedule (single period)."""
    period_days = max(1, (service_end_date - service_start_date).days)
    
    return [
        SchedulePeriod(
            period_start=service_start_date,
            period_end=service_end_date,
            scheduled_amount=_round(total_amount, 2),
            recognized_amount=Decimal("0"),
            deferred_amount=_round(total_amount, 2),
            period_days=period_days,
            daily_rate=_round(total_amount / period_days, 6),
            recognition_method=RecognitionMethod.MILESTONE,
            status=ScheduleStatus.PENDING,
        )
    ]


def _generate_as_invoiced_schedule(
    service_start_date: date,
    total_amount: Decimal,
) -> list[SchedulePeriod]:
    """Generate as-invoiced schedule (immediate recognition)."""
    return [
        SchedulePeriod(
            period_start=service_start_date,
            period_end=service_start_date,
            scheduled_amount=_round(total_amount, 2),
            recognized_amount=_round(total_amount, 2),  # Immediately recognized
            deferred_amount=Decimal("0"),
            period_days=1,
            daily_rate=_round(total_amount, 6),
            recognition_method=RecognitionMethod.AS_INVOICED,
            status=ScheduleStatus.RECOGNIZED,
        )
    ]


def _end_of_month(d: date) -> date:
    """Get the last day of the month."""
    _, last_day = monthrange(d.year, d.month)
    return date(d.year, d.month, last_day)


def _end_of_quarter(d: date) -> date:
    """Get the last day of the quarter."""
    quarter = (d.month - 1) // 3
    quarter_end_month = (quarter + 1) * 3
    if quarter_end_month > 12:
        quarter_end_month = 12
    _, last_day = monthrange(d.year, quarter_end_month)
    return date(d.year, quarter_end_month, last_day)


def _round(value, decimals: int) -> Decimal:
    """Round a value to specified decimal places."""
    # Ensure value is a Decimal
    if not isinstance(value, Decimal):
        value = Decimal(str(value)) if value is not None else Decimal("0")
    quantize_str = "0." + "0" * decimals
    return value.quantize(Decimal(quantize_str), rounding=ROUND_HALF_UP)
