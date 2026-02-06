"""
QuickBooks API payload generator.

Generates realistic QuickBooks-format data for testing
connector ingestion pipelines.
"""

from __future__ import annotations

import random
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Optional


class QuickBooksPayloadGenerator:
    """
    Generates QuickBooks API-compatible payloads.
    """

    def __init__(self, seed: Optional[int] = None):
        """Initialize the generator."""
        if seed is not None:
            random.seed(seed)

    def _qb_id(self) -> str:
        """Generate a QuickBooks-style ID."""
        return str(random.randint(1, 99999))

    def _get(self, data: Any, key: str, default: Any = None) -> Any:
        """Read a field from dicts or objects safely."""
        if isinstance(data, dict):
            return data.get(key, default)
        return getattr(data, key, default)

    def _coerce_date(self, value: Any) -> datetime:
        """Coerce an arbitrary date-like value to datetime."""
        if isinstance(value, datetime):
            return value
        if isinstance(value, date):
            return datetime.combine(value, datetime.min.time())
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace("Z", "")[:19])
            except ValueError:
                return datetime.now()
        return datetime.now()

    def _metadata(self, dt: Optional[datetime] = None) -> dict[str, str]:
        dt = dt or datetime.now()
        iso = dt.isoformat()
        return {
            "CreateTime": iso,
            "LastUpdatedTime": iso,
        }

    def _address(self) -> dict[str, str]:
        return {
            "Line1": f"{random.randint(100, 9999)} Main St",
            "City": random.choice(["San Francisco", "New York", "Austin", "Seattle", "Boston"]),
            "CountrySubDivisionCode": random.choice(["CA", "NY", "TX", "WA", "MA"]),
            "PostalCode": f"{random.randint(10000, 99999)}",
        }

    def generate_customer(self, customer_data: Any) -> dict[str, Any]:
        """
        Generate a QuickBooks Customer object.

        Args:
            customer_data: Internal customer data

        Returns:
            QuickBooks Customer payload
        """
        name = self._get(customer_data, "name", "Customer")
        email = self._get(customer_data, "email")
        phone = self._get(customer_data, "phone")

        return {
            "Id": self._qb_id(),
            "SyncToken": "0",
            "DisplayName": name,
            "CompanyName": name,
            "PrimaryEmailAddr": {"Address": email} if email else None,
            "PrimaryPhone": {"FreeFormNumber": phone} if phone else None,
            "BillAddr": self._address(),
            "Active": True,
            "Balance": float(random.randint(0, 50000)),
            "MetaData": self._metadata(),
        }

    def generate_invoice(
        self,
        invoice_data: Any,
        customer_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Generate a QuickBooks Invoice object.

        Args:
            invoice_data: Internal invoice data
            customer_id: QuickBooks customer ID

        Returns:
            QuickBooks Invoice payload
        """
        invoice_date = self._coerce_date(self._get(invoice_data, "invoice_date"))
        due_date = self._get(invoice_data, "due_date")
        due_dt = self._coerce_date(due_date) if due_date else invoice_date + timedelta(days=30)

        total = self._get(invoice_data, "total", Decimal("0"))
        status = self._get(invoice_data, "status", "open")

        if str(status) in ["paid", "PAID"]:
            balance = 0.0
        elif self._get(invoice_data, "amount_due") is not None:
            balance = float(self._get(invoice_data, "amount_due"))
        else:
            balance = float(total) if random.random() > 0.7 else 0.0

        lines = self._get(invoice_data, "lines", []) or []
        qb_lines = []
        for idx, line in enumerate(lines[:5]):
            amount = self._get(line, "amount", total)
            quantity = self._get(line, "quantity", 1)
            unit_price = self._get(line, "unit_price")
            if unit_price is None:
                try:
                    unit_price = Decimal(str(amount)) / Decimal(str(quantity or 1))
                except Exception:
                    unit_price = amount
            qb_lines.append({
                "Id": str(idx + 1),
                "Amount": float(amount),
                "Description": self._get(line, "description", f"Line item {idx + 1}"),
                "DetailType": "SalesItemLineDetail",
                "SalesItemLineDetail": {
                    "Qty": float(quantity),
                    "UnitPrice": float(unit_price),
                },
            })

        if not qb_lines:
            qb_lines = [{
                "Id": "1",
                "Amount": float(total),
                "DetailType": "SalesItemLineDetail",
            }]

        return {
            "Id": self._qb_id(),
            "SyncToken": "0",
            "DocNumber": self._get(invoice_data, "invoice_number", f"INV-{random.randint(1000, 9999)}"),
            "TxnDate": invoice_date.strftime("%Y-%m-%d"),
            "DueDate": due_dt.strftime("%Y-%m-%d"),
            "TotalAmt": float(total),
            "Balance": balance,
            "CustomerRef": {"value": customer_id or self._qb_id()},
            "CurrencyRef": {"value": self._get(invoice_data, "currency", "USD")},
            "Line": qb_lines,
            "MetaData": self._metadata(invoice_date),
        }

    def generate_payment(
        self,
        invoice_data: Any,
        customer_id: Optional[str] = None,
        invoice_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Generate a QuickBooks Payment object.

        Args:
            invoice_data: Internal invoice data
            customer_id: QuickBooks customer ID
            invoice_id: QuickBooks invoice ID for linkage

        Returns:
            QuickBooks Payment payload
        """
        invoice_date = self._coerce_date(self._get(invoice_data, "invoice_date"))
        payment_date = invoice_date + timedelta(days=random.randint(1, 30))
        total = self._get(invoice_data, "total", Decimal("0"))

        return {
            "Id": self._qb_id(),
            "SyncToken": "0",
            "TxnDate": payment_date.strftime("%Y-%m-%d"),
            "TotalAmt": float(total),
            "CustomerRef": {"value": customer_id or self._qb_id()},
            "CurrencyRef": {"value": self._get(invoice_data, "currency", "USD")},
            "PaymentMethodRef": {"value": str(random.randint(1, 20))},
            "Line": [
                {
                    "Amount": float(total),
                    "LinkedTxn": [{"TxnId": invoice_id or self._qb_id(), "TxnType": "Invoice"}],
                }
            ],
            "MetaData": self._metadata(payment_date),
        }
