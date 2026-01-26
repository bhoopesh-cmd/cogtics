"""
HubSpot API payload generator.

Generates realistic HubSpot-format data for testing
connector ingestion pipelines.
"""

import random
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Any, Optional
import uuid


class HubSpotPayloadGenerator:
    """
    Generates HubSpot API-compatible payloads.
    """
    
    def __init__(self, seed: Optional[int] = None):
        """Initialize the generator."""
        if seed is not None:
            random.seed(seed)
    
    def _hs_id(self) -> str:
        """Generate a HubSpot-style numeric ID."""
        return str(random.randint(10000000, 99999999))
    
    def _hs_timestamp(self, dt: Optional[datetime] = None) -> int:
        """Format datetime as HubSpot timestamp (milliseconds)."""
        dt = dt or datetime.utcnow()
        return int(dt.timestamp() * 1000)
    
    def generate_company(
        self,
        customer_data: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Generate a HubSpot Company object.
        
        Args:
            customer_data: Internal customer data
            
        Returns:
            HubSpot Company payload
        """
        hs_id = self._hs_id()
        created = datetime.utcnow() - timedelta(days=random.randint(30, 365))
        
        return {
            "id": hs_id,
            "properties": {
                "createdate": self._hs_timestamp(created),
                "domain": customer_data.get("domain") or f"{(customer_data.get('name') or 'company').lower().replace(' ', '')}.com",
                "hs_lastmodifieddate": self._hs_timestamp(),
                "hs_object_id": hs_id,
                "name": customer_data.get("name"),
                "description": customer_data.get("description"),
                "phone": customer_data.get("phone"),
                "address": customer_data.get("address"),
                "city": customer_data.get("city"),
                "state": customer_data.get("state"),
                "zip": customer_data.get("zip_code"),
                "country": customer_data.get("country", "United States"),
                "industry": customer_data.get("industry", "Technology"),
                "annualrevenue": str(customer_data.get("annual_revenue", random.randint(1000000, 100000000))),
                "numberofemployees": str(random.randint(10, 10000)),
                "lifecyclestage": "customer",
                "hs_lead_status": "CONNECTED",
                "type": random.choice(["PROSPECT", "PARTNER", "RESELLER", "VENDOR", "OTHER"]),
            },
            "createdAt": datetime.utcnow().isoformat() + "Z",
            "updatedAt": datetime.utcnow().isoformat() + "Z",
            "archived": False,
        }
    
    def generate_deal(
        self,
        contract_data: dict[str, Any],
        company_id: str,
    ) -> dict[str, Any]:
        """
        Generate a HubSpot Deal object.
        
        Args:
            contract_data: Internal contract data
            company_id: HubSpot Company ID
            
        Returns:
            HubSpot Deal payload
        """
        hs_id = self._hs_id()
        arr = contract_data.get("arr", Decimal("120000"))
        
        status = contract_data.get("status", "active")
        if status == "active":
            stage = "closedwon"
        elif status == "cancelled":
            stage = "closedlost"
        else:
            stage = random.choice([
                "appointmentscheduled",
                "qualifiedtobuy",
                "presentationscheduled",
                "decisionmakerboughtin",
                "contractsent",
            ])
        
        close_date = contract_data.get("start_date", date.today())
        try:
            if isinstance(close_date, str):
                close_date = date.fromisoformat(close_date.strip()[:10])
            if isinstance(close_date, date) and not isinstance(close_date, datetime):
                close_dt = datetime.combine(close_date, datetime.min.time())
            elif isinstance(close_date, datetime):
                close_dt = close_date
            else:
                close_dt = datetime.now()
        except (ValueError, AttributeError):
            close_dt = datetime.now()
        
        return {
            "id": hs_id,
            "properties": {
                "amount": str(float(arr)),
                "closedate": close_dt.isoformat() + "Z",
                "createdate": self._hs_timestamp(close_dt - timedelta(days=60)),
                "dealname": contract_data.get("name", "New Deal"),
                "dealstage": stage,
                "hs_lastmodifieddate": self._hs_timestamp(),
                "hs_object_id": hs_id,
                "pipeline": "default",
                "description": contract_data.get("description"),
                "dealtype": random.choice(["newbusiness", "existingbusiness"]),
                "hs_deal_stage_probability": "1.0" if stage == "closedwon" else "0.0" if stage == "closedlost" else "0.5",
                "hs_is_closed": "true" if stage in ["closedwon", "closedlost"] else "false",
                "hs_is_closed_won": "true" if stage == "closedwon" else "false",
                "hs_projected_amount": str(float(arr)),
                "hubspot_owner_id": self._hs_id(),
                "notes_last_updated": self._hs_timestamp(),
            },
            "associations": {
                "companies": {
                    "results": [
                        {
                            "id": company_id,
                            "type": "deal_to_company",
                        }
                    ]
                }
            },
            "createdAt": (close_dt - timedelta(days=60)).isoformat() + "Z",
            "updatedAt": datetime.utcnow().isoformat() + "Z",
            "archived": False,
        }
    
    def generate_line_item(
        self,
        line_data: dict[str, Any],
        deal_id: str,
    ) -> dict[str, Any]:
        """
        Generate a HubSpot Line Item object.
        
        Args:
            line_data: Internal line item data
            deal_id: HubSpot Deal ID
            
        Returns:
            HubSpot Line Item payload
        """
        hs_id = self._hs_id()
        amount = line_data.get("amount", Decimal("10000"))
        quantity = line_data.get("quantity", 1)
        unit_price = line_data.get("unit_price", amount / quantity if quantity else amount)
        
        return {
            "id": hs_id,
            "properties": {
                "amount": str(float(amount)),
                "createdate": self._hs_timestamp(),
                "description": line_data.get("description", "Product subscription"),
                "discount": "0",
                "hs_cost_of_goods_sold": "0",
                "hs_lastmodifieddate": self._hs_timestamp(),
                "hs_object_id": hs_id,
                "hs_product_id": self._hs_id(),
                "hs_recurring_billing_period": "P12M",
                "hs_sku": line_data.get("sku", f"SKU-{random.randint(1000, 9999)}"),
                "name": line_data.get("name", "Platform Subscription"),
                "price": str(float(unit_price)),
                "quantity": str(quantity),
                "recurringbillingfrequency": "annually",
                "tax": "0",
            },
            "associations": {
                "deals": {
                    "results": [
                        {
                            "id": deal_id,
                            "type": "line_item_to_deal",
                        }
                    ]
                }
            },
            "createdAt": datetime.utcnow().isoformat() + "Z",
            "updatedAt": datetime.utcnow().isoformat() + "Z",
            "archived": False,
        }
    
    def generate_contact(
        self,
        contact_data: dict[str, Any],
        company_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """Generate a HubSpot Contact object."""
        hs_id = self._hs_id()
        
        return {
            "id": hs_id,
            "properties": {
                "createdate": self._hs_timestamp(),
                "email": contact_data.get("email"),
                "firstname": contact_data.get("first_name", "John"),
                "lastname": contact_data.get("last_name", "Doe"),
                "hs_lastmodifieddate": self._hs_timestamp(),
                "hs_object_id": hs_id,
                "phone": contact_data.get("phone"),
                "company": contact_data.get("company_name"),
                "jobtitle": contact_data.get("title", "Manager"),
                "lifecyclestage": "customer",
            },
            "associations": {
                "companies": {
                    "results": [
                        {"id": company_id, "type": "contact_to_company"}
                    ] if company_id else []
                }
            },
            "createdAt": datetime.utcnow().isoformat() + "Z",
            "updatedAt": datetime.utcnow().isoformat() + "Z",
            "archived": False,
        }
