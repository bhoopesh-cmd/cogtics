"""
Explicit contract terms model for comprehensive rule validation.

Defines structured term types that map directly to detection rule requirements:
- Quantity terms (seats, users, licenses, devices)
- Unit price terms (with effective dates and price locks)
- Discount terms (promotional, volume, loyalty, bundle)
- Uplift terms (annual increases)
- Ramp schedule terms (multi-year pricing)
- Usage caps and overage terms
- Billing cadence terms
- Renewal terms
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional, List, Dict
from pydantic import BaseModel, Field
import uuid


class UnitType(str, Enum):
    """Unit types for quantity terms."""
    SEATS = "seats"
    USERS = "users"
    LICENSES = "licenses"
    DEVICES = "devices"
    INSTANCES = "instances"
    CORES = "cores"


class DiscountType(str, Enum):
    """Discount term types."""
    PROMOTIONAL = "promotional"
    VOLUME = "volume"
    LOYALTY = "loyalty"
    BUNDLE = "bundle"
    ENTERPRISE = "enterprise"
    FIRST_INVOICE = "first_invoice"


class UsageMetric(str, Enum):
    """Usage metric types."""
    API_CALLS = "api_calls"
    STORAGE_GB = "storage_gb"
    COMPUTE_HOURS = "compute_hours"
    BANDWIDTH_GB = "bandwidth_gb"
    TRANSACTIONS = "transactions"
    EVENTS = "events"


class BillingFrequency(str, Enum):
    """Billing frequency options."""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUALLY = "annually"
    ONE_TIME = "one_time"


class ProrationMethod(str, Enum):
    """Proration calculation methods."""
    DAILY_EXACT = "daily_exact"
    DAILY_30 = "daily_30"
    MONTHLY_PROPORTIONAL = "monthly_proportional"
    NONE = "none"


class CapPeriod(str, Enum):
    """Usage cap period types."""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"
    CUMULATIVE = "cumulative"


# Base term model
class ContractTermBase(BaseModel):
    """Base class for all contract terms."""
    id: str = Field(default_factory=lambda: f"term_{uuid.uuid4().hex[:12]}")
    tenant_id: str
    snapshot_id: str
    contract_id: str
    contract_version_id: Optional[str] = None
    effective_date: Optional[date] = None
    expiration_date: Optional[date] = None
    confidence: float = Field(default=100.0, ge=0, le=100)
    source_clause: Optional[str] = None
    source_page: Optional[int] = None
    extraction_method: str = "synthetic"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        use_enum_values = True


class QuantityTerm(ContractTermBase):
    """
    Quantity term defining committed quantities.
    
    Used for R005 (wrong quantity) validation.
    """
    term_type: str = "quantity"
    quantity: int = Field(ge=1)
    unit: UnitType = UnitType.SEATS
    min_commit: Optional[int] = None
    max_quantity: Optional[int] = None
    true_up_frequency: Optional[str] = None  # monthly | quarterly | annual
    product_id: Optional[str] = None


class UnitPriceTerm(ContractTermBase):
    """
    Unit price term defining pricing for a product/service.
    
    Used for R004 (wrong unit price) validation.
    """
    term_type: str = "unit_price"
    unit_price: Decimal
    currency: str = "USD"
    price_effective_date: Optional[date] = None
    price_lock_until: Optional[date] = None
    product_id: Optional[str] = None
    price_tier: Optional[str] = None  # For tiered pricing
    tier_min_quantity: Optional[int] = None
    tier_max_quantity: Optional[int] = None


class DiscountTerm(ContractTermBase):
    """
    Discount term defining discount rates and validity.
    
    Used for R011-R014 (discount rules) validation.
    """
    term_type: str = "discount"
    discount_pct: Decimal = Field(ge=0, le=100)
    discount_start: Optional[date] = None
    discount_end: Optional[date] = None
    discount_type: DiscountType = DiscountType.PROMOTIONAL
    max_discount_pct: Optional[Decimal] = Field(default=None, ge=0, le=100)
    applies_to: Optional[str] = None  # "all" | specific product_id
    stacks_with: List[str] = Field(default_factory=list)  # Other discount IDs
    is_cumulative: bool = False


class UpliftTerm(ContractTermBase):
    """
    Uplift term defining annual price increases.
    
    Used for R015 (uplift not applied) validation.
    """
    term_type: str = "uplift"
    uplift_pct: Decimal = Field(ge=0, le=50)
    uplift_effective_date: Optional[date] = None  # Typically renewal
    uplift_cap_pct: Optional[Decimal] = Field(default=None, ge=0, le=50)
    base_for_calculation: str = "list_price"  # "list_price" | "net_price"
    applies_annually: bool = True


class RampPeriod(BaseModel):
    """A single period in a ramp schedule."""
    period: int = Field(ge=1)
    amount: Decimal
    percentage: Decimal = Field(ge=0, le=100)  # % of full price
    start_date: date
    end_date: date


class RampScheduleTerm(ContractTermBase):
    """
    Ramp schedule term defining graduated pricing over time.
    
    Used for R016 (ramp pricing mismatch) validation.
    """
    term_type: str = "ramp_schedule"
    periods: List[RampPeriod] = Field(default_factory=list)
    full_price: Decimal
    currency: str = "USD"
    
    def get_amount_for_date(self, target_date: date) -> Optional[Decimal]:
        """Get the ramp amount for a specific date."""
        for period in self.periods:
            if period.start_date <= target_date < period.end_date:
                return period.amount
        return None


class UsageCapTerm(ContractTermBase):
    """
    Usage cap term defining usage limits and overage pricing.
    
    Used for R152 (usage exceeds cap) validation.
    """
    term_type: str = "usage_caps"
    cap_amount: Decimal
    overage_rate: Decimal  # Per unit over cap
    usage_metric: UsageMetric = UsageMetric.API_CALLS
    cap_period: CapPeriod = CapPeriod.MONTHLY
    rollover_enabled: bool = False
    rollover_max_periods: Optional[int] = None


class BillingCadenceTerm(ContractTermBase):
    """
    Billing cadence term defining billing frequency and timing.
    
    Used for R010, R017 (frequency/period mismatch) validation.
    """
    term_type: str = "billing_cadence"
    frequency: BillingFrequency = BillingFrequency.MONTHLY
    billing_day: int = Field(default=1, ge=1, le=28)
    proration_method: ProrationMethod = ProrationMethod.DAILY_EXACT
    invoice_in_advance: bool = True  # vs. arrears
    payment_terms_days: int = 30


class RenewalTerm(ContractTermBase):
    """
    Renewal term defining auto-renewal and notice periods.
    
    Used for R064 (auto-renew not reflected) validation.
    """
    term_type: str = "renewal_terms"
    auto_renew: bool = True
    renewal_notice_days: int = Field(default=30, ge=0)
    renewal_term_months: int = Field(default=12, ge=1)
    renewal_cap_years: Optional[int] = None
    renewal_price_change: Optional[str] = None  # "same" | "uplift" | "market"


class PaymentTerm(ContractTermBase):
    """
    Payment term defining payment conditions.
    
    Used for R161 (payment hold mismatch) validation.
    """
    term_type: str = "payment_terms"
    net_days: int = Field(default=30, ge=0)
    payment_method: Optional[str] = None  # "ach" | "wire" | "card" | "check"
    early_payment_discount_pct: Optional[Decimal] = None
    early_payment_days: Optional[int] = None
    late_fee_pct: Optional[Decimal] = None
    payment_hold: bool = False


class TaxExemptionTerm(ContractTermBase):
    """
    Tax exemption term for tax rule validation.
    
    Used for R120-R122 (tax rules) validation.
    """
    term_type: str = "tax_exemption"
    is_exempt: bool = False
    exemption_certificate: Optional[str] = None
    exemption_reason: Optional[str] = None
    jurisdiction: Optional[str] = None  # State/country code
    exemption_expiry: Optional[date] = None


class EntityTerm(ContractTermBase):
    """
    Multi-entity term for entity relationship validation.
    
    Used for R170-R173 (multi-entity rules) validation.
    """
    term_type: str = "entity"
    sold_to_entity_id: str
    bill_to_entity_id: Optional[str] = None
    ship_to_entity_id: Optional[str] = None
    parent_entity_id: Optional[str] = None
    split_billing: bool = False
    split_percentages: Dict[str, Decimal] = Field(default_factory=dict)


class ContractTermsCollection(BaseModel):
    """
    Collection of all contract terms for a contract.
    
    Provides structured access to terms for rule validation.
    """
    contract_id: str
    tenant_id: str
    snapshot_id: str
    
    # Core terms
    quantities: List[QuantityTerm] = Field(default_factory=list)
    unit_prices: List[UnitPriceTerm] = Field(default_factory=list)
    discounts: List[DiscountTerm] = Field(default_factory=list)
    uplifts: List[UpliftTerm] = Field(default_factory=list)
    ramp_schedules: List[RampScheduleTerm] = Field(default_factory=list)
    usage_caps: List[UsageCapTerm] = Field(default_factory=list)
    
    # Billing & Payment
    billing_cadence: Optional[BillingCadenceTerm] = None
    renewal: Optional[RenewalTerm] = None
    payment: Optional[PaymentTerm] = None
    
    # Tax & Entity
    tax_exemption: Optional[TaxExemptionTerm] = None
    entity: Optional[EntityTerm] = None
    
    def get_quantity(self, product_id: Optional[str] = None) -> Optional[int]:
        """Get quantity for a product."""
        for q in self.quantities:
            if product_id is None or q.product_id == product_id:
                return q.quantity
        return None
    
    def get_unit_price(
        self,
        product_id: Optional[str] = None,
        as_of: Optional[date] = None,
        quantity: Optional[int] = None,
    ) -> Optional[Decimal]:
        """Get unit price for a product, considering tiers and effective dates."""
        candidates = []
        for p in self.unit_prices:
            if product_id and p.product_id != product_id:
                continue
            if as_of and p.price_effective_date and p.price_effective_date > as_of:
                continue
            if quantity and p.tier_min_quantity and quantity < p.tier_min_quantity:
                continue
            if quantity and p.tier_max_quantity and quantity > p.tier_max_quantity:
                continue
            candidates.append(p)
        
        if not candidates:
            return None
        # Return the most recent / applicable price
        return candidates[-1].unit_price
    
    def get_active_discount(
        self,
        as_of: date,
        product_id: Optional[str] = None,
    ) -> Optional[DiscountTerm]:
        """Get the active discount for a date."""
        for d in self.discounts:
            if d.discount_start and d.discount_start > as_of:
                continue
            if d.discount_end and d.discount_end < as_of:
                continue
            if product_id and d.applies_to and d.applies_to != product_id and d.applies_to != "all":
                continue
            return d
        return None
    
    def get_ramp_amount(self, as_of: date) -> Optional[Decimal]:
        """Get the ramp amount for a specific date."""
        for ramp in self.ramp_schedules:
            amount = ramp.get_amount_for_date(as_of)
            if amount is not None:
                return amount
        return None
    
    def get_usage_cap(self, metric: UsageMetric) -> Optional[UsageCapTerm]:
        """Get usage cap for a metric."""
        for cap in self.usage_caps:
            if cap.usage_metric == metric:
                return cap
        return None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for export."""
        return {
            "contract_id": self.contract_id,
            "tenant_id": self.tenant_id,
            "snapshot_id": self.snapshot_id,
            "quantities": [q.dict() for q in self.quantities],
            "unit_prices": [p.dict() for p in self.unit_prices],
            "discounts": [d.dict() for d in self.discounts],
            "uplifts": [u.dict() for u in self.uplifts],
            "ramp_schedules": [r.dict() for r in self.ramp_schedules],
            "usage_caps": [c.dict() for c in self.usage_caps],
            "billing_cadence": self.billing_cadence.dict() if self.billing_cadence else None,
            "renewal": self.renewal.dict() if self.renewal else None,
            "payment": self.payment.dict() if self.payment else None,
            "tax_exemption": self.tax_exemption.dict() if self.tax_exemption else None,
            "entity": self.entity.dict() if self.entity else None,
        }


class ContractTermsGenerator:
    """Generator for realistic contract terms."""
    
    def __init__(
        self,
        tenant_id: str = "tenant_001",
        snapshot_id: str = "snap_001",
    ):
        self.tenant_id = tenant_id
        self.snapshot_id = snapshot_id
    
    def generate_standard_terms(
        self,
        contract_id: str,
        arr: Decimal,
        start_date: date,
        end_date: Optional[date] = None,
        with_discount: bool = False,
        with_ramp: bool = False,
        with_usage: bool = False,
    ) -> ContractTermsCollection:
        """Generate a standard set of contract terms."""
        import random
        from dateutil.relativedelta import relativedelta
        
        end_date = end_date or (start_date + relativedelta(years=1))
        
        collection = ContractTermsCollection(
            contract_id=contract_id,
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
        )
        
        # Generate quantity term
        quantity = random.randint(5, 100)
        collection.quantities.append(QuantityTerm(
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract_id,
            quantity=quantity,
            unit=random.choice(list(UnitType)),
            effective_date=start_date,
        ))
        
        # Generate unit price term
        unit_price = (arr / 12 / Decimal(str(quantity))).quantize(Decimal("0.01"))
        collection.unit_prices.append(UnitPriceTerm(
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract_id,
            unit_price=unit_price,
            price_effective_date=start_date,
            effective_date=start_date,
        ))
        
        # Add billing cadence
        collection.billing_cadence = BillingCadenceTerm(
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract_id,
            frequency=BillingFrequency.MONTHLY,
            billing_day=1,
            effective_date=start_date,
        )
        
        # Add renewal terms
        collection.renewal = RenewalTerm(
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract_id,
            auto_renew=random.choice([True, False]),
            renewal_notice_days=random.choice([30, 60, 90]),
            renewal_term_months=12,
            effective_date=start_date,
        )
        
        # Add payment terms
        collection.payment = PaymentTerm(
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract_id,
            net_days=random.choice([15, 30, 45, 60]),
            effective_date=start_date,
        )
        
        # Optionally add discount
        if with_discount:
            discount_pct = Decimal(str(random.randint(5, 25)))
            discount_end = start_date + relativedelta(months=6)
            collection.discounts.append(DiscountTerm(
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                contract_id=contract_id,
                discount_pct=discount_pct,
                discount_start=start_date,
                discount_end=discount_end,
                discount_type=random.choice(list(DiscountType)),
                max_discount_pct=Decimal("40"),
                effective_date=start_date,
            ))
        
        # Optionally add ramp
        if with_ramp:
            periods = []
            current = start_date
            full_monthly = arr / 12
            for i, pct in enumerate([Decimal("80"), Decimal("90"), Decimal("100")]):
                period_end = current + relativedelta(months=4)
                periods.append(RampPeriod(
                    period=i + 1,
                    amount=(full_monthly * pct / 100).quantize(Decimal("0.01")),
                    percentage=pct,
                    start_date=current,
                    end_date=period_end,
                ))
                current = period_end
            
            collection.ramp_schedules.append(RampScheduleTerm(
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                contract_id=contract_id,
                periods=periods,
                full_price=arr,
                effective_date=start_date,
            ))
        
        # Optionally add usage caps
        if with_usage:
            collection.usage_caps.append(UsageCapTerm(
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                contract_id=contract_id,
                cap_amount=Decimal("100000"),
                overage_rate=Decimal("0.01"),
                usage_metric=UsageMetric.API_CALLS,
                cap_period=CapPeriod.MONTHLY,
                effective_date=start_date,
            ))
        
        # Add uplift
        collection.uplifts.append(UpliftTerm(
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract_id,
            uplift_pct=Decimal(str(random.randint(3, 8))),
            uplift_effective_date=end_date,  # On renewal
            effective_date=start_date,
        ))
        
        return collection
