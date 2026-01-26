"""
Usage records and metering models.
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class MeterType(str, Enum):
    """Types of usage meters."""
    API_CALLS = "api_calls"
    STORAGE_GB = "storage_gb"
    BANDWIDTH_GB = "bandwidth_gb"
    COMPUTE_HOURS = "compute_hours"
    SEATS = "seats"
    TRANSACTIONS = "transactions"
    MESSAGES = "messages"
    RECORDS = "records"
    CUSTOM = "custom"


class AggregationType(str, Enum):
    """How usage is aggregated."""
    SUM = "sum"
    MAX = "max"
    LAST = "last"
    UNIQUE = "unique"


class UsageRecord(BaseModel):
    """Individual usage record/event."""
    id: str
    tenant_id: str
    snapshot_id: str
    customer_id: str
    contract_id: Optional[str] = None
    subscription_id: Optional[str] = None
    external_id: str
    meter_name: str
    meter_type: MeterType = MeterType.CUSTOM
    quantity: Decimal
    timestamp: datetime
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    unit: Optional[str] = None
    properties: dict[str, Any] = Field(default_factory=dict)
    source_system: str = "synthetic"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True


class UsageSummary(BaseModel):
    """Aggregated usage for a billing period."""
    id: str
    tenant_id: str
    snapshot_id: str
    customer_id: str
    contract_id: Optional[str] = None
    meter_name: str
    meter_type: MeterType
    period_start: date
    period_end: date
    total_quantity: Decimal
    billable_quantity: Decimal
    included_quantity: Decimal = Decimal("0")
    overage_quantity: Decimal = Decimal("0")
    unit_price: Optional[Decimal] = None
    overage_price: Optional[Decimal] = None
    total_amount: Decimal
    currency: str = "USD"
    record_count: int = 0
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True


class CommitmentType(str, Enum):
    """Usage commitment types."""
    NONE = "none"
    MINIMUM = "minimum"
    PREPAID = "prepaid"
    RESERVED = "reserved"


class UsageCommitment(BaseModel):
    """Usage commitment/reservation."""
    id: str
    tenant_id: str
    snapshot_id: str
    customer_id: str
    contract_id: str
    meter_name: str
    commitment_type: CommitmentType
    committed_quantity: Decimal
    used_quantity: Decimal = Decimal("0")
    remaining_quantity: Decimal = Decimal("0")
    period_start: date
    period_end: date
    unit_price: Decimal
    overage_price: Optional[Decimal] = None
    currency: str = "USD"
    rollover: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True

    def compute_remaining(self) -> None:
        """Compute remaining quantity."""
        self.remaining_quantity = max(
            Decimal("0"),
            self.committed_quantity - self.used_quantity
        )
