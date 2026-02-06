"""
Comprehensive revenue recognition scenarios for testing detection rules R020-R027.

Generates revenue recognition data with discrepancies covering:
- Recognized vs invoiced gap (R020)
- Deferred imbalance (R021)
- Schedule exceeds contract (R022)
- Missing schedule (R023)
- Recognition beyond period (R024)
- Premature recognition (R025)
- Allocation sum mismatch (R026)
- SSP outlier (R027)

Edge cases include:
- Timing differences
- Rounding errors
- Amended contracts
- Cancelled contracts
- New products without baseline
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
from ..models.invoices import Invoice, InvoiceStatus
from ..models.revrec import (
    RevenueObligation,
    RevenueSchedule,
    RevenueAllocation,
    DeferredBalance,
    ObligationType,
    AllocationMethod,
    RecognitionMethod,
    ObligationStatus,
    ScheduleStatus,
)
from .billing import ExpectedIssue


class RevRecScenarioType(str, Enum):
    """Revenue recognition scenario types aligned with detection rules R020-R027."""
    # R020: Recognized vs Invoiced Gap (4 edge cases as per plan)
    RECOGNIZED_INVOICED_GAP_OVER = "R020_recognized_invoiced_gap_over"
    RECOGNIZED_INVOICED_GAP_UNDER = "R020_recognized_invoiced_gap_under"
    RECOGNIZED_INVOICED_TIMING = "R020_recognized_invoiced_timing"
    RECOGNIZED_INVOICED_THRESHOLD = "R020_recognized_invoiced_threshold"
    
    # R021: Deferred Imbalance
    DEFERRED_IMBALANCE = "R021_deferred_imbalance"
    DEFERRED_NEGATIVE = "R021_deferred_negative"
    DEFERRED_NOT_DECREASING = "R021_deferred_not_decreasing"
    
    # R022: Schedule Exceeds Contract
    SCHEDULE_EXCEEDS_ARR = "R022_schedule_exceeds_arr"
    SCHEDULE_EXTENDS_BEYOND = "R022_schedule_extends_beyond"
    SCHEDULE_AMENDED_NOT_UPDATED = "R022_schedule_amended_not_updated"
    
    # R023: Missing Schedule
    MISSING_SCHEDULE_WITH_INVOICES = "R023_missing_schedule_with_invoices"
    MISSING_SCHEDULE_WITH_OBLIGATIONS = "R023_missing_schedule_with_obligations"
    MISSING_SCHEDULE_PARTIAL = "R023_missing_schedule_partial"
    
    # R024: Recognition Beyond Period
    RECOGNITION_BEYOND_END = "R024_recognition_beyond_end"
    RECOGNITION_AFTER_SERVICE = "R024_recognition_after_service"
    RECOGNITION_CANCELLED = "R024_recognition_cancelled"
    
    # R025: Premature Recognition
    PREMATURE_BEFORE_START = "R025_premature_before_start"
    PREMATURE_BEFORE_DELIVERY = "R025_premature_before_delivery"
    PREMATURE_BEFORE_SIGNED = "R025_premature_before_signed"
    
    # R026: Allocation Sum Mismatch
    ALLOCATION_SUM_MISMATCH = "R026_allocation_sum_mismatch"
    ALLOCATION_UNALLOCATED = "R026_allocation_unallocated"
    ALLOCATION_ROUNDING = "R026_allocation_rounding"
    
    # R027: SSP Outlier
    SSP_OUTLIER_HIGH = "R027_ssp_outlier_high"
    SSP_OUTLIER_ZERO = "R027_ssp_outlier_zero"
    SSP_NEW_PRODUCT = "R027_ssp_new_product"


@dataclass
class RevRecScenarioConfig:
    """Configuration for a revenue recognition scenario."""
    type: RevRecScenarioType
    count: int = 10
    probability: float = 0.5
    edge_case_description: str = ""
    variance_min: float = 0.05
    variance_max: float = 0.15


# Scenario configurations matching the plan
REVREC_SCENARIOS = {
    # R020: Recognized vs Invoiced Gap (30 total, 4 edge cases as per plan)
    "R020_recognized_vs_invoiced_gap": [
        RevRecScenarioConfig(RevRecScenarioType.RECOGNIZED_INVOICED_GAP_OVER, count=10, variance_min=0.05, variance_max=0.15, edge_case_description="recognized > invoiced"),
        RevRecScenarioConfig(RevRecScenarioType.RECOGNIZED_INVOICED_GAP_UNDER, count=10, variance_min=0.05, variance_max=0.15, edge_case_description="recognized < invoiced"),
        RevRecScenarioConfig(RevRecScenarioType.RECOGNIZED_INVOICED_TIMING, count=5, edge_case_description="timing difference > 30 days"),
        RevRecScenarioConfig(RevRecScenarioType.RECOGNIZED_INVOICED_THRESHOLD, count=5, variance_min=0.05, variance_max=0.05, edge_case_description="schedule.recognized != sum(invoices) by > 5%"),
    ],
    # R021: Deferred Imbalance (20 total)
    "R021_deferred_imbalance": [
        RevRecScenarioConfig(RevRecScenarioType.DEFERRED_IMBALANCE, count=8, edge_case_description="deferred_balance != expected"),
        RevRecScenarioConfig(RevRecScenarioType.DEFERRED_NEGATIVE, count=6, edge_case_description="deferred going negative"),
        RevRecScenarioConfig(RevRecScenarioType.DEFERRED_NOT_DECREASING, count=6, edge_case_description="deferred not decreasing over time"),
    ],
    # R022: Schedule Exceeds Contract (15 total)
    "R022_schedule_exceeds_contract": [
        RevRecScenarioConfig(RevRecScenarioType.SCHEDULE_EXCEEDS_ARR, count=5, edge_case_description="sum(schedule) > contract.arr"),
        RevRecScenarioConfig(RevRecScenarioType.SCHEDULE_EXTENDS_BEYOND, count=5, edge_case_description="schedule extends beyond contract term"),
        RevRecScenarioConfig(RevRecScenarioType.SCHEDULE_AMENDED_NOT_UPDATED, count=5, edge_case_description="amended contract, schedule not updated"),
    ],
    # R023: Missing Schedule (25 total)
    "R023_missing_schedule": [
        RevRecScenarioConfig(RevRecScenarioType.MISSING_SCHEDULE_WITH_INVOICES, count=10, edge_case_description="contract with invoices but no schedule"),
        RevRecScenarioConfig(RevRecScenarioType.MISSING_SCHEDULE_WITH_OBLIGATIONS, count=10, edge_case_description="contract with obligations but no schedule"),
        RevRecScenarioConfig(RevRecScenarioType.MISSING_SCHEDULE_PARTIAL, count=5, edge_case_description="partial schedule (some periods missing)"),
    ],
    # R024: Recognition Beyond Period (20 total)
    "R024_recognition_beyond_period": [
        RevRecScenarioConfig(RevRecScenarioType.RECOGNITION_BEYOND_END, count=8, edge_case_description="schedule.period_end > contract.end_date"),
        RevRecScenarioConfig(RevRecScenarioType.RECOGNITION_AFTER_SERVICE, count=6, edge_case_description="recognition after service delivery complete"),
        RevRecScenarioConfig(RevRecScenarioType.RECOGNITION_CANCELLED, count=6, edge_case_description="cancelled contract still recognizing"),
    ],
    # R025: Premature Recognition (20 total)
    "R025_premature_recognition": [
        RevRecScenarioConfig(RevRecScenarioType.PREMATURE_BEFORE_START, count=8, edge_case_description="schedule.period_start < contract.start_date"),
        RevRecScenarioConfig(RevRecScenarioType.PREMATURE_BEFORE_DELIVERY, count=6, edge_case_description="recognized before service delivery"),
        RevRecScenarioConfig(RevRecScenarioType.PREMATURE_BEFORE_SIGNED, count=6, edge_case_description="recognized before contract signed"),
    ],
    # R026: Allocation Sum Mismatch (15 total)
    "R026_allocation_sum_mismatch": [
        RevRecScenarioConfig(RevRecScenarioType.ALLOCATION_SUM_MISMATCH, count=6, edge_case_description="sum(obligation.allocation) != contract.arr"),
        RevRecScenarioConfig(RevRecScenarioType.ALLOCATION_UNALLOCATED, count=5, edge_case_description="allocation + unallocated != total"),
        RevRecScenarioConfig(RevRecScenarioType.ALLOCATION_ROUNDING, count=4, edge_case_description="rounding errors accumulating"),
    ],
    # R027: SSP Outlier (15 total)
    "R027_ssp_outlier": [
        RevRecScenarioConfig(RevRecScenarioType.SSP_OUTLIER_HIGH, count=6, edge_case_description="SSP > 3 std dev from mean"),
        RevRecScenarioConfig(RevRecScenarioType.SSP_OUTLIER_ZERO, count=5, edge_case_description="SSP = 0 (statistically rare)"),
        RevRecScenarioConfig(RevRecScenarioType.SSP_NEW_PRODUCT, count=4, edge_case_description="SSP for new product (no baseline)"),
    ],
}


class RevRecScenarioGenerator:
    """Generator for comprehensive revenue recognition test scenarios."""
    
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
        self._counter = 0
        self._issue_counter = 0
        # SSP statistics for outlier detection
        self._ssp_stats = {
            "mean": Decimal("1000"),
            "std_dev": Decimal("150"),
        }
    
    def _generate_id(self, prefix: str) -> str:
        """Generate a unique ID."""
        self._counter += 1
        return f"{prefix}_{uuid.uuid4().hex[:12]}"
    
    def _generate_issue_id(self) -> str:
        """Generate issue ID."""
        self._issue_counter += 1
        return f"issue_{self._issue_counter:06d}"
    
    def generate_revrec_scenarios(
        self,
        contracts: List[Contract],
        scenarios: Optional[dict] = None,
        as_of: Optional[date] = None,
    ) -> tuple[List[RevenueObligation], List[RevenueSchedule], List[RevenueAllocation], List[DeferredBalance], List[ExpectedIssue]]:
        """
        Generate revenue recognition data with discrepancies.
        
        Returns:
            Tuple of (obligations, schedules, allocations, deferred_balances, expected_issues)
        """
        if scenarios is None:
            scenarios = REVREC_SCENARIOS
        if as_of is None:
            as_of = date.today()
        
        all_obligations = []
        all_schedules = []
        all_allocations = []
        all_deferred = []
        all_issues = []
        
        # Get flat list of all scenario configs
        all_configs = []
        for rule_scenarios in scenarios.values():
            all_configs.extend(rule_scenarios)
        
        # Assign scenarios to contracts
        for contract in contracts:
            # Randomly select 1-2 revrec scenarios per contract
            num_scenarios = random.randint(1, 2)
            selected_configs = random.sample(all_configs, min(num_scenarios, len(all_configs)))
            
            for config in selected_configs:
                result = self._generate_scenario(contract, config, as_of)
                all_obligations.extend(result[0])
                all_schedules.extend(result[1])
                all_allocations.extend(result[2])
                all_deferred.extend(result[3])
                all_issues.extend(result[4])
        
        return all_obligations, all_schedules, all_allocations, all_deferred, all_issues
    
    def _generate_scenario(
        self,
        contract: Contract,
        config: RevRecScenarioConfig,
        as_of: date,
    ) -> tuple[List[RevenueObligation], List[RevenueSchedule], List[RevenueAllocation], List[DeferredBalance], List[ExpectedIssue]]:
        """Generate a specific revrec scenario."""
        scenario_type = config.type
        
        # Dispatch to appropriate handler
        if scenario_type.value.startswith("R020"):
            return self._generate_recognized_invoiced_gap(contract, config, as_of)
        elif scenario_type.value.startswith("R021"):
            return self._generate_deferred_imbalance(contract, config, as_of)
        elif scenario_type.value.startswith("R022"):
            return self._generate_schedule_exceeds_contract(contract, config, as_of)
        elif scenario_type.value.startswith("R023"):
            return self._generate_missing_schedule(contract, config, as_of)
        elif scenario_type.value.startswith("R024"):
            return self._generate_recognition_beyond_period(contract, config, as_of)
        elif scenario_type.value.startswith("R025"):
            return self._generate_premature_recognition(contract, config, as_of)
        elif scenario_type.value.startswith("R026"):
            return self._generate_allocation_sum_mismatch(contract, config, as_of)
        elif scenario_type.value.startswith("R027"):
            return self._generate_ssp_outlier(contract, config, as_of)
        
        return [], [], [], [], []
    
    def _create_base_obligation(
        self,
        contract: Contract,
        obligation_type: ObligationType = ObligationType.SUBSCRIPTION,
    ) -> RevenueObligation:
        """Create a base obligation for the contract."""
        return RevenueObligation(
            id=self._generate_id("obl"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            obligation_type=obligation_type,
            description="Platform Subscription",
            transaction_price=contract.arr or Decimal("0"),
            currency=contract.currency,
            allocation_method=AllocationMethod.STRAIGHT_LINE,
            service_start_date=contract.start_date,
            service_end_date=contract.end_date,
            status=ObligationStatus.ACTIVE,
        )
    
    def _create_schedules_for_obligation(
        self,
        obligation: RevenueObligation,
        months: int = 12,
    ) -> List[RevenueSchedule]:
        """Create monthly revenue schedules for an obligation."""
        schedules = []
        if not obligation.service_start_date:
            return schedules
        
        monthly_amount = (obligation.transaction_price / months).quantize(Decimal("0.01"))
        current_date = obligation.service_start_date
        
        for i in range(months):
            period_end = current_date + relativedelta(months=1)
            schedules.append(RevenueSchedule(
                id=self._generate_id("sched"),
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                obligation_id=obligation.id,
                period_start=current_date,
                period_end=period_end,
                scheduled_amount=monthly_amount,
                recognized_amount=monthly_amount,  # Assume recognized
                deferred_amount=Decimal("0"),
                recognition_method=RecognitionMethod.STRAIGHT_LINE,
                status=ScheduleStatus.RECOGNIZED,
                period_days=(period_end - current_date).days,
            ))
            current_date = period_end
        
        return schedules
    
    def _generate_recognized_invoiced_gap(
        self,
        contract: Contract,
        config: RevRecScenarioConfig,
        as_of: date,
    ) -> tuple[List[RevenueObligation], List[RevenueSchedule], List[RevenueAllocation], List[DeferredBalance], List[ExpectedIssue]]:
        """Generate recognized vs invoiced gap scenarios (R020)."""
        obligations = []
        schedules = []
        allocations = []
        deferred = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return obligations, schedules, allocations, deferred, issues
        
        arr = Decimal(str(contract.arr))
        
        # Create obligation
        obligation = self._create_base_obligation(contract)
        obligations.append(obligation)
        
        # Create schedules with variance
        variance = Decimal(str(random.uniform(config.variance_min, config.variance_max)))
        
        if config.type == RevRecScenarioType.RECOGNIZED_INVOICED_GAP_OVER:
            # Recognized more than invoiced
            recognized_total = (arr * (1 + variance)).quantize(Decimal("0.01"))
            invoiced_total = arr
            description = f"Recognized ({recognized_total}) exceeds invoiced ({invoiced_total}) by {variance*100:.1f}%"
        elif config.type == RevRecScenarioType.RECOGNIZED_INVOICED_GAP_UNDER:
            # Recognized less than invoiced
            recognized_total = (arr * (1 - variance)).quantize(Decimal("0.01"))
            invoiced_total = arr
            description = f"Recognized ({recognized_total}) less than invoiced ({invoiced_total}) by {variance*100:.1f}%"
        else:
            # Timing difference
            recognized_total = arr
            invoiced_total = arr
            description = "Timing difference between recognized and invoiced amounts"
        
        monthly_recognized = (recognized_total / 12).quantize(Decimal("0.01"))
        current_date = contract.start_date
        
        for i in range(12):
            period_end = current_date + relativedelta(months=1)
            schedules.append(RevenueSchedule(
                id=self._generate_id("sched"),
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                obligation_id=obligation.id,
                period_start=current_date,
                period_end=period_end,
                scheduled_amount=monthly_recognized,
                recognized_amount=monthly_recognized,
                deferred_amount=Decimal("0"),
                recognition_method=RecognitionMethod.STRAIGHT_LINE,
                status=ScheduleStatus.RECOGNIZED,
            ))
            current_date = period_end
        
        variance_pct = float((recognized_total - invoiced_total) / invoiced_total * 100) if invoiced_total else 0
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R020",
            category="revrec",
            severity="high",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=None,
            customer_id=contract.customer_id,
            expected_amount=invoiced_total,
            actual_amount=recognized_total,
            variance_pct=variance_pct,
            description=description,
            edge_case_type=config.edge_case_description,
        ))
        
        return obligations, schedules, allocations, deferred, issues
    
    def _generate_deferred_imbalance(
        self,
        contract: Contract,
        config: RevRecScenarioConfig,
        as_of: date,
    ) -> tuple[List[RevenueObligation], List[RevenueSchedule], List[RevenueAllocation], List[DeferredBalance], List[ExpectedIssue]]:
        """Generate deferred imbalance scenarios (R021)."""
        obligations = []
        schedules = []
        allocations = []
        deferred_balances = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return obligations, schedules, allocations, deferred_balances, issues
        
        arr = Decimal(str(contract.arr))
        
        obligation = self._create_base_obligation(contract)
        obligations.append(obligation)
        
        # Create deferred balance entries
        current_date = contract.start_date
        opening = arr  # Start with full deferred
        monthly_recognition = (arr / 12).quantize(Decimal("0.01"))
        
        for i in range(12):
            period_end = current_date + relativedelta(months=1)
            
            if config.type == RevRecScenarioType.DEFERRED_NEGATIVE:
                # Force negative deferred after month 6
                if i >= 6:
                    recognized = opening + Decimal("1000")  # Over-recognize
                else:
                    recognized = monthly_recognition
            elif config.type == RevRecScenarioType.DEFERRED_NOT_DECREASING:
                # Deferred increases (wrong direction)
                if i >= 4:
                    recognized = Decimal("-500")  # Negative recognition
                else:
                    recognized = monthly_recognition
            else:
                # Wrong balance calculation
                recognized = monthly_recognition
                if i == 5:
                    recognized = recognized * Decimal("1.5")  # Extra recognition
            
            closing = opening - recognized
            
            deferred_balances.append(DeferredBalance(
                id=self._generate_id("def"),
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                obligation_id=obligation.id,
                period_end=period_end,
                opening_balance=opening,
                additions=Decimal("0"),
                recognized=recognized,
                adjustments=Decimal("0"),
                closing_balance=closing,
            ))
            
            schedules.append(RevenueSchedule(
                id=self._generate_id("sched"),
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                obligation_id=obligation.id,
                period_start=current_date,
                period_end=period_end,
                scheduled_amount=monthly_recognition,
                recognized_amount=recognized,
                deferred_amount=closing,
            ))
            
            opening = closing
            current_date = period_end
        
        # Find the problematic balance
        problem_balance = None
        for bal in deferred_balances:
            if bal.closing_balance < 0:
                problem_balance = bal
                break
            if bal.closing_balance > bal.opening_balance:
                problem_balance = bal
                break
        
        if problem_balance:
            issues.append(ExpectedIssue(
                id=self._generate_issue_id(),
                rule_id="R021",
                category="revrec",
                severity="critical",
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                contract_id=contract.id,
                invoice_id=None,
                customer_id=contract.customer_id,
                expected_amount=None,
                actual_amount=problem_balance.closing_balance,
                variance_pct=None,
                description=f"Deferred balance imbalance: {config.edge_case_description}",
                edge_case_type=config.edge_case_description,
            ))
        
        return obligations, schedules, allocations, deferred_balances, issues
    
    def _generate_schedule_exceeds_contract(
        self,
        contract: Contract,
        config: RevRecScenarioConfig,
        as_of: date,
    ) -> tuple[List[RevenueObligation], List[RevenueSchedule], List[RevenueAllocation], List[DeferredBalance], List[ExpectedIssue]]:
        """Generate schedule exceeds contract scenarios (R022)."""
        obligations = []
        schedules = []
        allocations = []
        deferred = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return obligations, schedules, allocations, deferred, issues
        
        arr = Decimal(str(contract.arr))
        end_date = contract.end_date or (contract.start_date + relativedelta(years=1))
        
        obligation = self._create_base_obligation(contract)
        obligations.append(obligation)
        
        if config.type == RevRecScenarioType.SCHEDULE_EXCEEDS_ARR:
            # Schedule total > ARR
            monthly_amount = (arr / 12 * Decimal("1.15")).quantize(Decimal("0.01"))
            months = 12
            description = f"Schedule total ({monthly_amount * 12}) exceeds contract ARR ({arr})"
        elif config.type == RevRecScenarioType.SCHEDULE_EXTENDS_BEYOND:
            # Schedule extends past contract end
            monthly_amount = (arr / 12).quantize(Decimal("0.01"))
            months = 15  # 3 months beyond
            description = "Schedule extends 3 months beyond contract end date"
        else:
            # Amended but schedule not updated
            monthly_amount = (arr / 12).quantize(Decimal("0.01"))
            months = 12
            description = "Contract amended but recognition schedule not updated"
        
        current_date = contract.start_date
        for i in range(months):
            period_end = current_date + relativedelta(months=1)
            schedules.append(RevenueSchedule(
                id=self._generate_id("sched"),
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                obligation_id=obligation.id,
                period_start=current_date,
                period_end=period_end,
                scheduled_amount=monthly_amount,
                recognized_amount=monthly_amount,
            ))
            current_date = period_end
        
        schedule_total = sum(s.scheduled_amount for s in schedules)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R022",
            category="revrec",
            severity="high",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=None,
            customer_id=contract.customer_id,
            expected_amount=arr,
            actual_amount=schedule_total,
            variance_pct=float((schedule_total - arr) / arr * 100) if arr else None,
            description=description,
            edge_case_type=config.edge_case_description,
        ))
        
        return obligations, schedules, allocations, deferred, issues
    
    def _generate_missing_schedule(
        self,
        contract: Contract,
        config: RevRecScenarioConfig,
        as_of: date,
    ) -> tuple[List[RevenueObligation], List[RevenueSchedule], List[RevenueAllocation], List[DeferredBalance], List[ExpectedIssue]]:
        """Generate missing schedule scenarios (R023)."""
        obligations = []
        schedules = []
        allocations = []
        deferred = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return obligations, schedules, allocations, deferred, issues
        
        arr = Decimal(str(contract.arr))
        
        obligation = self._create_base_obligation(contract)
        obligations.append(obligation)
        
        if config.type == RevRecScenarioType.MISSING_SCHEDULE_PARTIAL:
            # Only some months have schedules
            monthly_amount = (arr / 12).quantize(Decimal("0.01"))
            current_date = contract.start_date
            
            # Generate schedules for months 1-6 and 10-12 (missing 7-9)
            for i in range(12):
                if 6 <= i < 9:  # Skip months 7-9
                    current_date = current_date + relativedelta(months=1)
                    continue
                    
                period_end = current_date + relativedelta(months=1)
                schedules.append(RevenueSchedule(
                    id=self._generate_id("sched"),
                    tenant_id=self.tenant_id,
                    snapshot_id=self.snapshot_id,
                    obligation_id=obligation.id,
                    period_start=current_date,
                    period_end=period_end,
                    scheduled_amount=monthly_amount,
                ))
                current_date = period_end
            
            description = "Partial schedule - months 7-9 missing"
        else:
            # No schedules at all (with obligations or invoices)
            description = f"Contract with {config.edge_case_description}"
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R023",
            category="revrec",
            severity="high",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=None,
            customer_id=contract.customer_id,
            expected_amount=arr,
            actual_amount=sum(s.scheduled_amount for s in schedules),
            variance_pct=None,
            description=description,
            edge_case_type=config.edge_case_description,
        ))
        
        return obligations, schedules, allocations, deferred, issues
    
    def _generate_recognition_beyond_period(
        self,
        contract: Contract,
        config: RevRecScenarioConfig,
        as_of: date,
    ) -> tuple[List[RevenueObligation], List[RevenueSchedule], List[RevenueAllocation], List[DeferredBalance], List[ExpectedIssue]]:
        """Generate recognition beyond period scenarios (R024)."""
        obligations = []
        schedules = []
        allocations = []
        deferred = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return obligations, schedules, allocations, deferred, issues
        
        arr = Decimal(str(contract.arr))
        end_date = contract.end_date or (contract.start_date + relativedelta(years=1))
        
        obligation = self._create_base_obligation(contract)
        
        if config.type == RevRecScenarioType.RECOGNITION_CANCELLED:
            obligation.status = ObligationStatus.CANCELLED
        
        obligations.append(obligation)
        
        # Create schedules that extend beyond contract end
        monthly_amount = (arr / 12).quantize(Decimal("0.01"))
        current_date = contract.start_date
        
        months = 15 if config.type != RevRecScenarioType.RECOGNITION_CANCELLED else 12
        
        for i in range(months):
            period_end = current_date + relativedelta(months=1)
            schedules.append(RevenueSchedule(
                id=self._generate_id("sched"),
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                obligation_id=obligation.id,
                period_start=current_date,
                period_end=period_end,
                scheduled_amount=monthly_amount,
                recognized_amount=monthly_amount,
                status=ScheduleStatus.RECOGNIZED,
            ))
            current_date = period_end
        
        if config.type == RevRecScenarioType.RECOGNITION_BEYOND_END:
            description = f"Schedule extends {months-12} months beyond contract end ({end_date})"
        elif config.type == RevRecScenarioType.RECOGNITION_CANCELLED:
            description = "Cancelled contract still has recognition schedules"
        else:
            description = "Recognition after service delivery complete"
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R024",
            category="revrec",
            severity="high",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=None,
            customer_id=contract.customer_id,
            expected_amount=None,
            actual_amount=None,
            variance_pct=None,
            description=description,
            edge_case_type=config.edge_case_description,
        ))
        
        return obligations, schedules, allocations, deferred, issues
    
    def _generate_premature_recognition(
        self,
        contract: Contract,
        config: RevRecScenarioConfig,
        as_of: date,
    ) -> tuple[List[RevenueObligation], List[RevenueSchedule], List[RevenueAllocation], List[DeferredBalance], List[ExpectedIssue]]:
        """Generate premature recognition scenarios (R025)."""
        obligations = []
        schedules = []
        allocations = []
        deferred = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return obligations, schedules, allocations, deferred, issues
        
        arr = Decimal(str(contract.arr))
        
        obligation = self._create_base_obligation(contract)
        obligations.append(obligation)
        
        monthly_amount = (arr / 12).quantize(Decimal("0.01"))
        
        # Start schedules before contract start
        days_early = random.randint(30, 90)
        early_start = contract.start_date - timedelta(days=days_early)
        current_date = early_start
        
        for i in range(12):
            period_end = current_date + relativedelta(months=1)
            schedules.append(RevenueSchedule(
                id=self._generate_id("sched"),
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                obligation_id=obligation.id,
                period_start=current_date,
                period_end=period_end,
                scheduled_amount=monthly_amount,
                recognized_amount=monthly_amount,
            ))
            current_date = period_end
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R025",
            category="revrec",
            severity="high",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=None,
            customer_id=contract.customer_id,
            expected_amount=None,
            actual_amount=None,
            variance_pct=None,
            description=f"Recognition started {days_early} days before contract start ({contract.start_date})",
            edge_case_type=config.edge_case_description,
        ))
        
        return obligations, schedules, allocations, deferred, issues
    
    def _generate_allocation_sum_mismatch(
        self,
        contract: Contract,
        config: RevRecScenarioConfig,
        as_of: date,
    ) -> tuple[List[RevenueObligation], List[RevenueSchedule], List[RevenueAllocation], List[DeferredBalance], List[ExpectedIssue]]:
        """Generate allocation sum mismatch scenarios (R026)."""
        obligations = []
        schedules = []
        allocations_list = []
        deferred = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return obligations, schedules, allocations_list, deferred, issues
        
        arr = Decimal(str(contract.arr))
        
        # Create multiple obligations
        obligation_types = [
            (ObligationType.SUBSCRIPTION, Decimal("0.70")),
            (ObligationType.SUPPORT, Decimal("0.20")),
            (ObligationType.PROFESSIONAL_SERVICES, Decimal("0.10")),
        ]
        
        total_allocated = Decimal("0")
        
        for obl_type, pct in obligation_types:
            obligation = RevenueObligation(
                id=self._generate_id("obl"),
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                contract_id=contract.id,
                obligation_type=obl_type,
                description=obl_type.value.replace("_", " ").title(),
                transaction_price=(arr * pct).quantize(Decimal("0.01")),
                currency=contract.currency,
                allocation_method=AllocationMethod.SSP,
                service_start_date=contract.start_date,
                service_end_date=contract.end_date,
            )
            obligations.append(obligation)
            
            # Create allocation with potential issues
            if config.type == RevRecScenarioType.ALLOCATION_ROUNDING:
                # Introduce rounding errors
                allocated = (arr * pct * Decimal("0.999")).quantize(Decimal("0.01"))
            elif config.type == RevRecScenarioType.ALLOCATION_SUM_MISMATCH:
                # Allocate more than 100%
                allocated = (arr * pct * Decimal("1.05")).quantize(Decimal("0.01"))
            else:
                allocated = (arr * pct).quantize(Decimal("0.01"))
            
            allocation = RevenueAllocation(
                id=self._generate_id("alloc"),
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                obligation_id=obligation.id,
                allocation_pct=pct * 100,
                allocated_amount=allocated,
            )
            allocations_list.append(allocation)
            total_allocated += allocated
        
        variance = total_allocated - arr
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R026",
            category="revrec",
            severity="medium",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=None,
            customer_id=contract.customer_id,
            expected_amount=arr,
            actual_amount=total_allocated,
            variance_pct=float(variance / arr * 100) if arr else None,
            description=f"Allocation sum ({total_allocated}) != contract ARR ({arr}), variance: {variance}",
            edge_case_type=config.edge_case_description,
        ))
        
        return obligations, schedules, allocations_list, deferred, issues
    
    def _generate_ssp_outlier(
        self,
        contract: Contract,
        config: RevRecScenarioConfig,
        as_of: date,
    ) -> tuple[List[RevenueObligation], List[RevenueSchedule], List[RevenueAllocation], List[DeferredBalance], List[ExpectedIssue]]:
        """Generate SSP outlier scenarios (R027)."""
        obligations = []
        schedules = []
        allocations = []
        deferred = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return obligations, schedules, allocations, deferred, issues
        
        arr = Decimal(str(contract.arr))
        mean_ssp = self._ssp_stats["mean"]
        std_dev = self._ssp_stats["std_dev"]
        
        # Determine SSP based on scenario
        if config.type == RevRecScenarioType.SSP_OUTLIER_HIGH:
            # SSP > 3 std dev from mean
            ssp = mean_ssp + (std_dev * Decimal("4"))
            description = f"SSP ({ssp}) is > 3 standard deviations from mean ({mean_ssp})"
        elif config.type == RevRecScenarioType.SSP_OUTLIER_ZERO:
            # SSP = 0
            ssp = Decimal("0")
            description = "SSP is zero (statistically rare)"
        else:
            # New product - no baseline
            ssp = None
            description = "New product has no SSP baseline"
        
        obligation = RevenueObligation(
            id=self._generate_id("obl"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            obligation_type=ObligationType.SUBSCRIPTION,
            description="Platform Subscription",
            transaction_price=arr,
            currency=contract.currency,
            allocation_method=AllocationMethod.SSP,
            standalone_selling_price=ssp,
            service_start_date=contract.start_date,
            service_end_date=contract.end_date,
            metadata={"_ssp_stats": {"mean": float(mean_ssp), "std_dev": float(std_dev)}},
        )
        obligations.append(obligation)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R027",
            category="revrec",
            severity="medium",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=None,
            customer_id=contract.customer_id,
            expected_amount=mean_ssp,
            actual_amount=ssp,
            variance_pct=float((ssp - mean_ssp) / std_dev) if ssp else None,
            description=description,
            edge_case_type=config.edge_case_description,
        ))
        
        return obligations, schedules, allocations, deferred, issues
