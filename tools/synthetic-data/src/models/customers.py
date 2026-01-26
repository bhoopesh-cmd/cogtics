"""
Customer models matching Cogtics schemas.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class CustomerStatus(str, Enum):
    """Customer status values."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    CHURNED = "churned"
    PROSPECT = "prospect"


class Customer(BaseModel):
    """Main customer entity matching Cogtics canonical schema."""
    id: str
    tenant_id: str
    snapshot_id: str
    external_id: str
    external_ids: dict[str, str] = Field(default_factory=dict)
    name: str
    email: Optional[str] = None
    status: CustomerStatus = CustomerStatus.ACTIVE
    metadata: dict[str, Any] = Field(default_factory=dict)
    source_system: str = "synthetic"
    source_batch_id: Optional[str] = None
    source_record_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True


class ProductStatus(str, Enum):
    """Product status values."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class Product(BaseModel):
    """Product entity matching Cogtics schema."""
    id: str
    tenant_id: str
    snapshot_id: str
    external_id: str
    external_ids: dict[str, str] = Field(default_factory=dict)
    sku: Optional[str] = None
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    status: ProductStatus = ProductStatus.ACTIVE
    metadata: dict[str, Any] = Field(default_factory=dict)
    source_system: str = "synthetic"
    source_batch_id: Optional[str] = None
    source_record_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True


class BillingCadence(str, Enum):
    """Billing cadence options for price plans."""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUALLY = "annually"
    ONE_TIME = "one_time"
    USAGE_BASED = "usage_based"


class PricePlanStatus(str, Enum):
    """Price plan status values."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class PricePlan(BaseModel):
    """Price plan entity matching Cogtics schema."""
    id: str
    tenant_id: str
    snapshot_id: str
    product_id: str
    external_id: str
    external_ids: dict[str, str] = Field(default_factory=dict)
    name: Optional[str] = None
    billing_cadence: Optional[BillingCadence] = None
    currency: str = "USD"
    price: Any = None  # Can be flat, tiered, volume, or graduated pricing
    status: PricePlanStatus = PricePlanStatus.ACTIVE
    metadata: dict[str, Any] = Field(default_factory=dict)
    source_system: str = "synthetic"
    source_batch_id: Optional[str] = None
    source_record_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True
