"""
Comprehensive discount scenarios for testing detection rules R011-R016.

Generates invoices with discount discrepancies covering:
- Expired discount (R011)
- Discount not applied (R012)
- Wrong discount rate (R013)
- Discount exceeds max (R014)
- Uplift not applied (R015)
- Ramp pricing mismatch (R016)

Edge cases include:
- Promotional discounts
- Volume discounts
- Loyalty discounts
- Bundle discounts
- First-invoice discounts
- Discount expired mid-billing-period
"""

import random
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from enum import Enum
from typing import Any, Optional, List
import uuid

from dateutil.relativedelta import relativedelta

from ..models.contracts import Contract, BillingFrequency
from ..models.invoices import Invoice, InvoiceLine, InvoiceStatus
from .billing import ExpectedIssue


class DiscountScenarioType(str, Enum):
    """Discount scenario types aligned with detection rules R011-R016."""
    # R011: Expired Discount
    EXPIRED_AFTER_END = "R011_expired_after_end"
    EXPIRED_PROMOTIONAL = "R011_expired_promotional"
    EXPIRED_VOLUME = "R011_expired_volume"
    EXPIRED_MID_PERIOD = "R011_expired_mid_period"
    
    # R012: Discount Not Applied
    NOT_APPLIED_ACTIVE = "R012_not_applied_active"
    NOT_APPLIED_LOYALTY = "R012_not_applied_loyalty"
    NOT_APPLIED_BUNDLE = "R012_not_applied_bundle"
    NOT_APPLIED_FIRST_INVOICE = "R012_not_applied_first_invoice"
    
    # R013: Wrong Discount Rate
    WRONG_RATE_DIFFERS = "R013_wrong_rate_differs"
    WRONG_RATE_TIERED = "R013_wrong_rate_tiered"
    WRONG_RATE_CUMULATIVE = "R013_wrong_rate_cumulative"
    WRONG_RATE_LIST_VS_NET = "R013_wrong_rate_list_vs_net"
    
    # R014: Discount Exceeds Max
    EXCEEDS_MAX = "R014_exceeds_max"
    EXCEEDS_STACKED = "R014_exceeds_stacked"
    EXCEEDS_OVERRIDE = "R014_exceeds_override"
    
    # R015: Uplift Not Applied
    UPLIFT_NOT_APPLIED = "R015_uplift_not_applied"
    UPLIFT_WRONG_PCT = "R015_uplift_wrong_pct"
    UPLIFT_WRONG_BASE = "R015_uplift_wrong_base"
    UPLIFT_AFFECTS_BILLING = "R015_uplift_affects_billing"
    
    # R016: Ramp Pricing Mismatch
    RAMP_Y1_Y2_NOT_APPLIED = "R016_ramp_y1_y2_not_applied"
    RAMP_SCHEDULE_MISMATCH = "R016_ramp_schedule_mismatch"
    RAMP_BOUNDARY_INCORRECT = "R016_ramp_boundary_incorrect"


@dataclass
class DiscountScenarioConfig:
    """Configuration for a discount scenario."""
    type: DiscountScenarioType
    count: int = 10
    probability: float = 0.5
    edge_case_description: str = ""
    discount_pct_min: float = 5.0
    discount_pct_max: float = 30.0
    max_discount_pct: float = 40.0


# Scenario configurations matching the plan
DISCOUNT_SCENARIOS = {
    # R011: Expired Discount (20 total)
    "R011_expired_discount": [
        DiscountScenarioConfig(DiscountScenarioType.EXPIRED_AFTER_END, count=6, edge_case_description="discount applied after discount_end_date"),
        DiscountScenarioConfig(DiscountScenarioType.EXPIRED_PROMOTIONAL, count=5, edge_case_description="promotional discount expired"),
        DiscountScenarioConfig(DiscountScenarioType.EXPIRED_VOLUME, count=5, edge_case_description="volume discount expired but still applied"),
        DiscountScenarioConfig(DiscountScenarioType.EXPIRED_MID_PERIOD, count=4, edge_case_description="discount expired mid-billing-period"),
    ],
    # R012: Discount Not Applied (20 total)
    "R012_discount_not_applied": [
        DiscountScenarioConfig(DiscountScenarioType.NOT_APPLIED_ACTIVE, count=6, edge_case_description="active discount in contract, not on invoice"),
        DiscountScenarioConfig(DiscountScenarioType.NOT_APPLIED_LOYALTY, count=5, edge_case_description="loyalty discount missing"),
        DiscountScenarioConfig(DiscountScenarioType.NOT_APPLIED_BUNDLE, count=5, edge_case_description="bundle discount not calculated"),
        DiscountScenarioConfig(DiscountScenarioType.NOT_APPLIED_FIRST_INVOICE, count=4, edge_case_description="first-invoice discount missing"),
    ],
    # R013: Wrong Discount Rate (25 total)
    "R013_wrong_discount_rate": [
        DiscountScenarioConfig(DiscountScenarioType.WRONG_RATE_DIFFERS, count=8, edge_case_description="discount_pct differs from contract term"),
        DiscountScenarioConfig(DiscountScenarioType.WRONG_RATE_TIERED, count=6, edge_case_description="tiered discount wrong tier"),
        DiscountScenarioConfig(DiscountScenarioType.WRONG_RATE_CUMULATIVE, count=6, edge_case_description="cumulative vs single discount miscalculation"),
        DiscountScenarioConfig(DiscountScenarioType.WRONG_RATE_LIST_VS_NET, count=5, edge_case_description="discount on list price vs net price"),
    ],
    # R014: Discount Exceeds Max (15 total)
    "R014_discount_exceeds_max": [
        DiscountScenarioConfig(DiscountScenarioType.EXCEEDS_MAX, count=6, edge_case_description="discount > max_discount_pct"),
        DiscountScenarioConfig(DiscountScenarioType.EXCEEDS_STACKED, count=5, edge_case_description="stacked discounts exceed cap"),
        DiscountScenarioConfig(DiscountScenarioType.EXCEEDS_OVERRIDE, count=4, edge_case_description="manual override exceeds policy"),
    ],
    # R015: Uplift Not Applied (20 total)
    "R015_uplift_not_applied": [
        DiscountScenarioConfig(DiscountScenarioType.UPLIFT_NOT_APPLIED, count=6, edge_case_description="annual uplift clause, price unchanged at renewal"),
        DiscountScenarioConfig(DiscountScenarioType.UPLIFT_WRONG_PCT, count=5, edge_case_description="uplift percentage wrong"),
        DiscountScenarioConfig(DiscountScenarioType.UPLIFT_WRONG_BASE, count=5, edge_case_description="uplift applied to wrong base amount"),
        DiscountScenarioConfig(DiscountScenarioType.UPLIFT_AFFECTS_BILLING, count=4, edge_case_description="uplift affecting R002/R003 calculations"),
    ],
    # R016: Ramp Pricing Mismatch (20 total)
    "R016_ramp_pricing_mismatch": [
        DiscountScenarioConfig(DiscountScenarioType.RAMP_Y1_Y2_NOT_APPLIED, count=7, edge_case_description="year 1 vs year 2 ramp not applied"),
        DiscountScenarioConfig(DiscountScenarioType.RAMP_SCHEDULE_MISMATCH, count=7, edge_case_description="ramp schedule vs actual invoice amounts"),
        DiscountScenarioConfig(DiscountScenarioType.RAMP_BOUNDARY_INCORRECT, count=6, edge_case_description="ramp period boundary invoice incorrect"),
    ],
}


class DiscountScenarioGenerator:
    """Generator for comprehensive discount test scenarios."""
    
    def __init__(
        self,
        tenant_id: str = "tenant_001",
        snapshot_id: str = "snap_001",
        seed: Optional[int] = None,
    ):
        self.tenant_id = tenant_id
        self.snapshot_id = snapshot_id
        if seed:
            random.seed(seed)
        self._invoice_counter = 0
        self._issue_counter = 0
    
    def _generate_id(self, prefix: str) -> str:
        """Generate a unique ID."""
        return f"{prefix}_{uuid.uuid4().hex[:12]}"
    
    def _generate_invoice_number(self) -> str:
        """Generate invoice number."""
        self._invoice_counter += 1
        return f"INV-{self._invoice_counter:06d}"
    
    def _generate_issue_id(self) -> str:
        """Generate issue ID."""
        self._issue_counter += 1
        return f"issue_{self._issue_counter:06d}"
    
    def _calculate_expected_amount(
        self,
        arr: Decimal,
        frequency: BillingFrequency,
    ) -> Decimal:
        """Calculate expected billing amount."""
        if frequency == BillingFrequency.ANNUALLY:
            return arr.quantize(Decimal("0.01"))
        elif frequency == BillingFrequency.QUARTERLY:
            return (arr / 4).quantize(Decimal("0.01"))
        elif frequency == BillingFrequency.ONE_TIME:
            return arr.quantize(Decimal("0.01"))
        else:
            return (arr / 12).quantize(Decimal("0.01"))
    
    def generate_discount_scenarios(
        self,
        contracts: List[Contract],
        scenarios: Optional[dict] = None,
        as_of: Optional[date] = None,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """
        Generate invoices with discount discrepancies.
        
        Returns:
            Tuple of (invoices, expected_issues)
        """
        if scenarios is None:
            scenarios = DISCOUNT_SCENARIOS
        if as_of is None:
            as_of = date.today()
        
        all_invoices = []
        all_issues = []
        
        # Get flat list of all scenario configs
        all_configs = []
        for rule_scenarios in scenarios.values():
            all_configs.extend(rule_scenarios)
        
        # Assign scenarios to contracts
        for contract in contracts:
            # Randomly select 1-2 discount scenarios per contract
            num_scenarios = random.randint(1, 2)
            selected_configs = random.sample(all_configs, min(num_scenarios, len(all_configs)))
            
            for config in selected_configs:
                invoices, issues = self._generate_scenario(contract, config, as_of)
                all_invoices.extend(invoices)
                all_issues.extend(issues)
        
        return all_invoices, all_issues
    
    def _generate_scenario(
        self,
        contract: Contract,
        config: DiscountScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate a specific discount scenario."""
        scenario_type = config.type
        
        # Dispatch to appropriate handler
        if scenario_type.value.startswith("R011"):
            return self._generate_expired_discount(contract, config, as_of)
        elif scenario_type.value.startswith("R012"):
            return self._generate_discount_not_applied(contract, config, as_of)
        elif scenario_type.value.startswith("R013"):
            return self._generate_wrong_discount_rate(contract, config, as_of)
        elif scenario_type.value.startswith("R014"):
            return self._generate_discount_exceeds_max(contract, config, as_of)
        elif scenario_type.value.startswith("R015"):
            return self._generate_uplift_not_applied(contract, config, as_of)
        elif scenario_type.value.startswith("R016"):
            return self._generate_ramp_pricing_mismatch(contract, config, as_of)
        
        return [], []
    
    def _generate_expired_discount(
        self,
        contract: Contract,
        config: DiscountScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate expired discount scenarios (R011)."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        frequency = contract.billing_frequency or BillingFrequency.MONTHLY
        list_price = self._calculate_expected_amount(arr, frequency)
        
        # Discount that should have expired
        discount_pct = Decimal(str(random.uniform(config.discount_pct_min, config.discount_pct_max) / 100))
        discount_end_date = contract.start_date + relativedelta(months=6)  # Discount expired 6 months in
        
        # Invoice date after discount expiry
        if config.type == DiscountScenarioType.EXPIRED_MID_PERIOD:
            # Discount expired mid-period
            invoice_date = discount_end_date - timedelta(days=15)
            period_start = discount_end_date - timedelta(days=15)
            period_end = discount_end_date + timedelta(days=15)
        else:
            invoice_date = discount_end_date + relativedelta(months=1)
            period_start = invoice_date
            period_end = invoice_date + relativedelta(months=1)
        
        # Discount was incorrectly applied
        discounted_amount = (list_price * (1 - discount_pct)).quantize(Decimal("0.01"))
        expected_amount = list_price  # Should be full price
        
        invoice = Invoice(
            id=self._generate_id("inv"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            customer_id=contract.customer_id,
            contract_id=contract.id,
            external_id=str(uuid.uuid4()),
            invoice_number=self._generate_invoice_number(),
            invoice_date=invoice_date,
            due_date=invoice_date + timedelta(days=30),
            subtotal=discounted_amount,
            tax=Decimal("0"),
            total=discounted_amount,
            status=InvoiceStatus.OPEN,
            period_start=period_start,
            period_end=period_end,
            metadata={
                "_scenario": config.type.value,
                "_discount_end_date": discount_end_date.isoformat(),
                "_discount_pct": float(discount_pct * 100),
            },
        )
        
        invoice.lines.append(InvoiceLine(
            id=self._generate_id("line"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            invoice_id=invoice.id,
            description="Platform Subscription",
            quantity=Decimal("1"),
            unit_price=discounted_amount,
            amount=discounted_amount,
            metadata={"discount_applied": float(discount_pct * 100)},
        ))
        invoices.append(invoice)
        
        variance_pct = float((expected_amount - discounted_amount) / expected_amount * 100)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R011",
            category="discount",
            severity="high",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=expected_amount,
            actual_amount=discounted_amount,
            variance_pct=-variance_pct,
            description=f"Expired discount ({discount_pct*100:.1f}%) applied after end date {discount_end_date}",
            edge_case_type=config.edge_case_description,
        ))
        
        return invoices, issues
    
    def _generate_discount_not_applied(
        self,
        contract: Contract,
        config: DiscountScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate discount not applied scenarios (R012)."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        frequency = contract.billing_frequency or BillingFrequency.MONTHLY
        list_price = self._calculate_expected_amount(arr, frequency)
        
        # Active discount that should have been applied
        discount_pct = Decimal(str(random.uniform(config.discount_pct_min, config.discount_pct_max) / 100))
        expected_amount = (list_price * (1 - discount_pct)).quantize(Decimal("0.01"))
        
        # Determine discount type based on scenario
        if config.type == DiscountScenarioType.NOT_APPLIED_LOYALTY:
            discount_type = "loyalty"
            description_suffix = "Loyalty discount not applied"
        elif config.type == DiscountScenarioType.NOT_APPLIED_BUNDLE:
            discount_type = "bundle"
            description_suffix = "Bundle discount not calculated"
        elif config.type == DiscountScenarioType.NOT_APPLIED_FIRST_INVOICE:
            discount_type = "first_invoice"
            description_suffix = "First-invoice promotional discount missing"
        else:
            discount_type = "standard"
            description_suffix = "Active discount in contract not applied to invoice"
        
        invoice = Invoice(
            id=self._generate_id("inv"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            customer_id=contract.customer_id,
            contract_id=contract.id,
            external_id=str(uuid.uuid4()),
            invoice_number=self._generate_invoice_number(),
            invoice_date=contract.start_date,
            due_date=contract.start_date + timedelta(days=30),
            subtotal=list_price,  # Full price - discount not applied
            tax=Decimal("0"),
            total=list_price,
            status=InvoiceStatus.OPEN,
            period_start=contract.start_date,
            period_end=contract.start_date + relativedelta(months=1),
            metadata={
                "_scenario": config.type.value,
                "_expected_discount_pct": float(discount_pct * 100),
                "_discount_type": discount_type,
            },
        )
        
        invoice.lines.append(InvoiceLine(
            id=self._generate_id("line"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            invoice_id=invoice.id,
            description="Platform Subscription",
            quantity=Decimal("1"),
            unit_price=list_price,
            amount=list_price,
        ))
        invoices.append(invoice)
        
        variance_pct = float((list_price - expected_amount) / expected_amount * 100)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R012",
            category="discount",
            severity="high",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=expected_amount,
            actual_amount=list_price,
            variance_pct=variance_pct,
            description=f"{description_suffix}: {discount_pct*100:.1f}% discount expected",
            edge_case_type=config.edge_case_description,
        ))
        
        return invoices, issues
    
    def _generate_wrong_discount_rate(
        self,
        contract: Contract,
        config: DiscountScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate wrong discount rate scenarios (R013)."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        frequency = contract.billing_frequency or BillingFrequency.MONTHLY
        list_price = self._calculate_expected_amount(arr, frequency)
        
        # Correct discount rate
        correct_discount_pct = Decimal(str(random.uniform(10, 20) / 100))
        
        # Wrong discount rate applied
        if config.type == DiscountScenarioType.WRONG_RATE_TIERED:
            # Wrong tier discount (higher tier = less discount)
            wrong_discount_pct = correct_discount_pct * Decimal("0.7")
        elif config.type == DiscountScenarioType.WRONG_RATE_CUMULATIVE:
            # Cumulative discount miscalculation
            wrong_discount_pct = correct_discount_pct * Decimal("0.85")
        elif config.type == DiscountScenarioType.WRONG_RATE_LIST_VS_NET:
            # Discount on net vs list (compound)
            wrong_discount_pct = correct_discount_pct * Decimal("0.9")
        else:
            # Random variance
            variance = Decimal(str(random.uniform(0.2, 0.4)))
            wrong_discount_pct = correct_discount_pct * (1 - variance)
        
        expected_amount = (list_price * (1 - correct_discount_pct)).quantize(Decimal("0.01"))
        actual_amount = (list_price * (1 - wrong_discount_pct)).quantize(Decimal("0.01"))
        
        invoice = Invoice(
            id=self._generate_id("inv"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            customer_id=contract.customer_id,
            contract_id=contract.id,
            external_id=str(uuid.uuid4()),
            invoice_number=self._generate_invoice_number(),
            invoice_date=contract.start_date,
            due_date=contract.start_date + timedelta(days=30),
            subtotal=actual_amount,
            tax=Decimal("0"),
            total=actual_amount,
            status=InvoiceStatus.OPEN,
            period_start=contract.start_date,
            period_end=contract.start_date + relativedelta(months=1),
            metadata={
                "_scenario": config.type.value,
                "_expected_discount_pct": float(correct_discount_pct * 100),
                "_actual_discount_pct": float(wrong_discount_pct * 100),
            },
        )
        
        invoice.lines.append(InvoiceLine(
            id=self._generate_id("line"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            invoice_id=invoice.id,
            description="Platform Subscription",
            quantity=Decimal("1"),
            unit_price=actual_amount,
            amount=actual_amount,
            metadata={"discount_applied": float(wrong_discount_pct * 100)},
        ))
        invoices.append(invoice)
        
        variance_pct = float((actual_amount - expected_amount) / expected_amount * 100)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R013",
            category="discount",
            severity="medium",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=correct_discount_pct * 100,
            actual_amount=wrong_discount_pct * 100,
            variance_pct=float((wrong_discount_pct - correct_discount_pct) / correct_discount_pct * 100),
            description=f"Wrong discount rate: {wrong_discount_pct*100:.1f}% vs expected {correct_discount_pct*100:.1f}%",
            edge_case_type=config.edge_case_description,
        ))
        
        return invoices, issues
    
    def _generate_discount_exceeds_max(
        self,
        contract: Contract,
        config: DiscountScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate discount exceeds max scenarios (R014)."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        frequency = contract.billing_frequency or BillingFrequency.MONTHLY
        list_price = self._calculate_expected_amount(arr, frequency)
        
        max_discount_pct = Decimal(str(config.max_discount_pct / 100))
        
        # Apply discount that exceeds max
        if config.type == DiscountScenarioType.EXCEEDS_STACKED:
            # Multiple discounts stacked
            discount1 = Decimal("0.20")
            discount2 = Decimal("0.15")
            discount3 = Decimal("0.10")
            # Compound: (1-0.20) * (1-0.15) * (1-0.10) = 0.612 => 38.8% total discount
            actual_discount_pct = 1 - (1 - discount1) * (1 - discount2) * (1 - discount3)
        elif config.type == DiscountScenarioType.EXCEEDS_OVERRIDE:
            # Manual override exceeds policy
            actual_discount_pct = Decimal("0.55")  # 55% manual override
        else:
            # Single discount exceeds max
            actual_discount_pct = max_discount_pct + Decimal(str(random.uniform(0.05, 0.15)))
        
        expected_amount = (list_price * (1 - max_discount_pct)).quantize(Decimal("0.01"))
        actual_amount = (list_price * (1 - actual_discount_pct)).quantize(Decimal("0.01"))
        
        invoice = Invoice(
            id=self._generate_id("inv"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            customer_id=contract.customer_id,
            contract_id=contract.id,
            external_id=str(uuid.uuid4()),
            invoice_number=self._generate_invoice_number(),
            invoice_date=contract.start_date,
            due_date=contract.start_date + timedelta(days=30),
            subtotal=actual_amount,
            tax=Decimal("0"),
            total=actual_amount,
            status=InvoiceStatus.OPEN,
            period_start=contract.start_date,
            period_end=contract.start_date + relativedelta(months=1),
            metadata={
                "_scenario": config.type.value,
                "_max_discount_pct": float(max_discount_pct * 100),
                "_actual_discount_pct": float(actual_discount_pct * 100),
            },
        )
        
        invoice.lines.append(InvoiceLine(
            id=self._generate_id("line"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            invoice_id=invoice.id,
            description="Platform Subscription",
            quantity=Decimal("1"),
            unit_price=actual_amount,
            amount=actual_amount,
            metadata={"discount_applied": float(actual_discount_pct * 100)},
        ))
        invoices.append(invoice)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R014",
            category="discount",
            severity="critical",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=max_discount_pct * 100,
            actual_amount=actual_discount_pct * 100,
            variance_pct=float((actual_discount_pct - max_discount_pct) / max_discount_pct * 100),
            description=f"Discount {actual_discount_pct*100:.1f}% exceeds max allowed {max_discount_pct*100:.1f}%",
            edge_case_type=config.edge_case_description,
        ))
        
        return invoices, issues
    
    def _generate_uplift_not_applied(
        self,
        contract: Contract,
        config: DiscountScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate uplift not applied scenarios (R015)."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        frequency = contract.billing_frequency or BillingFrequency.MONTHLY
        base_amount = self._calculate_expected_amount(arr, frequency)
        
        # Uplift should be applied at renewal
        uplift_pct = Decimal(str(random.uniform(3, 8) / 100))  # 3-8% annual uplift
        
        # Renewal date (1 year after start)
        renewal_date = contract.start_date + relativedelta(years=1)
        
        # Expected amount with uplift
        expected_amount = (base_amount * (1 + uplift_pct)).quantize(Decimal("0.01"))
        
        # Determine actual amount based on scenario
        if config.type == DiscountScenarioType.UPLIFT_WRONG_PCT:
            # Wrong uplift percentage (e.g., 2% instead of 5%)
            wrong_uplift_pct = uplift_pct * Decimal("0.4")
            actual_amount = (base_amount * (1 + wrong_uplift_pct)).quantize(Decimal("0.01"))
            description = f"Uplift {wrong_uplift_pct*100:.1f}% instead of expected {uplift_pct*100:.1f}%"
        elif config.type == DiscountScenarioType.UPLIFT_WRONG_BASE:
            # Uplift applied to wrong base (discounted instead of list)
            discounted_base = base_amount * Decimal("0.85")
            actual_amount = (discounted_base * (1 + uplift_pct)).quantize(Decimal("0.01"))
            description = "Uplift applied to discounted base instead of list price"
        else:
            # Uplift not applied at all
            actual_amount = base_amount
            description = f"Annual uplift ({uplift_pct*100:.1f}%) not applied at renewal"
        
        invoice = Invoice(
            id=self._generate_id("inv"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            customer_id=contract.customer_id,
            contract_id=contract.id,
            external_id=str(uuid.uuid4()),
            invoice_number=self._generate_invoice_number(),
            invoice_date=renewal_date,
            due_date=renewal_date + timedelta(days=30),
            subtotal=actual_amount,
            tax=Decimal("0"),
            total=actual_amount,
            status=InvoiceStatus.OPEN,
            period_start=renewal_date,
            period_end=renewal_date + relativedelta(months=1),
            metadata={
                "_scenario": config.type.value,
                "_expected_uplift_pct": float(uplift_pct * 100),
                "_is_renewal": True,
            },
        )
        
        invoice.lines.append(InvoiceLine(
            id=self._generate_id("line"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            invoice_id=invoice.id,
            description="Platform Subscription - Renewal",
            quantity=Decimal("1"),
            unit_price=actual_amount,
            amount=actual_amount,
        ))
        invoices.append(invoice)
        
        variance_pct = float((expected_amount - actual_amount) / expected_amount * 100)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R015",
            category="discount",
            severity="high",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=expected_amount,
            actual_amount=actual_amount,
            variance_pct=-variance_pct,
            description=description,
            edge_case_type=config.edge_case_description,
        ))
        
        return invoices, issues
    
    def _generate_ramp_pricing_mismatch(
        self,
        contract: Contract,
        config: DiscountScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate ramp pricing mismatch scenarios (R016)."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        frequency = contract.billing_frequency or BillingFrequency.MONTHLY
        
        # Define ramp schedule (year 1: 80%, year 2: 100%, year 3: 100%)
        ramp_schedule = [
            {"year": 1, "pct": Decimal("0.80"), "amount": (arr * Decimal("0.80") / 12).quantize(Decimal("0.01"))},
            {"year": 2, "pct": Decimal("1.00"), "amount": (arr / 12).quantize(Decimal("0.01"))},
            {"year": 3, "pct": Decimal("1.00"), "amount": (arr / 12).quantize(Decimal("0.01"))},
        ]
        
        if config.type == DiscountScenarioType.RAMP_Y1_Y2_NOT_APPLIED:
            # Year 2 invoice still at Year 1 price
            invoice_date = contract.start_date + relativedelta(years=1, months=1)
            expected_amount = ramp_schedule[1]["amount"]  # Year 2 amount
            actual_amount = ramp_schedule[0]["amount"]  # Still Year 1 amount
            description = "Year 2 ramp not applied - still billing at Year 1 rate"
        elif config.type == DiscountScenarioType.RAMP_BOUNDARY_INCORRECT:
            # Ramp boundary invoice incorrect (last day of Y1 billed at Y2 rate)
            invoice_date = contract.start_date + relativedelta(months=11, days=15)
            expected_amount = ramp_schedule[0]["amount"]  # Still Year 1
            actual_amount = ramp_schedule[1]["amount"]  # But billed at Year 2
            description = "Ramp boundary error - Year 2 rate applied before Year 1 ends"
        else:
            # General schedule mismatch
            invoice_date = contract.start_date + relativedelta(months=8)
            expected_amount = ramp_schedule[0]["amount"]
            # Wrong amount that doesn't match any ramp period
            actual_amount = (expected_amount * Decimal("1.10")).quantize(Decimal("0.01"))
            description = "Ramp schedule mismatch - amount doesn't match any scheduled period"
        
        period_end = invoice_date + relativedelta(months=1)
        
        invoice = Invoice(
            id=self._generate_id("inv"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            customer_id=contract.customer_id,
            contract_id=contract.id,
            external_id=str(uuid.uuid4()),
            invoice_number=self._generate_invoice_number(),
            invoice_date=invoice_date,
            due_date=invoice_date + timedelta(days=30),
            subtotal=actual_amount,
            tax=Decimal("0"),
            total=actual_amount,
            status=InvoiceStatus.OPEN,
            period_start=invoice_date,
            period_end=period_end,
            metadata={
                "_scenario": config.type.value,
                "_ramp_schedule": [{"year": r["year"], "pct": float(r["pct"]), "amount": float(r["amount"])} for r in ramp_schedule],
            },
        )
        
        invoice.lines.append(InvoiceLine(
            id=self._generate_id("line"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            invoice_id=invoice.id,
            description="Platform Subscription - Ramp",
            quantity=Decimal("1"),
            unit_price=actual_amount,
            amount=actual_amount,
        ))
        invoices.append(invoice)
        
        variance_pct = float((actual_amount - expected_amount) / expected_amount * 100)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R016",
            category="discount",
            severity="high",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=expected_amount,
            actual_amount=actual_amount,
            variance_pct=variance_pct,
            description=description,
            edge_case_type=config.edge_case_description,
        ))
        
        return invoices, issues
