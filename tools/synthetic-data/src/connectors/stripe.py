"""
Stripe API payload generator.

Generates realistic Stripe-format data for testing
connector ingestion pipelines.
"""

import random
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Any, Optional
import uuid


class StripePayloadGenerator:
    """
    Generates Stripe API-compatible payloads.
    """
    
    def __init__(self, seed: Optional[int] = None):
        """Initialize the generator."""
        if seed is not None:
            random.seed(seed)
    
    def _stripe_id(self, prefix: str) -> str:
        """Generate a Stripe-style ID."""
        return f"{prefix}_{uuid.uuid4().hex[:24]}"
    
    def _unix_timestamp(self, dt: Optional[datetime] = None) -> int:
        """Convert datetime to Unix timestamp."""
        if dt is None:
            dt = datetime.utcnow()
        elif isinstance(dt, str):
            # Parse ISO format string
            dt = datetime.fromisoformat(dt.replace('Z', '+00:00')[:19])
        elif isinstance(dt, date) and not isinstance(dt, datetime):
            dt = datetime.combine(dt, datetime.min.time())
        return int(dt.timestamp())
    
    def generate_customer(
        self,
        customer_data: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Generate a Stripe Customer object.
        
        Args:
            customer_data: Internal customer data
            
        Returns:
            Stripe Customer payload
        """
        created = datetime.utcnow() - timedelta(days=random.randint(30, 365))
        
        return {
            "id": self._stripe_id("cus"),
            "object": "customer",
            "address": {
                "city": customer_data.get("city"),
                "country": customer_data.get("country", "US"),
                "line1": customer_data.get("address"),
                "line2": None,
                "postal_code": customer_data.get("zip_code"),
                "state": customer_data.get("state"),
            },
            "balance": 0,
            "created": self._unix_timestamp(created),
            "currency": customer_data.get("currency", "usd").lower(),
            "default_source": self._stripe_id("card") if random.random() > 0.3 else None,
            "delinquent": random.random() < 0.05,
            "description": customer_data.get("description"),
            "discount": None,
            "email": customer_data.get("email"),
            "invoice_prefix": customer_data.get("invoice_prefix", "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=6))),
            "invoice_settings": {
                "custom_fields": None,
                "default_payment_method": self._stripe_id("pm") if random.random() > 0.5 else None,
                "footer": None,
            },
            "livemode": True,
            "metadata": customer_data.get("metadata", {}),
            "name": customer_data.get("name"),
            "phone": customer_data.get("phone"),
            "preferred_locales": ["en"],
            "shipping": None,
            "tax_exempt": "none",
            "test_clock": None,
        }
    
    def generate_subscription(
        self,
        contract_data: dict[str, Any],
        customer_id: str,
    ) -> dict[str, Any]:
        """
        Generate a Stripe Subscription object.
        
        Args:
            contract_data: Internal contract data
            customer_id: Stripe customer ID
            
        Returns:
            Stripe Subscription payload
        """
        start_date = contract_data.get("start_date", date.today())
        try:
            if isinstance(start_date, str):
                start_date = date.fromisoformat(start_date.strip()[:10])
            if isinstance(start_date, date) and not isinstance(start_date, datetime):
                start_dt = datetime.combine(start_date, datetime.min.time())
            elif isinstance(start_date, datetime):
                start_dt = start_date
            else:
                start_dt = datetime.now()
        except (ValueError, AttributeError):
            # Handle corrupted dates from anomaly injection
            start_dt = datetime.now()
        
        end_date = contract_data.get("end_date")
        end_dt = None
        if end_date:
            try:
                if isinstance(end_date, str):
                    end_date = date.fromisoformat(end_date.strip()[:10])
                if isinstance(end_date, date) and not isinstance(end_date, datetime):
                    end_dt = datetime.combine(end_date, datetime.min.time())
                elif isinstance(end_date, datetime):
                    end_dt = end_date
            except (ValueError, AttributeError):
                # Handle corrupted dates from anomaly injection
                end_dt = start_dt + timedelta(days=365) if start_dt else None
        
        # Map billing frequency to Stripe interval
        freq = contract_data.get("billing_frequency", "monthly")
        if freq == "annually":
            interval = "year"
            interval_count = 1
        elif freq == "quarterly":
            interval = "month"
            interval_count = 3
        else:
            interval = "month"
            interval_count = 1
        
        arr = contract_data.get("arr", Decimal("120000"))
        if freq == "monthly":
            amount = int(arr / 12 * 100)  # Convert to cents
        elif freq == "quarterly":
            amount = int(arr / 4 * 100)
        else:
            amount = int(arr * 100)
        
        status = contract_data.get("status", "active")
        stripe_status = "active" if status == "active" else "canceled"
        
        return {
            "id": self._stripe_id("sub"),
            "object": "subscription",
            "application": None,
            "application_fee_percent": None,
            "automatic_tax": {"enabled": False},
            "billing_cycle_anchor": self._unix_timestamp(start_dt),
            "billing_thresholds": None,
            "cancel_at": self._unix_timestamp(end_dt) if end_dt else None,
            "cancel_at_period_end": False,
            "canceled_at": None,
            "collection_method": "charge_automatically",
            "created": self._unix_timestamp(start_dt),
            "currency": contract_data.get("currency", "usd").lower(),
            "current_period_end": self._unix_timestamp(start_dt + timedelta(days=30)),
            "current_period_start": self._unix_timestamp(start_dt),
            "customer": customer_id,
            "days_until_due": None,
            "default_payment_method": self._stripe_id("pm"),
            "default_source": None,
            "default_tax_rates": [],
            "description": contract_data.get("name"),
            "discount": None,
            "ended_at": None,
            "items": {
                "object": "list",
                "data": [
                    {
                        "id": self._stripe_id("si"),
                        "object": "subscription_item",
                        "billing_thresholds": None,
                        "created": self._unix_timestamp(start_dt),
                        "metadata": {},
                        "plan": {
                            "id": self._stripe_id("plan"),
                            "object": "plan",
                            "active": True,
                            "amount": amount,
                            "amount_decimal": str(amount),
                            "billing_scheme": "per_unit",
                            "created": self._unix_timestamp(start_dt - timedelta(days=30)),
                            "currency": contract_data.get("currency", "usd").lower(),
                            "interval": interval,
                            "interval_count": interval_count,
                            "livemode": True,
                            "metadata": {},
                            "nickname": "Standard Plan",
                            "product": self._stripe_id("prod"),
                            "tiers_mode": None,
                            "usage_type": "licensed",
                        },
                        "price": {
                            "id": self._stripe_id("price"),
                            "object": "price",
                            "active": True,
                            "billing_scheme": "per_unit",
                            "created": self._unix_timestamp(start_dt - timedelta(days=30)),
                            "currency": contract_data.get("currency", "usd").lower(),
                            "livemode": True,
                            "metadata": {},
                            "nickname": None,
                            "product": self._stripe_id("prod"),
                            "recurring": {
                                "aggregate_usage": None,
                                "interval": interval,
                                "interval_count": interval_count,
                                "usage_type": "licensed",
                            },
                            "type": "recurring",
                            "unit_amount": amount,
                            "unit_amount_decimal": str(amount),
                        },
                        "quantity": 1,
                        "subscription": None,  # Will be filled
                        "tax_rates": [],
                    }
                ],
                "has_more": False,
                "total_count": 1,
                "url": "/v1/subscription_items",
            },
            "latest_invoice": self._stripe_id("in"),
            "livemode": True,
            "metadata": contract_data.get("metadata", {}),
            "next_pending_invoice_item_invoice": None,
            "pause_collection": None,
            "payment_settings": {
                "payment_method_options": None,
                "payment_method_types": None,
                "save_default_payment_method": "on_subscription",
            },
            "pending_invoice_item_interval": None,
            "pending_setup_intent": None,
            "pending_update": None,
            "schedule": None,
            "start_date": self._unix_timestamp(start_dt),
            "status": stripe_status,
            "test_clock": None,
            "transfer_data": None,
            "trial_end": None,
            "trial_start": None,
        }
    
    def generate_invoice(
        self,
        invoice_data: dict[str, Any],
        customer_id: str,
        subscription_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Generate a Stripe Invoice object.
        
        Args:
            invoice_data: Internal invoice data
            customer_id: Stripe customer ID
            subscription_id: Optional Stripe subscription ID
            
        Returns:
            Stripe Invoice payload
        """
        invoice_date = invoice_data.get("invoice_date", date.today())
        if isinstance(invoice_date, str):
            invoice_date = date.fromisoformat(invoice_date[:10])
        if isinstance(invoice_date, date) and not isinstance(invoice_date, datetime):
            invoice_dt = datetime.combine(invoice_date, datetime.min.time())
        elif isinstance(invoice_date, datetime):
            invoice_dt = invoice_date
        else:
            invoice_dt = datetime.now()
        
        total = invoice_data.get("total", Decimal("1000"))
        amount_cents = int(Decimal(str(total)) * 100)
        
        status = invoice_data.get("status", "paid")
        stripe_status = "paid" if status == "paid" else "open"
        
        return {
            "id": self._stripe_id("in"),
            "object": "invoice",
            "account_country": "US",
            "account_name": "Cogtics, Inc.",
            "account_tax_ids": None,
            "amount_due": amount_cents,
            "amount_paid": amount_cents if stripe_status == "paid" else 0,
            "amount_remaining": 0 if stripe_status == "paid" else amount_cents,
            "application": None,
            "application_fee_amount": None,
            "attempt_count": 1 if stripe_status == "paid" else 0,
            "attempted": stripe_status == "paid",
            "auto_advance": True,
            "automatic_tax": {"enabled": False, "status": None},
            "billing_reason": "subscription_cycle",
            "charge": self._stripe_id("ch") if stripe_status == "paid" else None,
            "collection_method": "charge_automatically",
            "created": self._unix_timestamp(invoice_dt),
            "currency": invoice_data.get("currency", "usd").lower(),
            "custom_fields": None,
            "customer": customer_id,
            "customer_address": None,
            "customer_email": invoice_data.get("customer_email"),
            "customer_name": invoice_data.get("customer_name"),
            "customer_phone": None,
            "customer_shipping": None,
            "customer_tax_exempt": "none",
            "customer_tax_ids": [],
            "default_payment_method": None,
            "default_source": None,
            "default_tax_rates": [],
            "description": None,
            "discount": None,
            "discounts": [],
            "due_date": self._unix_timestamp(invoice_dt + timedelta(days=30)),
            "ending_balance": 0,
            "footer": None,
            "hosted_invoice_url": f"https://invoice.stripe.com/i/{self._stripe_id('invst')}",
            "invoice_pdf": f"https://pay.stripe.com/invoice/{self._stripe_id('invst')}/pdf",
            "last_finalization_error": None,
            "lines": {
                "object": "list",
                "data": [
                    {
                        "id": self._stripe_id("il"),
                        "object": "line_item",
                        "amount": amount_cents,
                        "amount_excluding_tax": amount_cents,
                        "currency": invoice_data.get("currency", "usd").lower(),
                        "description": invoice_data.get("description", "Subscription"),
                        "discount_amounts": [],
                        "discountable": True,
                        "discounts": [],
                        "livemode": True,
                        "metadata": {},
                        "period": {
                            "end": self._unix_timestamp(invoice_dt + timedelta(days=30)),
                            "start": self._unix_timestamp(invoice_dt),
                        },
                        "plan": None,
                        "price": {
                            "id": self._stripe_id("price"),
                            "object": "price",
                            "unit_amount": amount_cents,
                        },
                        "proration": False,
                        "proration_details": {"credited_items": None},
                        "quantity": 1,
                        "subscription": subscription_id,
                        "subscription_item": self._stripe_id("si") if subscription_id else None,
                        "tax_amounts": [],
                        "tax_rates": [],
                        "type": "subscription",
                        "unit_amount_excluding_tax": str(amount_cents),
                    }
                ],
                "has_more": False,
                "total_count": 1,
                "url": "/v1/invoices/in_xxx/lines",
            },
            "livemode": True,
            "metadata": invoice_data.get("metadata", {}),
            "next_payment_attempt": None,
            "number": invoice_data.get("invoice_number", f"INV-{random.randint(10000, 99999)}"),
            "on_behalf_of": None,
            "paid": stripe_status == "paid",
            "paid_out_of_band": False,
            "payment_intent": self._stripe_id("pi") if stripe_status == "paid" else None,
            "payment_settings": {
                "default_mandate": None,
                "payment_method_options": None,
                "payment_method_types": None,
            },
            "period_end": self._unix_timestamp(invoice_dt + timedelta(days=30)),
            "period_start": self._unix_timestamp(invoice_dt),
            "post_payment_credit_notes_amount": 0,
            "pre_payment_credit_notes_amount": 0,
            "quote": None,
            "receipt_number": None,
            "rendering_options": None,
            "starting_balance": 0,
            "statement_descriptor": None,
            "status": stripe_status,
            "status_transitions": {
                "finalized_at": self._unix_timestamp(invoice_dt),
                "marked_uncollectible_at": None,
                "paid_at": self._unix_timestamp(invoice_dt) if stripe_status == "paid" else None,
                "voided_at": None,
            },
            "subscription": subscription_id,
            "subtotal": amount_cents,
            "subtotal_excluding_tax": amount_cents,
            "tax": 0,
            "test_clock": None,
            "total": amount_cents,
            "total_discount_amounts": [],
            "total_excluding_tax": amount_cents,
            "total_tax_amounts": [],
            "transfer_data": None,
            "webhooks_delivered_at": self._unix_timestamp(invoice_dt),
        }
    
    def generate_payment_intent(
        self,
        amount: Decimal,
        currency: str = "usd",
        customer_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """Generate a Stripe PaymentIntent object."""
        amount_cents = int(amount * 100)
        
        return {
            "id": self._stripe_id("pi"),
            "object": "payment_intent",
            "amount": amount_cents,
            "amount_capturable": 0,
            "amount_received": amount_cents,
            "application": None,
            "application_fee_amount": None,
            "automatic_payment_methods": None,
            "canceled_at": None,
            "cancellation_reason": None,
            "capture_method": "automatic",
            "charges": {
                "object": "list",
                "data": [
                    {
                        "id": self._stripe_id("ch"),
                        "object": "charge",
                        "amount": amount_cents,
                        "amount_captured": amount_cents,
                        "amount_refunded": 0,
                        "captured": True,
                        "created": self._unix_timestamp(),
                        "currency": currency.lower(),
                        "customer": customer_id,
                        "paid": True,
                        "refunded": False,
                        "status": "succeeded",
                    }
                ],
                "has_more": False,
                "total_count": 1,
            },
            "client_secret": f"{self._stripe_id('pi')}_secret_{uuid.uuid4().hex[:24]}",
            "confirmation_method": "automatic",
            "created": self._unix_timestamp(),
            "currency": currency.lower(),
            "customer": customer_id,
            "description": None,
            "invoice": None,
            "last_payment_error": None,
            "livemode": True,
            "metadata": {},
            "next_action": None,
            "on_behalf_of": None,
            "payment_method": self._stripe_id("pm"),
            "payment_method_options": {},
            "payment_method_types": ["card"],
            "processing": None,
            "receipt_email": None,
            "review": None,
            "setup_future_usage": None,
            "shipping": None,
            "source": None,
            "statement_descriptor": None,
            "statement_descriptor_suffix": None,
            "status": "succeeded",
            "transfer_data": None,
            "transfer_group": None,
        }
