"""
Contract lifecycle events: amendments, renewals, cancellations.
"""

import random
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal
from enum import Enum
from typing import Any, Optional

from ..models.contracts import Contract, ContractVersion, ContractTerm, ContractStatus, BillingFrequency


class LifecycleEventType(str, Enum):
    """Types of contract lifecycle events."""
    AMENDMENT = "amendment"
    RENEWAL = "renewal"
    CANCELLATION = "cancellation"
    UPGRADE = "upgrade"
    DOWNGRADE = "downgrade"
    EXPANSION = "expansion"
    CONTRACTION = "contraction"
    PAUSE = "pause"
    RESUME = "resume"


@dataclass
class LifecycleEvent:
    """Base class for lifecycle events."""
    contract_id: str
    effective_date: date
    event_type: LifecycleEventType = LifecycleEventType.AMENDMENT
    processed_date: date = field(default_factory=date.today)
    reason: Optional[str] = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class Amendment:
    """Contract amendment event."""
    contract_id: str
    effective_date: date
    event_type: LifecycleEventType = LifecycleEventType.AMENDMENT
    processed_date: date = field(default_factory=date.today)
    reason: Optional[str] = None
    metadata: dict[str, Any] = field(default_factory=dict)
    
    # What changed
    old_arr: Optional[Decimal] = None
    new_arr: Optional[Decimal] = None
    old_term_end: Optional[date] = None
    new_term_end: Optional[date] = None
    
    # Products added/removed
    added_products: list[str] = field(default_factory=list)
    removed_products: list[str] = field(default_factory=list)
    
    # Proration
    proration_amount: Optional[Decimal] = None
    proration_credit: Optional[Decimal] = None
    
    version_number: int = 2


@dataclass
class Renewal:
    """Contract renewal event."""
    contract_id: str
    effective_date: date
    event_type: LifecycleEventType = LifecycleEventType.RENEWAL
    processed_date: date = field(default_factory=date.today)
    reason: Optional[str] = None
    metadata: dict[str, Any] = field(default_factory=dict)
    
    # Renewal terms
    renewal_term_months: int = 12
    new_start_date: Optional[date] = None
    new_end_date: Optional[date] = None
    
    # Price changes
    old_arr: Optional[Decimal] = None
    new_arr: Optional[Decimal] = None
    price_increase_pct: Optional[Decimal] = None
    
    # Renewal type
    auto_renewed: bool = True
    negotiated: bool = False


@dataclass
class Cancellation:
    """Contract cancellation event."""
    contract_id: str
    effective_date: date
    event_type: LifecycleEventType = LifecycleEventType.CANCELLATION
    processed_date: date = field(default_factory=date.today)
    reason: Optional[str] = None
    metadata: dict[str, Any] = field(default_factory=dict)
    
    # Cancellation details
    cancellation_type: str = "end_of_term"  # immediate, end_of_term, scheduled
    cancellation_reason: str = "customer_request"
    
    # Financial impact
    remaining_value: Optional[Decimal] = None
    refund_amount: Optional[Decimal] = None
    early_termination_fee: Optional[Decimal] = None
    
    # Dates
    last_service_date: Optional[date] = None
    notice_date: Optional[date] = None


class ContractLifecycleManager:
    """
    Manages contract lifecycle events and generates realistic
    contract histories.
    """
    
    def __init__(self, faker_support=None, seed: Optional[int] = None):
        """Initialize the lifecycle manager."""
        from ..support.generators import FakerSupport
        
        self.faker = faker_support or FakerSupport(seed=seed)
        if seed is not None:
            random.seed(seed)
        
        self.event_log: list[LifecycleEvent] = []
    
    def generate_contract_with_history(
        self,
        base_contract: Contract,
        num_amendments: int = 0,
        renewal_count: int = 0,
        cancelled: bool = False,
    ) -> tuple[Contract, list[LifecycleEvent]]:
        """
        Generate a contract with full lifecycle history.
        
        Args:
            base_contract: Starting contract
            num_amendments: Number of amendments to generate
            renewal_count: Number of renewals
            cancelled: Whether to add cancellation
            
        Returns:
            Tuple of (final contract state, list of events)
        """
        events = []
        current_contract = base_contract
        
        # Generate amendments
        for i in range(num_amendments):
            amendment = self._generate_amendment(current_contract, i + 1)
            current_contract = self._apply_amendment(current_contract, amendment)
            events.append(amendment)
        
        # Generate renewals
        for i in range(renewal_count):
            renewal = self._generate_renewal(current_contract)
            current_contract = self._apply_renewal(current_contract, renewal)
            events.append(renewal)
        
        # Generate cancellation
        if cancelled:
            cancellation = self._generate_cancellation(current_contract)
            current_contract = self._apply_cancellation(current_contract, cancellation)
            events.append(cancellation)
        
        self.event_log.extend(events)
        return current_contract, events
    
    def _generate_amendment(
        self,
        contract: Contract,
        version_number: int,
    ) -> Amendment:
        """Generate an amendment event."""
        # Random amendment type
        amendment_types = [
            "arr_increase",
            "arr_decrease",
            "term_extension",
            "add_product",
            "remove_product",
            "upgrade",
            "downgrade",
        ]
        amend_type = random.choice(amendment_types)
        
        old_arr = contract.arr or Decimal("0")
        new_arr = old_arr
        old_term_end = contract.end_date
        new_term_end = old_term_end
        
        if amend_type == "arr_increase":
            increase = Decimal(str(random.uniform(0.10, 0.50)))
            new_arr = old_arr * (1 + increase)
        elif amend_type == "arr_decrease":
            decrease = Decimal(str(random.uniform(0.10, 0.30)))
            new_arr = old_arr * (1 - decrease)
        elif amend_type == "term_extension" and old_term_end:
            extension_months = random.choice([6, 12, 24])
            new_term_end = old_term_end + timedelta(days=extension_months * 30)
        elif amend_type == "upgrade":
            new_arr = old_arr * Decimal("1.5")
        elif amend_type == "downgrade":
            new_arr = old_arr * Decimal("0.7")
        
        # Effective date is sometime during the contract term
        if contract.start_date and contract.end_date:
            days_into_contract = random.randint(
                90,
                max(90, (contract.end_date - contract.start_date).days - 30)
            )
            effective_date = contract.start_date + timedelta(days=days_into_contract)
        else:
            effective_date = date.today()
        
        # Calculate proration if ARR changed
        proration_amount = None
        if new_arr != old_arr and contract.end_date:
            remaining_days = (contract.end_date - effective_date).days
            daily_difference = (new_arr - old_arr) / 365
            proration_amount = daily_difference * remaining_days
        
        return Amendment(
            contract_id=contract.id,
            effective_date=effective_date,
            old_arr=old_arr,
            new_arr=new_arr.quantize(Decimal("0.01")),
            old_term_end=old_term_end,
            new_term_end=new_term_end,
            proration_amount=proration_amount.quantize(Decimal("0.01")) if proration_amount else None,
            version_number=version_number + 1,
            reason=f"Amendment: {amend_type.replace('_', ' ')}",
        )
    
    def _apply_amendment(
        self,
        contract: Contract,
        amendment: Amendment,
    ) -> Contract:
        """Apply an amendment to a contract."""
        if amendment.new_arr is not None:
            contract.arr = amendment.new_arr
        if amendment.new_term_end is not None:
            contract.end_date = amendment.new_term_end
        
        # Add new version
        new_version = ContractVersion(
            id=f"ver_{self.faker._short_uuid()}",
            tenant_id=contract.tenant_id,
            snapshot_id=contract.snapshot_id,
            contract_id=contract.id,
            version=amendment.version_number,
            effective_date=amendment.effective_date,
        )
        contract.versions.append(new_version)
        
        return contract
    
    def _generate_renewal(self, contract: Contract) -> Renewal:
        """Generate a renewal event."""
        old_arr = contract.arr or Decimal("0")
        
        # Determine price change
        price_change_type = random.choices(
            ["increase", "same", "discount"],
            weights=[0.6, 0.3, 0.1]
        )[0]
        
        if price_change_type == "increase":
            increase_pct = Decimal(str(random.uniform(0.03, 0.10)))
            new_arr = old_arr * (1 + increase_pct)
        elif price_change_type == "discount":
            discount_pct = Decimal(str(random.uniform(0.05, 0.15)))
            new_arr = old_arr * (1 - discount_pct)
            increase_pct = -discount_pct
        else:
            new_arr = old_arr
            increase_pct = Decimal("0")
        
        # Renewal term
        renewal_months = random.choice([12, 24, 36])
        new_start = contract.end_date or date.today()
        new_end = new_start + timedelta(days=renewal_months * 30)
        
        return Renewal(
            contract_id=contract.id,
            effective_date=new_start,
            renewal_term_months=renewal_months,
            new_start_date=new_start,
            new_end_date=new_end,
            old_arr=old_arr,
            new_arr=new_arr.quantize(Decimal("0.01")),
            price_increase_pct=increase_pct * 100,
            auto_renewed=random.random() > 0.3,
            negotiated=random.random() > 0.7,
        )
    
    def _apply_renewal(
        self,
        contract: Contract,
        renewal: Renewal,
    ) -> Contract:
        """Apply a renewal to a contract."""
        contract.arr = renewal.new_arr
        contract.start_date = renewal.new_start_date
        contract.end_date = renewal.new_end_date
        contract.status = ContractStatus.RENEWED
        
        return contract
    
    def _generate_cancellation(self, contract: Contract) -> Cancellation:
        """Generate a cancellation event."""
        cancellation_types = [
            ("immediate", 0.2),
            ("end_of_term", 0.6),
            ("scheduled", 0.2),
        ]
        cancel_type = random.choices(
            [t[0] for t in cancellation_types],
            weights=[t[1] for t in cancellation_types]
        )[0]
        
        reasons = [
            "customer_request",
            "non_payment",
            "product_not_meeting_needs",
            "budget_cuts",
            "switching_competitor",
            "company_closed",
        ]
        reason = random.choice(reasons)
        
        # Calculate dates and amounts
        notice_date = date.today() - timedelta(days=random.randint(30, 90))
        
        if cancel_type == "immediate":
            effective_date = notice_date + timedelta(days=random.randint(0, 7))
            last_service = effective_date
        elif cancel_type == "end_of_term":
            effective_date = contract.end_date or date.today()
            last_service = effective_date
        else:
            effective_date = notice_date + timedelta(days=random.randint(30, 90))
            last_service = effective_date
        
        # Calculate remaining value
        remaining_value = None
        refund_amount = None
        etf = None
        
        if contract.arr and contract.end_date and cancel_type == "immediate":
            days_remaining = (contract.end_date - effective_date).days
            remaining_value = (contract.arr / 365) * days_remaining
            
            # Maybe a refund, maybe an ETF
            if random.random() > 0.7:
                refund_amount = remaining_value * Decimal("0.5")
            else:
                etf = remaining_value * Decimal("0.25")
        
        return Cancellation(
            contract_id=contract.id,
            effective_date=effective_date,
            cancellation_type=cancel_type,
            cancellation_reason=reason,
            remaining_value=remaining_value.quantize(Decimal("0.01")) if remaining_value else None,
            refund_amount=refund_amount.quantize(Decimal("0.01")) if refund_amount else None,
            early_termination_fee=etf.quantize(Decimal("0.01")) if etf else None,
            last_service_date=last_service,
            notice_date=notice_date,
        )
    
    def _apply_cancellation(
        self,
        contract: Contract,
        cancellation: Cancellation,
    ) -> Contract:
        """Apply a cancellation to a contract."""
        contract.status = ContractStatus.CANCELLED
        if cancellation.last_service_date:
            contract.end_date = cancellation.last_service_date
        
        return contract
    
    def generate_batch_with_lifecycle(
        self,
        contracts: list[Contract],
        amendment_rate: float = 0.3,
        renewal_rate: float = 0.2,
        cancellation_rate: float = 0.1,
    ) -> list[tuple[Contract, list[LifecycleEvent]]]:
        """
        Apply random lifecycle events to a batch of contracts.
        
        Args:
            contracts: List of base contracts
            amendment_rate: Probability of amendments
            renewal_rate: Probability of renewals
            cancellation_rate: Probability of cancellations
            
        Returns:
            List of (contract, events) tuples
        """
        results = []
        
        for contract in contracts:
            num_amendments = 0
            if random.random() < amendment_rate:
                num_amendments = random.randint(1, 3)
            
            renewal_count = 0
            if random.random() < renewal_rate:
                renewal_count = random.randint(1, 2)
            
            cancelled = random.random() < cancellation_rate
            
            result = self.generate_contract_with_history(
                contract,
                num_amendments=num_amendments,
                renewal_count=renewal_count,
                cancelled=cancelled,
            )
            results.append(result)
        
        return results
    
    def get_event_log(self) -> list[LifecycleEvent]:
        """Get all generated events."""
        return self.event_log
