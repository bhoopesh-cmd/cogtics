"""
Comprehensive data quality scenarios for testing detection rules R100-R105.

Generates data quality issues covering:
- Stale usage data (R100)
- Missing CRM sync (R101)
- Incomplete snapshot (R102)
- Low readiness/confidence (R103)
- FX unavailable (R104)
- Missing master data (R105)

Also includes additional rule tiers:
- Credits (R110-R113)
- Tax/Fees (R120-R122)
- FX/Currency (R130-R132)
- Usage (R150-R154)
- Lifecycle (R060-R064, R160-R161)
- Multi-Entity (R170-R173)
- Cross-Snapshot (R080-R083)
"""

import random
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Any, Optional, List, Dict
import uuid

from dateutil.relativedelta import relativedelta

from ..models.contracts import Contract, BillingFrequency, ContractStatus
from ..models.invoices import Invoice, InvoiceLine, InvoiceStatus
from ..models.usage import UsageEvent
from .billing import ExpectedIssue


class DataQualityScenarioType(str, Enum):
    """Data quality scenario types aligned with detection rules."""
    # R100: Stale Usage
    STALE_USAGE_72H = "R100_stale_usage_72h"
    STALE_USAGE_THRESHOLD = "R100_stale_usage_threshold"
    STALE_USAGE_MISSING = "R100_stale_usage_missing"
    
    # R101: Missing CRM Sync
    MISSING_CRM_48H = "R101_missing_crm_48h"
    MISSING_CRM_TIMESTAMP = "R101_missing_crm_timestamp"
    MISSING_CRM_PARTIAL = "R101_missing_crm_partial"
    
    # R102: Incomplete Snapshot
    INCOMPLETE_NO_INVOICES = "R102_incomplete_no_invoices"
    INCOMPLETE_NO_CONTRACTS = "R102_incomplete_no_contracts"
    INCOMPLETE_FEWER_RECORDS = "R102_incomplete_fewer_records"
    INCOMPLETE_MISSING_ENTITY = "R102_incomplete_missing_entity"
    
    # R103: Low Readiness
    LOW_READINESS_60 = "R103_low_readiness_60"
    LOW_READINESS_ZERO = "R103_low_readiness_zero"
    LOW_READINESS_MISSING_TERMS = "R103_low_readiness_missing_terms"
    
    # R104: FX Unavailable
    FX_UNAVAILABLE_NON_USD = "R104_fx_unavailable_non_usd"
    FX_UNAVAILABLE_WRONG_DATE = "R104_fx_unavailable_wrong_date"
    FX_UNAVAILABLE_PARTIAL = "R104_fx_unavailable_partial"
    
    # R105: Missing Master Data
    MISSING_PRODUCT = "R105_missing_product"
    MISSING_CUSTOMER = "R105_missing_customer"
    MISSING_ORPHAN_PRODUCT = "R105_missing_orphan_product"
    
    # R110-R113: Credits (3 edge cases each as per plan)
    CREDIT_UNMATCHED = "R110_credit_unmatched"
    CREDIT_REFERENCES_DELETED = "R110_credit_references_deleted"
    CREDIT_WRONG_CUSTOMER = "R110_credit_wrong_customer"
    CREDIT_EXCEEDS_INVOICE = "R111_credit_exceeds_invoice"
    CREDIT_MULTIPLE_EXCEED = "R111_credit_multiple_exceed"
    CREDIT_PARTIAL_THEN_FULL = "R111_credit_partial_then_full"
    REFUND_UNRECONCILED = "R112_refund_unreconciled"
    REFUND_CHARGEBACK_NOT_REFLECTED = "R112_refund_chargeback_not_reflected"
    REFUND_PARTIAL_MISMATCH = "R112_refund_partial_mismatch"
    NET_REVENUE_NEGATIVE = "R113_net_revenue_negative"
    NET_REVENUE_REFUNDS_EXCEED = "R113_net_revenue_refunds_exceed"
    NET_REVENUE_CONTRACT_NEGATIVE = "R113_net_revenue_contract_negative"
    
    # R120-R122: Tax (3 edge cases each as per plan)
    TAX_UNEXPECTED = "R120_tax_unexpected"
    TAX_UNEXPECTED_PRODUCT = "R120_tax_unexpected_product"
    TAX_UNEXPECTED_JURISDICTION = "R120_tax_unexpected_jurisdiction"
    TAX_WRONG_RATE = "R121_tax_wrong_rate"
    TAX_WRONG_COMBINED_RATE = "R121_tax_wrong_combined_rate"
    TAX_WRONG_RATE_CHANGE = "R121_tax_wrong_rate_change"
    TAX_MISSING_EXPECTED = "R122_tax_missing_expected"
    TAX_MISSING_JURISDICTION = "R122_tax_missing_jurisdiction"
    TAX_EXEMPTION_EXPIRED = "R122_tax_exemption_expired"
    
    # R130-R132: FX (3/3/2 edge cases as per plan)
    FX_RATE_DEVIATION = "R130_fx_rate_deviation"
    FX_RATE_SPOT_VS_CONTRACTED = "R130_fx_rate_spot_vs_contracted"
    FX_RATE_WRONG_DATE = "R130_fx_rate_wrong_date"
    FX_RATE_INCONSISTENT = "R131_fx_rate_inconsistent"
    FX_RATE_LINE_MISMATCH = "R131_fx_rate_line_mismatch"
    FX_RATE_CHANGED_MID_INVOICE = "R131_fx_rate_changed_mid_invoice"
    FX_GAIN_LOSS_THRESHOLD = "R132_fx_gain_loss_threshold"
    FX_GAIN_LOSS_UNREALIZED_MISMATCH = "R132_fx_gain_loss_unrealized_mismatch"
    
    # R150-R154: Usage (3 edge cases each as per plan)
    USAGE_MISSING_PERIOD = "R150_usage_missing_period"
    USAGE_MISSING_TIMELINE_GAP = "R150_usage_missing_timeline_gap"
    USAGE_MISSING_WRONG_PRODUCT = "R150_usage_missing_wrong_product"
    USAGE_LATE_EVENTS = "R151_usage_late_events"
    USAGE_LATE_BACKDATED = "R151_usage_late_backdated"
    USAGE_LATE_FUTURE_TIMESTAMP = "R151_usage_late_future_timestamp"
    USAGE_EXCEEDS_CAP = "R152_usage_exceeds_cap"
    USAGE_EXCEEDS_NO_OVERAGE = "R152_usage_exceeds_no_overage"
    USAGE_EXCEEDS_CAP_PERIOD_MISMATCH = "R152_usage_exceeds_cap_period_mismatch"
    USAGE_OUTSIDE_TERM = "R153_usage_outside_term"
    USAGE_OUTSIDE_AFTER_END = "R153_usage_outside_after_end"
    USAGE_OUTSIDE_DURING_PAUSE = "R153_usage_outside_during_pause"
    USAGE_RATE_MISMATCH = "R154_usage_rate_mismatch"
    USAGE_RATE_TIERED_WRONG = "R154_usage_rate_tiered_wrong"
    USAGE_RATE_VOLUME_DISCOUNT = "R154_usage_rate_volume_discount"
    
    # R060-R064: Lifecycle (3/2/2/2/2 edge cases as per plan)
    AMENDMENT_NO_ADJUSTMENT = "R060_amendment_no_adjustment"
    AMENDMENT_QUANTITY_NOT_REFLECTED = "R060_amendment_quantity_not_reflected"
    AMENDMENT_PRICE_NOT_REFLECTED = "R060_amendment_price_not_reflected"
    CANCELLED_STILL_BILLING = "R061_cancelled_still_billing"
    CANCELLED_FUTURE_INVOICES = "R061_cancelled_future_invoices"
    EXPIRED_ACTIVE_BILLING = "R062_expired_active_billing"
    EXPIRED_NO_RENEWAL_STILL_BILLING = "R062_expired_no_renewal_still_billing"
    VERSION_GAP = "R063_version_gap"
    VERSION_CHAIN_BROKEN = "R063_version_chain_broken"
    AUTO_RENEW_NOT_REFLECTED = "R064_auto_renew_not_reflected"
    AUTO_RENEW_STATUS_UNCHANGED = "R064_auto_renew_status_unchanged"
    PAUSED_BUT_BILLING = "R160_paused_but_billing"
    PAYMENT_HOLD_MISMATCH = "R161_payment_hold_mismatch"
    PAYMENT_HOLD_PARTIAL = "R161_payment_hold_partial"
    
    # R170-R173: Multi-Entity (2 edge cases each as per plan)
    BILL_TO_SOLD_TO_MISMATCH = "R170_bill_to_sold_to_mismatch"
    BILL_TO_SUBSIDIARY_WRONG = "R170_bill_to_subsidiary_wrong"
    SPLIT_BILLING_UNRECONCILED = "R171_split_billing_unreconciled"
    SPLIT_BILLING_PERCENTAGES = "R171_split_billing_percentages"
    CONSOLIDATED_MISSING_BREAKDOWN = "R172_consolidated_missing_breakdown"
    CONSOLIDATED_SUM_MISMATCH = "R172_consolidated_sum_mismatch"
    SUBSIDIARY_INVOICE_ORPHAN = "R173_subsidiary_invoice_orphan"
    SUBSIDIARY_HIERARCHY_ORPHAN = "R173_subsidiary_hierarchy_orphan"
    
    # R080-R083: Cross-Snapshot (3/2/2/2 edge cases as per plan)
    ISSUE_REGRESSION = "R080_issue_regression"
    ISSUE_REGRESSION_SEVERITY = "R080_issue_regression_severity"
    ISSUE_REGRESSION_PARTIAL_FIX = "R080_issue_regression_partial_fix"
    NEW_ISSUE_UNCHANGED = "R081_new_issue_unchanged"
    NEW_ISSUE_RULE_CHANGE = "R081_new_issue_rule_change"
    VALUE_CHANGE_NO_AMENDMENT = "R082_value_change_no_amendment"
    VALUE_CHANGE_ARR_NO_VERSION = "R082_value_change_arr_no_version"
    SNAPSHOT_GAP = "R083_snapshot_gap"
    SNAPSHOT_LARGE_TIME_GAP = "R083_snapshot_large_time_gap"


@dataclass
class DataQualityScenarioConfig:
    """Configuration for a data quality scenario."""
    type: DataQualityScenarioType
    count: int = 10
    probability: float = 0.5
    edge_case_description: str = ""


# Scenario configurations matching the plan
DATA_QUALITY_SCENARIOS = {
    # Tier 0: Data Quality (R100-R105)
    "R100_stale_usage": [
        DataQualityScenarioConfig(DataQualityScenarioType.STALE_USAGE_72H, count=6, edge_case_description="usage > 72h old with no newer events"),
        DataQualityScenarioConfig(DataQualityScenarioType.STALE_USAGE_THRESHOLD, count=5, edge_case_description="usage within threshold but no recent activity"),
        DataQualityScenarioConfig(DataQualityScenarioType.STALE_USAGE_MISSING, count=4, edge_case_description="usage feed completely missing"),
    ],
    "R101_missing_crm_sync": [
        DataQualityScenarioConfig(DataQualityScenarioType.MISSING_CRM_48H, count=4, edge_case_description="no CRM metadata, last_sync > 48h"),
        DataQualityScenarioConfig(DataQualityScenarioType.MISSING_CRM_TIMESTAMP, count=3, edge_case_description="CRM sync timestamp missing entirely"),
        DataQualityScenarioConfig(DataQualityScenarioType.MISSING_CRM_PARTIAL, count=3, edge_case_description="partial CRM data (some fields null)"),
    ],
    "R102_incomplete_snapshot": [
        DataQualityScenarioConfig(DataQualityScenarioType.INCOMPLETE_NO_INVOICES, count=3, edge_case_description="contracts without invoices"),
        DataQualityScenarioConfig(DataQualityScenarioType.INCOMPLETE_NO_CONTRACTS, count=3, edge_case_description="invoices without contracts"),
        DataQualityScenarioConfig(DataQualityScenarioType.INCOMPLETE_FEWER_RECORDS, count=2, edge_case_description="significantly fewer records than prior snapshot"),
        DataQualityScenarioConfig(DataQualityScenarioType.INCOMPLETE_MISSING_ENTITY, count=2, edge_case_description="missing entity types entirely"),
    ],
    "R103_low_readiness": [
        DataQualityScenarioConfig(DataQualityScenarioType.LOW_READINESS_60, count=8, edge_case_description="< 60% term extraction confidence"),
        DataQualityScenarioConfig(DataQualityScenarioType.LOW_READINESS_ZERO, count=6, edge_case_description="0% confidence (no extraction)"),
        DataQualityScenarioConfig(DataQualityScenarioType.LOW_READINESS_MISSING_TERMS, count=6, edge_case_description="high confidence but missing critical terms"),
    ],
    "R104_fx_unavailable": [
        DataQualityScenarioConfig(DataQualityScenarioType.FX_UNAVAILABLE_NON_USD, count=6, edge_case_description="non-USD invoice, no FX rate"),
        DataQualityScenarioConfig(DataQualityScenarioType.FX_UNAVAILABLE_WRONG_DATE, count=5, edge_case_description="FX rate for wrong date"),
        DataQualityScenarioConfig(DataQualityScenarioType.FX_UNAVAILABLE_PARTIAL, count=4, edge_case_description="partial FX rates (some currencies missing)"),
    ],
    "R105_missing_master_data": [
        DataQualityScenarioConfig(DataQualityScenarioType.MISSING_PRODUCT, count=6, edge_case_description="invoice references non-existent product"),
        DataQualityScenarioConfig(DataQualityScenarioType.MISSING_CUSTOMER, count=5, edge_case_description="invoice references non-existent customer"),
        DataQualityScenarioConfig(DataQualityScenarioType.MISSING_ORPHAN_PRODUCT, count=4, edge_case_description="contract references orphan product_id"),
    ],
    # Credits (R110-R113) - 3 edge cases per rule as per plan
    "R110_unmatched_credit": [
        DataQualityScenarioConfig(DataQualityScenarioType.CREDIT_UNMATCHED, count=5, edge_case_description="credit memo without original invoice"),
        DataQualityScenarioConfig(DataQualityScenarioType.CREDIT_REFERENCES_DELETED, count=5, edge_case_description="credit references deleted invoice"),
        DataQualityScenarioConfig(DataQualityScenarioType.CREDIT_WRONG_CUSTOMER, count=5, edge_case_description="credit for wrong customer"),
    ],
    "R111_credit_exceeds_invoice": [
        DataQualityScenarioConfig(DataQualityScenarioType.CREDIT_EXCEEDS_INVOICE, count=5, edge_case_description="credit amount > invoice total"),
        DataQualityScenarioConfig(DataQualityScenarioType.CREDIT_MULTIPLE_EXCEED, count=5, edge_case_description="multiple credits exceed invoice"),
        DataQualityScenarioConfig(DataQualityScenarioType.CREDIT_PARTIAL_THEN_FULL, count=5, edge_case_description="partial refund then full credit"),
    ],
    "R112_refund_unreconciled": [
        DataQualityScenarioConfig(DataQualityScenarioType.REFUND_UNRECONCILED, count=5, edge_case_description="payment refund without credit memo"),
        DataQualityScenarioConfig(DataQualityScenarioType.REFUND_CHARGEBACK_NOT_REFLECTED, count=5, edge_case_description="chargeback not reflected"),
        DataQualityScenarioConfig(DataQualityScenarioType.REFUND_PARTIAL_MISMATCH, count=5, edge_case_description="partial refund mismatch"),
    ],
    "R113_net_revenue_negative": [
        DataQualityScenarioConfig(DataQualityScenarioType.NET_REVENUE_NEGATIVE, count=4, edge_case_description="credits > invoices for period"),
        DataQualityScenarioConfig(DataQualityScenarioType.NET_REVENUE_REFUNDS_EXCEED, count=3, edge_case_description="refunds exceed collections"),
        DataQualityScenarioConfig(DataQualityScenarioType.NET_REVENUE_CONTRACT_NEGATIVE, count=3, edge_case_description="contract net negative"),
    ],
    # Tax (R120-R122) - 3 edge cases per rule as per plan
    "R120_unexpected_tax": [
        DataQualityScenarioConfig(DataQualityScenarioType.TAX_UNEXPECTED, count=5, edge_case_description="tax on tax-exempt customer"),
        DataQualityScenarioConfig(DataQualityScenarioType.TAX_UNEXPECTED_PRODUCT, count=5, edge_case_description="tax on tax-exempt product"),
        DataQualityScenarioConfig(DataQualityScenarioType.TAX_UNEXPECTED_JURISDICTION, count=5, edge_case_description="tax in exempt jurisdiction"),
    ],
    "R121_wrong_tax_rate": [
        DataQualityScenarioConfig(DataQualityScenarioType.TAX_WRONG_RATE, count=7, edge_case_description="tax rate != jurisdiction rate"),
        DataQualityScenarioConfig(DataQualityScenarioType.TAX_WRONG_COMBINED_RATE, count=7, edge_case_description="combined rate miscalculated"),
        DataQualityScenarioConfig(DataQualityScenarioType.TAX_WRONG_RATE_CHANGE, count=6, edge_case_description="rate change not applied"),
    ],
    "R122_missing_expected_tax": [
        DataQualityScenarioConfig(DataQualityScenarioType.TAX_MISSING_EXPECTED, count=5, edge_case_description="taxable customer, no tax line"),
        DataQualityScenarioConfig(DataQualityScenarioType.TAX_MISSING_JURISDICTION, count=5, edge_case_description="taxable jurisdiction, no tax"),
        DataQualityScenarioConfig(DataQualityScenarioType.TAX_EXEMPTION_EXPIRED, count=5, edge_case_description="tax exemption expired"),
    ],
    # FX (R130-R132) - 3/3/2 edge cases per rule as per plan
    "R130_fx_rate_deviation": [
        DataQualityScenarioConfig(DataQualityScenarioType.FX_RATE_DEVIATION, count=5, edge_case_description="rate differs > 5% from reference"),
        DataQualityScenarioConfig(DataQualityScenarioType.FX_RATE_SPOT_VS_CONTRACTED, count=5, edge_case_description="spot rate vs contracted rate"),
        DataQualityScenarioConfig(DataQualityScenarioType.FX_RATE_WRONG_DATE, count=5, edge_case_description="rate for wrong date"),
    ],
    "R131_inconsistent_fx_rate": [
        DataQualityScenarioConfig(DataQualityScenarioType.FX_RATE_INCONSISTENT, count=4, edge_case_description="different rates on same invoice"),
        DataQualityScenarioConfig(DataQualityScenarioType.FX_RATE_LINE_MISMATCH, count=3, edge_case_description="line item rates don't match header"),
        DataQualityScenarioConfig(DataQualityScenarioType.FX_RATE_CHANGED_MID_INVOICE, count=3, edge_case_description="rate changed mid-invoice"),
    ],
    "R132_fx_gain_loss_threshold": [
        DataQualityScenarioConfig(DataQualityScenarioType.FX_GAIN_LOSS_THRESHOLD, count=5, edge_case_description="realized FX gain/loss > threshold"),
        DataQualityScenarioConfig(DataQualityScenarioType.FX_GAIN_LOSS_UNREALIZED_MISMATCH, count=5, edge_case_description="unrealized vs realized mismatch"),
    ],
    # Usage (R150-R154) - 3 edge cases per rule as per plan
    "R150_missing_usage_period": [
        DataQualityScenarioConfig(DataQualityScenarioType.USAGE_MISSING_PERIOD, count=5, edge_case_description="no usage data for billing period"),
        DataQualityScenarioConfig(DataQualityScenarioType.USAGE_MISSING_TIMELINE_GAP, count=5, edge_case_description="gap in usage timeline"),
        DataQualityScenarioConfig(DataQualityScenarioType.USAGE_MISSING_WRONG_PRODUCT, count=5, edge_case_description="usage for wrong product"),
    ],
    "R151_late_usage_events": [
        DataQualityScenarioConfig(DataQualityScenarioType.USAGE_LATE_EVENTS, count=5, edge_case_description="usage received after billing cutoff"),
        DataQualityScenarioConfig(DataQualityScenarioType.USAGE_LATE_BACKDATED, count=5, edge_case_description="backdated usage events"),
        DataQualityScenarioConfig(DataQualityScenarioType.USAGE_LATE_FUTURE_TIMESTAMP, count=5, edge_case_description="usage timestamp in future"),
    ],
    "R152_usage_exceeds_cap": [
        DataQualityScenarioConfig(DataQualityScenarioType.USAGE_EXCEEDS_CAP, count=7, edge_case_description="usage > cap, no overage invoice"),
        DataQualityScenarioConfig(DataQualityScenarioType.USAGE_EXCEEDS_NO_OVERAGE, count=7, edge_case_description="overage rate not applied"),
        DataQualityScenarioConfig(DataQualityScenarioType.USAGE_EXCEEDS_CAP_PERIOD_MISMATCH, count=6, edge_case_description="cap per period vs cumulative mismatch"),
    ],
    "R153_usage_outside_term": [
        DataQualityScenarioConfig(DataQualityScenarioType.USAGE_OUTSIDE_TERM, count=5, edge_case_description="usage before contract start"),
        DataQualityScenarioConfig(DataQualityScenarioType.USAGE_OUTSIDE_AFTER_END, count=5, edge_case_description="usage after contract end"),
        DataQualityScenarioConfig(DataQualityScenarioType.USAGE_OUTSIDE_DURING_PAUSE, count=5, edge_case_description="usage during paused period"),
    ],
    "R154_usage_rate_mismatch": [
        DataQualityScenarioConfig(DataQualityScenarioType.USAGE_RATE_MISMATCH, count=5, edge_case_description="billed rate != contract rate"),
        DataQualityScenarioConfig(DataQualityScenarioType.USAGE_RATE_TIERED_WRONG, count=5, edge_case_description="tiered usage wrong tier"),
        DataQualityScenarioConfig(DataQualityScenarioType.USAGE_RATE_VOLUME_DISCOUNT, count=5, edge_case_description="volume discount not applied"),
    ],
    # Lifecycle (R060-R064, R160-R161) - edge cases as per plan
    "R060_amendment_no_adjustment": [
        DataQualityScenarioConfig(DataQualityScenarioType.AMENDMENT_NO_ADJUSTMENT, count=7, edge_case_description="contract amended, billing unchanged"),
        DataQualityScenarioConfig(DataQualityScenarioType.AMENDMENT_QUANTITY_NOT_REFLECTED, count=7, edge_case_description="quantity change, no invoice adjustment"),
        DataQualityScenarioConfig(DataQualityScenarioType.AMENDMENT_PRICE_NOT_REFLECTED, count=6, edge_case_description="price change, old price still billed"),
    ],
    "R061_cancelled_still_billing": [
        DataQualityScenarioConfig(DataQualityScenarioType.CANCELLED_STILL_BILLING, count=8, edge_case_description="cancelled contract, new invoices issued"),
        DataQualityScenarioConfig(DataQualityScenarioType.CANCELLED_FUTURE_INVOICES, count=7, edge_case_description="cancellation date in past, future invoices exist"),
    ],
    "R062_expired_active_billing": [
        DataQualityScenarioConfig(DataQualityScenarioType.EXPIRED_ACTIVE_BILLING, count=8, edge_case_description="contract past end_date, no renewal"),
        DataQualityScenarioConfig(DataQualityScenarioType.EXPIRED_NO_RENEWAL_STILL_BILLING, count=7, edge_case_description="expired but auto_renew = false, still billing"),
    ],
    "R063_version_gap": [
        DataQualityScenarioConfig(DataQualityScenarioType.VERSION_GAP, count=5, edge_case_description="version 1 -> version 3 (missing v2)"),
        DataQualityScenarioConfig(DataQualityScenarioType.VERSION_CHAIN_BROKEN, count=5, edge_case_description="amendment chain broken"),
    ],
    "R064_auto_renew_not_reflected": [
        DataQualityScenarioConfig(DataQualityScenarioType.AUTO_RENEW_NOT_REFLECTED, count=8, edge_case_description="auto_renew = true, no new term"),
        DataQualityScenarioConfig(DataQualityScenarioType.AUTO_RENEW_STATUS_UNCHANGED, count=7, edge_case_description="renewal date passed, status unchanged"),
    ],
    "R160_paused_but_billing": [
        DataQualityScenarioConfig(DataQualityScenarioType.PAUSED_BUT_BILLING, count=10, edge_case_description="contract has billing_hold, invoices still issued"),
    ],
    "R161_payment_hold_mismatch": [
        DataQualityScenarioConfig(DataQualityScenarioType.PAYMENT_HOLD_MISMATCH, count=5, edge_case_description="payment status != hold setting"),
        DataQualityScenarioConfig(DataQualityScenarioType.PAYMENT_HOLD_PARTIAL, count=5, edge_case_description="partial hold not respected"),
    ],
    # Multi-Entity (R170-R173) - 2 edge cases per rule as per plan
    "R170_bill_to_sold_to_mismatch": [
        DataQualityScenarioConfig(DataQualityScenarioType.BILL_TO_SOLD_TO_MISMATCH, count=8, edge_case_description="invoice billing entity != contract sold_to"),
        DataQualityScenarioConfig(DataQualityScenarioType.BILL_TO_SUBSIDIARY_WRONG, count=7, edge_case_description="subsidiary billed instead of parent"),
    ],
    "R171_split_billing_unreconciled": [
        DataQualityScenarioConfig(DataQualityScenarioType.SPLIT_BILLING_UNRECONCILED, count=5, edge_case_description="multi-entity invoices don't sum to contract"),
        DataQualityScenarioConfig(DataQualityScenarioType.SPLIT_BILLING_PERCENTAGES, count=5, edge_case_description="split percentages don't add to 100%"),
    ],
    "R172_consolidated_missing_breakdown": [
        DataQualityScenarioConfig(DataQualityScenarioType.CONSOLIDATED_MISSING_BREAKDOWN, count=5, edge_case_description="parent invoice lacks child breakdown"),
        DataQualityScenarioConfig(DataQualityScenarioType.CONSOLIDATED_SUM_MISMATCH, count=5, edge_case_description="consolidated total != sum of parts"),
    ],
    "R173_subsidiary_invoice_orphan": [
        DataQualityScenarioConfig(DataQualityScenarioType.SUBSIDIARY_INVOICE_ORPHAN, count=5, edge_case_description="subsidiary invoice without parent contract"),
        DataQualityScenarioConfig(DataQualityScenarioType.SUBSIDIARY_HIERARCHY_ORPHAN, count=5, edge_case_description="orphan entity in hierarchy"),
    ],
    # Cross-Snapshot (R080-R083) - 3/2/2/2 edge cases per rule as per plan
    "R080_issue_regression": [
        DataQualityScenarioConfig(DataQualityScenarioType.ISSUE_REGRESSION, count=5, edge_case_description="resolved issue reappeared"),
        DataQualityScenarioConfig(DataQualityScenarioType.ISSUE_REGRESSION_SEVERITY, count=5, edge_case_description="same issue, different severity"),
        DataQualityScenarioConfig(DataQualityScenarioType.ISSUE_REGRESSION_PARTIAL_FIX, count=5, edge_case_description="partial fix regressed"),
    ],
    "R081_new_issue_unchanged": [
        DataQualityScenarioConfig(DataQualityScenarioType.NEW_ISSUE_UNCHANGED, count=5, edge_case_description="issue detected on unchanged data"),
        DataQualityScenarioConfig(DataQualityScenarioType.NEW_ISSUE_RULE_CHANGE, count=5, edge_case_description="rule change caused new detection"),
    ],
    "R082_value_change_no_amendment": [
        DataQualityScenarioConfig(DataQualityScenarioType.VALUE_CHANGE_NO_AMENDMENT, count=8, edge_case_description="contract TCV changed without amendment"),
        DataQualityScenarioConfig(DataQualityScenarioType.VALUE_CHANGE_ARR_NO_VERSION, count=7, edge_case_description="ARR changed, no version record"),
    ],
    "R083_snapshot_gap": [
        DataQualityScenarioConfig(DataQualityScenarioType.SNAPSHOT_GAP, count=5, edge_case_description="missing snapshot in sequence"),
        DataQualityScenarioConfig(DataQualityScenarioType.SNAPSHOT_LARGE_TIME_GAP, count=5, edge_case_description="large time gap between snapshots"),
    ],
}


@dataclass
class SnapshotMetadata:
    """Metadata for snapshot-level issues."""
    snapshot_id: str
    tenant_id: str
    created_at: datetime
    record_counts: Dict[str, int]
    last_crm_sync: Optional[datetime] = None
    last_usage_event: Optional[datetime] = None
    fx_rates_available: Dict[str, bool] = None
    
    def to_dict(self) -> dict:
        return {
            "snapshot_id": self.snapshot_id,
            "tenant_id": self.tenant_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "record_counts": self.record_counts,
            "last_crm_sync": self.last_crm_sync.isoformat() if self.last_crm_sync else None,
            "last_usage_event": self.last_usage_event.isoformat() if self.last_usage_event else None,
            "fx_rates_available": self.fx_rates_available,
        }


class DataQualityScenarioGenerator:
    """Generator for comprehensive data quality test scenarios."""
    
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
    
    def _generate_id(self, prefix: str) -> str:
        """Generate a unique ID."""
        self._counter += 1
        return f"{prefix}_{uuid.uuid4().hex[:12]}"
    
    def _generate_issue_id(self) -> str:
        """Generate issue ID."""
        self._issue_counter += 1
        return f"issue_{self._issue_counter:06d}"
    
    def generate_data_quality_scenarios(
        self,
        contracts: List[Contract],
        invoices: List[Invoice],
        scenarios: Optional[dict] = None,
        as_of: Optional[date] = None,
    ) -> tuple[List[Invoice], List[UsageEvent], List[SnapshotMetadata], List[ExpectedIssue]]:
        """
        Generate data quality issues.
        
        Returns:
            Tuple of (modified_invoices, usage_events, snapshot_metadata, expected_issues)
        """
        if scenarios is None:
            scenarios = DATA_QUALITY_SCENARIOS
        if as_of is None:
            as_of = date.today()
        
        modified_invoices = []
        usage_events = []
        snapshot_metadata = []
        issues = []
        
        # Get flat list of all scenario configs
        all_configs = []
        for rule_scenarios in scenarios.values():
            all_configs.extend(rule_scenarios)
        
        # Assign scenarios to contracts and invoices
        for contract in contracts:
            num_scenarios = random.randint(1, 2)
            selected_configs = random.sample(all_configs, min(num_scenarios, len(all_configs)))
            
            for config in selected_configs:
                result = self._generate_scenario(contract, invoices, config, as_of)
                modified_invoices.extend(result[0])
                usage_events.extend(result[1])
                snapshot_metadata.extend(result[2])
                issues.extend(result[3])
        
        return modified_invoices, usage_events, snapshot_metadata, issues
    
    def _generate_scenario(
        self,
        contract: Contract,
        invoices: List[Invoice],
        config: DataQualityScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[UsageEvent], List[SnapshotMetadata], List[ExpectedIssue]]:
        """Generate a specific data quality scenario."""
        scenario_type = config.type
        
        # Dispatch based on rule prefix
        if scenario_type.value.startswith("R100"):
            return self._generate_stale_usage(contract, config, as_of)
        elif scenario_type.value.startswith("R101"):
            return self._generate_missing_crm_sync(contract, config, as_of)
        elif scenario_type.value.startswith("R102"):
            return self._generate_incomplete_snapshot(contract, invoices, config, as_of)
        elif scenario_type.value.startswith("R103"):
            return self._generate_low_readiness(contract, config, as_of)
        elif scenario_type.value.startswith("R104"):
            return self._generate_fx_unavailable(contract, invoices, config, as_of)
        elif scenario_type.value.startswith("R105"):
            return self._generate_missing_master_data(contract, invoices, config, as_of)
        elif scenario_type.value.startswith("R110") or scenario_type.value.startswith("R111") or \
             scenario_type.value.startswith("R112") or scenario_type.value.startswith("R113"):
            return self._generate_credit_issues(contract, invoices, config, as_of)
        elif scenario_type.value.startswith("R120") or scenario_type.value.startswith("R121") or \
             scenario_type.value.startswith("R122"):
            return self._generate_tax_issues(contract, invoices, config, as_of)
        elif scenario_type.value.startswith("R130") or scenario_type.value.startswith("R131") or \
             scenario_type.value.startswith("R132"):
            return self._generate_fx_issues(contract, invoices, config, as_of)
        elif scenario_type.value.startswith("R150") or scenario_type.value.startswith("R151") or \
             scenario_type.value.startswith("R152") or scenario_type.value.startswith("R153") or \
             scenario_type.value.startswith("R154"):
            return self._generate_usage_issues(contract, config, as_of)
        elif scenario_type.value.startswith("R060") or scenario_type.value.startswith("R061") or \
             scenario_type.value.startswith("R062") or scenario_type.value.startswith("R063") or \
             scenario_type.value.startswith("R064") or scenario_type.value.startswith("R160") or \
             scenario_type.value.startswith("R161"):
            return self._generate_lifecycle_issues(contract, invoices, config, as_of)
        elif scenario_type.value.startswith("R170") or scenario_type.value.startswith("R171") or \
             scenario_type.value.startswith("R172") or scenario_type.value.startswith("R173"):
            return self._generate_multi_entity_issues(contract, invoices, config, as_of)
        elif scenario_type.value.startswith("R080") or scenario_type.value.startswith("R081") or \
             scenario_type.value.startswith("R082") or scenario_type.value.startswith("R083"):
            return self._generate_cross_snapshot_issues(contract, config, as_of)
        
        return [], [], [], []
    
    def _generate_stale_usage(
        self,
        contract: Contract,
        config: DataQualityScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[UsageEvent], List[SnapshotMetadata], List[ExpectedIssue]]:
        """Generate stale usage scenarios (R100)."""
        usage_events = []
        issues = []
        
        if not contract.start_date:
            return [], [], [], []
        
        now = datetime.combine(as_of, datetime.min.time())
        
        # Generate stale usage events
        if config.type == DataQualityScenarioType.STALE_USAGE_72H:
            # Usage > 72h old
            stale_date = now - timedelta(hours=80)
        elif config.type == DataQualityScenarioType.STALE_USAGE_THRESHOLD:
            # Within threshold but concerning
            stale_date = now - timedelta(hours=48)
        else:
            # Completely missing
            stale_date = None
        
        if stale_date:
            usage_events.append(UsageEvent(
                id=self._generate_id("usage"),
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                customer_id=contract.customer_id,
                contract_id=contract.id,
                event_timestamp=stale_date,
                metric_name="api_calls",
                quantity=Decimal("1000"),
                metadata={"_scenario": config.type.value},
            ))
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R100",
            category="data_quality",
            severity="medium",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=None,
            customer_id=contract.customer_id,
            expected_amount=None,
            actual_amount=None,
            variance_pct=None,
            description=f"Stale usage data: {config.edge_case_description}",
            edge_case_type=config.edge_case_description,
        ))
        
        return [], usage_events, [], issues
    
    def _generate_missing_crm_sync(
        self,
        contract: Contract,
        config: DataQualityScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[UsageEvent], List[SnapshotMetadata], List[ExpectedIssue]]:
        """Generate missing CRM sync scenarios (R101)."""
        metadata = []
        issues = []
        
        now = datetime.combine(as_of, datetime.min.time())
        
        if config.type == DataQualityScenarioType.MISSING_CRM_48H:
            last_sync = now - timedelta(hours=60)
        elif config.type == DataQualityScenarioType.MISSING_CRM_TIMESTAMP:
            last_sync = None
        else:
            last_sync = now - timedelta(hours=24)  # Recent but partial
        
        metadata.append(SnapshotMetadata(
            snapshot_id=self.snapshot_id,
            tenant_id=self.tenant_id,
            created_at=now,
            record_counts={"contracts": 10, "invoices": 50},
            last_crm_sync=last_sync,
        ))
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R101",
            category="data_quality",
            severity="medium",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=None,
            customer_id=contract.customer_id,
            expected_amount=None,
            actual_amount=None,
            variance_pct=None,
            description=f"Missing CRM sync: {config.edge_case_description}",
            edge_case_type=config.edge_case_description,
        ))
        
        return [], [], metadata, issues
    
    def _generate_incomplete_snapshot(
        self,
        contract: Contract,
        invoices: List[Invoice],
        config: DataQualityScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[UsageEvent], List[SnapshotMetadata], List[ExpectedIssue]]:
        """Generate incomplete snapshot scenarios (R102)."""
        metadata = []
        issues = []
        
        now = datetime.combine(as_of, datetime.min.time())
        
        if config.type == DataQualityScenarioType.INCOMPLETE_NO_INVOICES:
            record_counts = {"contracts": 10, "invoices": 0}
        elif config.type == DataQualityScenarioType.INCOMPLETE_NO_CONTRACTS:
            record_counts = {"contracts": 0, "invoices": 50}
        elif config.type == DataQualityScenarioType.INCOMPLETE_FEWER_RECORDS:
            record_counts = {"contracts": 5, "invoices": 20}  # Prior had 10/50
        else:
            record_counts = {"contracts": 10}  # Missing invoices entity
        
        metadata.append(SnapshotMetadata(
            snapshot_id=self.snapshot_id,
            tenant_id=self.tenant_id,
            created_at=now,
            record_counts=record_counts,
        ))
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R102",
            category="data_quality",
            severity="high",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=None,
            customer_id=contract.customer_id,
            expected_amount=None,
            actual_amount=None,
            variance_pct=None,
            description=f"Incomplete snapshot: {config.edge_case_description}",
            edge_case_type=config.edge_case_description,
        ))
        
        return [], [], metadata, issues
    
    def _generate_low_readiness(
        self,
        contract: Contract,
        config: DataQualityScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[UsageEvent], List[SnapshotMetadata], List[ExpectedIssue]]:
        """Generate low readiness scenarios (R103)."""
        issues = []
        
        if config.type == DataQualityScenarioType.LOW_READINESS_60:
            confidence = random.uniform(30, 59)
        elif config.type == DataQualityScenarioType.LOW_READINESS_ZERO:
            confidence = 0
        else:
            confidence = 85  # High confidence but missing terms
        
        # Update contract metadata to reflect low confidence
        contract.metadata["_term_extraction_confidence"] = confidence
        contract.metadata["_scenario"] = config.type.value
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R103",
            category="data_quality",
            severity="medium",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=None,
            customer_id=contract.customer_id,
            expected_amount=None,
            actual_amount=Decimal(str(confidence)),
            variance_pct=None,
            description=f"Low readiness: {config.edge_case_description} (confidence: {confidence:.1f}%)",
            edge_case_type=config.edge_case_description,
        ))
        
        return [], [], [], issues
    
    def _generate_fx_unavailable(
        self,
        contract: Contract,
        invoices: List[Invoice],
        config: DataQualityScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[UsageEvent], List[SnapshotMetadata], List[ExpectedIssue]]:
        """Generate FX unavailable scenarios (R104)."""
        modified_invoices = []
        metadata = []
        issues = []
        
        # Create non-USD invoice without FX rate
        currency = random.choice(["EUR", "GBP", "CAD", "AUD"])
        
        invoice = Invoice(
            id=self._generate_id("inv"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            customer_id=contract.customer_id,
            contract_id=contract.id,
            external_id=str(uuid.uuid4()),
            invoice_number=f"INV-FX-{random.randint(1000, 9999)}",
            invoice_date=as_of - timedelta(days=5),
            due_date=as_of + timedelta(days=25),
            currency=currency,
            subtotal=Decimal("1000"),
            total=Decimal("1000"),
            status=InvoiceStatus.OPEN,
            metadata={"_scenario": config.type.value, "_fx_rate_missing": True},
        )
        modified_invoices.append(invoice)
        
        fx_rates = {"USD": True, "EUR": False, "GBP": False}
        if config.type == DataQualityScenarioType.FX_UNAVAILABLE_PARTIAL:
            fx_rates["EUR"] = True
        
        metadata.append(SnapshotMetadata(
            snapshot_id=self.snapshot_id,
            tenant_id=self.tenant_id,
            created_at=datetime.combine(as_of, datetime.min.time()),
            record_counts={"invoices": 1},
            fx_rates_available=fx_rates,
        ))
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R104",
            category="data_quality",
            severity="high",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=None,
            actual_amount=None,
            variance_pct=None,
            description=f"FX unavailable for {currency}: {config.edge_case_description}",
            edge_case_type=config.edge_case_description,
        ))
        
        return modified_invoices, [], metadata, issues
    
    def _generate_missing_master_data(
        self,
        contract: Contract,
        invoices: List[Invoice],
        config: DataQualityScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[UsageEvent], List[SnapshotMetadata], List[ExpectedIssue]]:
        """Generate missing master data scenarios (R105)."""
        modified_invoices = []
        issues = []
        
        invoice = Invoice(
            id=self._generate_id("inv"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            customer_id=contract.customer_id if config.type != DataQualityScenarioType.MISSING_CUSTOMER else "cust_nonexistent",
            contract_id=contract.id,
            external_id=str(uuid.uuid4()),
            invoice_number=f"INV-MD-{random.randint(1000, 9999)}",
            invoice_date=as_of,
            due_date=as_of + timedelta(days=30),
            subtotal=Decimal("1000"),
            total=Decimal("1000"),
            status=InvoiceStatus.OPEN,
            metadata={"_scenario": config.type.value},
        )
        
        # Add line with non-existent product
        if config.type == DataQualityScenarioType.MISSING_PRODUCT:
            invoice.lines.append(InvoiceLine(
                id=self._generate_id("line"),
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                invoice_id=invoice.id,
                product_id="prod_nonexistent",
                description="Unknown Product",
                quantity=Decimal("1"),
                unit_price=Decimal("1000"),
                amount=Decimal("1000"),
            ))
        
        modified_invoices.append(invoice)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id="R105",
            category="data_quality",
            severity="high",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=None,
            actual_amount=None,
            variance_pct=None,
            description=f"Missing master data: {config.edge_case_description}",
            edge_case_type=config.edge_case_description,
        ))
        
        return modified_invoices, [], [], issues
    
    def _generate_credit_issues(
        self,
        contract: Contract,
        invoices: List[Invoice],
        config: DataQualityScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[UsageEvent], List[SnapshotMetadata], List[ExpectedIssue]]:
        """Generate credit/refund scenarios (R110-R113)."""
        modified_invoices = []
        issues = []
        
        # Create a credit memo
        credit_amount = Decimal("500")
        
        if config.type == DataQualityScenarioType.CREDIT_EXCEEDS_INVOICE:
            # Credit exceeds the original invoice
            original_amount = Decimal("300")
            credit_amount = Decimal("500")
        elif config.type == DataQualityScenarioType.NET_REVENUE_NEGATIVE:
            # Credits exceed all invoices
            original_amount = Decimal("1000")
            credit_amount = Decimal("1500")
        else:
            original_amount = Decimal("1000")
            credit_amount = Decimal("200")
        
        # Create the credit invoice
        credit_invoice = Invoice(
            id=self._generate_id("inv"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            customer_id=contract.customer_id,
            contract_id=contract.id,
            external_id=str(uuid.uuid4()),
            invoice_number=f"CM-{random.randint(1000, 9999)}",
            invoice_date=as_of,
            due_date=as_of + timedelta(days=30),
            subtotal=-credit_amount,
            total=-credit_amount,
            status=InvoiceStatus.PAID,
            metadata={
                "_scenario": config.type.value,
                "_is_credit_memo": True,
                "_original_invoice_id": "inv_nonexistent" if config.type == DataQualityScenarioType.CREDIT_UNMATCHED else None,
            },
        )
        modified_invoices.append(credit_invoice)
        
        rule_id = config.type.value.split("_")[0]
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id=rule_id,
            category="credits",
            severity="high",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=credit_invoice.id,
            customer_id=contract.customer_id,
            expected_amount=original_amount,
            actual_amount=-credit_amount,
            variance_pct=None,
            description=f"Credit issue: {config.edge_case_description}",
            edge_case_type=config.edge_case_description,
        ))
        
        return modified_invoices, [], [], issues
    
    def _generate_tax_issues(
        self,
        contract: Contract,
        invoices: List[Invoice],
        config: DataQualityScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[UsageEvent], List[SnapshotMetadata], List[ExpectedIssue]]:
        """Generate tax scenarios (R120-R122)."""
        modified_invoices = []
        issues = []
        
        subtotal = Decimal("1000")
        expected_tax_rate = Decimal("0.08")  # 8%
        
        if config.type == DataQualityScenarioType.TAX_UNEXPECTED:
            # Tax on exempt customer
            tax = (subtotal * Decimal("0.05")).quantize(Decimal("0.01"))
            expected_tax = Decimal("0")
        elif config.type == DataQualityScenarioType.TAX_WRONG_RATE:
            # Wrong tax rate
            actual_rate = Decimal("0.12")  # 12% instead of 8%
            tax = (subtotal * actual_rate).quantize(Decimal("0.01"))
            expected_tax = (subtotal * expected_tax_rate).quantize(Decimal("0.01"))
        else:
            # Missing expected tax
            tax = Decimal("0")
            expected_tax = (subtotal * expected_tax_rate).quantize(Decimal("0.01"))
        
        invoice = Invoice(
            id=self._generate_id("inv"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            customer_id=contract.customer_id,
            contract_id=contract.id,
            external_id=str(uuid.uuid4()),
            invoice_number=f"INV-TAX-{random.randint(1000, 9999)}",
            invoice_date=as_of,
            due_date=as_of + timedelta(days=30),
            subtotal=subtotal,
            tax=tax,
            total=subtotal + tax,
            status=InvoiceStatus.OPEN,
            metadata={
                "_scenario": config.type.value,
                "_expected_tax_rate": float(expected_tax_rate),
            },
        )
        modified_invoices.append(invoice)
        
        rule_id = config.type.value.split("_")[0]
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id=rule_id,
            category="tax",
            severity="medium",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=expected_tax,
            actual_amount=tax,
            variance_pct=float((tax - expected_tax) / expected_tax * 100) if expected_tax else None,
            description=f"Tax issue: {config.edge_case_description}",
            edge_case_type=config.edge_case_description,
        ))
        
        return modified_invoices, [], [], issues
    
    def _generate_fx_issues(
        self,
        contract: Contract,
        invoices: List[Invoice],
        config: DataQualityScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[UsageEvent], List[SnapshotMetadata], List[ExpectedIssue]]:
        """Generate FX scenarios (R130-R132)."""
        modified_invoices = []
        issues = []
        
        reference_rate = Decimal("1.10")  # EUR/USD
        
        if config.type == DataQualityScenarioType.FX_RATE_DEVIATION:
            actual_rate = Decimal("1.20")  # > 5% deviation
        elif config.type == DataQualityScenarioType.FX_RATE_INCONSISTENT:
            actual_rate = Decimal("1.15")  # Different rate
        else:
            actual_rate = Decimal("1.25")  # Large gain/loss
        
        invoice = Invoice(
            id=self._generate_id("inv"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            customer_id=contract.customer_id,
            contract_id=contract.id,
            external_id=str(uuid.uuid4()),
            invoice_number=f"INV-FX-{random.randint(1000, 9999)}",
            invoice_date=as_of,
            due_date=as_of + timedelta(days=30),
            currency="EUR",
            subtotal=Decimal("1000"),
            total=Decimal("1000"),
            status=InvoiceStatus.OPEN,
            metadata={
                "_scenario": config.type.value,
                "_fx_rate_applied": float(actual_rate),
                "_fx_rate_reference": float(reference_rate),
            },
        )
        modified_invoices.append(invoice)
        
        rule_id = config.type.value.split("_")[0]
        deviation_pct = float((actual_rate - reference_rate) / reference_rate * 100)
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id=rule_id,
            category="fx",
            severity="medium",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=reference_rate,
            actual_amount=actual_rate,
            variance_pct=deviation_pct,
            description=f"FX issue: {config.edge_case_description} (deviation: {deviation_pct:.1f}%)",
            edge_case_type=config.edge_case_description,
        ))
        
        return modified_invoices, [], [], issues
    
    def _generate_usage_issues(
        self,
        contract: Contract,
        config: DataQualityScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[UsageEvent], List[SnapshotMetadata], List[ExpectedIssue]]:
        """Generate usage scenarios (R150-R154)."""
        usage_events = []
        issues = []
        
        if not contract.start_date:
            return [], [], [], []
        
        now = datetime.combine(as_of, datetime.min.time())
        
        if config.type == DataQualityScenarioType.USAGE_MISSING_PERIOD:
            # No usage for billing period - don't create any events
            pass
        elif config.type == DataQualityScenarioType.USAGE_LATE_EVENTS:
            # Usage after billing cutoff
            late_date = now + timedelta(hours=48)  # After cutoff
            usage_events.append(UsageEvent(
                id=self._generate_id("usage"),
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                customer_id=contract.customer_id,
                contract_id=contract.id,
                event_timestamp=late_date,
                metric_name="api_calls",
                quantity=Decimal("5000"),
                metadata={"_scenario": config.type.value, "_late": True},
            ))
        elif config.type == DataQualityScenarioType.USAGE_EXCEEDS_CAP:
            # Usage exceeds cap
            usage_events.append(UsageEvent(
                id=self._generate_id("usage"),
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                customer_id=contract.customer_id,
                contract_id=contract.id,
                event_timestamp=now - timedelta(hours=24),
                metric_name="api_calls",
                quantity=Decimal("150000"),  # Cap is 100000
                metadata={"_scenario": config.type.value, "_cap": 100000, "_exceeds_cap": True},
            ))
        elif config.type == DataQualityScenarioType.USAGE_OUTSIDE_TERM:
            # Usage before contract start
            usage_events.append(UsageEvent(
                id=self._generate_id("usage"),
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                customer_id=contract.customer_id,
                contract_id=contract.id,
                event_timestamp=datetime.combine(contract.start_date - timedelta(days=30), datetime.min.time()),
                metric_name="api_calls",
                quantity=Decimal("1000"),
                metadata={"_scenario": config.type.value, "_outside_term": True},
            ))
        else:
            # Usage rate mismatch
            usage_events.append(UsageEvent(
                id=self._generate_id("usage"),
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                customer_id=contract.customer_id,
                contract_id=contract.id,
                event_timestamp=now - timedelta(hours=24),
                metric_name="api_calls",
                quantity=Decimal("10000"),
                unit_price=Decimal("0.015"),  # Wrong rate
                metadata={"_scenario": config.type.value, "_expected_rate": 0.01},
            ))
        
        rule_id = config.type.value.split("_")[0]
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id=rule_id,
            category="usage",
            severity="high" if "cap" in config.type.value else "medium",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=None,
            customer_id=contract.customer_id,
            expected_amount=None,
            actual_amount=None,
            variance_pct=None,
            description=f"Usage issue: {config.edge_case_description}",
            edge_case_type=config.edge_case_description,
        ))
        
        return [], usage_events, [], issues
    
    def _generate_lifecycle_issues(
        self,
        contract: Contract,
        invoices: List[Invoice],
        config: DataQualityScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[UsageEvent], List[SnapshotMetadata], List[ExpectedIssue]]:
        """Generate lifecycle scenarios (R060-R064, R160-R161)."""
        modified_invoices = []
        issues = []
        
        if not contract.start_date or not contract.arr:
            return [], [], [], []
        
        arr = Decimal(str(contract.arr))
        monthly = (arr / 12).quantize(Decimal("0.01"))
        
        # Modify contract status based on scenario
        if config.type == DataQualityScenarioType.CANCELLED_STILL_BILLING:
            contract.status = ContractStatus.CANCELLED
            invoice_date = as_of
        elif config.type == DataQualityScenarioType.EXPIRED_ACTIVE_BILLING:
            contract.end_date = as_of - timedelta(days=30)
            invoice_date = as_of
        elif config.type == DataQualityScenarioType.AUTO_RENEW_NOT_REFLECTED:
            contract.auto_renew = True
            contract.end_date = as_of - timedelta(days=10)
            invoice_date = as_of - timedelta(days=5)
        elif config.type == DataQualityScenarioType.PAUSED_BUT_BILLING:
            contract.metadata["billing_hold"] = True
            invoice_date = as_of
        else:
            invoice_date = as_of
        
        invoice = Invoice(
            id=self._generate_id("inv"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            customer_id=contract.customer_id,
            contract_id=contract.id,
            external_id=str(uuid.uuid4()),
            invoice_number=f"INV-LC-{random.randint(1000, 9999)}",
            invoice_date=invoice_date,
            due_date=invoice_date + timedelta(days=30),
            subtotal=monthly,
            total=monthly,
            status=InvoiceStatus.OPEN,
            metadata={"_scenario": config.type.value},
        )
        modified_invoices.append(invoice)
        
        rule_id = config.type.value.split("_")[0]
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id=rule_id,
            category="lifecycle",
            severity="high",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=None,
            actual_amount=monthly,
            variance_pct=None,
            description=f"Lifecycle issue: {config.edge_case_description}",
            edge_case_type=config.edge_case_description,
        ))
        
        return modified_invoices, [], [], issues
    
    def _generate_multi_entity_issues(
        self,
        contract: Contract,
        invoices: List[Invoice],
        config: DataQualityScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[UsageEvent], List[SnapshotMetadata], List[ExpectedIssue]]:
        """Generate multi-entity scenarios (R170-R173)."""
        modified_invoices = []
        issues = []
        
        if not contract.arr:
            return [], [], [], []
        
        monthly = (Decimal(str(contract.arr)) / 12).quantize(Decimal("0.01"))
        
        # Create invoice with entity mismatch
        if config.type == DataQualityScenarioType.BILL_TO_SOLD_TO_MISMATCH:
            bill_to = "entity_billing_001"
            sold_to = "entity_sold_002"
        elif config.type == DataQualityScenarioType.SUBSIDIARY_INVOICE_ORPHAN:
            bill_to = "entity_subsidiary_orphan"
            sold_to = None
        else:
            bill_to = "entity_001"
            sold_to = "entity_001"
        
        invoice = Invoice(
            id=self._generate_id("inv"),
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            customer_id=contract.customer_id,
            contract_id=contract.id if config.type != DataQualityScenarioType.SUBSIDIARY_INVOICE_ORPHAN else None,
            external_id=str(uuid.uuid4()),
            invoice_number=f"INV-ME-{random.randint(1000, 9999)}",
            invoice_date=as_of,
            due_date=as_of + timedelta(days=30),
            subtotal=monthly,
            total=monthly,
            status=InvoiceStatus.OPEN,
            metadata={
                "_scenario": config.type.value,
                "_bill_to_entity": bill_to,
                "_sold_to_entity": sold_to,
            },
        )
        modified_invoices.append(invoice)
        
        rule_id = config.type.value.split("_")[0]
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id=rule_id,
            category="multi_entity",
            severity="medium",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=invoice.id,
            customer_id=contract.customer_id,
            expected_amount=None,
            actual_amount=None,
            variance_pct=None,
            description=f"Multi-entity issue: {config.edge_case_description}",
            edge_case_type=config.edge_case_description,
        ))
        
        return modified_invoices, [], [], issues
    
    def _generate_cross_snapshot_issues(
        self,
        contract: Contract,
        config: DataQualityScenarioConfig,
        as_of: date,
    ) -> tuple[List[Invoice], List[UsageEvent], List[SnapshotMetadata], List[ExpectedIssue]]:
        """Generate cross-snapshot scenarios (R080-R083)."""
        metadata = []
        issues = []
        
        now = datetime.combine(as_of, datetime.min.time())
        
        if config.type == DataQualityScenarioType.VALUE_CHANGE_NO_AMENDMENT:
            # TCV changed without amendment
            contract.metadata["_prior_arr"] = float(contract.arr or 0) * 0.9
            contract.metadata["_arr_changed_without_amendment"] = True
        
        # Create snapshot metadata
        metadata.append(SnapshotMetadata(
            snapshot_id=self.snapshot_id,
            tenant_id=self.tenant_id,
            created_at=now,
            record_counts={"contracts": 10, "invoices": 50},
        ))
        
        rule_id = config.type.value.split("_")[0]
        
        issues.append(ExpectedIssue(
            id=self._generate_issue_id(),
            rule_id=rule_id,
            category="cross_snapshot",
            severity="medium",
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=contract.id,
            invoice_id=None,
            customer_id=contract.customer_id,
            expected_amount=None,
            actual_amount=None,
            variance_pct=None,
            description=f"Cross-snapshot issue: {config.edge_case_description}",
            edge_case_type=config.edge_case_description,
        ))
        
        return [], [], metadata, issues
