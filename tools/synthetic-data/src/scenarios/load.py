"""
Load testing scenarios and scale generation.

Provides tools for generating large-scale test data
and configuring load test profiles.
"""

import random
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Any, Callable, Iterator, Optional
import logging

logger = logging.getLogger(__name__)


class LoadProfile(str, Enum):
    """Pre-defined load test profiles."""
    STEADY = "steady"  # Constant rate
    RAMP_UP = "ramp_up"  # Gradually increasing
    BURST = "burst"  # Sudden spike
    WAVE = "wave"  # Oscillating
    STRESS = "stress"  # Maximum load


@dataclass
class LoadScenario:
    """Configuration for a load test scenario."""
    name: str
    profile: LoadProfile
    
    # Scale targets
    customer_count: int = 100
    contracts_per_customer: tuple[int, int] = (1, 5)  # min, max
    invoices_per_contract: tuple[int, int] = (1, 12)
    usage_records_per_contract: tuple[int, int] = (0, 100)
    
    # Temporal settings
    time_range_months: int = 24
    
    # Complexity settings
    multi_currency: bool = False
    usage_based: bool = False
    amendments_enabled: bool = False
    
    # Anomaly rates
    anomaly_rate: float = 0.05
    discrepancy_rate: float = 0.10
    
    # Batch settings
    batch_size: int = 1000
    
    @property
    def estimated_contracts(self) -> int:
        """Estimate total contract count."""
        avg = (self.contracts_per_customer[0] + self.contracts_per_customer[1]) / 2
        return int(self.customer_count * avg)
    
    @property
    def estimated_invoices(self) -> int:
        """Estimate total invoice count."""
        avg_inv = (self.invoices_per_contract[0] + self.invoices_per_contract[1]) / 2
        return int(self.estimated_contracts * avg_inv)
    
    @property
    def estimated_usage_records(self) -> int:
        """Estimate total usage record count."""
        avg = (self.usage_records_per_contract[0] + self.usage_records_per_contract[1]) / 2
        return int(self.estimated_contracts * avg)


# Pre-defined load scenarios
LOAD_SCENARIOS = {
    "small": LoadScenario(
        name="Small",
        profile=LoadProfile.STEADY,
        customer_count=10,
        contracts_per_customer=(1, 3),
        invoices_per_contract=(1, 6),
    ),
    "medium": LoadScenario(
        name="Medium",
        profile=LoadProfile.STEADY,
        customer_count=100,
        contracts_per_customer=(1, 5),
        invoices_per_contract=(1, 12),
        multi_currency=True,
    ),
    "large": LoadScenario(
        name="Large",
        profile=LoadProfile.RAMP_UP,
        customer_count=1000,
        contracts_per_customer=(2, 10),
        invoices_per_contract=(1, 24),
        usage_based=True,
        amendments_enabled=True,
    ),
    "stress": LoadScenario(
        name="Stress",
        profile=LoadProfile.STRESS,
        customer_count=10000,
        contracts_per_customer=(5, 20),
        invoices_per_contract=(1, 36),
        usage_records_per_contract=(10, 500),
        multi_currency=True,
        usage_based=True,
        amendments_enabled=True,
        anomaly_rate=0.10,
        discrepancy_rate=0.15,
    ),
    "burst": LoadScenario(
        name="Burst",
        profile=LoadProfile.BURST,
        customer_count=500,
        contracts_per_customer=(10, 50),
        invoices_per_contract=(1, 12),
        batch_size=5000,
    ),
}


class ScaleGenerator:
    """
    Generator for large-scale test data.
    
    Generates data in batches for memory efficiency.
    """
    
    def __init__(
        self,
        scenario: LoadScenario,
        faker_support = None,
        seed: Optional[int] = None,
    ):
        """Initialize the scale generator."""
        from ..support.generators import FakerSupport
        
        self.scenario = scenario
        self.faker = faker_support or FakerSupport(seed=seed)
        
        if seed is not None:
            random.seed(seed)
        
        self.stats = {
            "customers_generated": 0,
            "contracts_generated": 0,
            "invoices_generated": 0,
            "usage_records_generated": 0,
            "start_time": None,
            "end_time": None,
        }
    
    def generate_customers(self) -> Iterator[dict[str, Any]]:
        """Generate customers in batches."""
        count = self.scenario.customer_count
        logger.info(f"Generating {count} customers...")
        
        for i in range(count):
            customer = self.faker.generate_customer()
            self.stats["customers_generated"] += 1
            yield customer
    
    def generate_contracts(
        self,
        customer_ids: list[str],
    ) -> Iterator[dict[str, Any]]:
        """Generate contracts for customers."""
        min_c, max_c = self.scenario.contracts_per_customer
        
        for customer_id in customer_ids:
            contract_count = random.randint(min_c, max_c)
            
            for _ in range(contract_count):
                contract = self._generate_contract(customer_id)
                self.stats["contracts_generated"] += 1
                yield contract
    
    def _generate_contract(self, customer_id: str) -> dict[str, Any]:
        """Generate a single contract."""
        # Random start date within time range
        months_ago = random.randint(1, self.scenario.time_range_months)
        start_date = date.today() - timedelta(days=months_ago * 30)
        term_months = random.choice([12, 24, 36])
        end_date = start_date + timedelta(days=term_months * 30)
        
        arr = self.faker.generate_arr()
        
        contract = {
            "id": self.faker.generate_contract_id(),
            "tenant_id": self.faker.tenant_id,
            "snapshot_id": self.faker.snapshot_id,
            "customer_id": customer_id,
            "external_id": self.faker._full_uuid(),
            "name": f"Contract {self.stats['contracts_generated'] + 1}",
            "start_date": start_date,
            "end_date": end_date,
            "arr": arr,
            "currency": self._get_currency() if self.scenario.multi_currency else "USD",
            "billing_frequency": random.choice(["monthly", "quarterly", "annually"]),
            "status": "active" if end_date > date.today() else "expired",
        }
        
        return contract
    
    def _get_currency(self) -> str:
        """Get a random currency."""
        currencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"]
        weights = [0.5, 0.2, 0.1, 0.1, 0.05, 0.05]
        return random.choices(currencies, weights=weights)[0]
    
    def generate_invoices(
        self,
        contracts: list[dict[str, Any]],
    ) -> Iterator[dict[str, Any]]:
        """Generate invoices for contracts."""
        min_i, max_i = self.scenario.invoices_per_contract
        
        for contract in contracts:
            invoice_count = random.randint(min_i, max_i)
            
            for i in range(invoice_count):
                invoice = self._generate_invoice(contract, i)
                self.stats["invoices_generated"] += 1
                yield invoice
    
    def _generate_invoice(
        self,
        contract: dict[str, Any],
        index: int,
    ) -> dict[str, Any]:
        """Generate a single invoice."""
        # Calculate invoice date based on billing frequency
        freq = contract.get("billing_frequency", "monthly")
        months_offset = index * (1 if freq == "monthly" else 3 if freq == "quarterly" else 12)
        
        invoice_date = contract["start_date"] + timedelta(days=months_offset * 30)
        
        # Calculate amount
        arr = contract.get("arr", Decimal("120000"))
        if freq == "monthly":
            amount = arr / 12
        elif freq == "quarterly":
            amount = arr / 4
        else:
            amount = arr
        
        return {
            "id": self.faker.generate_invoice_id(),
            "tenant_id": self.faker.tenant_id,
            "snapshot_id": self.faker.snapshot_id,
            "customer_id": contract["customer_id"],
            "contract_id": contract["id"],
            "external_id": self.faker._full_uuid(),
            "invoice_number": self.faker.generate_invoice_number(),
            "invoice_date": invoice_date,
            "due_date": invoice_date + timedelta(days=30),
            "total": amount,
            "currency": contract.get("currency", "USD"),
            "status": "paid" if invoice_date < date.today() - timedelta(days=30) else "open",
        }
    
    def generate_usage_records(
        self,
        contracts: list[dict[str, Any]],
    ) -> Iterator[dict[str, Any]]:
        """Generate usage records for contracts."""
        if not self.scenario.usage_based:
            return
        
        min_u, max_u = self.scenario.usage_records_per_contract
        meters = ["api_calls", "storage_gb", "compute_hours", "transactions"]
        
        for contract in contracts:
            record_count = random.randint(min_u, max_u)
            
            for _ in range(record_count):
                usage = {
                    "id": f"usage_{self.faker._short_uuid()}",
                    "tenant_id": self.faker.tenant_id,
                    "snapshot_id": self.faker.snapshot_id,
                    "customer_id": contract["customer_id"],
                    "contract_id": contract["id"],
                    "external_id": self.faker._full_uuid(),
                    "meter_name": random.choice(meters),
                    "quantity": Decimal(str(random.randint(1, 10000))),
                    "timestamp": datetime.now() - timedelta(
                        days=random.randint(0, self.scenario.time_range_months * 30)
                    ),
                }
                self.stats["usage_records_generated"] += 1
                yield usage
    
    def generate_all(self) -> dict[str, list[dict[str, Any]]]:
        """
        Generate all data (for smaller datasets).
        
        Warning: For large scenarios, use iterators instead.
        """
        self.stats["start_time"] = datetime.now()
        
        customers = list(self.generate_customers())
        customer_ids = [c["id"] for c in customers]
        
        contracts = list(self.generate_contracts(customer_ids))
        invoices = list(self.generate_invoices(contracts))
        usage = list(self.generate_usage_records(contracts))
        
        self.stats["end_time"] = datetime.now()
        
        return {
            "customers": customers,
            "contracts": contracts,
            "invoices": invoices,
            "usage_records": usage,
            "stats": self.stats.copy(),
        }
    
    def get_stats(self) -> dict[str, Any]:
        """Get generation statistics."""
        stats = self.stats.copy()
        if stats["start_time"] and stats["end_time"]:
            stats["duration_seconds"] = (
                stats["end_time"] - stats["start_time"]
            ).total_seconds()
        return stats
