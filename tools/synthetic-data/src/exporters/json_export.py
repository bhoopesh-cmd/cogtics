"""
JSON exporter for synthetic data.
"""

import json
import logging
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Optional, Union

from pydantic import BaseModel

from ..config import config

logger = logging.getLogger(__name__)


class JSONEncoder(json.JSONEncoder):
    """Custom JSON encoder for Pydantic models and special types."""
    
    def default(self, obj: Any) -> Any:
        if isinstance(obj, BaseModel):
            return obj.model_dump()
        if isinstance(obj, Decimal):
            # Round to 2 decimal places for currency precision
            return float(obj.quantize(Decimal("0.01")))
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        if hasattr(obj, "__dict__"):
            return obj.__dict__
        return super().default(obj)


class JSONExporter:
    """
    Exports synthetic data to JSON format.
    """
    
    def __init__(self, output_dir: Optional[Path] = None):
        """
        Initialize the JSON exporter.
        
        Args:
            output_dir: Directory to save JSON files
        """
        self.output_dir = output_dir or config.get_output_path("data")
    
    def export(
        self,
        data: Union[list[Any], dict[str, Any], BaseModel],
        filename: str,
        pretty: bool = True,
    ) -> str:
        """
        Export data to JSON file.
        
        Args:
            data: Data to export (models, dicts, or lists)
            filename: Output filename (with or without .json extension)
            pretty: Whether to format with indentation
            
        Returns:
            Path to exported file
        """
        # Ensure .json extension
        if not filename.endswith(".json"):
            filename += ".json"
        
        output_path = self.output_dir / filename
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Convert to JSON
        indent = 2 if pretty else None
        json_str = json.dumps(data, cls=JSONEncoder, indent=indent)
        
        # Write to file
        output_path.write_text(json_str, encoding="utf-8")
        
        logger.info(f"Exported JSON: {output_path}")
        return str(output_path)
    
    def export_contracts(
        self,
        contracts: list[Any],
        filename: str = "contracts.json",
    ) -> str:
        """Export contracts to JSON."""
        return self.export(contracts, filename)
    
    def export_invoices(
        self,
        invoices: list[Any],
        filename: str = "invoices.json",
    ) -> str:
        """Export invoices to JSON."""
        return self.export(invoices, filename)
    
    def export_customers(
        self,
        customers: list[Any],
        filename: str = "customers.json",
    ) -> str:
        """Export customers to JSON."""
        return self.export(customers, filename)
    
    def export_revrec(
        self,
        obligations: list[Any],
        schedules: list[Any],
        events: list[Any],
        balances: list[Any],
        filename: str = "revrec.json",
    ) -> str:
        """Export revenue recognition data to JSON."""
        data = {
            "obligations": obligations,
            "schedules": schedules,
            "events": events,
            "balances": balances,
        }
        return self.export(data, filename)
    
    def export_full_dataset(
        self,
        contracts: list[Any],
        invoices: list[Any],
        customers: list[Any],
        revrec: dict[str, list[Any]],
        filename: str = "full_dataset.json",
    ) -> str:
        """Export complete dataset to a single JSON file."""
        data = {
            "contracts": contracts,
            "invoices": invoices,
            "customers": customers,
            "revenue_recognition": revrec,
            "metadata": {
                "generated_at": datetime.utcnow().isoformat(),
                "generator": "cogtics-synthetic-data",
                "version": "0.1.0",
            },
        }
        return self.export(data, filename)
    
    def load(self, filename: str) -> Any:
        """
        Load data from JSON file.
        
        Args:
            filename: Filename to load
            
        Returns:
            Loaded data
        """
        if not filename.endswith(".json"):
            filename += ".json"
        
        input_path = self.output_dir / filename
        
        if not input_path.exists():
            raise FileNotFoundError(f"File not found: {input_path}")
        
        return json.loads(input_path.read_text(encoding="utf-8"))
