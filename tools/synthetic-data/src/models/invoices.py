"""
Invoice models matching Cogtics schemas.
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class InvoiceStatus(str, Enum):
    """Invoice status values."""
    DRAFT = "draft"
    OPEN = "open"
    PAID = "paid"
    VOID = "void"
    UNCOLLECTIBLE = "uncollectible"
    PAST_DUE = "past_due"


class InvoiceLine(BaseModel):
    """A single line item on an invoice."""
    id: str
    tenant_id: str
    snapshot_id: str
    invoice_id: str
    product_id: Optional[str] = None
    external_id: Optional[str] = None
    description: Optional[str] = None
    quantity: Decimal = Decimal("1")
    unit_price: Optional[Decimal] = None
    amount: Decimal
    currency: str = "USD"
    service_start: Optional[date] = None
    service_end: Optional[date] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Invoice(BaseModel):
    """Main invoice entity matching Cogtics canonical schema."""
    id: str
    tenant_id: str
    snapshot_id: str
    customer_id: Optional[str] = None
    contract_id: Optional[str] = None
    external_id: str
    external_ids: dict[str, str] = Field(default_factory=dict)
    invoice_number: Optional[str] = None
    invoice_date: date
    due_date: Optional[date] = None
    currency: str = "USD"
    subtotal: Optional[Decimal] = None
    tax: Decimal = Decimal("0")
    total: Decimal
    amount_paid: Decimal = Decimal("0")
    amount_due: Optional[Decimal] = None
    status: InvoiceStatus = InvoiceStatus.OPEN
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    source_system: str = "synthetic"
    source_batch_id: Optional[str] = None
    source_record_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Nested relations
    lines: list[InvoiceLine] = Field(default_factory=list)

    class Config:
        use_enum_values = True

    def compute_totals(self) -> None:
        """Compute subtotal and amount_due from lines."""
        self.subtotal = sum(line.amount for line in self.lines)
        self.total = self.subtotal + self.tax
        self.amount_due = self.total - self.amount_paid


class PaymentStatus(str, Enum):
    """Payment status values."""
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class Payment(BaseModel):
    """Payment entity matching Cogtics schema."""
    id: str
    tenant_id: str
    snapshot_id: str
    invoice_id: Optional[str] = None
    customer_id: Optional[str] = None
    external_id: str
    external_ids: dict[str, str] = Field(default_factory=dict)
    amount: Decimal
    currency: str = "USD"
    payment_date: datetime
    method: Optional[str] = None
    status: PaymentStatus = PaymentStatus.SUCCEEDED
    metadata: dict[str, Any] = Field(default_factory=dict)
    source_system: str = "synthetic"
    source_batch_id: Optional[str] = None
    source_record_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True
