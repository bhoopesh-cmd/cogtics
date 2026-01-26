"""
Contract models matching Cogtics schemas.
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class ContractStatus(str, Enum):
    """Contract status values."""
    DRAFT = "draft"
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    RENEWED = "renewed"


class BillingFrequency(str, Enum):
    """Billing frequency options."""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUALLY = "annually"
    ONE_TIME = "one_time"


class TermType(str, Enum):
    """Contract term types."""
    PRICING_MODEL = "pricing_model"
    BILLING_CADENCE = "billing_cadence"
    DISCOUNT = "discount"
    RENEWAL_TERMS = "renewal_terms"
    TERMINATION_TERMS = "termination_terms"
    USAGE_CAPS = "usage_caps"
    PAYMENT_TERMS = "payment_terms"
    UPLIFT = "uplift"
    AUTO_RENEW = "auto_renew"
    NOTICE_PERIOD = "notice_period"
    CONTRACT_VALUE = "contract_value"
    START_DATE = "start_date"
    END_DATE = "end_date"
    TERM_LENGTH = "term_length"
    UNIT_PRICE = "unit_price"
    QUANTITY = "quantity"
    SEATS = "seats"
    LICENSES = "licenses"


class ClauseType(str, Enum):
    """Contract clause types."""
    HEADING = "heading"
    SECTION = "section"
    PARAGRAPH = "paragraph"
    LIST_ITEM = "list_item"


class ContractTerm(BaseModel):
    """A single extracted contract term."""
    id: str
    tenant_id: str
    snapshot_id: str
    contract_version_id: str
    term_type: TermType
    value: Any
    confidence: float = Field(ge=0, le=100)
    source_clause: Optional[str] = None
    source_page: Optional[int] = None
    extraction_method: str = "rule"  # 'rule' | 'pattern' | 'llm'
    matched_text: Optional[str] = None
    start_offset: Optional[int] = None
    end_offset: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True


class ContractClause(BaseModel):
    """A clause extracted from a contract document."""
    id: str
    tenant_id: str
    snapshot_id: str
    contract_version_id: str
    document_id: Optional[str] = None
    clause_type: ClauseType
    clause_label: Optional[str] = None
    text: str
    start_offset: Optional[int] = None
    end_offset: Optional[int] = None
    page_number: Optional[int] = None
    sequence_number: int = 0
    parent_clause_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True


class ContractVersion(BaseModel):
    """A specific version of a contract."""
    id: str
    tenant_id: str
    snapshot_id: str
    contract_id: str
    version: int = 1
    effective_date: Optional[date] = None
    source: Optional[dict] = None
    changes: Optional[dict] = None
    terms: list[ContractTerm] = Field(default_factory=list)
    clauses: list[ContractClause] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Contract(BaseModel):
    """Main contract entity matching Cogtics canonical schema."""
    id: str
    tenant_id: str
    snapshot_id: str
    customer_id: Optional[str] = None
    external_id: str
    external_ids: dict[str, str] = Field(default_factory=dict)
    name: Optional[str] = None
    status: ContractStatus = ContractStatus.ACTIVE
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    arr: Optional[Decimal] = None
    currency: str = "USD"
    billing_frequency: Optional[BillingFrequency] = None
    auto_renew: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)
    source_system: str = "synthetic"
    source_batch_id: Optional[str] = None
    source_record_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Nested relations
    versions: list[ContractVersion] = Field(default_factory=list)

    class Config:
        use_enum_values = True

    def get_current_version(self) -> Optional[ContractVersion]:
        """Get the most recent contract version."""
        if not self.versions:
            return None
        return max(self.versions, key=lambda v: v.version)

    def get_terms(self) -> list[ContractTerm]:
        """Get all terms from current version."""
        version = self.get_current_version()
        return version.terms if version else []
