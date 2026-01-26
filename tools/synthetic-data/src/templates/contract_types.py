"""
Contract type definitions and mappings.
"""

from enum import Enum
from typing import Any


class ContractType(str, Enum):
    """Types of contracts we generate."""
    MSA = "msa"  # Master Service Agreement
    ORDER_FORM = "order_form"  # Order Form / Quote
    SOW = "sow"  # Statement of Work
    AMENDMENT = "amendment"  # Contract Amendment
    LICENSE = "license"  # Software License Agreement
    NDA = "nda"  # Non-Disclosure Agreement
    SAAS = "saas"  # SaaS Subscription Agreement


# Mapping of contract types to CUAD document categories
CONTRACT_TYPE_MAPPINGS: dict[ContractType, list[str]] = {
    ContractType.MSA: [
        "Master Agreement",
        "Master Services Agreement",
        "Framework Agreement",
        "General Terms",
    ],
    ContractType.ORDER_FORM: [
        "Order Form",
        "Purchase Order",
        "Quote",
        "Sales Order",
    ],
    ContractType.SOW: [
        "Statement of Work",
        "SOW",
        "Work Order",
        "Project Agreement",
    ],
    ContractType.AMENDMENT: [
        "Amendment",
        "Addendum",
        "Modification",
        "Change Order",
    ],
    ContractType.LICENSE: [
        "License Agreement",
        "Software License",
        "End User License",
        "EULA",
    ],
    ContractType.NDA: [
        "Non-Disclosure Agreement",
        "NDA",
        "Confidentiality Agreement",
    ],
    ContractType.SAAS: [
        "SaaS Agreement",
        "Subscription Agreement",
        "Cloud Services Agreement",
        "Software as a Service",
    ],
}


# Required clauses for each contract type
REQUIRED_CLAUSES: dict[ContractType, list[str]] = {
    ContractType.MSA: [
        "Parties",
        "Agreement_Date",
        "Effective_Date",
        "Term",
        "Payment_Terms",
        "Termination",
        "Governing_Law",
        "Limitation_Of_Liability",
        "Indemnification",
    ],
    ContractType.ORDER_FORM: [
        "Parties",
        "Agreement_Date",
        "Products_Services",
        "Pricing",
        "Payment_Terms",
        "Term",
    ],
    ContractType.SOW: [
        "Parties",
        "Scope_Of_Work",
        "Deliverables",
        "Timeline",
        "Pricing",
        "Acceptance_Criteria",
    ],
    ContractType.AMENDMENT: [
        "Parties",
        "Original_Agreement",
        "Amendment_Date",
        "Changes",
        "Effective_Date",
    ],
    ContractType.LICENSE: [
        "Parties",
        "License_Grant",
        "Restrictions",
        "Term",
        "Fees",
        "Termination",
        "IP_Rights",
    ],
    ContractType.NDA: [
        "Parties",
        "Definition_Of_Confidential",
        "Obligations",
        "Term",
        "Exclusions",
    ],
    ContractType.SAAS: [
        "Parties",
        "Service_Description",
        "Subscription_Term",
        "Fees",
        "Payment_Terms",
        "SLA",
        "Data_Protection",
        "Termination",
    ],
}


# Default contract structure templates
DEFAULT_STRUCTURE: dict[ContractType, list[dict[str, Any]]] = {
    ContractType.MSA: [
        {"section": "1", "title": "Definitions", "type": "heading"},
        {"section": "2", "title": "Services", "type": "heading"},
        {"section": "3", "title": "Fees and Payment", "type": "heading"},
        {"section": "4", "title": "Term and Termination", "type": "heading"},
        {"section": "5", "title": "Confidentiality", "type": "heading"},
        {"section": "6", "title": "Intellectual Property", "type": "heading"},
        {"section": "7", "title": "Warranties", "type": "heading"},
        {"section": "8", "title": "Limitation of Liability", "type": "heading"},
        {"section": "9", "title": "Indemnification", "type": "heading"},
        {"section": "10", "title": "General Provisions", "type": "heading"},
    ],
    ContractType.ORDER_FORM: [
        {"section": "1", "title": "Order Details", "type": "heading"},
        {"section": "2", "title": "Products/Services", "type": "heading"},
        {"section": "3", "title": "Pricing", "type": "heading"},
        {"section": "4", "title": "Payment Terms", "type": "heading"},
        {"section": "5", "title": "Term", "type": "heading"},
        {"section": "6", "title": "Signatures", "type": "heading"},
    ],
    ContractType.SOW: [
        {"section": "1", "title": "Background", "type": "heading"},
        {"section": "2", "title": "Scope of Work", "type": "heading"},
        {"section": "3", "title": "Deliverables", "type": "heading"},
        {"section": "4", "title": "Timeline and Milestones", "type": "heading"},
        {"section": "5", "title": "Fees and Expenses", "type": "heading"},
        {"section": "6", "title": "Acceptance Criteria", "type": "heading"},
        {"section": "7", "title": "Project Management", "type": "heading"},
    ],
    ContractType.AMENDMENT: [
        {"section": "1", "title": "Reference to Original Agreement", "type": "heading"},
        {"section": "2", "title": "Amendments", "type": "heading"},
        {"section": "3", "title": "Effective Date", "type": "heading"},
        {"section": "4", "title": "Ratification", "type": "heading"},
    ],
}
