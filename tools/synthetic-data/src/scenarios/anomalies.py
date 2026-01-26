"""
Data quality anomaly generators.

Creates realistic data quality issues for testing normalization
and validation pipelines.
"""

import random
import string
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Any, Optional, TypeVar, Callable

from pydantic import BaseModel


class AnomalyType(str, Enum):
    """Types of data quality anomalies."""
    # Duplicate issues
    DUPLICATE_RECORD = "duplicate_record"
    NEAR_DUPLICATE = "near_duplicate"  # Same entity, slightly different
    
    # Missing data
    NULL_REQUIRED_FIELD = "null_required_field"
    EMPTY_STRING = "empty_string"
    MISSING_RELATIONSHIP = "missing_relationship"  # FK to nothing
    
    # Invalid data
    INVALID_EMAIL = "invalid_email"
    INVALID_DATE = "invalid_date"
    NEGATIVE_AMOUNT = "negative_amount"
    IMPOSSIBLE_DATE_RANGE = "impossible_date_range"  # End before start
    FUTURE_DATE = "future_date"  # Date in future when shouldn't be
    
    # Format issues
    ENCODING_ERROR = "encoding_error"  # UTF-8 problems
    EXTRA_WHITESPACE = "extra_whitespace"
    INCONSISTENT_CASE = "inconsistent_case"
    SPECIAL_CHARACTERS = "special_characters"
    
    # Status issues
    STALE_STATUS = "stale_status"  # Paid invoice still "open"
    ORPHAN_RECORD = "orphan_record"  # No parent relationship
    CIRCULAR_REFERENCE = "circular_reference"
    
    # Temporal issues
    OUT_OF_ORDER = "out_of_order"  # Events not in sequence
    TIMEZONE_MISMATCH = "timezone_mismatch"
    
    # Numeric issues
    PRECISION_ERROR = "precision_error"  # Too many decimal places
    CURRENCY_MISMATCH = "currency_mismatch"


@dataclass
class AnomalyConfig:
    """Configuration for an anomaly type."""
    type: AnomalyType
    probability: float = 0.05
    fields: list[str] = None  # Fields to apply to
    severity: str = "medium"


# Default anomaly configurations
DEFAULT_ANOMALIES = {
    "duplicate": AnomalyConfig(
        type=AnomalyType.DUPLICATE_RECORD,
        probability=0.03,
    ),
    "near_duplicate": AnomalyConfig(
        type=AnomalyType.NEAR_DUPLICATE,
        probability=0.05,
    ),
    "null_field": AnomalyConfig(
        type=AnomalyType.NULL_REQUIRED_FIELD,
        probability=0.03,
        fields=["email", "name", "customer_id"],
    ),
    "empty_string": AnomalyConfig(
        type=AnomalyType.EMPTY_STRING,
        probability=0.04,
        fields=["name", "description", "invoice_number"],
    ),
    "invalid_email": AnomalyConfig(
        type=AnomalyType.INVALID_EMAIL,
        probability=0.05,
    ),
    "invalid_date_range": AnomalyConfig(
        type=AnomalyType.IMPOSSIBLE_DATE_RANGE,
        probability=0.02,
    ),
    "whitespace": AnomalyConfig(
        type=AnomalyType.EXTRA_WHITESPACE,
        probability=0.08,
    ),
    "case_issues": AnomalyConfig(
        type=AnomalyType.INCONSISTENT_CASE,
        probability=0.10,
    ),
    "stale_status": AnomalyConfig(
        type=AnomalyType.STALE_STATUS,
        probability=0.05,
    ),
    "orphan": AnomalyConfig(
        type=AnomalyType.ORPHAN_RECORD,
        probability=0.02,
    ),
    "negative_amount": AnomalyConfig(
        type=AnomalyType.NEGATIVE_AMOUNT,
        probability=0.01,
    ),
    "precision": AnomalyConfig(
        type=AnomalyType.PRECISION_ERROR,
        probability=0.03,
    ),
}


T = TypeVar('T')


class AnomalyGenerator:
    """
    Generates and injects data quality anomalies.
    """
    
    def __init__(
        self,
        configs: Optional[dict[str, AnomalyConfig]] = None,
        seed: Optional[int] = None,
    ):
        """Initialize the anomaly generator."""
        self.configs = configs or DEFAULT_ANOMALIES
        if seed is not None:
            random.seed(seed)
        
        self.anomaly_log: list[dict[str, Any]] = []
    
    def inject(
        self,
        record: T,
        record_type: str = "unknown",
    ) -> T:
        """
        Inject anomalies into a record.
        
        Args:
            record: Record to inject anomalies into
            record_type: Type of record for logging
            
        Returns:
            Potentially modified record
        """
        for config_name, config in self.configs.items():
            if random.random() < config.probability:
                record = self._apply_anomaly(record, config, record_type)
        
        return record
    
    def inject_batch(
        self,
        records: list[T],
        record_type: str = "unknown",
    ) -> list[T]:
        """Inject anomalies into a batch of records."""
        result = []
        for record in records:
            result.append(self.inject(record, record_type))
        return result
    
    def _apply_anomaly(
        self,
        record: T,
        config: AnomalyConfig,
        record_type: str,
    ) -> T:
        """Apply a specific anomaly to a record."""
        anomaly_type = config.type
        applied = False
        details = {"type": anomaly_type.value, "record_type": record_type}
        
        # Handle dict records
        if isinstance(record, dict):
            record, applied, details = self._apply_to_dict(record, config, details)
        
        # Handle Pydantic models
        elif isinstance(record, BaseModel):
            data = record.model_dump()
            data, applied, details = self._apply_to_dict(data, config, details)
            if applied:
                try:
                    record = record.__class__(**data)
                except:
                    pass  # Validation failed, return original
        
        if applied:
            details["applied"] = True
            if hasattr(record, 'id'):
                details["record_id"] = record.id if isinstance(record, BaseModel) else record.get("id")
            self.anomaly_log.append(details)
        
        return record
    
    def _apply_to_dict(
        self,
        data: dict,
        config: AnomalyConfig,
        details: dict,
    ) -> tuple[dict, bool, dict]:
        """Apply anomaly to a dictionary."""
        anomaly_type = config.type
        fields = config.fields or list(data.keys())
        
        if anomaly_type == AnomalyType.NULL_REQUIRED_FIELD:
            field = self._pick_field(data, fields)
            if field:
                details["field"] = field
                details["original_value"] = data[field]
                data[field] = None
                return data, True, details
        
        elif anomaly_type == AnomalyType.EMPTY_STRING:
            field = self._pick_string_field(data, fields)
            if field:
                details["field"] = field
                details["original_value"] = data[field]
                data[field] = ""
                return data, True, details
        
        elif anomaly_type == AnomalyType.INVALID_EMAIL:
            if "email" in data and data["email"]:
                details["original_email"] = data["email"]
                data["email"] = self._corrupt_email(data["email"])
                details["new_email"] = data["email"]
                return data, True, details
        
        elif anomaly_type == AnomalyType.EXTRA_WHITESPACE:
            field = self._pick_string_field(data, fields)
            if field and data[field]:
                original = data[field]
                data[field] = self._add_whitespace(str(data[field]))
                details["field"] = field
                details["original"] = original
                return data, True, details
        
        elif anomaly_type == AnomalyType.INCONSISTENT_CASE:
            field = self._pick_string_field(data, fields)
            if field and data[field]:
                original = data[field]
                data[field] = self._randomize_case(str(data[field]))
                details["field"] = field
                details["original"] = original
                return data, True, details
        
        elif anomaly_type == AnomalyType.IMPOSSIBLE_DATE_RANGE:
            if "start_date" in data and "end_date" in data:
                # Swap dates so end < start
                if data["start_date"] and data["end_date"]:
                    details["original_start"] = str(data["start_date"])
                    details["original_end"] = str(data["end_date"])
                    data["start_date"], data["end_date"] = data["end_date"], data["start_date"]
                    return data, True, details
        
        elif anomaly_type == AnomalyType.STALE_STATUS:
            # For invoices: paid but status is open
            if "status" in data and "amount_paid" in data:
                if data.get("status") == "paid":
                    details["original_status"] = data["status"]
                    data["status"] = "open"
                    return data, True, details
        
        elif anomaly_type == AnomalyType.NEGATIVE_AMOUNT:
            amount_fields = ["total", "amount", "arr", "subtotal"]
            for field in amount_fields:
                if field in data and data[field]:
                    try:
                        val = Decimal(str(data[field]))
                        if val > 0:
                            details["field"] = field
                            details["original"] = float(val)
                            data[field] = -val
                            return data, True, details
                    except:
                        pass
        
        elif anomaly_type == AnomalyType.ORPHAN_RECORD:
            fk_fields = ["customer_id", "contract_id", "invoice_id", "product_id"]
            for field in fk_fields:
                if field in data and data[field]:
                    details["field"] = field
                    details["original"] = data[field]
                    data[field] = f"orphan_{random.randint(100000, 999999)}"
                    return data, True, details
        
        elif anomaly_type == AnomalyType.PRECISION_ERROR:
            amount_fields = ["total", "amount", "arr", "subtotal", "unit_price"]
            for field in amount_fields:
                if field in data and data[field]:
                    try:
                        val = float(data[field])
                        # Add excessive precision
                        data[field] = Decimal(str(val + 0.000000123456789))
                        details["field"] = field
                        return data, True, details
                    except:
                        pass
        
        return data, False, details
    
    def _pick_field(self, data: dict, fields: list[str]) -> Optional[str]:
        """Pick a field that exists and has a value."""
        available = [f for f in fields if f in data and data[f] is not None]
        return random.choice(available) if available else None
    
    def _pick_string_field(self, data: dict, fields: list[str]) -> Optional[str]:
        """Pick a string field."""
        available = [
            f for f in fields 
            if f in data and isinstance(data[f], str) and data[f]
        ]
        return random.choice(available) if available else None
    
    def _corrupt_email(self, email: str) -> str:
        """Corrupt an email address."""
        corruptions = [
            lambda e: e.replace("@", ""),  # Remove @
            lambda e: e.replace(".", ""),  # Remove dots
            lambda e: e + "..com",  # Double extension
            lambda e: "@" + e,  # Leading @
            lambda e: e.replace("@", "@@"),  # Double @
            lambda e: "not_an_email",  # Plain text
        ]
        return random.choice(corruptions)(email)
    
    def _add_whitespace(self, text: str) -> str:
        """Add problematic whitespace."""
        options = [
            f"  {text}",  # Leading
            f"{text}  ",  # Trailing
            f"  {text}  ",  # Both
            text.replace(" ", "  "),  # Double spaces
            f"\t{text}",  # Tab
            f"{text}\n",  # Newline
        ]
        return random.choice(options)
    
    def _randomize_case(self, text: str) -> str:
        """Randomize case in text."""
        options = [
            text.upper(),
            text.lower(),
            text.title(),
            "".join(c.upper() if random.random() > 0.5 else c.lower() for c in text),
        ]
        return random.choice(options)
    
    def get_log(self) -> list[dict[str, Any]]:
        """Get the anomaly log."""
        return self.anomaly_log
    
    def clear_log(self) -> None:
        """Clear the anomaly log."""
        self.anomaly_log = []


def inject_anomalies(
    records: list[Any],
    record_type: str = "unknown",
    configs: Optional[dict[str, AnomalyConfig]] = None,
) -> tuple[list[Any], list[dict[str, Any]]]:
    """
    Convenience function to inject anomalies.
    
    Args:
        records: Records to inject into
        record_type: Type name for logging
        configs: Anomaly configurations
        
    Returns:
        Tuple of (modified records, anomaly log)
    """
    generator = AnomalyGenerator(configs)
    result = generator.inject_batch(records, record_type)
    return result, generator.get_log()
