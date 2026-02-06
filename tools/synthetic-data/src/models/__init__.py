"""
Pydantic models matching Cogtics schemas.
"""

from .contracts import (
    Contract,
    ContractVersion,
    ContractTerm,
    ContractClause,
    ContractStatus,
    BillingFrequency,
    TermType,
)
from .invoices import Invoice, InvoiceLine, InvoiceStatus
from .customers import Customer, CustomerStatus
from .revrec import (
    RevenueObligation,
    RevenueAllocation,
    RevenueSchedule,
    RecognitionEvent,
    DeferredBalance,
    ObligationType,
    AllocationMethod,
    RecognitionMethod,
    ScheduleStatus,
)
from .contract_terms import (
    ContractTermsCollection,
    ContractTermsGenerator,
    QuantityTerm,
    UnitPriceTerm,
    DiscountTerm,
    UpliftTerm,
    RampScheduleTerm,
    UsageCapTerm,
    BillingCadenceTerm,
    RenewalTerm,
    PaymentTerm,
    TaxExemptionTerm,
    EntityTerm,
)
from .usage import UsageRecord, UsageEvent, UsageSummary

__all__ = [
    # Contracts
    "Contract",
    "ContractVersion",
    "ContractTerm",
    "ContractClause",
    "ContractStatus",
    "BillingFrequency",
    "TermType",
    # Invoices
    "Invoice",
    "InvoiceLine",
    "InvoiceStatus",
    # Customers
    "Customer",
    "CustomerStatus",
    # RevRec
    "RevenueObligation",
    "RevenueAllocation",
    "RevenueSchedule",
    "RecognitionEvent",
    "DeferredBalance",
    "ObligationType",
    "AllocationMethod",
    "RecognitionMethod",
    "ScheduleStatus",
    # Contract Terms
    "ContractTermsCollection",
    "ContractTermsGenerator",
    "QuantityTerm",
    "UnitPriceTerm",
    "DiscountTerm",
    "UpliftTerm",
    "RampScheduleTerm",
    "UsageCapTerm",
    "BillingCadenceTerm",
    "RenewalTerm",
    "PaymentTerm",
    "TaxExemptionTerm",
    "EntityTerm",
    # Usage
    "UsageRecord",
    "UsageEvent",
    "UsageSummary",
]
