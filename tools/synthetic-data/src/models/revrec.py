"""
Revenue recognition models matching Cogtics revrec types.
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class ObligationType(str, Enum):
    """Revenue obligation types."""
    SUBSCRIPTION = "subscription"
    USAGE = "usage"
    ONE_TIME = "one_time"
    PROFESSIONAL_SERVICES = "professional_services"
    SUPPORT = "support"


class AllocationMethod(str, Enum):
    """Price allocation methods."""
    SSP = "ssp"  # Standalone Selling Price
    RESIDUAL = "residual"
    STRAIGHT_LINE = "straight_line"
    CUSTOM = "custom"


class RecognitionMethod(str, Enum):
    """Revenue recognition methods."""
    STRAIGHT_LINE = "straight_line"
    USAGE_BASED = "usage_based"
    MILESTONE = "milestone"
    AS_INVOICED = "as_invoiced"


class ObligationStatus(str, Enum):
    """Revenue obligation status."""
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    AMENDED = "amended"


class ScheduleStatus(str, Enum):
    """Schedule period status."""
    PENDING = "pending"
    PARTIAL = "partial"
    RECOGNIZED = "recognized"
    CANCELLED = "cancelled"


class RecognitionEventType(str, Enum):
    """Recognition event types."""
    SCHEDULED = "scheduled"
    USAGE = "usage"
    MILESTONE = "milestone"
    ADJUSTMENT = "adjustment"
    CANCELLATION = "cancellation"
    AMENDMENT = "amendment"


class ReconciliationStatus(str, Enum):
    """Reconciliation result status."""
    MATCHED = "matched"
    TIMING_VARIANCE = "timing_variance"
    AMOUNT_VARIANCE = "amount_variance"
    MISSING_INVOICE = "missing_invoice"
    UNMATCHED = "unmatched"


class RevenueObligation(BaseModel):
    """Identified revenue obligation from a contract."""
    id: str
    tenant_id: str
    snapshot_id: str
    contract_id: str
    contract_version_id: Optional[str] = None
    obligation_type: ObligationType
    description: Optional[str] = None
    transaction_price: Decimal
    currency: str = "USD"
    allocation_method: AllocationMethod = AllocationMethod.STRAIGHT_LINE
    standalone_selling_price: Optional[Decimal] = None
    service_start_date: Optional[date] = None
    service_end_date: Optional[date] = None
    status: ObligationStatus = ObligationStatus.ACTIVE
    source_term_ids: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True


class RevenueAllocation(BaseModel):
    """Price allocation result for an obligation."""
    id: str
    tenant_id: str
    snapshot_id: str
    obligation_id: str
    obligation_index: int = 0
    allocation_pct: Decimal = Field(ge=0, le=100)
    allocated_amount: Decimal
    allocation_basis: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RevenueSchedule(BaseModel):
    """Recognition schedule period for an obligation."""
    id: str
    tenant_id: str
    snapshot_id: str
    obligation_id: str
    period_start: date
    period_end: date
    scheduled_amount: Decimal
    recognized_amount: Decimal = Decimal("0")
    deferred_amount: Decimal = Decimal("0")
    recognition_method: RecognitionMethod = RecognitionMethod.STRAIGHT_LINE
    status: ScheduleStatus = ScheduleStatus.PENDING
    period_days: Optional[int] = None
    daily_rate: Optional[Decimal] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True


class RecognitionEvent(BaseModel):
    """A revenue recognition event."""
    id: str
    tenant_id: str
    snapshot_id: str
    obligation_id: str
    schedule_id: Optional[str] = None
    event_date: date
    recognized_amount: Decimal
    event_type: RecognitionEventType = RecognitionEventType.SCHEDULED
    source_invoice_id: Optional[str] = None
    description: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True


class DeferredBalance(BaseModel):
    """Deferred revenue balance for a period."""
    id: str
    tenant_id: str
    snapshot_id: str
    obligation_id: str
    period_end: date
    opening_balance: Decimal
    additions: Decimal = Decimal("0")
    recognized: Decimal = Decimal("0")
    adjustments: Decimal = Decimal("0")
    closing_balance: Decimal
    created_at: datetime = Field(default_factory=datetime.utcnow)

    def compute_closing(self) -> None:
        """Compute closing balance from components."""
        self.closing_balance = (
            self.opening_balance 
            + self.additions 
            - self.recognized 
            + self.adjustments
        )


class ReconciliationResult(BaseModel):
    """Result of reconciling schedules with invoices."""
    id: str
    tenant_id: str
    snapshot_id: str
    contract_id: str
    period_start: date
    period_end: date
    status: ReconciliationStatus
    scheduled_amount: Decimal
    invoiced_amount: Decimal
    variance_amount: Decimal
    variance_pct: Optional[Decimal] = None
    details: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True
