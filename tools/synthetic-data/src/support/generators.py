"""
Faker-based support generators for IDs, timestamps, and contact info.
"""

import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Optional
from faker import Faker

from ..config import config

# Initialize Faker with seed for reproducibility
fake = Faker()


class FakerSupport:
    """Collection of Faker-based data generators."""
    
    def __init__(self, seed: Optional[int] = None):
        """Initialize with optional seed for reproducibility."""
        if seed is not None:
            Faker.seed(seed)
        self.fake = Faker()
        self.tenant_id = config.DEFAULT_TENANT_ID
        self.snapshot_id = f"snap_{self._short_uuid()}"
    
    def _short_uuid(self) -> str:
        """Generate a short UUID string."""
        return str(uuid.uuid4())[:8]
    
    def _full_uuid(self) -> str:
        """Generate a full UUID string."""
        return str(uuid.uuid4())
    
    # ========================================
    # ID Generators
    # ========================================
    
    def generate_ids(self, prefix: str = "") -> dict[str, str]:
        """Generate a set of IDs for an entity."""
        return {
            "id": f"{prefix}{self._full_uuid()}",
            "external_id": self._full_uuid(),
            "tenant_id": self.tenant_id,
            "snapshot_id": self.snapshot_id,
        }
    
    def generate_contract_id(self) -> str:
        """Generate a contract ID."""
        return f"con_{self._short_uuid()}"
    
    def generate_customer_id(self) -> str:
        """Generate a customer ID."""
        return f"cus_{self._short_uuid()}"
    
    def generate_invoice_id(self) -> str:
        """Generate an invoice ID."""
        return f"inv_{self._short_uuid()}"
    
    def generate_invoice_number(self) -> str:
        """Generate a realistic invoice number."""
        year = datetime.now().year
        num = self.fake.random_number(digits=6, fix_len=True)
        return f"INV-{year}-{num}"
    
    def generate_product_id(self) -> str:
        """Generate a product ID."""
        return f"prod_{self._short_uuid()}"
    
    def generate_obligation_id(self) -> str:
        """Generate a revenue obligation ID."""
        return f"obl_{self._short_uuid()}"
    
    # ========================================
    # Customer Generators
    # ========================================
    
    def generate_customer(self) -> dict[str, Any]:
        """Generate a complete customer record."""
        company = self.fake.company()
        domain = company.lower().replace(" ", "").replace(",", "")[:20]
        
        return {
            **self.generate_ids("cus_"),
            "name": company,
            "email": f"billing@{domain}.com",
            "status": "active",
            "metadata": {
                "industry": self.fake.bs(),
                "size": self.fake.random_element(["small", "medium", "large", "enterprise"]),
            },
            "source_system": "synthetic",
        }
    
    def generate_customer_with_messiness(self) -> dict[str, Any]:
        """Generate customer with realistic data quality issues."""
        customer = self.generate_customer()
        
        # Add some messiness
        messiness_type = self.fake.random_element([
            "typo", "abbreviation", "case", "extra_space", "clean"
        ])
        
        name = customer["name"]
        if messiness_type == "typo":
            # Swap two adjacent characters
            if len(name) > 3:
                i = self.fake.random_int(1, len(name) - 2)
                name = name[:i] + name[i+1] + name[i] + name[i+2:]
        elif messiness_type == "abbreviation":
            name = name.replace("Corporation", "Corp").replace("Company", "Co")
            name = name.replace("Incorporated", "Inc").replace("Limited", "Ltd")
        elif messiness_type == "case":
            name = self.fake.random_element([name.upper(), name.lower(), name.title()])
        elif messiness_type == "extra_space":
            i = self.fake.random_int(1, len(name) - 1)
            name = name[:i] + "  " + name[i:]
        
        customer["name"] = name
        customer["metadata"]["messiness_type"] = messiness_type
        return customer
    
    # ========================================
    # Contact Info Generators
    # ========================================
    
    def generate_contact_info(self) -> dict[str, str]:
        """Generate contact information."""
        return {
            "email": self.fake.company_email(),
            "phone": self.fake.phone_number(),
            "address": self.fake.address(),
            "city": self.fake.city(),
            "state": self.fake.state_abbr(),
            "zip_code": self.fake.zipcode(),
            "country": "US",
        }
    
    def generate_address_with_variations(self) -> dict[str, str]:
        """Generate address with realistic variations."""
        address = self.fake.street_address()
        
        # Apply random variations
        variation = self.fake.random_element([
            "standard", "abbreviated", "spelled_out", "mixed"
        ])
        
        if variation == "abbreviated":
            address = (address
                .replace("Street", "St")
                .replace("Avenue", "Ave")
                .replace("Boulevard", "Blvd")
                .replace("Suite", "Ste")
                .replace("Building", "Bldg"))
        elif variation == "spelled_out":
            address = (address
                .replace("St", "Street")
                .replace("Ave", "Avenue")
                .replace("Blvd", "Boulevard")
                .replace("Ste", "Suite"))
        
        return {
            "address": address,
            "city": self.fake.city(),
            "state": self.fake.state_abbr(),
            "zip_code": self.fake.zipcode(),
            "variation_type": variation,
        }
    
    # ========================================
    # Timestamp Generators
    # ========================================
    
    def generate_timestamps(
        self,
        start_year: int = 2023,
        end_year: int = 2025
    ) -> dict[str, datetime]:
        """Generate realistic timestamps."""
        created = self.fake.date_time_between(
            start_date=date(start_year, 1, 1),
            end_date=date(end_year, 12, 31)
        )
        return {
            "created_at": created,
            "updated_at": created + timedelta(days=self.fake.random_int(0, 30)),
        }
    
    def generate_contract_dates(
        self,
        start_year: int = 2024,
        term_months: int = 12
    ) -> dict[str, date]:
        """Generate contract start/end dates."""
        start = self.fake.date_between(
            start_date=date(start_year, 1, 1),
            end_date=date(start_year, 12, 31)
        )
        end = start + timedelta(days=term_months * 30)
        
        return {
            "start_date": start,
            "end_date": end,
            "term_months": term_months,
        }
    
    def generate_billing_periods(
        self,
        start_date: date,
        end_date: date,
        frequency: str = "monthly"
    ) -> list[dict[str, date]]:
        """Generate billing periods between start and end dates."""
        periods = []
        current = start_date
        
        if frequency == "monthly":
            delta = timedelta(days=30)
        elif frequency == "quarterly":
            delta = timedelta(days=91)
        elif frequency == "annually":
            delta = timedelta(days=365)
        else:
            delta = timedelta(days=30)
        
        while current < end_date:
            period_end = min(current + delta, end_date)
            periods.append({
                "period_start": current,
                "period_end": period_end,
            })
            current = period_end
        
        return periods
    
    # ========================================
    # Financial Generators
    # ========================================
    
    def generate_arr(
        self,
        min_value: int = 10000,
        max_value: int = 500000
    ) -> Decimal:
        """Generate a realistic ARR value."""
        # Round to nice numbers
        base = self.fake.random_int(min_value // 1000, max_value // 1000)
        return Decimal(str(base * 1000))
    
    def generate_unit_price(
        self,
        min_value: int = 10,
        max_value: int = 10000
    ) -> Decimal:
        """Generate a realistic unit price."""
        # Use common SaaS price points
        price_points = [
            10, 25, 50, 99, 149, 199, 299, 499, 999, 1499, 1999, 2999, 4999, 9999
        ]
        if max_value < 100:
            price_points = [p for p in price_points if p <= max_value]
        if min_value > 10:
            price_points = [p for p in price_points if p >= min_value]
        
        if price_points:
            return Decimal(str(self.fake.random_element(price_points)))
        return Decimal(str(self.fake.random_int(min_value, max_value)))
    
    def generate_quantity(
        self,
        min_qty: int = 1,
        max_qty: int = 1000
    ) -> int:
        """Generate a realistic quantity (seats, licenses, etc.)."""
        # Use common seat counts
        if max_qty <= 100:
            return self.fake.random_int(min_qty, max_qty)
        
        # Weighted towards smaller numbers
        ranges = [
            (1, 10, 0.3),
            (11, 50, 0.3),
            (51, 100, 0.2),
            (101, 500, 0.15),
            (501, max_qty, 0.05),
        ]
        
        r = self.fake.random.random()
        cumulative = 0
        for low, high, weight in ranges:
            cumulative += weight
            if r <= cumulative:
                return self.fake.random_int(low, min(high, max_qty))
        
        return self.fake.random_int(min_qty, max_qty)


# Convenience functions
def generate_ids(prefix: str = "") -> dict[str, str]:
    """Generate IDs using default FakerSupport."""
    return FakerSupport().generate_ids(prefix)


def generate_customer() -> dict[str, Any]:
    """Generate customer using default FakerSupport."""
    return FakerSupport().generate_customer()


def generate_timestamps() -> dict[str, datetime]:
    """Generate timestamps using default FakerSupport."""
    return FakerSupport().generate_timestamps()


def generate_contact_info() -> dict[str, str]:
    """Generate contact info using default FakerSupport."""
    return FakerSupport().generate_contact_info()
