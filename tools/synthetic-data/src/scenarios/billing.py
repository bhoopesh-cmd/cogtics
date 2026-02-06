"""
Comprehensive billing scenarios for testing detection rules R001-R010, R017-R018.

Generates invoices with deliberate discrepancies covering:
- Missing invoices (R001)
- Under/overbilling (R002, R003)
- Wrong unit price (R004)
- Wrong quantity (R005)
- Duplicate billing (R006)
- Billing beyond term (R007)
- Billing before start (R008)
- Currency mismatch (R009)
- Frequency mismatch (R010)
- Period span mismatch (R017)
- Timing variance (R018)

Edge cases include:
- Proration (partial months, leap days)
- Multi-line discounts
- True-up scenarios
- Month-length drift (28 vs 31 days)
"""

import random
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal
from enum import Enum
from typing import Any, Optional, List
import uuid

from dateutil.relativedelta import relativedelta

from ..models.contracts import Contract, BillingFrequency
from ..models.invoices import Invoice, InvoiceLine, InvoiceStatus


class BillingScenarioType(str, Enum):
    """Comprehensive billing scenario types aligned with detection rules."""
    # R001: Missing Invoice
    MISSING_INVOICE_GAP = "R001_missing_invoice_gap"
    MISSING_INVOICE_FIRST = "R001_missing_invoice_first"
    MISSING_INVOICE_LAST = "R001_missing_invoice_last"
    MISSING_INVOICE_MULTI_MONTH = "R001_missing_invoice_multi_month"
    
    # R002: Underbilling
    UNDERBILLING_10_30 = "R002_underbilling_10_30"
    UNDERBILLING_PRORATION = "R002_underbilling_proration"
    UNDERBILLING_AMENDMENT = "R002_underbilling_amendment"
    UNDERBILLING_LEAP_DAY = "R002_underbilling_leap_day"
    UNDERBILLING_MONTH_LENGTH = "R002_underbilling_month_length"
    
    # R003: Overbilling
    OVERBILLING_5_20 = "R003_overbilling_5_20"
    OVERBILLING_DISCOUNT_NOT_APPLIED = "R003_overbilling_discount_not_applied"
    OVERBILLING_DOUBLE_PARTIAL = "R003_overbilling_double_partial"
    OVERBILLING_UPLIFT_TWICE = "R003_overbilling_uplift_twice"
    
    # R004: Wrong Unit Price
    WRONG_UNIT_PRICE_DIFFERS = "R004_wrong_unit_price_differs"
    WRONG_UNIT_PRICE_CHANGE_NOT_APPLIED = "R004_wrong_unit_price_change_not_applied"
    WRONG_UNIT_PRICE_LOCK_VIOLATED = "R004_wrong_unit_price_lock_violated"
    WRONG_UNIT_PRICE_TIERED = "R004_wrong_unit_price_tiered"
    
    # R005: Wrong Quantity
    WRONG_QUANTITY_DIFFERS = "R005_wrong_quantity_differs"
    WRONG_QUANTITY_AMENDMENT = "R005_wrong_quantity_amendment"
    WRONG_QUANTITY_REDUCED = "R005_wrong_quantity_reduced"
    WRONG_QUANTITY_TRUE_UP = "R005_wrong_quantity_true_up"
    
    # R006: Duplicate Billing
    DUPLICATE_SAME_PERIOD = "R006_duplicate_same_period"
    DUPLICATE_OVERLAPPING = "R006_duplicate_overlapping"
    DUPLICATE_ADJACENT = "R006_duplicate_adjacent"
    DUPLICATE_SAME_NUMBER = "R006_duplicate_same_number"
    
    # R007: Billing Beyond Term
    BILLING_BEYOND_END = "R007_billing_beyond_end"
    BILLING_CANCELLED = "R007_billing_cancelled"
    BILLING_RENEWAL_NOT_PROCESSED = "R007_billing_renewal_not_processed"
    
    # R008: Billing Before Start
    BILLING_BEFORE_START = "R008_billing_before_start"
    BILLING_SETUP_BEFORE_SIGNED = "R008_billing_setup_before_signed"
    BILLING_PRODUCT_NOT_DELIVERED = "R008_billing_product_not_delivered"
    
    # R009: Currency Mismatch
    CURRENCY_MISMATCH_INVOICE = "R009_currency_mismatch_invoice"
    CURRENCY_MISMATCH_LINE_MIXED = "R009_currency_mismatch_line_mixed"
    CURRENCY_FX_NOT_APPLIED = "R009_currency_fx_not_applied"
    
    # R010: Frequency Mismatch
    FREQUENCY_MONTHLY_QUARTERLY = "R010_frequency_monthly_quarterly"
    FREQUENCY_ANNUAL_MONTHLY = "R010_frequency_annual_monthly"
    FREQUENCY_CHANGED_MID_TERM = "R010_frequency_changed_mid_term"
    
    # R017: Period Span Mismatch
    PERIOD_SPAN_FREQUENCY = "R017_period_span_frequency"
    PERIOD_PARTIAL_NOT_PRORATED = "R017_period_partial_not_prorated"
    PERIOD_SPANS_AMENDMENT = "R017_period_spans_amendment"
    
    # R018: Timing Variance
    TIMING_LATE_5_DAYS = "R018_timing_late_5_days"
    TIMING_EARLY_30_DAYS = "R018_timing_early_30_days"
    TIMING_CONSISTENT_DRIFT = "R018_timing_consistent_drift"
    
    # Edge cases: Multi-line discount
    EDGE_MULTI_LINE_DISCOUNT_PARTIAL = "edge_multi_line_discount_partial"
    EDGE_MULTI_LINE_DISCOUNT_CONFLICT = "edge_multi_line_discount_conflict"
    
    # Edge cases: True-up
    EDGE_TRUE_UP_LATE = "edge_true_up_late"
    EDGE_TRUE_UP_CREDITS_INCORRECT = "edge_true_up_credits_incorrect"


@dataclass
class BillingScenarioConfig:
    """Configuration for a billing scenario."""
    type: BillingScenarioType
    count: int = 10
    probability: float = 0.5
    edge_case_description: str = ""
    variance_min: float = 0.05
    variance_max: float = 0.25
    days_min: int = 5
    days_max: int = 30


@dataclass
class ExpectedIssue:
    """Expected issue for ground truth."""
    id: str
    rule_id: str
    category: str
    severity: str
    tenant_id: str
    snapshot_id: str
    contract_id: str
    invoice_id: Optional[str]
    customer_id: Optional[str]
    expected_amount: Optional[Decimal]
    actual_amount: Optional[Decimal]
    variance_pct: Optional[float]
    description: str
    detection_tier: str = "rule"
    edge_case_type: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "rule_id": self.rule_id,
            "category": self.category,
            "severity": self.severity,
            "tenant_id": self.tenant_id,
            "snapshot_id": self.snapshot_id,
            "contract_id": self.contract_id,
            "invoice_id": self.invoice_id,
            "customer_id": self.customer_id,
            "expected_amount": float(self.expected_amount) if self.expected_amount else None,
            "actual_amount": float(self.actual_amount) if self.actual_amount else None,
            "variance_pct": self.variance_pct,
            "description": self.description,
            "detection_tier": self.detection_tier,
            "edge_case_type": self.edge_case_type,
        }


# Scenario configurations matching the plan
BILLING_SCENARIOS = {
    # R001: Missing Invoice (25 total)
    "R001_missing_invoice": [
        BillingScenarioConfig(BillingScenarioType.MISSING_INVOICE_GAP, count=8, edge_case_description="gap in invoice sequence"),
        BillingScenarioConfig(BillingScenarioType.MISSING_INVOICE_FIRST, count=5, edge_case_description="first invoice missing"),
        BillingScenarioConfig(BillingScenarioType.MISSING_INVOICE_LAST, count=5, edge_case_description="last invoice missing"),
        BillingScenarioConfig(BillingScenarioType.MISSING_INVOICE_MULTI_MONTH, count=7, edge_case_description="multi-month gap"),
    ],
    # R002: Underbilling (30 total)
    "R002_underbilling": [
        BillingScenarioConfig(BillingScenarioType.UNDERBILLING_10_30, count=10, variance_min=0.10, variance_max=0.30, edge_case_description="10-30% variance"),
        BillingScenarioConfig(BillingScenarioType.UNDERBILLING_PRORATION, count=7, edge_case_description="proration edge (partial month)"),
        BillingScenarioConfig(BillingScenarioType.UNDERBILLING_AMENDMENT, count=5, edge_case_description="mid-period amendment not reflected"),
        BillingScenarioConfig(BillingScenarioType.UNDERBILLING_LEAP_DAY, count=4, edge_case_description="leap-day proration"),
        BillingScenarioConfig(BillingScenarioType.UNDERBILLING_MONTH_LENGTH, count=4, edge_case_description="month-length drift (28 vs 31 days)"),
    ],
    # R003: Overbilling (30 total)
    "R003_overbilling": [
        BillingScenarioConfig(BillingScenarioType.OVERBILLING_5_20, count=10, variance_min=0.05, variance_max=0.20, edge_case_description="5-20% variance"),
        BillingScenarioConfig(BillingScenarioType.OVERBILLING_DISCOUNT_NOT_APPLIED, count=8, edge_case_description="discount not applied"),
        BillingScenarioConfig(BillingScenarioType.OVERBILLING_DOUBLE_PARTIAL, count=6, edge_case_description="double billing partial period"),
        BillingScenarioConfig(BillingScenarioType.OVERBILLING_UPLIFT_TWICE, count=6, edge_case_description="uplift applied twice"),
    ],
    # R004: Wrong Unit Price (25 total)
    "R004_wrong_unit_price": [
        BillingScenarioConfig(BillingScenarioType.WRONG_UNIT_PRICE_DIFFERS, count=8, edge_case_description="unit price differs from contract term"),
        BillingScenarioConfig(BillingScenarioType.WRONG_UNIT_PRICE_CHANGE_NOT_APPLIED, count=6, edge_case_description="price change not applied on effective date"),
        BillingScenarioConfig(BillingScenarioType.WRONG_UNIT_PRICE_LOCK_VIOLATED, count=5, edge_case_description="price lock violated"),
        BillingScenarioConfig(BillingScenarioType.WRONG_UNIT_PRICE_TIERED, count=6, edge_case_description="tiered pricing wrong tier applied"),
    ],
    # R005: Wrong Quantity (25 total)
    "R005_wrong_quantity": [
        BillingScenarioConfig(BillingScenarioType.WRONG_QUANTITY_DIFFERS, count=8, edge_case_description="quantity differs from contract term"),
        BillingScenarioConfig(BillingScenarioType.WRONG_QUANTITY_AMENDMENT, count=6, edge_case_description="amendment quantity not reflected"),
        BillingScenarioConfig(BillingScenarioType.WRONG_QUANTITY_REDUCED, count=5, edge_case_description="quantity reduced but invoice unchanged"),
        BillingScenarioConfig(BillingScenarioType.WRONG_QUANTITY_TRUE_UP, count=6, edge_case_description="true-up quantity mismatch"),
    ],
    # R006: Duplicate Billing (20 total)
    "R006_duplicate_billing": [
        BillingScenarioConfig(BillingScenarioType.DUPLICATE_SAME_PERIOD, count=6, edge_case_description="same period, same amount"),
        BillingScenarioConfig(BillingScenarioType.DUPLICATE_OVERLAPPING, count=5, edge_case_description="overlapping periods"),
        BillingScenarioConfig(BillingScenarioType.DUPLICATE_ADJACENT, count=5, edge_case_description="adjacent periods with same amount"),
        BillingScenarioConfig(BillingScenarioType.DUPLICATE_SAME_NUMBER, count=4, edge_case_description="same invoice_number different amounts"),
    ],
    # R007: Billing Beyond Term (15 total)
    "R007_billing_beyond_term": [
        BillingScenarioConfig(BillingScenarioType.BILLING_BEYOND_END, count=6, edge_case_description="invoice after end_date"),
        BillingScenarioConfig(BillingScenarioType.BILLING_CANCELLED, count=5, edge_case_description="invoice for cancelled contract"),
        BillingScenarioConfig(BillingScenarioType.BILLING_RENEWAL_NOT_PROCESSED, count=4, edge_case_description="renewal not processed but billing continues"),
    ],
    # R008: Billing Before Start (15 total)
    "R008_billing_before_start": [
        BillingScenarioConfig(BillingScenarioType.BILLING_BEFORE_START, count=6, edge_case_description="invoice before start_date"),
        BillingScenarioConfig(BillingScenarioType.BILLING_SETUP_BEFORE_SIGNED, count=5, edge_case_description="setup fee before contract signed"),
        BillingScenarioConfig(BillingScenarioType.BILLING_PRODUCT_NOT_DELIVERED, count=4, edge_case_description="product not yet delivered"),
    ],
    # R009: Currency Mismatch (15 total)
    "R009_currency_mismatch": [
        BillingScenarioConfig(BillingScenarioType.CURRENCY_MISMATCH_INVOICE, count=6, edge_case_description="invoice USD, contract EUR"),
        BillingScenarioConfig(BillingScenarioType.CURRENCY_MISMATCH_LINE_MIXED, count=5, edge_case_description="line items mixed currencies"),
        BillingScenarioConfig(BillingScenarioType.CURRENCY_FX_NOT_APPLIED, count=4, edge_case_description="FX conversion not applied"),
    ],
    # R010: Frequency Mismatch (20 total)
    "R010_frequency_mismatch": [
        BillingScenarioConfig(BillingScenarioType.FREQUENCY_MONTHLY_QUARTERLY, count=7, edge_case_description="monthly contract, quarterly invoice"),
        BillingScenarioConfig(BillingScenarioType.FREQUENCY_ANNUAL_MONTHLY, count=7, edge_case_description="annual contract, monthly invoices"),
        BillingScenarioConfig(BillingScenarioType.FREQUENCY_CHANGED_MID_TERM, count=6, edge_case_description="frequency changed mid-term"),
    ],
    # R017: Period Span Mismatch (15 total)
    "R017_period_span_mismatch": [
        BillingScenarioConfig(BillingScenarioType.PERIOD_SPAN_FREQUENCY, count=6, edge_case_description="invoice period != billing frequency"),
        BillingScenarioConfig(BillingScenarioType.PERIOD_PARTIAL_NOT_PRORATED, count=5, edge_case_description="partial period not prorated"),
        BillingScenarioConfig(BillingScenarioType.PERIOD_SPANS_AMENDMENT, count=4, edge_case_description="period spans amendment date incorrectly"),
    ],
    # R018: Timing Variance (20 total)
    "R018_timing_variance": [
        BillingScenarioConfig(BillingScenarioType.TIMING_LATE_5_DAYS, count=8, days_min=5, days_max=15, edge_case_description="invoice > 5 days late"),
        BillingScenarioConfig(BillingScenarioType.TIMING_EARLY_30_DAYS, count=6, days_min=15, days_max=30, edge_case_description="invoice > 30 days early"),
        BillingScenarioConfig(BillingScenarioType.TIMING_CONSISTENT_DRIFT, count=6, edge_case_description="consistent timing drift across invoices"),
    ],
    # Edge cases: Multi-line discount (10 total)
    "billing_edge_multi_line_discount": [
        BillingScenarioConfig(BillingScenarioType.EDGE_MULTI_LINE_DISCOUNT_PARTIAL, count=5, edge_case_description="discount on some lines not others"),
        BillingScenarioConfig(BillingScenarioType.EDGE_MULTI_LINE_DISCOUNT_CONFLICT, count=5, edge_case_description="line-level vs invoice-level discount conflict"),
    ],
    # Edge cases: True-up (10 total)
    "billing_edge_true_up": [
        BillingScenarioConfig(BillingScenarioType.EDGE_TRUE_UP_LATE, count=5, edge_case_description="late true-up invoice for usage overage"),
        BillingScenarioConfig(BillingScenarioType.EDGE_TRUE_UP_CREDITS_INCORRECT, count=5, edge_case_description="true-up credits applied incorrectly"),
    ],
}


class BillingScenarioGenerator:
    """Generator for comprehensive billing test scenarios."""
    
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
    
    def generate_billing_scenarios(
        self,
        contracts: List[Contract],
        scenarios: Optional[dict] = None,
        as_of: Optional[date] = None,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """
        Generate invoices with billing discrepancies.
        
        Returns:
            Tuple of (invoices, expected_issues)
        """
        if scenarios is None:
            scenarios = BILLING_SCENARIOS
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
            # Randomly select 1-3 scenarios per contract
            num_scenarios = random.randint(1, 3)
            selected_configs = random.sample(all_configs, min(num_scenarios, len(all_configs)))
            
            for config in selected_configs:
                invoices, issues = self._generate_scenario(contract, config, as_of)
                all_invoices.extend(invoices)
                all_issues.extend(issues)
        
        return all_invoices, all_issues
    
    def _generate_scenario(
        self,
        contract: Contract,
        config: BillingScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate a specific billing scenario."""
        scenario_type = config.type
        
        # Dispatch to appropriate handler
        if scenario_type.value.startswith("R001"):
            return self._generate_missing_invoice(contract, config, as_of)
        elif scenario_type.value.startswith("R002"):
            return self._generate_underbilling(contract, config, as_of)
        elif scenario_type.value.startswith("R003"):
            return self._generate_overbilling(contract, config, as_of)
        elif scenario_type.value.startswith("R004"):
            return self._generate_wrong_unit_price(contract, config, as_of)
        elif scenario_type.value.startswith("R005"):
            return self._generate_wrong_quantity(contract, config, as_of)
        elif scenario_type.value.startswith("R006"):
            return self._generate_duplicate_billing(contract, config, as_of)
        elif scenario_type.value.startswith("R007"):
            return self._generate_billing_beyond_term(contract, config, as_of)
        elif scenario_type.value.startswith("R008"):
            return self._generate_billing_before_start(contract, config, as_of)
        elif scenario_type.value.startswith("R009"):
            return self._generate_currency_mismatch(contract, config, as_of)
        elif scenario_type.value.startswith("R010"):
            return self._generate_frequency_mismatch(contract, config, as_of)
        elif scenario_type.value.startswith("R017"):
            return self._generate_period_span_mismatch(contract, config, as_of)
        elif scenario_type.value.startswith("R018"):
            return self._generate_timing_variance(contract, config, as_of)
        elif scenario_type.value.startswith("edge_multi_line"):
            return self._generate_multi_line_discount_edge(contract, config, as_of)
        elif scenario_type.value.startswith("edge_true_up"):
            return self._generate_true_up_edge(contract, config, as_of)
        
        return [], []
    
    def _generate_missing_invoice(
        self,
        contract: Contract,
        config: BillingScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate missing invoice scenarios (R001)."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        frequency = contract.billing_frequency or BillingFrequency.MONTHLY
        expected_amount = self._calculate_expected_amount(arr, frequency)
        
        # Generate periods
        period_months = 1 if frequency == BillingFrequency.MONTHLY else (3 if frequency == BillingFrequency.QUARTERLY else 12)
        current_date = contract.start_date
        periods = []
        
        while current_date < as_of:
            period_end = current_date + relativedelta(months=period_months)
            if contract.end_date and current_date > contract.end_date:
                break
            periods.append({"start": current_date, "end": period_end})
            current_date = period_end
        
        if len(periods) < 2:
            return invoices, issues
        
        # Determine which invoice to skip based on scenario type
        skip_idx = None
        if config.type == BillingScenarioType.MISSING_INVOICE_FIRST:
            skip_idx = 0
        elif config.type == BillingScenarioType.MISSING_INVOICE_LAST:
            skip_idx = len(periods) - 1
        elif config.type == BillingScenarioType.MISSING_INVOICE_MULTI_MONTH:
            # Skip multiple consecutive invoices
            if len(periods) >= 4:
                skip_idx = random.randint(1, len(periods) - 3)
                skip_count = random.randint(2, 3)
            else:
                skip_idx = 1
                skip_count = 1
        else:  # GAP - random middle invoice
            skip_idx = random.randint(1, max(1, len(periods) - 2))
        
        # Generate invoices, skipping the selected ones
        for i, period in enumerate(periods):
            if config.type == BillingScenarioType.MISSING_INVOICE_MULTI_MONTH:
                if skip_idx <= i < skip_idx + skip_count:
                    # Record expected issue for each missing invoice
                    issues.append(ExpectedIssue(
                        id=self._generate_issue_id(),
                        rule_id="R001",
                        category="billing",
                        severity="high",
                        tenant_id=self.tenant_id,
                        snapshot_id=self.snapshot_id,
                        contract_id=contract.id,
                        invoice_id=None,
                        customer_id=contract.customer_id,
                        expected_amount=expected_amount,
                        actual_amount=Decimal("0"),
                        variance_pct=-100.0,
                        description=f"Missing invoice for period {period['start']} - {period['end']}",
                        edge_case_type=config.edge_case_description,
                    ))
                    continue
            elif i == skip_idx:
                issues.append(ExpectedIssue(
                    id=self._generate_issue_id(),
                    rule_id="R001",
                    category="billing",
                    severity="high",
                    tenant_id=self.tenant_id,
                    snapshot_id=self.snapshot_id,
                    contract_id=contract.id,
                    invoice_id=None,
                    customer_id=contract.customer_id,
                    expected_amount=expected_amount,
                    actual_amount=Decimal("0"),
                    variance_pct=-100.0,
                    description=f"Missing invoice for period {period['start']} - {period['end']}",
                    edge_case_type=config.edge_case_description,
                ))
                continue
            
            # Generate normal invoice
            invoice = Invoice(
                id=self._generate_id("inv"),
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                customer_id=contract.customer_id,
                contract_id=contract.id,
                external_id=str(uuid.uuid4()),
                invoice_number=self._generate_invoice_number(),
                invoice_date=period["start"],
                due_date=period["start"] + timedelta(days=30),
                subtotal=expected_amount,
                tax=Decimal("0"),
                total=expected_amount,
                status=InvoiceStatus.PAID if period["end"] < as_of else InvoiceStatus.OPEN,
                period_start=period["start"],
                period_end=period["end"],
            )
            invoices.append(invoice)
        
        return invoices, issues
    
    def _generate_underbilling(
        self,
        contract: Contract,
        config: BillingScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate underbilling scenarios (R002)."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        frequency = contract.billing_frequency or BillingFrequency.MONTHLY
        expected_amount = self._calculate_expected_amount(arr, frequency)
        
        # Determine underbilling variance
        if config.type == BillingScenarioType.UNDERBILLING_10_30:
            variance = Decimal(str(random.uniform(config.variance_min, config.variance_max)))
        elif config.type == BillingScenarioType.UNDERBILLING_PRORATION:
            # Partial month - e.g., started mid-month
            days_into_month = random.randint(5, 25)
            variance = Decimal(str(days_into_month / 30))
        elif config.type == BillingScenarioType.UNDERBILLING_LEAP_DAY:
            # Feb 29 proration issue
            variance = Decimal("0.0345")  # 1/29 of month
        elif config.type == BillingScenarioType.UNDERBILLING_MONTH_LENGTH:
            # 28 vs 31 day month drift
            variance = Decimal(str((31 - 28) / 30))
        else:
            variance = Decimal(str(random.uniform(0.10, 0.20)))
        
        actual_amount = (expected_amount * (1 - variance)).quantize(Decimal("0.01"))
        variance_pct = float(variance * 100)
        
        # Generate invoice with underbilling
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
            metadata={"_scenario": config.type.value},
        )
        
        # Add line item
        invoice.lines.append(InvoiceLine(
            id=self._generate_id("line"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            invoice_id=invoice.id,
            description="Platform Subscription",
            quantity=Decimal("1"),
            unit_price=actual_amount,
            amount=actual_amount,
        ))
        
        invoices.append(invoice)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R002",
            category="billing",
            severity="high",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=expected_amount,
            actual_amount=actual_amount,
            variance_pct=-variance_pct,
            description=f"Invoice underbilled by {variance_pct:.1f}%",
            edge_case_type=config.edge_case_description,
        ))
        
        return invoices, issues
    
    def _generate_overbilling(
        self,
        contract: Contract,
        config: BillingScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate overbilling scenarios (R003)."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        frequency = contract.billing_frequency or BillingFrequency.MONTHLY
        expected_amount = self._calculate_expected_amount(arr, frequency)
        
        # Determine overbilling variance
        if config.type == BillingScenarioType.OVERBILLING_5_20:
            variance = Decimal(str(random.uniform(config.variance_min, config.variance_max)))
        elif config.type == BillingScenarioType.OVERBILLING_DISCOUNT_NOT_APPLIED:
            # Discount should have reduced by 10-20%
            variance = Decimal(str(random.uniform(0.10, 0.20)))
        elif config.type == BillingScenarioType.OVERBILLING_DOUBLE_PARTIAL:
            # Double billing for partial period
            variance = Decimal(str(random.uniform(0.30, 0.50)))
        elif config.type == BillingScenarioType.OVERBILLING_UPLIFT_TWICE:
            # 5% uplift applied twice = 10.25%
            variance = Decimal("0.1025")
        else:
            variance = Decimal(str(random.uniform(0.05, 0.15)))
        
        actual_amount = (expected_amount * (1 + variance)).quantize(Decimal("0.01"))
        variance_pct = float(variance * 100)
        
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
            metadata={"_scenario": config.type.value},
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
        ))
        
        invoices.append(invoice)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R003",
            category="billing",
            severity="high",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=expected_amount,
            actual_amount=actual_amount,
            variance_pct=variance_pct,
            description=f"Invoice overbilled by {variance_pct:.1f}%",
            edge_case_type=config.edge_case_description,
        ))
        
        return invoices, issues
    
    def _generate_wrong_unit_price(
        self,
        contract: Contract,
        config: BillingScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate wrong unit price scenarios (R004)."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        quantity = Decimal("10")  # Assume 10 units
        expected_unit_price = (arr / 12 / quantity).quantize(Decimal("0.01"))
        
        # Generate wrong unit price
        if config.type == BillingScenarioType.WRONG_UNIT_PRICE_TIERED:
            # Wrong tier - price for wrong volume tier
            wrong_unit_price = (expected_unit_price * Decimal("1.5")).quantize(Decimal("0.01"))
        elif config.type == BillingScenarioType.WRONG_UNIT_PRICE_LOCK_VIOLATED:
            # Price increased despite lock
            wrong_unit_price = (expected_unit_price * Decimal("1.10")).quantize(Decimal("0.01"))
        else:
            # Random variance
            variance = Decimal(str(random.uniform(0.10, 0.30)))
            wrong_unit_price = (expected_unit_price * (1 + variance)).quantize(Decimal("0.01"))
        
        actual_amount = (wrong_unit_price * quantity).quantize(Decimal("0.01"))
        expected_amount = (expected_unit_price * quantity).quantize(Decimal("0.01"))
        
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
                "_expected_unit_price": float(expected_unit_price),
                "_actual_unit_price": float(wrong_unit_price),
            },
        )
        
        invoice.lines.append(InvoiceLine(
            id=self._generate_id("line"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            invoice_id=invoice.id,
            description="Platform Subscription",
            quantity=quantity,
            unit_price=wrong_unit_price,
            amount=actual_amount,
        ))
        
        invoices.append(invoice)
        
        variance_pct = float((wrong_unit_price - expected_unit_price) / expected_unit_price * 100)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R004",
            category="billing",
            severity="medium",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=expected_unit_price,
            actual_amount=wrong_unit_price,
            variance_pct=variance_pct,
            description=f"Unit price {wrong_unit_price} differs from expected {expected_unit_price}",
            edge_case_type=config.edge_case_description,
        ))
        
        return invoices, issues
    
    def _generate_wrong_quantity(
        self,
        contract: Contract,
        config: BillingScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate wrong quantity scenarios (R005)."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        expected_quantity = Decimal("10")
        unit_price = (arr / 12 / expected_quantity).quantize(Decimal("0.01"))
        
        # Generate wrong quantity
        if config.type == BillingScenarioType.WRONG_QUANTITY_REDUCED:
            wrong_quantity = Decimal("5")  # Reduced but invoice unchanged
        elif config.type == BillingScenarioType.WRONG_QUANTITY_TRUE_UP:
            wrong_quantity = Decimal("15")  # True-up quantity issue
        else:
            wrong_quantity = Decimal(str(random.randint(12, 20)))
        
        actual_amount = (unit_price * wrong_quantity).quantize(Decimal("0.01"))
        expected_amount = (unit_price * expected_quantity).quantize(Decimal("0.01"))
        
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
                "_expected_quantity": float(expected_quantity),
                "_actual_quantity": float(wrong_quantity),
            },
        )
        
        invoice.lines.append(InvoiceLine(
            id=self._generate_id("line"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            invoice_id=invoice.id,
            description="Platform Subscription",
            quantity=wrong_quantity,
            unit_price=unit_price,
            amount=actual_amount,
        ))
        
        invoices.append(invoice)
        
        variance_pct = float((wrong_quantity - expected_quantity) / expected_quantity * 100)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R005",
            category="billing",
            severity="medium",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=expected_quantity,
            actual_amount=wrong_quantity,
            variance_pct=variance_pct,
            description=f"Quantity {wrong_quantity} differs from expected {expected_quantity}",
            edge_case_type=config.edge_case_description,
        ))
        
        return invoices, issues
    
    def _generate_duplicate_billing(
        self,
        contract: Contract,
        config: BillingScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate duplicate billing scenarios (R006)."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        frequency = contract.billing_frequency or BillingFrequency.MONTHLY
        expected_amount = self._calculate_expected_amount(arr, frequency)
        
        period_start = contract.start_date
        period_end = contract.start_date + relativedelta(months=1)
        
        # Generate original invoice
        original_invoice = Invoice(
            id=self._generate_id("inv"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            customer_id=contract.customer_id,
            contract_id=contract.id,
            external_id=str(uuid.uuid4()),
            invoice_number=self._generate_invoice_number(),
            invoice_date=period_start,
            due_date=period_start + timedelta(days=30),
            subtotal=expected_amount,
            tax=Decimal("0"),
            total=expected_amount,
            status=InvoiceStatus.PAID,
            period_start=period_start,
            period_end=period_end,
        )
        invoices.append(original_invoice)
        
        # Generate duplicate
        if config.type == BillingScenarioType.DUPLICATE_SAME_NUMBER:
            # Same invoice number, different amount
            duplicate_amount = (expected_amount * Decimal("1.10")).quantize(Decimal("0.01"))
            dup_invoice_number = original_invoice.invoice_number
        else:
            duplicate_amount = expected_amount
            dup_invoice_number = self._generate_invoice_number()
        
        if config.type == BillingScenarioType.DUPLICATE_OVERLAPPING:
            # Overlapping period
            dup_period_start = period_start + timedelta(days=15)
            dup_period_end = period_end + timedelta(days=15)
        elif config.type == BillingScenarioType.DUPLICATE_ADJACENT:
            # Adjacent period but same amount (suspicious)
            dup_period_start = period_end
            dup_period_end = period_end + relativedelta(months=1)
        else:
            # Same period
            dup_period_start = period_start
            dup_period_end = period_end
        
        duplicate_invoice = Invoice(
            id=self._generate_id("inv"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            customer_id=contract.customer_id,
            contract_id=contract.id,
            external_id=str(uuid.uuid4()),
            invoice_number=dup_invoice_number,
            invoice_date=period_start + timedelta(days=random.randint(1, 10)),
            due_date=period_start + timedelta(days=30),
            subtotal=duplicate_amount,
            tax=Decimal("0"),
            total=duplicate_amount,
            status=InvoiceStatus.OPEN,
            period_start=dup_period_start,
            period_end=dup_period_end,
            metadata={"_scenario": config.type.value, "_original_id": original_invoice.id},
        )
        invoices.append(duplicate_invoice)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R006",
            category="billing",
            severity="critical",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=duplicate_invoice.id,
            customer_id=contract.customer_id,
            expected_amount=expected_amount,
            actual_amount=expected_amount + duplicate_amount,
            variance_pct=100.0,
            description=f"Duplicate invoice for period {period_start} - {period_end}",
            edge_case_type=config.edge_case_description,
        ))
        
        return invoices, issues
    
    def _generate_billing_beyond_term(
        self,
        contract: Contract,
        config: BillingScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate billing beyond term scenarios (R007)."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        frequency = contract.billing_frequency or BillingFrequency.MONTHLY
        expected_amount = self._calculate_expected_amount(arr, frequency)
        
        # Set contract end date if not set
        end_date = contract.end_date or (contract.start_date + relativedelta(months=12))
        
        # Invoice after end date
        invoice_date = end_date + timedelta(days=random.randint(5, 30))
        
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
            subtotal=expected_amount,
            tax=Decimal("0"),
            total=expected_amount,
            status=InvoiceStatus.OPEN,
            period_start=invoice_date,
            period_end=invoice_date + relativedelta(months=1),
            metadata={"_scenario": config.type.value, "_contract_end_date": end_date.isoformat()},
        )
        invoices.append(invoice)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R007",
            category="billing",
            severity="critical",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=Decimal("0"),
            actual_amount=expected_amount,
            variance_pct=None,
            description=f"Invoice dated {invoice_date} after contract end {end_date}",
            edge_case_type=config.edge_case_description,
        ))
        
        return invoices, issues
    
    def _generate_billing_before_start(
        self,
        contract: Contract,
        config: BillingScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate billing before start scenarios (R008)."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        frequency = contract.billing_frequency or BillingFrequency.MONTHLY
        expected_amount = self._calculate_expected_amount(arr, frequency)
        
        # Invoice before start date
        days_before = random.randint(10, 60)
        invoice_date = contract.start_date - timedelta(days=days_before)
        
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
            subtotal=expected_amount,
            tax=Decimal("0"),
            total=expected_amount,
            status=InvoiceStatus.OPEN,
            period_start=invoice_date,
            period_end=invoice_date + relativedelta(months=1),
            metadata={"_scenario": config.type.value, "_contract_start_date": contract.start_date.isoformat()},
        )
        invoices.append(invoice)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R008",
            category="billing",
            severity="high",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=Decimal("0"),
            actual_amount=expected_amount,
            variance_pct=None,
            description=f"Invoice dated {invoice_date} before contract start {contract.start_date}",
            edge_case_type=config.edge_case_description,
        ))
        
        return invoices, issues
    
    def _generate_currency_mismatch(
        self,
        contract: Contract,
        config: BillingScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate currency mismatch scenarios (R009)."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        frequency = contract.billing_frequency or BillingFrequency.MONTHLY
        expected_amount = self._calculate_expected_amount(arr, frequency)
        
        contract_currency = contract.currency or "USD"
        # Pick a different currency
        currencies = ["USD", "EUR", "GBP", "CAD", "AUD"]
        currencies.remove(contract_currency) if contract_currency in currencies else None
        invoice_currency = random.choice(currencies) if currencies else "EUR"
        
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
            currency=invoice_currency,
            subtotal=expected_amount,
            tax=Decimal("0"),
            total=expected_amount,
            status=InvoiceStatus.OPEN,
            period_start=contract.start_date,
            period_end=contract.start_date + relativedelta(months=1),
            metadata={"_scenario": config.type.value, "_contract_currency": contract_currency},
        )
        invoices.append(invoice)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R009",
            category="billing",
            severity="high",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=None,
            actual_amount=None,
            variance_pct=None,
            description=f"Invoice currency {invoice_currency} differs from contract currency {contract_currency}",
            edge_case_type=config.edge_case_description,
        ))
        
        return invoices, issues
    
    def _generate_frequency_mismatch(
        self,
        contract: Contract,
        config: BillingScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate frequency mismatch scenarios (R010)."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        contract_frequency = contract.billing_frequency or BillingFrequency.MONTHLY
        
        # Determine mismatched frequency
        if config.type == BillingScenarioType.FREQUENCY_MONTHLY_QUARTERLY:
            actual_frequency = BillingFrequency.QUARTERLY
            period_months = 3
        elif config.type == BillingScenarioType.FREQUENCY_ANNUAL_MONTHLY:
            actual_frequency = BillingFrequency.MONTHLY
            period_months = 1
        else:
            actual_frequency = BillingFrequency.QUARTERLY
            period_months = 3
        
        expected_amount = self._calculate_expected_amount(arr, actual_frequency)
        
        period_end = contract.start_date + relativedelta(months=period_months)
        
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
            subtotal=expected_amount,
            tax=Decimal("0"),
            total=expected_amount,
            status=InvoiceStatus.OPEN,
            period_start=contract.start_date,
            period_end=period_end,
            metadata={
                "_scenario": config.type.value,
            "_contract_frequency": contract_frequency.value if hasattr(contract_frequency, 'value') else str(contract_frequency),
            "_invoice_frequency": actual_frequency.value if hasattr(actual_frequency, 'value') else str(actual_frequency),
            },
        )
        invoices.append(invoice)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R010",
            category="billing",
            severity="medium",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=None,
            actual_amount=None,
            variance_pct=None,
            description=f"Invoice billing frequency ({actual_frequency.value if hasattr(actual_frequency, 'value') else actual_frequency}) mismatches contract ({contract_frequency.value if hasattr(contract_frequency, 'value') else contract_frequency})",
            edge_case_type=config.edge_case_description,
        ))
        
        return invoices, issues
    
    def _generate_period_span_mismatch(
        self,
        contract: Contract,
        config: BillingScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate period span mismatch scenarios (R017)."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        frequency = contract.billing_frequency or BillingFrequency.MONTHLY
        expected_amount = self._calculate_expected_amount(arr, frequency)
        
        # Create period that doesn't match frequency
        if config.type == BillingScenarioType.PERIOD_SPAN_FREQUENCY:
            # Monthly contract but 45-day period
            period_end = contract.start_date + timedelta(days=45)
        elif config.type == BillingScenarioType.PERIOD_PARTIAL_NOT_PRORATED:
            # Partial period with full amount
            period_end = contract.start_date + timedelta(days=15)
        else:
            period_end = contract.start_date + timedelta(days=40)
        
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
            subtotal=expected_amount,
            tax=Decimal("0"),
            total=expected_amount,
            status=InvoiceStatus.OPEN,
            period_start=contract.start_date,
            period_end=period_end,
            metadata={"_scenario": config.type.value},
        )
        invoices.append(invoice)
        
        period_days = (period_end - contract.start_date).days
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R017",
            category="billing",
            severity="medium",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=None,
            actual_amount=None,
            variance_pct=None,
            description=f"Invoice period span ({period_days} days) doesn't match billing frequency ({frequency.value if hasattr(frequency, 'value') else frequency})",
            edge_case_type=config.edge_case_description,
        ))
        
        return invoices, issues
    
    def _generate_timing_variance(
        self,
        contract: Contract,
        config: BillingScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate timing variance scenarios (R018)."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        frequency = contract.billing_frequency or BillingFrequency.MONTHLY
        expected_amount = self._calculate_expected_amount(arr, frequency)
        
        # Expected invoice date is period start
        expected_date = contract.start_date
        
        # Calculate actual date with variance
        if config.type == BillingScenarioType.TIMING_LATE_5_DAYS:
            days_variance = random.randint(config.days_min, config.days_max)
            actual_date = expected_date + timedelta(days=days_variance)
            variance_desc = f"{days_variance} days late"
        elif config.type == BillingScenarioType.TIMING_EARLY_30_DAYS:
            days_variance = random.randint(config.days_min, config.days_max)
            actual_date = expected_date - timedelta(days=days_variance)
            variance_desc = f"{days_variance} days early"
        else:
            # Consistent drift
            days_variance = random.randint(5, 10)
            actual_date = expected_date + timedelta(days=days_variance)
            variance_desc = f"consistent {days_variance} day drift"
        
        invoice = Invoice(
            id=self._generate_id("inv"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            customer_id=contract.customer_id,
            contract_id=contract.id,
            external_id=str(uuid.uuid4()),
            invoice_number=self._generate_invoice_number(),
            invoice_date=actual_date,
            due_date=actual_date + timedelta(days=30),
            subtotal=expected_amount,
            tax=Decimal("0"),
            total=expected_amount,
            status=InvoiceStatus.OPEN,
            period_start=expected_date,
            period_end=expected_date + relativedelta(months=1),
            metadata={"_scenario": config.type.value, "_expected_date": expected_date.isoformat()},
        )
        invoices.append(invoice)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R018",
            category="billing",
            severity="low",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=None,
            actual_amount=None,
            variance_pct=None,
            description=f"Invoice date {actual_date} is {variance_desc} from expected {expected_date}",
            edge_case_type=config.edge_case_description,
        ))
        
        return invoices, issues
    
    def _generate_multi_line_discount_edge(
        self,
        contract: Contract,
        config: BillingScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate multi-line discount edge cases."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        line_amount = (arr / 12 / 3).quantize(Decimal("0.01"))  # 3 lines
        discount_pct = Decimal("0.10")
        
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
            subtotal=Decimal("0"),
            tax=Decimal("0"),
            total=Decimal("0"),
            status=InvoiceStatus.OPEN,
            period_start=contract.start_date,
            period_end=contract.start_date + relativedelta(months=1),
            metadata={"_scenario": config.type.value},
        )
        
        # Add lines - only some get discount
        products = ["Platform License", "Support", "Premium Features"]
        total = Decimal("0")
        for i, product in enumerate(products):
            if config.type == BillingScenarioType.EDGE_MULTI_LINE_DISCOUNT_PARTIAL:
                # Only first line gets discount
                if i == 0:
                    amount = (line_amount * (1 - discount_pct)).quantize(Decimal("0.01"))
                else:
                    amount = line_amount
            else:
                # All should get discount but don't
                amount = line_amount
            
            invoice.lines.append(InvoiceLine(
                id=self._generate_id("line"),
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                invoice_id=invoice.id,
                description=product,
                quantity=Decimal("1"),
                unit_price=amount,
                amount=amount,
            ))
            total += amount
        
        invoice.subtotal = total
        invoice.total = total
        invoices.append(invoice)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R003",
            category="billing",
            severity="medium",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=None,
            actual_amount=None,
            variance_pct=None,
            description="Multi-line discount inconsistency",
            edge_case_type=config.edge_case_description,
        ))
        
        return invoices, issues
    
    def _generate_true_up_edge(
        self,
        contract: Contract,
        config: BillingScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[ExpectedIssue]]:
        """Generate true-up edge cases."""
        invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return invoices, issues
        
        arr = Decimal(str(contract.arr))
        base_amount = (arr / 12).quantize(Decimal("0.01"))
        
        # Generate regular invoice first
        regular_invoice = Invoice(
            id=self._generate_id("inv"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            customer_id=contract.customer_id,
            contract_id=contract.id,
            external_id=str(uuid.uuid4()),
            invoice_number=self._generate_invoice_number(),
            invoice_date=contract.start_date,
            due_date=contract.start_date + timedelta(days=30),
            subtotal=base_amount,
            tax=Decimal("0"),
            total=base_amount,
            status=InvoiceStatus.PAID,
            period_start=contract.start_date,
            period_end=contract.start_date + relativedelta(months=1),
        )
        invoices.append(regular_invoice)
        
        # Generate true-up invoice
        if config.type == BillingScenarioType.EDGE_TRUE_UP_LATE:
            # Late true-up (more than 30 days after period)
            true_up_date = contract.start_date + relativedelta(months=2)
        else:
            true_up_date = contract.start_date + relativedelta(months=1)
        
        true_up_amount = (base_amount * Decimal("0.15")).quantize(Decimal("0.01"))  # 15% overage
        
        true_up_invoice = Invoice(
            id=self._generate_id("inv"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            customer_id=contract.customer_id,
            contract_id=contract.id,
            external_id=str(uuid.uuid4()),
            invoice_number=self._generate_invoice_number(),
            invoice_date=true_up_date,
            due_date=true_up_date + timedelta(days=30),
            subtotal=true_up_amount,
            tax=Decimal("0"),
            total=true_up_amount,
            status=InvoiceStatus.OPEN,
            period_start=contract.start_date,
            period_end=contract.start_date + relativedelta(months=1),
            metadata={
                "_scenario": config.type.value,
                "_is_true_up": True,
                "_original_invoice_id": regular_invoice.id,
            },
        )
        
        true_up_invoice.lines.append(InvoiceLine(
            id=self._generate_id("line"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            invoice_id=true_up_invoice.id,
            description="Usage True-Up Adjustment",
            quantity=Decimal("1"),
            unit_price=true_up_amount,
            amount=true_up_amount,
        ))
        invoices.append(true_up_invoice)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R005",
            category="billing",
            severity="medium",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=true_up_invoice.id,
            customer_id=contract.customer_id,
            expected_amount=None,
            actual_amount=true_up_amount,
            variance_pct=None,
            description="True-up invoice edge case",
            edge_case_type=config.edge_case_description,
        ))
        
        return invoices, issues
