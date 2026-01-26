"""
Multi-tenant and snapshot drift support.
"""

import random
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Any, Iterator, Optional
import copy


@dataclass
class TenantConfig:
    """Configuration for a tenant."""
    tenant_id: str
    name: str
    
    # Scale settings
    customer_count: int = 50
    contract_scale: float = 1.0  # Multiplier for contracts per customer
    
    # Feature settings
    multi_currency: bool = False
    usage_based: bool = False
    amendments_enabled: bool = True
    
    # Data quality settings
    anomaly_rate: float = 0.05
    discrepancy_rate: float = 0.10
    
    # Currency distribution
    primary_currency: str = "USD"
    secondary_currencies: list[str] = field(default_factory=lambda: ["EUR", "GBP"])
    
    # Industry/segment for realistic data
    industry: Optional[str] = None


# Pre-defined tenant configurations
DEFAULT_TENANTS = [
    TenantConfig(
        tenant_id="tenant_enterprise",
        name="Enterprise Corp",
        customer_count=200,
        contract_scale=2.0,
        multi_currency=True,
        usage_based=True,
        industry="technology",
    ),
    TenantConfig(
        tenant_id="tenant_smb",
        name="SMB Inc",
        customer_count=50,
        contract_scale=0.5,
        multi_currency=False,
        usage_based=False,
        industry="retail",
    ),
    TenantConfig(
        tenant_id="tenant_startup",
        name="Startup.io",
        customer_count=20,
        contract_scale=1.0,
        multi_currency=False,
        usage_based=True,
        industry="saas",
    ),
]


class SnapshotDriftType(str, Enum):
    """Types of changes between snapshots."""
    NEW_CUSTOMER = "new_customer"
    CHURNED_CUSTOMER = "churned_customer"
    NEW_CONTRACT = "new_contract"
    AMENDED_CONTRACT = "amended_contract"
    RENEWED_CONTRACT = "renewed_contract"
    CANCELLED_CONTRACT = "cancelled_contract"
    NEW_INVOICE = "new_invoice"
    PAID_INVOICE = "paid_invoice"
    AMOUNT_CHANGE = "amount_change"
    STATUS_CHANGE = "status_change"


@dataclass
class SnapshotDrift:
    """Represents changes between two snapshots."""
    from_snapshot_id: str
    to_snapshot_id: str
    drift_date: date
    changes: list[dict[str, Any]] = field(default_factory=list)
    
    def add_change(
        self,
        drift_type: SnapshotDriftType,
        entity_type: str,
        entity_id: str,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Add a change to the drift."""
        self.changes.append({
            "type": drift_type.value,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "details": details or {},
        })
    
    @property
    def summary(self) -> dict[str, int]:
        """Get summary of changes by type."""
        summary = {}
        for change in self.changes:
            drift_type = change["type"]
            summary[drift_type] = summary.get(drift_type, 0) + 1
        return summary


class MultiTenantGenerator:
    """
    Generates data for multiple tenants with snapshot drift.
    """
    
    def __init__(
        self,
        tenants: Optional[list[TenantConfig]] = None,
        faker_support=None,
        seed: Optional[int] = None,
    ):
        """Initialize the multi-tenant generator."""
        from ..support.generators import FakerSupport
        
        self.tenants = tenants or DEFAULT_TENANTS
        self.base_faker = faker_support or FakerSupport(seed=seed)
        
        if seed is not None:
            random.seed(seed)
        
        # Track state for each tenant
        self._tenant_state: dict[str, dict[str, Any]] = {}
        self._snapshot_counter: dict[str, int] = {}
    
    def generate_tenant_data(
        self,
        tenant: TenantConfig,
    ) -> dict[str, list[dict[str, Any]]]:
        """
        Generate full dataset for a single tenant.
        
        Returns:
            Dictionary with customers, contracts, invoices
        """
        # Create tenant-specific faker
        faker = copy.copy(self.base_faker)
        faker.tenant_id = tenant.tenant_id
        faker.snapshot_id = self._get_next_snapshot_id(tenant.tenant_id)
        
        # Generate customers
        customers = []
        for _ in range(tenant.customer_count):
            customer = faker.generate_customer()
            customer["tenant_id"] = tenant.tenant_id
            customers.append(customer)
        
        # Generate contracts
        contracts = []
        for customer in customers:
            num_contracts = max(1, int(random.randint(1, 3) * tenant.contract_scale))
            
            for _ in range(num_contracts):
                contract = self._generate_tenant_contract(
                    faker, customer, tenant
                )
                contracts.append(contract)
        
        # Generate invoices
        invoices = []
        for contract in contracts:
            num_invoices = random.randint(1, 12)
            for i in range(num_invoices):
                invoice = self._generate_tenant_invoice(
                    faker, contract, i
                )
                invoices.append(invoice)
        
        # Store state
        self._tenant_state[tenant.tenant_id] = {
            "customers": customers,
            "contracts": contracts,
            "invoices": invoices,
            "snapshot_id": faker.snapshot_id,
        }
        
        return {
            "customers": customers,
            "contracts": contracts,
            "invoices": invoices,
            "metadata": {
                "tenant_id": tenant.tenant_id,
                "snapshot_id": faker.snapshot_id,
                "generated_at": datetime.utcnow().isoformat(),
            },
        }
    
    def _get_next_snapshot_id(self, tenant_id: str) -> str:
        """Get the next snapshot ID for a tenant."""
        counter = self._snapshot_counter.get(tenant_id, 0)
        self._snapshot_counter[tenant_id] = counter + 1
        return f"snap_{tenant_id}_{counter:04d}"
    
    def _generate_tenant_contract(
        self,
        faker,
        customer: dict[str, Any],
        tenant: TenantConfig,
    ) -> dict[str, Any]:
        """Generate a contract for a tenant."""
        dates = faker.generate_contract_dates()
        arr = faker.generate_arr()
        
        # Multi-currency support
        if tenant.multi_currency and random.random() > 0.5:
            currency = random.choice(tenant.secondary_currencies)
        else:
            currency = tenant.primary_currency
        
        return {
            "id": faker.generate_contract_id(),
            "tenant_id": tenant.tenant_id,
            "snapshot_id": faker.snapshot_id,
            "customer_id": customer["id"],
            "external_id": faker._full_uuid(),
            "name": f"Contract with {customer['name']}",
            "start_date": dates["start_date"],
            "end_date": dates["end_date"],
            "arr": arr,
            "currency": currency,
            "billing_frequency": random.choice(["monthly", "quarterly", "annually"]),
            "status": "active",
        }
    
    def _generate_tenant_invoice(
        self,
        faker,
        contract: dict[str, Any],
        index: int,
    ) -> dict[str, Any]:
        """Generate an invoice for a contract."""
        freq = contract.get("billing_frequency", "monthly")
        
        # Calculate period based on billing frequency
        if freq == "monthly":
            period_days = 30
            divisor = 12
        elif freq == "quarterly":
            period_days = 90
            divisor = 4
        else:  # annually
            period_days = 365
            divisor = 1
        
        months_offset = index * (1 if freq == "monthly" else 3 if freq == "quarterly" else 12)
        
        # Calculate period start/end
        period_start = contract["start_date"] + timedelta(days=months_offset * 30)
        period_end = period_start + timedelta(days=period_days - 1)
        
        # Invoice date is typically at the start of the period
        invoice_date = period_start
        
        arr = contract.get("arr", Decimal("120000"))
        amount = arr / divisor
        
        return {
            "id": faker.generate_invoice_id(),
            "tenant_id": contract["tenant_id"],
            "snapshot_id": faker.snapshot_id,
            "customer_id": contract["customer_id"],
            "contract_id": contract["id"],
            "external_id": faker._full_uuid(),
            "invoice_number": faker.generate_invoice_number(),
            "invoice_date": invoice_date.isoformat() if hasattr(invoice_date, 'isoformat') else invoice_date,
            "due_date": (invoice_date + timedelta(days=30)).isoformat() if hasattr(invoice_date, 'isoformat') else invoice_date + timedelta(days=30),
            "period_start": period_start.isoformat() if hasattr(period_start, 'isoformat') else period_start,
            "period_end": period_end.isoformat() if hasattr(period_end, 'isoformat') else period_end,
            "total": float(amount) if hasattr(amount, '__float__') else amount,
            "currency": contract.get("currency", "USD"),
            "status": "paid" if period_start < date.today() - timedelta(days=30) else "open",
        }
    
    def generate_snapshot_drift(
        self,
        tenant_id: str,
        drift_config: Optional[dict[str, float]] = None,
    ) -> tuple[dict[str, list[dict[str, Any]]], SnapshotDrift]:
        """
        Generate a new snapshot with drift from previous state.
        
        Args:
            tenant_id: Tenant to generate drift for
            drift_config: Configuration for drift rates
            
        Returns:
            Tuple of (new data, drift record)
        """
        if tenant_id not in self._tenant_state:
            raise ValueError(f"No previous state for tenant {tenant_id}")
        
        default_drift = {
            "new_customer_rate": 0.10,
            "churn_rate": 0.05,
            "new_contract_rate": 0.15,
            "amendment_rate": 0.10,
            "renewal_rate": 0.05,
            "cancellation_rate": 0.03,
            "payment_rate": 0.80,
        }
        drift_config = drift_config or default_drift
        
        prev_state = self._tenant_state[tenant_id]
        new_snapshot_id = self._get_next_snapshot_id(tenant_id)
        
        drift = SnapshotDrift(
            from_snapshot_id=prev_state["snapshot_id"],
            to_snapshot_id=new_snapshot_id,
            drift_date=date.today(),
        )
        
        # Copy and update data
        customers = copy.deepcopy(prev_state["customers"])
        contracts = copy.deepcopy(prev_state["contracts"])
        invoices = copy.deepcopy(prev_state["invoices"])
        
        # Update snapshot IDs
        for c in customers:
            c["snapshot_id"] = new_snapshot_id
        for c in contracts:
            c["snapshot_id"] = new_snapshot_id
        for i in invoices:
            i["snapshot_id"] = new_snapshot_id
        
        # Apply drift: new customers
        tenant = next((t for t in self.tenants if t.tenant_id == tenant_id), None)
        if tenant:
            new_count = int(len(customers) * drift_config.get("new_customer_rate", 0.1))
            for _ in range(new_count):
                faker = copy.copy(self.base_faker)
                faker.tenant_id = tenant_id
                faker.snapshot_id = new_snapshot_id
                new_customer = faker.generate_customer()
                new_customer["tenant_id"] = tenant_id
                customers.append(new_customer)
                drift.add_change(
                    SnapshotDriftType.NEW_CUSTOMER,
                    "customer",
                    new_customer["id"],
                )
        
        # Apply drift: churned customers
        churn_count = int(len(customers) * drift_config.get("churn_rate", 0.05))
        for _ in range(min(churn_count, len(customers) - 1)):
            churned = random.choice(customers)
            churned["status"] = "churned"
            drift.add_change(
                SnapshotDriftType.CHURNED_CUSTOMER,
                "customer",
                churned["id"],
            )
        
        # Apply drift: invoice payments
        open_invoices = [i for i in invoices if i.get("status") == "open"]
        payment_count = int(len(open_invoices) * drift_config.get("payment_rate", 0.8))
        for inv in random.sample(open_invoices, min(payment_count, len(open_invoices))):
            inv["status"] = "paid"
            inv["paid_date"] = date.today().isoformat()
            drift.add_change(
                SnapshotDriftType.PAID_INVOICE,
                "invoice",
                inv["id"],
            )
        
        # Apply drift: new contracts for existing customers
        if tenant and customers:
            new_contract_count = int(len(contracts) * drift_config.get("new_contract_rate", 0.15))
            for _ in range(new_contract_count):
                # Pick a random active customer
                active_customers = [c for c in customers if c.get("status") != "churned"]
                if not active_customers:
                    break
                customer = random.choice(active_customers)
                
                faker = copy.copy(self.base_faker)
                faker.tenant_id = tenant_id
                faker.snapshot_id = new_snapshot_id
                
                # Generate new contract
                new_contract = self._generate_tenant_contract(faker, customer, tenant)
                new_contract["snapshot_id"] = new_snapshot_id
                contracts.append(new_contract)
                
                # Generate initial invoice for the new contract
                new_invoice = self._generate_tenant_invoice(faker, new_contract, 0)
                new_invoice["snapshot_id"] = new_snapshot_id
                invoices.append(new_invoice)
                
                drift.add_change(
                    SnapshotDriftType.NEW_CONTRACT,
                    "contract",
                    new_contract["id"],
                )
        
        # Apply drift: contract amendments (price changes)
        active_contracts = [c for c in contracts if c.get("status") == "active"]
        amend_count = int(len(active_contracts) * drift_config.get("amendment_rate", 0.10))
        for contract in random.sample(active_contracts, min(amend_count, len(active_contracts))):
            old_arr = contract.get("arr", Decimal("120000"))
            # Amendment: 10-30% price change
            change_pct = random.uniform(-0.15, 0.30)
            new_arr = Decimal(str(old_arr)) * Decimal(str(1 + change_pct))
            contract["arr"] = float(new_arr.quantize(Decimal("0.01")))
            contract["version"] = contract.get("version", 1) + 1
            contract["amended_date"] = date.today().isoformat()
            
            # Generate proration/adjustment invoice for amendment
            faker = copy.copy(self.base_faker)
            faker.tenant_id = tenant_id
            faker.snapshot_id = new_snapshot_id
            
            proration_amount = abs(float(new_arr) - float(old_arr)) / 12  # Monthly proration
            amendment_invoice = {
                "id": faker.generate_invoice_id(),
                "tenant_id": contract["tenant_id"],
                "snapshot_id": new_snapshot_id,
                "customer_id": contract["customer_id"],
                "contract_id": contract["id"],
                "external_id": faker._full_uuid(),
                "invoice_number": faker.generate_invoice_number(),
                "invoice_date": date.today().isoformat(),
                "due_date": (date.today() + timedelta(days=30)).isoformat(),
                "period_start": date.today().isoformat(),
                "period_end": (date.today() + timedelta(days=30)).isoformat(),
                "total": round(proration_amount, 2),
                "currency": contract.get("currency", "USD"),
                "status": "open",
                "invoice_type": "amendment_proration",
                "amendment_reference": contract["id"],
            }
            invoices.append(amendment_invoice)
            
            drift.add_change(
                SnapshotDriftType.AMENDED_CONTRACT,
                "contract",
                contract["id"],
                {"old_arr": float(old_arr), "new_arr": contract["arr"], "proration_invoice": amendment_invoice["id"]},
            )
        
        # Apply drift: contract renewals
        # Find contracts near end date
        renewal_candidates = [
            c for c in contracts 
            if c.get("status") == "active" and c.get("end_date")
        ]
        renewal_count = int(len(renewal_candidates) * drift_config.get("renewal_rate", 0.05))
        for contract in random.sample(renewal_candidates, min(renewal_count, len(renewal_candidates))):
            old_end = contract.get("end_date")
            if isinstance(old_end, str):
                old_end_date = date.fromisoformat(old_end[:10])
            else:
                old_end_date = old_end
            
            # Extend by 12 months
            new_end_date = old_end_date + timedelta(days=365)
            contract["end_date"] = new_end_date.isoformat()
            contract["status"] = "renewed"
            contract["renewed_date"] = date.today().isoformat()
            
            # Generate first invoice for renewal period
            faker = copy.copy(self.base_faker)
            faker.tenant_id = tenant_id
            faker.snapshot_id = new_snapshot_id
            
            renewal_invoice = self._generate_tenant_invoice(faker, contract, 0)
            renewal_invoice["snapshot_id"] = new_snapshot_id
            renewal_invoice["invoice_type"] = "renewal"
            renewal_invoice["renewal_reference"] = contract["id"]
            invoices.append(renewal_invoice)
            
            drift.add_change(
                SnapshotDriftType.RENEWED_CONTRACT,
                "contract",
                contract["id"],
                {"old_end_date": str(old_end), "new_end_date": contract["end_date"], "renewal_invoice": renewal_invoice["id"]},
            )
        
        # Apply drift: contract cancellations
        cancel_candidates = [c for c in contracts if c.get("status") == "active"]
        cancel_count = int(len(cancel_candidates) * drift_config.get("cancellation_rate", 0.03))
        for contract in random.sample(cancel_candidates, min(cancel_count, len(cancel_candidates))):
            contract["status"] = "cancelled"
            contract["cancelled_date"] = date.today().isoformat()
            cancellation_reason = random.choice([
                "customer_request",
                "non_payment",
                "business_closure",
                "competitor_switch",
            ])
            contract["cancellation_reason"] = cancellation_reason
            
            # Generate credit memo for unused portion (if applicable)
            if cancellation_reason in ["customer_request", "business_closure"]:
                faker = copy.copy(self.base_faker)
                faker.tenant_id = tenant_id
                faker.snapshot_id = new_snapshot_id
                
                # Calculate unused portion (simplified)
                arr = contract.get("arr", Decimal("120000"))
                remaining_months = random.randint(1, 6)  # Assume 1-6 months remaining
                credit_amount = float(Decimal(str(arr)) / 12 * remaining_months)
                
                credit_memo = {
                    "id": faker.generate_invoice_id(),
                    "tenant_id": contract["tenant_id"],
                    "snapshot_id": new_snapshot_id,
                    "customer_id": contract["customer_id"],
                    "contract_id": contract["id"],
                    "external_id": faker._full_uuid(),
                    "invoice_number": f"CM-{faker.generate_invoice_number()}",
                    "invoice_date": date.today().isoformat(),
                    "due_date": date.today().isoformat(),
                    "period_start": date.today().isoformat(),
                    "period_end": contract.get("end_date"),
                    "total": -round(credit_amount, 2),  # Negative for credit
                    "currency": contract.get("currency", "USD"),
                    "status": "finalized",
                    "invoice_type": "credit_memo",
                    "cancellation_reference": contract["id"],
                }
                invoices.append(credit_memo)
                contract["credit_memo_id"] = credit_memo["id"]
            
            drift.add_change(
                SnapshotDriftType.CANCELLED_CONTRACT,
                "contract",
                contract["id"],
            )
        
        # Store new state
        self._tenant_state[tenant_id] = {
            "customers": customers,
            "contracts": contracts,
            "invoices": invoices,
            "snapshot_id": new_snapshot_id,
        }
        
        return {
            "customers": customers,
            "contracts": contracts,
            "invoices": invoices,
            "metadata": {
                "tenant_id": tenant_id,
                "snapshot_id": new_snapshot_id,
                "generated_at": datetime.utcnow().isoformat(),
            },
        }, drift
    
    def generate_all_tenants(self) -> dict[str, dict[str, list[dict[str, Any]]]]:
        """Generate data for all tenants."""
        result = {}
        for tenant in self.tenants:
            result[tenant.tenant_id] = self.generate_tenant_data(tenant)
        return result
    
    def get_tenant_state(self, tenant_id: str) -> Optional[dict[str, Any]]:
        """Get current state for a tenant."""
        return self._tenant_state.get(tenant_id)
