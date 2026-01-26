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
]
