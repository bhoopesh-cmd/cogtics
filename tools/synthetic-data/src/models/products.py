"""
Product and pricing models.
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional, Union
from pydantic import BaseModel, Field


class ProductType(str, Enum):
    """Product types."""
    SUBSCRIPTION = "subscription"
    USAGE_BASED = "usage_based"
    ONE_TIME = "one_time"
    PROFESSIONAL_SERVICES = "professional_services"
    SUPPORT = "support"
    ADD_ON = "add_on"


class ProductStatus(str, Enum):
    """Product status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DEPRECATED = "deprecated"
    ARCHIVED = "archived"


class Product(BaseModel):
    """Product definition."""
    id: str
    tenant_id: str
    snapshot_id: str
    external_id: str
    external_ids: dict[str, str] = Field(default_factory=dict)
    sku: Optional[str] = None
    name: str
    description: Optional[str] = None
    product_type: ProductType = ProductType.SUBSCRIPTION
    category: Optional[str] = None
    status: ProductStatus = ProductStatus.ACTIVE
    metadata: dict[str, Any] = Field(default_factory=dict)
    source_system: str = "synthetic"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True


class PricingModel(str, Enum):
    """Pricing model types."""
    FLAT = "flat"
    PER_UNIT = "per_unit"
    TIERED = "tiered"
    VOLUME = "volume"
    GRADUATED = "graduated"
    PACKAGE = "package"
    USAGE = "usage"


class BillingCadence(str, Enum):
    """Billing cadence options."""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    SEMI_ANNUAL = "semi_annual"
    ANNUAL = "annual"
    ONE_TIME = "one_time"
    USAGE_BASED = "usage_based"


class TierMode(str, Enum):
    """How tiers are applied."""
    GRADUATED = "graduated"  # Each tier applies to its range
    VOLUME = "volume"  # Highest tier applies to all


class PriceTier(BaseModel):
    """Price tier for tiered/volume pricing."""
    up_to: Optional[int] = None  # None = infinity
    unit_price: Decimal
    flat_fee: Decimal = Decimal("0")


class PricePlan(BaseModel):
    """Pricing plan for a product."""
    id: str
    tenant_id: str
    snapshot_id: str
    product_id: str
    external_id: str
    external_ids: dict[str, str] = Field(default_factory=dict)
    name: Optional[str] = None
    pricing_model: PricingModel = PricingModel.FLAT
    billing_cadence: BillingCadence = BillingCadence.MONTHLY
    currency: str = "USD"
    
    # Pricing details
    base_price: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    tiers: list[PriceTier] = Field(default_factory=list)
    tier_mode: Optional[TierMode] = None
    
    # Included quantities
    included_units: Optional[int] = None
    minimum_units: Optional[int] = None
    
    # Validity
    effective_date: Optional[date] = None
    end_date: Optional[date] = None
    
    status: ProductStatus = ProductStatus.ACTIVE
    metadata: dict[str, Any] = Field(default_factory=dict)
    source_system: str = "synthetic"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True

    def calculate_amount(self, quantity: int) -> Decimal:
        """Calculate amount for a given quantity."""
        if self.pricing_model == PricingModel.FLAT:
            return self.base_price or Decimal("0")
        
        elif self.pricing_model == PricingModel.PER_UNIT:
            return (self.unit_price or Decimal("0")) * quantity
        
        elif self.pricing_model == PricingModel.TIERED:
            return self._calculate_tiered(quantity)
        
        elif self.pricing_model == PricingModel.VOLUME:
            return self._calculate_volume(quantity)
        
        return Decimal("0")
    
    def _calculate_tiered(self, quantity: int) -> Decimal:
        """Calculate graduated tiered pricing."""
        total = Decimal("0")
        remaining = quantity
        prev_up_to = 0
        
        for tier in self.tiers:
            if remaining <= 0:
                break
            
            tier_max = tier.up_to or float('inf')
            tier_units = min(remaining, tier_max - prev_up_to)
            
            if tier_units > 0:
                total += tier.flat_fee + (tier.unit_price * tier_units)
                remaining -= tier_units
                prev_up_to = tier_max
        
        return total
    
    def _calculate_volume(self, quantity: int) -> Decimal:
        """Calculate volume pricing (single tier applies to all)."""
        for tier in self.tiers:
            tier_max = tier.up_to or float('inf')
            if quantity <= tier_max:
                return tier.flat_fee + (tier.unit_price * quantity)
        
        # Use last tier
        if self.tiers:
            tier = self.tiers[-1]
            return tier.flat_fee + (tier.unit_price * quantity)
        
        return Decimal("0")


class DiscountType(str, Enum):
    """Discount types."""
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"
    FREE_UNITS = "free_units"


class DiscountDuration(str, Enum):
    """How long discount applies."""
    ONCE = "once"
    FOREVER = "forever"
    REPEATING = "repeating"


class Discount(BaseModel):
    """Discount definition."""
    id: str
    tenant_id: str
    snapshot_id: str
    external_id: str
    name: Optional[str] = None
    discount_type: DiscountType
    value: Decimal  # Percentage (0-100) or fixed amount
    currency: Optional[str] = None  # Required for fixed_amount
    duration: DiscountDuration = DiscountDuration.ONCE
    duration_months: Optional[int] = None  # For REPEATING
    applies_to_products: list[str] = Field(default_factory=list)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    max_redemptions: Optional[int] = None
    current_redemptions: int = 0
    metadata: dict[str, Any] = Field(default_factory=dict)
    source_system: str = "synthetic"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True

    def apply(self, amount: Decimal) -> Decimal:
        """Apply discount to an amount."""
        if self.discount_type == DiscountType.PERCENTAGE:
            return amount * (1 - self.value / 100)
        elif self.discount_type == DiscountType.FIXED_AMOUNT:
            return max(Decimal("0"), amount - self.value)
        return amount


class RampSchedule(BaseModel):
    """Price ramp schedule."""
    id: str
    tenant_id: str
    snapshot_id: str
    contract_id: str
    external_id: str
    name: Optional[str] = None
    
    # Ramp periods
    periods: list[dict[str, Any]] = Field(default_factory=list)
    # e.g., [{"start": "2024-01-01", "end": "2024-06-30", "percentage": 50},
    #        {"start": "2024-07-01", "end": "2024-12-31", "percentage": 100}]
    
    base_amount: Decimal
    currency: str = "USD"
    metadata: dict[str, Any] = Field(default_factory=dict)
    source_system: str = "synthetic"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    def get_amount_for_date(self, as_of: date) -> Decimal:
        """Get ramped amount for a specific date."""
        for period in self.periods:
            start = date.fromisoformat(period["start"])
            end = date.fromisoformat(period["end"])
            if start <= as_of <= end:
                pct = Decimal(str(period["percentage"])) / 100
                return self.base_amount * pct
        return self.base_amount
