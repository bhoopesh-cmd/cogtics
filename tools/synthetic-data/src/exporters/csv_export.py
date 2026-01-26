"""
CSV exporter for synthetic data.
"""

import csv
import logging
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Optional, Union

import pandas as pd
from pydantic import BaseModel

from ..config import config

logger = logging.getLogger(__name__)


class CSVExporter:
    """
    Exports synthetic data to CSV format.
    """
    
    def __init__(self, output_dir: Optional[Path] = None):
        """
        Initialize the CSV exporter.
        
        Args:
            output_dir: Directory to save CSV files
        """
        self.output_dir = output_dir or config.get_output_path("data")
    
    def export(
        self,
        data: Union[list[Any], pd.DataFrame],
        filename: str,
    ) -> str:
        """
        Export data to CSV file.
        
        Args:
            data: Data to export (list of models/dicts or DataFrame)
            filename: Output filename (with or without .csv extension)
            
        Returns:
            Path to exported file
        """
        # Ensure .csv extension
        if not filename.endswith(".csv"):
            filename += ".csv"
        
        output_path = self.output_dir / filename
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Convert to DataFrame if needed
        if isinstance(data, pd.DataFrame):
            df = data
        else:
            df = self._to_dataframe(data)
        
        # Write to CSV
        df.to_csv(output_path, index=False)
        
        logger.info(f"Exported CSV: {output_path} ({len(df)} rows)")
        return str(output_path)
    
    def _to_dataframe(self, data: list[Any]) -> pd.DataFrame:
        """Convert list of objects to DataFrame."""
        if not data:
            return pd.DataFrame()
        
        # Convert objects to dicts
        rows = []
        for item in data:
            if isinstance(item, BaseModel):
                row = item.model_dump()
            elif hasattr(item, "__dict__"):
                row = item.__dict__.copy()
            elif isinstance(item, dict):
                row = item.copy()
            else:
                continue
            
            # Flatten nested dicts and convert special types
            flat_row = self._flatten_dict(row)
            rows.append(flat_row)
        
        return pd.DataFrame(rows)
    
    def _flatten_dict(
        self,
        d: dict[str, Any],
        parent_key: str = "",
        sep: str = "_",
    ) -> dict[str, Any]:
        """Flatten nested dictionary."""
        items = []
        
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            
            if isinstance(v, dict):
                items.extend(
                    self._flatten_dict(v, new_key, sep).items()
                )
            elif isinstance(v, list):
                # Convert lists to JSON string with custom encoder for dates
                import json
                
                def default_encoder(obj):
                    if isinstance(obj, (date, datetime)):
                        return obj.isoformat()
                    if isinstance(obj, Decimal):
                        # Round to 2 decimal places for currency precision
                        return float(obj.quantize(Decimal("0.01")))
                    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")
                
                items.append((new_key, json.dumps(v, default=default_encoder)))
            elif isinstance(v, (date, datetime)):
                items.append((new_key, v.isoformat()))
            elif isinstance(v, Decimal):
                # Round to 2 decimal places for currency precision
                items.append((new_key, float(v.quantize(Decimal("0.01")))))
            else:
                items.append((new_key, v))
        
        return dict(items)
    
    def export_contracts(
        self,
        contracts: list[Any],
        filename: str = "contracts.csv",
    ) -> str:
        """Export contracts to CSV."""
        return self.export(contracts, filename)
    
    def export_invoices(
        self,
        invoices: list[Any],
        filename: str = "invoices.csv",
    ) -> str:
        """Export invoices to CSV."""
        return self.export(invoices, filename)
    
    def export_invoice_lines(
        self,
        lines: list[Any],
        filename: str = "invoice_lines.csv",
    ) -> str:
        """Export invoice lines to CSV."""
        return self.export(lines, filename)
    
    def export_customers(
        self,
        customers: list[Any],
        filename: str = "customers.csv",
    ) -> str:
        """Export customers to CSV."""
        return self.export(customers, filename)
    
    def export_obligations(
        self,
        obligations: list[Any],
        filename: str = "revenue_obligations.csv",
    ) -> str:
        """Export revenue obligations to CSV."""
        return self.export(obligations, filename)
    
    def export_schedules(
        self,
        schedules: list[Any],
        filename: str = "revenue_schedules.csv",
    ) -> str:
        """Export revenue schedules to CSV."""
        return self.export(schedules, filename)
    
    def export_all(
        self,
        contracts: list[Any],
        invoices: list[Any],
        invoice_lines: list[Any],
        customers: list[Any],
        obligations: list[Any],
        schedules: list[Any],
    ) -> dict[str, str]:
        """
        Export all data to separate CSV files.
        
        Returns:
            Dictionary mapping entity type to file path
        """
        return {
            "contracts": self.export_contracts(contracts),
            "invoices": self.export_invoices(invoices),
            "invoice_lines": self.export_invoice_lines(invoice_lines),
            "customers": self.export_customers(customers),
            "obligations": self.export_obligations(obligations),
            "schedules": self.export_schedules(schedules),
        }
    
    def load(self, filename: str) -> pd.DataFrame:
        """
        Load data from CSV file.
        
        Args:
            filename: Filename to load
            
        Returns:
            DataFrame with loaded data
        """
        if not filename.endswith(".csv"):
            filename += ".csv"
        
        input_path = self.output_dir / filename
        
        if not input_path.exists():
            raise FileNotFoundError(f"File not found: {input_path}")
        
        return pd.read_csv(input_path)
