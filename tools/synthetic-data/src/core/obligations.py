"""
Obligation identification ported from packages/revrec/src/obligations.ts

Identifies performance obligations from contract terms.
"""

from datetime import date
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from enum import Enum
from typing import Any, Optional

from ..models.revrec import (
    ObligationType,
    AllocationMethod,
    RecognitionMethod,
)


class IdentifiedObligation:
    """A performance obligation identified from a contract."""
    
    _counter = 0
    
    def __init__(
        self,
        obligation_type: ObligationType,
        description: str,
        transaction_price: Decimal,
        service_start_date: date,
        service_end_date: date,
        standalone_selling_price: Optional[Decimal] = None,
        source_term_ids: Optional[list[str]] = None,
        allocation_method: AllocationMethod = AllocationMethod.STRAIGHT_LINE,
        recognition_method: RecognitionMethod = RecognitionMethod.STRAIGHT_LINE,
    ):
        IdentifiedObligation._counter += 1
        self.id = f"obl_{IdentifiedObligation._counter:08d}"
        self.obligation_type = obligation_type
        self.description = description
        # Ensure transaction_price is always Decimal
        self.transaction_price = Decimal(str(transaction_price)) if transaction_price is not None else Decimal("0")
        self.standalone_selling_price = Decimal(str(standalone_selling_price)) if standalone_selling_price is not None else None
        self.service_start_date = service_start_date
        self.service_end_date = service_end_date
        self.source_term_ids = source_term_ids or []
        self.allocation_method = allocation_method
        self.recognition_method = recognition_method


# Term type to obligation mapping
TERM_TYPE_MAPPINGS: dict[str, dict[str, Any]] = {
    "contract_value": {
        "obligation_type": ObligationType.SUBSCRIPTION,
        "recognition_method": RecognitionMethod.STRAIGHT_LINE,
    },
    "billing_cadence": {
        "obligation_type": ObligationType.SUBSCRIPTION,
        "recognition_method": RecognitionMethod.STRAIGHT_LINE,
    },
    "term_length": {
        "obligation_type": ObligationType.SUBSCRIPTION,
        "recognition_method": RecognitionMethod.STRAIGHT_LINE,
    },
    "support_terms": {
        "obligation_type": ObligationType.SUPPORT,
        "recognition_method": RecognitionMethod.STRAIGHT_LINE,
    },
    "usage_terms": {
        "obligation_type": ObligationType.USAGE,
        "recognition_method": RecognitionMethod.USAGE_BASED,
    },
    "professional_services": {
        "obligation_type": ObligationType.PROFESSIONAL_SERVICES,
        "recognition_method": RecognitionMethod.MILESTONE,
    },
    "one_time_fee": {
        "obligation_type": ObligationType.ONE_TIME,
        "recognition_method": RecognitionMethod.AS_INVOICED,
    },
    "setup_fee": {
        "obligation_type": ObligationType.ONE_TIME,
        "recognition_method": RecognitionMethod.AS_INVOICED,
    },
    "implementation": {
        "obligation_type": ObligationType.PROFESSIONAL_SERVICES,
        "recognition_method": RecognitionMethod.MILESTONE,
    },
}


def identify_obligations(
    contract_id: str,
    start_date: Optional[date],
    end_date: Optional[date],
    arr: Optional[Decimal],
    terms: Optional[list[dict[str, Any]]] = None,
    contract_name: Optional[str] = None,
) -> list[IdentifiedObligation]:
    """
    Identify performance obligations from a contract and its terms.
    
    Port of identifyObligations() from obligations.ts
    
    Args:
        contract_id: Contract ID
        start_date: Service start date
        end_date: Service end date
        arr: Annual recurring revenue
        terms: List of contract terms
        contract_name: Optional contract name for descriptions
        
    Returns:
        List of identified obligations
    """
    # Validate dates
    service_start = start_date or date.today()
    service_end = end_date or (service_start + relativedelta(years=1))
    
    if service_end <= service_start:
        raise ValueError(
            f"Invalid contract dates: end date ({service_end}) "
            f"must be after start date ({service_start})"
        )
    
    # If no terms, create default obligation from ARR
    if not terms or len(terms) == 0:
        return _create_default_obligation(
            arr, service_start, service_end, contract_name
        )
    
    # Group terms by obligation type
    grouped_terms = _group_terms_by_obligation(terms)
    
    # Create obligations from grouped terms
    obligations = []
    for obligation_type, type_terms in grouped_terms.items():
        obligation = _create_obligation_from_terms(
            arr,
            obligation_type,
            type_terms,
            service_start,
            service_end,
            contract_name,
        )
        if obligation:
            obligations.append(obligation)
    
    # If no obligations were created, fall back to default
    if not obligations:
        return _create_default_obligation(
            arr, service_start, service_end, contract_name
        )
    
    return obligations


def _create_default_obligation(
    arr: Optional[Decimal],
    service_start: date,
    service_end: date,
    contract_name: Optional[str],
) -> list[IdentifiedObligation]:
    """Create a default subscription obligation when no terms are found."""
    transaction_price = arr or Decimal("0")
    
    if transaction_price <= 0:
        return []
    
    return [
        IdentifiedObligation(
            obligation_type=ObligationType.SUBSCRIPTION,
            description=_generate_description(
                ObligationType.SUBSCRIPTION, contract_name
            ),
            transaction_price=transaction_price,
            service_start_date=service_start,
            service_end_date=service_end,
            allocation_method=AllocationMethod.STRAIGHT_LINE,
            recognition_method=RecognitionMethod.STRAIGHT_LINE,
        )
    ]


def _group_terms_by_obligation(
    terms: list[dict[str, Any]]
) -> dict[ObligationType, list[dict[str, Any]]]:
    """Group terms by their obligation type."""
    groups: dict[ObligationType, list[dict[str, Any]]] = {}
    
    for term in terms:
        term_type = term.get("term_type", "")
        mapping = TERM_TYPE_MAPPINGS.get(term_type)
        
        if mapping:
            obl_type = mapping["obligation_type"]
            if obl_type not in groups:
                groups[obl_type] = []
            groups[obl_type].append(term)
    
    return groups


def _create_obligation_from_terms(
    arr: Optional[Decimal],
    obligation_type: ObligationType,
    terms: list[dict[str, Any]],
    service_start: date,
    service_end: date,
    contract_name: Optional[str],
) -> Optional[IdentifiedObligation]:
    """Create an obligation from a group of terms."""
    # Find transaction price from terms
    transaction_price = Decimal("0")
    
    for term in terms:
        if term.get("term_type") == "contract_value":
            value = _parse_contract_value(term.get("value"))
            if value is not None:
                transaction_price = value
    
    # Fall back to ARR
    if transaction_price <= 0 and arr:
        transaction_price = arr
    
    # Skip zero-value obligations
    if transaction_price <= 0:
        return None
    
    # Get recognition method
    recognition_method = _get_recognition_method(obligation_type, terms)
    
    return IdentifiedObligation(
        obligation_type=obligation_type,
        description=_generate_description(obligation_type, contract_name),
        transaction_price=transaction_price,
        service_start_date=service_start,
        service_end_date=service_end,
        source_term_ids=[t.get("id", "") for t in terms if t.get("id")],
        allocation_method=AllocationMethod.STRAIGHT_LINE,
        recognition_method=recognition_method,
    )


def _parse_contract_value(value: Any) -> Optional[Decimal]:
    """Parse a contract value from term value."""
    if isinstance(value, (int, float)):
        return Decimal(str(value))
    
    if isinstance(value, str):
        cleaned = value.replace("$", "").replace(",", "").strip()
        try:
            return Decimal(cleaned)
        except:
            return None
    
    if isinstance(value, dict):
        for key in ("amount", "value"):
            if key in value:
                v = value[key]
                if isinstance(v, (int, float)):
                    return Decimal(str(v))
    
    return None


def _generate_description(
    obligation_type: ObligationType,
    contract_name: Optional[str],
) -> str:
    """Generate a human-readable description for an obligation."""
    prefix = f"{contract_name} - " if contract_name else ""
    
    descriptions = {
        ObligationType.SUBSCRIPTION: "Subscription Service",
        ObligationType.USAGE: "Usage-Based Service",
        ObligationType.ONE_TIME: "One-Time Fee",
        ObligationType.PROFESSIONAL_SERVICES: "Professional Services",
        ObligationType.SUPPORT: "Support Services",
    }
    
    return f"{prefix}{descriptions.get(obligation_type, 'Service')}"


def _get_recognition_method(
    obligation_type: ObligationType,
    terms: list[dict[str, Any]],
) -> RecognitionMethod:
    """Determine recognition method based on obligation type and terms."""
    # Check if any term specifies a recognition method
    for term in terms:
        term_type = term.get("term_type", "")
        mapping = TERM_TYPE_MAPPINGS.get(term_type)
        if mapping:
            return mapping["recognition_method"]
    
    # Default based on obligation type
    defaults = {
        ObligationType.SUBSCRIPTION: RecognitionMethod.STRAIGHT_LINE,
        ObligationType.SUPPORT: RecognitionMethod.STRAIGHT_LINE,
        ObligationType.USAGE: RecognitionMethod.USAGE_BASED,
        ObligationType.PROFESSIONAL_SERVICES: RecognitionMethod.MILESTONE,
        ObligationType.ONE_TIME: RecognitionMethod.AS_INVOICED,
    }
    
    return defaults.get(obligation_type, RecognitionMethod.STRAIGHT_LINE)
