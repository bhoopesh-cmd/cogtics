"""
Recognition events ported from packages/revrec/src/recognition.ts

Creates recognition events from schedules.
"""

from datetime import date
from decimal import Decimal
from typing import Optional

from .schedules import SchedulePeriod
from ..models.revrec import RecognitionEventType


class RecognitionEvent:
    """A revenue recognition event."""
    
    def __init__(
        self,
        event_date: date,
        recognized_amount: Decimal,
        event_type: RecognitionEventType,
        schedule_index: Optional[int] = None,
        source_invoice_id: Optional[str] = None,
        description: Optional[str] = None,
    ):
        self.event_date = event_date
        self.recognized_amount = recognized_amount
        self.event_type = event_type
        self.schedule_index = schedule_index
        self.source_invoice_id = source_invoice_id
        self.description = description


def create_recognition_events(
    schedules: list[SchedulePeriod],
    as_of_date: Optional[date] = None,
) -> list[RecognitionEvent]:
    """
    Create recognition events from schedule periods.
    
    Port of createRecognitionEvents() from recognition.ts
    
    Args:
        schedules: List of schedule periods
        as_of_date: Date up to which to create events
        
    Returns:
        List of recognition events
    """
    if not schedules:
        return []
    
    events = []
    cutoff = as_of_date or date.today()
    
    for i, schedule in enumerate(schedules):
        # Only create events for periods that have ended
        if schedule.period_end > cutoff:
            continue
        
        # Create scheduled recognition event
        events.append(
            RecognitionEvent(
                event_date=schedule.period_end,
                recognized_amount=schedule.scheduled_amount,
                event_type=RecognitionEventType.SCHEDULED,
                schedule_index=i,
                description=f"Scheduled recognition for period ending {schedule.period_end}",
            )
        )
    
    return events


def create_usage_event(
    event_date: date,
    amount: Decimal,
    schedule_index: Optional[int] = None,
    source_invoice_id: Optional[str] = None,
    description: Optional[str] = None,
) -> RecognitionEvent:
    """Create a usage-based recognition event."""
    return RecognitionEvent(
        event_date=event_date,
        recognized_amount=amount,
        event_type=RecognitionEventType.USAGE,
        schedule_index=schedule_index,
        source_invoice_id=source_invoice_id,
        description=description or "Usage-based recognition",
    )


def create_milestone_event(
    event_date: date,
    amount: Decimal,
    schedule_index: Optional[int] = None,
    description: Optional[str] = None,
) -> RecognitionEvent:
    """Create a milestone-based recognition event."""
    return RecognitionEvent(
        event_date=event_date,
        recognized_amount=amount,
        event_type=RecognitionEventType.MILESTONE,
        schedule_index=schedule_index,
        description=description or "Milestone achieved",
    )


def create_adjustment_event(
    event_date: date,
    amount: Decimal,
    description: Optional[str] = None,
) -> RecognitionEvent:
    """Create an adjustment event."""
    return RecognitionEvent(
        event_date=event_date,
        recognized_amount=amount,
        event_type=RecognitionEventType.ADJUSTMENT,
        description=description or "Revenue adjustment",
    )


def create_cancellation_event(
    event_date: date,
    amount: Decimal,
    description: Optional[str] = None,
) -> RecognitionEvent:
    """Create a cancellation event (negative amount to reverse)."""
    return RecognitionEvent(
        event_date=event_date,
        recognized_amount=-abs(amount),  # Negative to reverse
        event_type=RecognitionEventType.CANCELLATION,
        description=description or "Contract cancellation",
    )


def create_amendment_event(
    event_date: date,
    amount: Decimal,
    description: Optional[str] = None,
) -> RecognitionEvent:
    """Create an amendment event."""
    return RecognitionEvent(
        event_date=event_date,
        recognized_amount=amount,
        event_type=RecognitionEventType.AMENDMENT,
        description=description or "Contract amendment",
    )


def calculate_cumulative_recognized(
    events: list[RecognitionEvent],
    as_of_date: Optional[date] = None,
) -> Decimal:
    """Calculate cumulative recognized amount up to a date."""
    cutoff = as_of_date or date.today()
    
    return sum(
        e.recognized_amount
        for e in events
        if e.event_date <= cutoff
    )


def apply_events_to_schedule(
    schedules: list[SchedulePeriod],
    events: list[RecognitionEvent],
) -> list[SchedulePeriod]:
    """Apply recognition events to update schedule recognized amounts."""
    # Group events by schedule index
    events_by_schedule: dict[int, list[RecognitionEvent]] = {}
    for event in events:
        if event.schedule_index is not None:
            if event.schedule_index not in events_by_schedule:
                events_by_schedule[event.schedule_index] = []
            events_by_schedule[event.schedule_index].append(event)
    
    # Update schedules
    for i, schedule in enumerate(schedules):
        if i in events_by_schedule:
            recognized = sum(e.recognized_amount for e in events_by_schedule[i])
            schedule.recognized_amount = recognized
            schedule.deferred_amount = schedule.scheduled_amount - recognized
            
            if recognized >= schedule.scheduled_amount:
                schedule.status = "recognized"
            elif recognized > 0:
                schedule.status = "partial"
    
    return schedules
