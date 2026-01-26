"""
Payment, credit, and refund models.
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class PaymentMethod(str, Enum):
    """Payment method types."""
    CREDIT_CARD = "credit_card"
    ACH = "ach"
    WIRE = "wire"
    CHECK = "check"
    PAYPAL = "paypal"
    OTHER = "other"


class PaymentStatus(str, Enum):
    """Payment status values."""
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class Payment(BaseModel):
    """Payment record."""
    id: str
    tenant_id: str
    snapshot_id: str
    customer_id: Optional[str] = None
    invoice_id: Optional[str] = None
    external_id: str
    external_ids: dict[str, str] = Field(default_factory=dict)
    amount: Decimal
    currency: str = "USD"
    payment_date: datetime
    payment_method: PaymentMethod = PaymentMethod.CREDIT_CARD
    status: PaymentStatus = PaymentStatus.SUCCEEDED
    reference: Optional[str] = None
    failure_reason: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    source_system: str = "synthetic"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True


class CreditType(str, Enum):
    """Credit types."""
    PROMOTIONAL = "promotional"
    REFERRAL = "referral"
    SERVICE_CREDIT = "service_credit"
    GOODWILL = "goodwill"
    BILLING_ERROR = "billing_error"
    PREPAYMENT = "prepayment"


class CreditStatus(str, Enum):
    """Credit status."""
    ACTIVE = "active"
    APPLIED = "applied"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class Credit(BaseModel):
    """Credit/promotional balance."""
    id: str
    tenant_id: str
    snapshot_id: str
    customer_id: str
    external_id: str
    credit_type: CreditType
    original_amount: Decimal
    remaining_amount: Decimal
    currency: str = "USD"
    issued_date: date
    expiry_date: Optional[date] = None
    status: CreditStatus = CreditStatus.ACTIVE
    reason: Optional[str] = None
    applied_to_invoices: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    source_system: str = "synthetic"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True


class RefundReason(str, Enum):
    """Refund reasons."""
    CUSTOMER_REQUEST = "customer_request"
    DUPLICATE_CHARGE = "duplicate_charge"
    SERVICE_ISSUE = "service_issue"
    BILLING_ERROR = "billing_error"
    CANCELLATION = "cancellation"
    FRAUD = "fraud"
    OTHER = "other"


class RefundStatus(str, Enum):
    """Refund status."""
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Refund(BaseModel):
    """Refund record."""
    id: str
    tenant_id: str
    snapshot_id: str
    payment_id: str
    invoice_id: Optional[str] = None
    customer_id: Optional[str] = None
    external_id: str
    amount: Decimal
    currency: str = "USD"
    refund_date: datetime
    reason: RefundReason = RefundReason.CUSTOMER_REQUEST
    status: RefundStatus = RefundStatus.SUCCEEDED
    notes: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    source_system: str = "synthetic"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True
