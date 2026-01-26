"""
NetSuite API payload generator.

Generates realistic NetSuite-format data for testing
connector ingestion pipelines.
"""

import random
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Any, Optional


class NetSuitePayloadGenerator:
    """
    Generates NetSuite API-compatible payloads.
    """
    
    def __init__(self, seed: Optional[int] = None):
        """Initialize the generator."""
        if seed is not None:
            random.seed(seed)
    
    def _ns_id(self) -> int:
        """Generate a NetSuite-style numeric ID."""
        return random.randint(100000, 9999999)
    
    def _ns_date(self, d: Optional[date] = None) -> str:
        """Format date for NetSuite."""
        d = d or date.today()
        return d.strftime("%m/%d/%Y")
    
    def generate_customer(
        self,
        customer_data: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Generate a NetSuite Customer record.
        
        Args:
            customer_data: Internal customer data
            
        Returns:
            NetSuite Customer payload
        """
        internal_id = self._ns_id()
        
        return {
            "internalId": internal_id,
            "externalId": customer_data.get("external_id"),
            "entityId": f"CUST{internal_id}",
            "companyName": customer_data.get("name"),
            "entityStatus": {
                "internalId": "13",
                "name": "CUSTOMER-Closed Won",
            },
            "isInactive": False,
            "email": customer_data.get("email"),
            "phone": customer_data.get("phone"),
            "defaultAddress": customer_data.get("address"),
            "addressbookList": {
                "addressbook": [
                    {
                        "defaultBilling": True,
                        "defaultShipping": True,
                        "addressbookAddress": {
                            "addr1": customer_data.get("address"),
                            "city": customer_data.get("city"),
                            "state": customer_data.get("state"),
                            "zip": customer_data.get("zip_code"),
                            "country": {"internalId": "US"},
                        },
                    }
                ]
            },
            "currency": {
                "internalId": "1",
                "name": customer_data.get("currency", "USD"),
            },
            "terms": {
                "internalId": "2",
                "name": "Net 30",
            },
            "creditLimit": customer_data.get("credit_limit", 100000),
            "salesRep": {
                "internalId": str(self._ns_id()),
                "name": "Sales Rep",
            },
            "category": {
                "internalId": "1",
                "name": "Corporate",
            },
            "dateCreated": self._ns_date(date.today() - timedelta(days=random.randint(30, 365))),
            "lastModifiedDate": self._ns_date(),
        }
    
    def generate_invoice(
        self,
        invoice_data: dict[str, Any],
        customer_internal_id: int,
    ) -> dict[str, Any]:
        """
        Generate a NetSuite Invoice record.
        
        Args:
            invoice_data: Internal invoice data
            customer_internal_id: NetSuite customer internal ID
            
        Returns:
            NetSuite Invoice payload
        """
        internal_id = self._ns_id()
        invoice_date = invoice_data.get("invoice_date", date.today())
        try:
            if isinstance(invoice_date, str):
                invoice_date = date.fromisoformat(invoice_date.strip()[:10])
        except (ValueError, AttributeError):
            invoice_date = date.today()
        
        due_date = invoice_data.get("due_date")
        if due_date:
            try:
                if isinstance(due_date, str):
                    due_date = date.fromisoformat(due_date.strip()[:10])
            except (ValueError, AttributeError):
                due_date = invoice_date + timedelta(days=30)
        else:
            due_date = invoice_date + timedelta(days=30)
        
        total = invoice_data.get("total", Decimal("10000"))
        subtotal = invoice_data.get("subtotal", total)
        tax = invoice_data.get("tax", Decimal("0"))
        
        status = invoice_data.get("status", "open")
        ns_status = "paidInFull" if status == "paid" else "open"
        
        return {
            "internalId": internal_id,
            "externalId": invoice_data.get("external_id"),
            "tranId": invoice_data.get("invoice_number", f"INV{internal_id}"),
            "entity": {
                "internalId": str(customer_internal_id),
            },
            "tranDate": self._ns_date(invoice_date),
            "dueDate": self._ns_date(due_date),
            "status": {
                "internalId": ns_status,
                "name": "Paid In Full" if ns_status == "paidInFull" else "Open",
            },
            "currency": {
                "internalId": "1",
                "name": invoice_data.get("currency", "USD"),
            },
            "exchangeRate": 1.0,
            "subTotal": float(subtotal),
            "taxTotal": float(tax),
            "total": float(total),
            "amountPaid": float(total) if ns_status == "paidInFull" else 0,
            "amountRemaining": 0 if ns_status == "paidInFull" else float(total),
            "terms": {
                "internalId": "2",
                "name": "Net 30",
            },
            "itemList": {
                "item": [
                    {
                        "item": {
                            "internalId": str(self._ns_id()),
                            "name": "Platform Subscription",
                        },
                        "quantity": 1,
                        "rate": float(subtotal),
                        "amount": float(subtotal),
                        "description": invoice_data.get("description", "Subscription service"),
                    }
                ]
            },
            "billingAddress": {
                "addr1": invoice_data.get("billing_address"),
                "city": invoice_data.get("billing_city"),
                "state": invoice_data.get("billing_state"),
                "zip": invoice_data.get("billing_zip"),
                "country": {"internalId": "US"},
            },
            "memo": invoice_data.get("memo"),
            "createdDate": self._ns_date(invoice_date),
            "lastModifiedDate": self._ns_date(),
        }
    
    def generate_sales_order(
        self,
        order_data: dict[str, Any],
        customer_internal_id: int,
    ) -> dict[str, Any]:
        """
        Generate a NetSuite Sales Order record.
        
        Args:
            order_data: Internal order data
            customer_internal_id: NetSuite customer internal ID
            
        Returns:
            NetSuite Sales Order payload
        """
        internal_id = self._ns_id()
        order_date = order_data.get("order_date", date.today())
        
        total = order_data.get("total", Decimal("10000"))
        
        return {
            "internalId": internal_id,
            "externalId": order_data.get("external_id"),
            "tranId": f"SO{internal_id}",
            "entity": {
                "internalId": str(customer_internal_id),
            },
            "tranDate": self._ns_date(order_date),
            "status": {
                "internalId": "pendingFulfillment",
                "name": "Pending Fulfillment",
            },
            "orderStatus": {
                "internalId": "B",
                "name": "Pending Fulfillment",
            },
            "currency": {
                "internalId": "1",
                "name": order_data.get("currency", "USD"),
            },
            "subTotal": float(total),
            "total": float(total),
            "terms": {
                "internalId": "2",
                "name": "Net 30",
            },
            "itemList": {
                "item": [
                    {
                        "item": {
                            "internalId": str(self._ns_id()),
                            "name": order_data.get("product_name", "Platform Subscription"),
                        },
                        "quantity": order_data.get("quantity", 1),
                        "rate": float(order_data.get("unit_price", total)),
                        "amount": float(total),
                    }
                ]
            },
            "createdDate": self._ns_date(order_date),
            "lastModifiedDate": self._ns_date(),
        }
    
    def generate_payment(
        self,
        payment_data: dict[str, Any],
        customer_internal_id: int,
        invoice_internal_id: Optional[int] = None,
    ) -> dict[str, Any]:
        """Generate a NetSuite Customer Payment record."""
        internal_id = self._ns_id()
        payment_date = payment_data.get("payment_date", date.today())
        
        amount = payment_data.get("amount", Decimal("10000"))
        
        return {
            "internalId": internal_id,
            "externalId": payment_data.get("external_id"),
            "tranId": f"PMT{internal_id}",
            "customer": {
                "internalId": str(customer_internal_id),
            },
            "tranDate": self._ns_date(payment_date),
            "payment": float(amount),
            "currency": {
                "internalId": "1",
                "name": payment_data.get("currency", "USD"),
            },
            "paymentMethod": {
                "internalId": "1",
                "name": payment_data.get("payment_method", "Credit Card"),
            },
            "applyList": {
                "apply": [
                    {
                        "doc": invoice_internal_id,
                        "apply": True,
                        "amount": float(amount),
                    }
                ] if invoice_internal_id else []
            },
            "createdDate": self._ns_date(payment_date),
            "lastModifiedDate": self._ns_date(),
        }
