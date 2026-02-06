#!/usr/bin/env python3
"""
Comprehensive Data Generator for Stress Testing Cogtics

This script generates a complete dataset that covers:
- All 70 detection rules (R001-R173)
- Multi-snapshot drift scenarios
- Simulation test data
- Connector payloads (Stripe, Salesforce, HubSpot, QuickBooks, DocuSign)
- Upload edge cases
- Identity resolution test data
- Worker/queue stress scenarios
- AI-assisted detection test cases
- Ground truth export for validation

Usage:
    python generate_comprehensive.py [options]

Options:
    --size SIZE        Dataset size: minimal, small, medium, large, stress (default: small)
    --tenants N        Number of tenants (default: 1)
    --snapshots N      Number of snapshots per tenant (default: 2)
    --output DIR       Output directory (default: output/comprehensive)
    --seed N           Random seed for reproducibility
    --with-ai          Include AI test cases
    --with-connectors  Include connector payloads
    --with-uploads     Include upload edge cases
    --verbose          Verbose output
"""

import argparse
import json
import logging
import os
import random
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import uuid

from dateutil.relativedelta import relativedelta

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.models.contracts import Contract, ContractStatus, BillingFrequency
from src.models.invoices import Invoice, InvoiceLine, InvoiceStatus
from src.models.customers import Customer
from src.models.revrec import RevenueObligation, RevenueSchedule, RevenueAllocation
from src.models.contract_terms import ContractTermsGenerator, ContractTermsCollection
from src.models.usage import UsageEvent

from src.scenarios.billing import BillingScenarioGenerator, BILLING_SCENARIOS, ExpectedIssue
from src.scenarios.discounts import DiscountScenarioGenerator, DISCOUNT_SCENARIOS
from src.scenarios.revrec import RevRecScenarioGenerator, REVREC_SCENARIOS
from src.scenarios.data_quality import DataQualityScenarioGenerator, DATA_QUALITY_SCENARIOS
from src.scenarios.ai_test_cases import AITestCaseGenerator

from src.support.generators import FakerSupport
from src.exporters.json_export import JSONExporter
from src.exporters.csv_export import CSVExporter
from src.connectors import QuickBooksPayloadGenerator, DocuSignPayloadGenerator

# LLM synthesis (optional)
try:
    from src.llm import LLMClient, HybridContractGenerator, InvoiceTextGenerator, CRMNotesGenerator
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Dataset size configurations from the plan
SIZE_CONFIGS = {
    "tiny": {
        "tenants": 1,
        "snapshots": 1,
        "customers": 3,
        "contracts": 5,
        "invoices_per_contract": 3,
        "usage_events": 20,
        "expected_issues": 10,
    },
    "minimal": {
        "tenants": 1,
        "snapshots": 1,
        "customers": 5,
        "contracts": 10,
        "invoices_per_contract": 5,
        "usage_events": 100,
        "expected_issues": 20,
    },
    "small": {
        "tenants": 1,
        "snapshots": 2,
        "customers": 25,
        "contracts": 75,
        "invoices_per_contract": 7,
        "usage_events": 1000,
        "expected_issues": 100,
    },
    "medium": {
        "tenants": 2,
        "snapshots": 3,
        "customers": 100,
        "contracts": 400,
        "invoices_per_contract": 8,
        "usage_events": 10000,
        "expected_issues": 500,
    },
    "large": {
        "tenants": 3,
        "snapshots": 4,
        "customers": 500,
        "contracts": 2000,
        "invoices_per_contract": 10,
        "usage_events": 100000,
        "expected_issues": 3000,
    },
    "stress": {
        "tenants": 5,
        "snapshots": 5,
        "customers": 2000,
        "contracts": 15000,
        "invoices_per_contract": 10,
        "usage_events": 500000,
        "expected_issues": 20000,
    },
}


class ComprehensiveDataGenerator:
    """Generates comprehensive test data for all rule coverage."""
    
    def __init__(
        self,
        size: str = "small",
        seed: Optional[int] = None,
        output_dir: str = "output/comprehensive",
        with_llm: bool = False,
    ):
        self.size = size
        self.config = SIZE_CONFIGS.get(size, SIZE_CONFIGS["small"])
        self.output_dir = Path(output_dir)
        self.seed = seed or random.randint(1, 100000)
        self.with_llm = with_llm
        
        random.seed(self.seed)
        
        # Data stores
        self.tenants: List[Dict] = []
        self.customers: List[Customer] = []
        self.contracts: List[Contract] = []
        self.invoices: List[Invoice] = []
        self.usage_events: List[UsageEvent] = []
        self.obligations: List[RevenueObligation] = []
        self.schedules: List[RevenueSchedule] = []
        self.allocations: List[RevenueAllocation] = []
        self.contract_terms: List[ContractTermsCollection] = []
        self.expected_issues: List[ExpectedIssue] = []
        self.ai_test_cases: List[Dict] = []
        
        # Helpers
        self.faker = None
        self.terms_generator = None
        self.llm_client = None
        
        # Initialize LLM if requested
        if with_llm and LLM_AVAILABLE:
            try:
                self.llm_client = LLMClient()
                if self.llm_client.is_configured():
                    logger.info("LLM synthesis enabled")
                else:
                    logger.warning("LLM API key not configured - synthesis disabled")
                    self.llm_client = None
            except Exception as e:
                logger.warning(f"Failed to initialize LLM client: {e}")
                self.llm_client = None
    
    def generate(
        self,
        with_ai: bool = True,
        with_connectors: bool = False,
        with_uploads: bool = False,
    ) -> Dict[str, Any]:
        """
        Generate comprehensive dataset.
        
        Returns:
            Dictionary with all generated data
        """
        logger.info(f"Generating comprehensive dataset: size={self.size}, seed={self.seed}")
        
        # Initialize output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate tenants and snapshots
        for t in range(self.config["tenants"]):
            tenant_id = f"tenant_{t+1:03d}"
            self.tenants.append({"id": tenant_id, "name": f"Test Tenant {t+1}"})
            
            for s in range(self.config["snapshots"]):
                snapshot_id = f"snap_{s+1:03d}"
                logger.info(f"Generating data for {tenant_id}/{snapshot_id}")
                
                self._generate_snapshot_data(tenant_id, snapshot_id, s)
        
        # Generate AI test cases
        if with_ai:
            self._generate_ai_test_cases()
        
        # Generate connector payloads
        if with_connectors:
            self._generate_connector_payloads()
        
        # Generate upload edge cases
        if with_uploads:
            self._generate_upload_edge_cases()
        
        # Export all data
        self._export_data()
        
        # Generate summary
        summary = self._generate_summary()
        
        logger.info(f"Generation complete: {len(self.expected_issues)} expected issues")
        
        return summary
    
    def _generate_snapshot_data(
        self,
        tenant_id: str,
        snapshot_id: str,
        snapshot_index: int,
    ):
        """Generate data for a single snapshot."""
        self.faker = FakerSupport(seed=self.seed)
        self.faker.tenant_id = tenant_id
        self.faker.snapshot_id = snapshot_id
        self.terms_generator = ContractTermsGenerator(tenant_id, snapshot_id)
        
        as_of = date.today() - timedelta(days=30 * snapshot_index)
        
        # Generate customers
        customers = self._generate_customers(tenant_id, snapshot_id)
        self.customers.extend(customers)
        
        # Generate contracts with terms
        contracts = self._generate_contracts(tenant_id, snapshot_id, customers, as_of)
        self.contracts.extend(contracts)
        
        # Generate rule-based scenarios
        self._generate_billing_scenarios(tenant_id, snapshot_id, contracts, as_of)
        self._generate_discount_scenarios(tenant_id, snapshot_id, contracts, as_of)
        self._generate_revrec_scenarios(tenant_id, snapshot_id, contracts, as_of)
        self._generate_data_quality_scenarios(tenant_id, snapshot_id, contracts, as_of)
    
    def _generate_customers(
        self,
        tenant_id: str,
        snapshot_id: str,
    ) -> List[Customer]:
        """Generate customers."""
        customers = []
        
        for i in range(self.config["customers"]):
            customer = Customer(
                id=f"cust_{uuid.uuid4().hex[:12]}",
                tenant_id=tenant_id,
                snapshot_id=snapshot_id,
                external_id=str(uuid.uuid4()),
                name=self.faker.fake.company(),
                email=self.faker.fake.company_email(),
                status="active",
            )
            customers.append(customer)
        
        return customers
    
    def _generate_contracts(
        self,
        tenant_id: str,
        snapshot_id: str,
        customers: List[Customer],
        as_of: date,
    ) -> List[Contract]:
        """Generate contracts with explicit terms."""
        contracts = []
        
        contracts_per_customer = max(1, self.config["contracts"] // len(customers))
        
        for customer in customers:
            for _ in range(contracts_per_customer):
                if len(contracts) >= self.config["contracts"]:
                    break
                
                # Generate contract
                start_date = as_of - timedelta(days=random.randint(30, 365))
                end_date = start_date + relativedelta(years=1)
                arr = Decimal(str(random.randint(10000, 250000)))
                
                # Generate contract name
                contract_type = random.choice([
                    "Enterprise License", "Platform Agreement", "SaaS Subscription",
                    "Professional Services", "Support Agreement", "Master Services"
                ])
                contract_name = f"{customer.name} - {contract_type}"
                
                # Use LLM for realistic descriptions if available
                description = None
                if self.llm_client:
                    try:
                        description = self.llm_client.generate(
                            f"Generate a 1-2 sentence business contract description for a {contract_type} "
                            f"between a SaaS vendor and {customer.name}. ARR: ${arr:,.0f}. "
                            f"Be concise and professional.",
                            max_tokens=100,
                        )
                    except Exception as e:
                        logger.debug(f"LLM description generation failed: {e}")
                
                contract = Contract(
                    id=f"con_{uuid.uuid4().hex[:12]}",
                    tenant_id=tenant_id,
                    snapshot_id=snapshot_id,
                    customer_id=customer.id,
                    external_id=str(uuid.uuid4()),
                    name=contract_name,
                    status=ContractStatus.ACTIVE,
                    start_date=start_date,
                    end_date=end_date,
                    arr=arr,
                    currency=random.choice(["USD", "USD", "USD", "EUR", "GBP"]),
                    billing_frequency=random.choice([BillingFrequency.MONTHLY, BillingFrequency.QUARTERLY]),
                    auto_renew=random.choice([True, False]),
                )
                
                # Add LLM-generated description to metadata if available
                if description and hasattr(contract, 'metadata'):
                    contract.metadata["description"] = description
                
                contracts.append(contract)
                
                # Generate terms
                terms = self.terms_generator.generate_standard_terms(
                    contract_id=contract.id,
                    arr=arr,
                    start_date=start_date,
                    end_date=end_date,
                    with_discount=random.random() > 0.5,
                    with_ramp=random.random() > 0.8,
                    with_usage=random.random() > 0.7,
                )
                self.contract_terms.append(terms)
        
        return contracts
    
    def _generate_billing_scenarios(
        self,
        tenant_id: str,
        snapshot_id: str,
        contracts: List[Contract],
        as_of: date,
    ):
        """Generate billing rule scenarios (R001-R010, R017-R018)."""
        generator = BillingScenarioGenerator(
            tenant_id=tenant_id,
            snapshot_id=snapshot_id,
            seed=self.seed,
        )
        
        invoices, issues = generator.generate_billing_scenarios(
            contracts=contracts,
            as_of=as_of,
        )
        
        self.invoices.extend(invoices)
        self.expected_issues.extend(issues)
        
        logger.info(f"  Billing scenarios: {len(invoices)} invoices, {len(issues)} issues")
    
    def _generate_discount_scenarios(
        self,
        tenant_id: str,
        snapshot_id: str,
        contracts: List[Contract],
        as_of: date,
    ):
        """Generate discount rule scenarios (R011-R016)."""
        generator = DiscountScenarioGenerator(
            tenant_id=tenant_id,
            snapshot_id=snapshot_id,
            seed=self.seed,
        )
        
        invoices, issues = generator.generate_discount_scenarios(
            contracts=contracts,
            as_of=as_of,
        )
        
        self.invoices.extend(invoices)
        self.expected_issues.extend(issues)
        
        logger.info(f"  Discount scenarios: {len(invoices)} invoices, {len(issues)} issues")
    
    def _generate_revrec_scenarios(
        self,
        tenant_id: str,
        snapshot_id: str,
        contracts: List[Contract],
        as_of: date,
    ):
        """Generate revenue recognition scenarios (R020-R027)."""
        generator = RevRecScenarioGenerator(
            tenant_id=tenant_id,
            snapshot_id=snapshot_id,
            seed=self.seed,
        )
        
        obligations, schedules, allocations, deferred, issues = generator.generate_revrec_scenarios(
            contracts=contracts,
            as_of=as_of,
        )
        
        self.obligations.extend(obligations)
        self.schedules.extend(schedules)
        self.allocations.extend(allocations)
        self.expected_issues.extend(issues)
        
        logger.info(f"  RevRec scenarios: {len(obligations)} obligations, {len(issues)} issues")
    
    def _generate_data_quality_scenarios(
        self,
        tenant_id: str,
        snapshot_id: str,
        contracts: List[Contract],
        as_of: date,
    ):
        """Generate data quality scenarios (R100-R105 and others)."""
        generator = DataQualityScenarioGenerator(
            tenant_id=tenant_id,
            snapshot_id=snapshot_id,
            seed=self.seed,
        )
        
        invoices, usage_events, metadata, issues = generator.generate_data_quality_scenarios(
            contracts=contracts,
            invoices=self.invoices,
            as_of=as_of,
        )
        
        self.invoices.extend(invoices)
        self.usage_events.extend(usage_events)
        self.expected_issues.extend(issues)
        
        logger.info(f"  Data quality scenarios: {len(usage_events)} usage events, {len(issues)} issues")
    
    def _generate_ai_test_cases(self):
        """Generate AI detection test cases."""
        logger.info("Generating AI test cases...")
        
        # Convert to dicts for AI generator
        contracts_dict = [
            {
                "id": c.id,
                "customer_id": c.customer_id,
                "arr": float(c.arr or 0),
                "total_value": float(c.arr or 0),
                "start_date": c.start_date.isoformat() if c.start_date else None,
            }
            for c in self.contracts
        ]
        
        invoices_dict = [
            {
                "id": inv.id,
                "contract_id": inv.contract_id,
                "customer_id": inv.customer_id,
                "invoice_date": inv.invoice_date,
                "total": float(inv.total),
            }
            for inv in self.invoices
        ]
        
        generator = AITestCaseGenerator(seed=self.seed)
        test_cases, ai_issues = generator.generate_comprehensive_ai_scenarios(
            contracts=contracts_dict,
            invoices=invoices_dict,
        )
        
        self.ai_test_cases = generator.to_ground_truth()
        self.expected_issues.extend(ai_issues)
        
        logger.info(f"  AI test cases: {len(test_cases)} cases, {len(ai_issues)} issues")
    
    def _generate_connector_payloads(self):
        """Generate raw connector payloads for integration testing."""
        logger.info("Generating connector payloads...")
        
        connectors_dir = self.output_dir / "connectors"
        
        # Stripe payloads
        self._generate_stripe_payloads(connectors_dir / "stripe")
        
        # Salesforce payloads
        self._generate_salesforce_payloads(connectors_dir / "salesforce")
        
        # HubSpot payloads
        self._generate_hubspot_payloads(connectors_dir / "hubspot")

        # QuickBooks payloads
        self._generate_quickbooks_payloads(connectors_dir / "quickbooks")

        # DocuSign payloads
        self._generate_docusign_payloads(connectors_dir / "docusign")
    
    def _generate_stripe_payloads(self, output_dir: Path):
        """Generate Stripe connector payloads."""
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate sample Stripe events
        events = []
        for i in range(min(50, len(self.invoices))):
            inv = self.invoices[i]
            events.append({
                "id": f"evt_{uuid.uuid4().hex[:24]}",
                "type": "invoice.paid",
                "data": {
                    "object": {
                        "id": f"in_{uuid.uuid4().hex[:24]}",
                        "customer": f"cus_{uuid.uuid4().hex[:14]}",
                        "amount_paid": int(float(inv.total) * 100),
                        "currency": inv.currency.lower(),
                        "status": "paid",
                    }
                },
                "created": int(datetime.now().timestamp()),
            })
        
        with open(output_dir / "events.json", "w") as f:
            json.dump(events, f, indent=2)
        
        # Generate idempotency edge case
        with open(output_dir / "idempotency_duplicate.json", "w") as f:
            json.dump([events[0], events[0]] if events else [], f, indent=2)
    
    def _generate_salesforce_payloads(self, output_dir: Path):
        """Generate Salesforce connector payloads."""
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate sample Salesforce opportunities
        opportunities = []
        for i, contract in enumerate(self.contracts[:50]):
            opportunities.append({
                "Id": f"006{uuid.uuid4().hex[:15]}".upper(),
                "Name": f"Opportunity {i+1}",
                "AccountId": f"001{uuid.uuid4().hex[:15]}".upper(),
                "Amount": float(contract.arr or 0),
                "StageName": "Closed Won",
                "CloseDate": contract.start_date.isoformat() if contract.start_date else None,
            })
        
        with open(output_dir / "opportunities.json", "w") as f:
            json.dump(opportunities, f, indent=2)
    
    def _generate_hubspot_payloads(self, output_dir: Path):
        """Generate HubSpot connector payloads."""
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate sample HubSpot deals
        deals = []
        for i, contract in enumerate(self.contracts[:50]):
            deals.append({
                "id": str(random.randint(10000000, 99999999)),
                "properties": {
                    "dealname": f"Deal {i+1}",
                    "amount": str(float(contract.arr or 0)),
                    "dealstage": "closedwon",
                    "closedate": contract.start_date.isoformat() if contract.start_date else None,
                },
            })
        
        with open(output_dir / "deals.json", "w") as f:
            json.dump(deals, f, indent=2)

    def _generate_quickbooks_payloads(self, output_dir: Path):
        """Generate QuickBooks connector payloads."""
        output_dir.mkdir(parents=True, exist_ok=True)
        qb_generator = QuickBooksPayloadGenerator(seed=self.seed)

        # Generate QuickBooks customers
        qb_customers = []
        customer_id_map: Dict[str, str] = {}
        for i, cust in enumerate(self.customers[:100]):
            payload = qb_generator.generate_customer(cust)
            customer_id_map[cust.id] = payload["Id"]
            qb_customers.append(payload)

        with open(output_dir / "customers.json", "w") as f:
            json.dump(qb_customers, f, indent=2)

        # Generate QuickBooks invoices
        qb_invoices = []
        invoice_id_map: Dict[str, str] = {}
        for i, inv in enumerate(self.invoices[:100]):
            cust_id = customer_id_map.get(inv.customer_id) if getattr(inv, "customer_id", None) else None
            payload = qb_generator.generate_invoice(inv, customer_id=cust_id)
            invoice_id_map[inv.id] = payload["Id"]
            qb_invoices.append(payload)

        with open(output_dir / "invoices.json", "w") as f:
            json.dump(qb_invoices, f, indent=2)

        # Generate QuickBooks payments
        qb_payments = []
        for i, inv in enumerate(self.invoices[:50]):
            if random.random() > 0.3:  # 70% have payments
                cust_id = customer_id_map.get(inv.customer_id) if getattr(inv, "customer_id", None) else None
                inv_id = invoice_id_map.get(inv.id)
                qb_payments.append(qb_generator.generate_payment(inv, customer_id=cust_id, invoice_id=inv_id))

        with open(output_dir / "payments.json", "w") as f:
            json.dump(qb_payments, f, indent=2)

    def _generate_docusign_payloads(self, output_dir: Path):
        """Generate DocuSign connector payloads."""
        output_dir.mkdir(parents=True, exist_ok=True)
        ds_generator = DocuSignPayloadGenerator(seed=self.seed)

        # Generate DocuSign envelopes (one per contract)
        envelopes = []
        for i, contract in enumerate(self.contracts[:100]):
            envelopes.append(ds_generator.generate_envelope(contract, signer_email=f"signer{i}@example.com"))

        with open(output_dir / "envelopes.json", "w") as f:
            json.dump(envelopes, f, indent=2)

    def _generate_upload_edge_cases(self):
        """Generate upload edge case files."""
        logger.info("Generating upload edge cases...")
        
        uploads_dir = self.output_dir / "uploads"
        
        # Valid uploads
        valid_dir = uploads_dir / "valid"
        valid_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate valid CSV
        self._generate_valid_csv(valid_dir)
        
        # Malformed uploads
        malformed_dir = uploads_dir / "malformed"
        malformed_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate malformed CSVs
        self._generate_malformed_csvs(malformed_dir)
    
    def _generate_valid_csv(self, output_dir: Path):
        """Generate valid CSV files."""
        # Contracts CSV
        with open(output_dir / "contracts.csv", "w") as f:
            f.write("external_id,customer_id,name,start_date,end_date,arr,currency\n")
            for c in self.contracts[:100]:
                f.write(f"{c.external_id},{c.customer_id},{c.name},{c.start_date},{c.end_date},{c.arr},{c.currency}\n")
        
        # Invoices CSV
        with open(output_dir / "invoices.csv", "w") as f:
            f.write("external_id,contract_id,customer_id,invoice_date,total,currency,status\n")
            for inv in self.invoices[:100]:
                f.write(f"{inv.external_id},{inv.contract_id},{inv.customer_id},{inv.invoice_date},{inv.total},{inv.currency},{inv.status}\n")
    
    def _generate_malformed_csvs(self, output_dir: Path):
        """Generate malformed CSV files for testing."""
        # Missing required column
        with open(output_dir / "missing_column.csv", "w") as f:
            f.write("customer_id,name,start_date\n")
            f.write("cust_001,Test Contract,2024-01-01\n")
        
        # Invalid date format
        with open(output_dir / "invalid_date.csv", "w") as f:
            f.write("external_id,customer_id,name,start_date,arr\n")
            f.write("ext_001,cust_001,Test,not-a-date,10000\n")
        
        # Negative amount
        with open(output_dir / "negative_amount.csv", "w") as f:
            f.write("external_id,invoice_date,total\n")
            f.write("ext_001,2024-01-01,-500\n")
        
        # Special characters
        with open(output_dir / "special_chars.csv", "w") as f:
            f.write("external_id,name\n")
            f.write("ext_001,\"O'Brien & Co.\"\n")
            f.write("ext_002,\"Café Münich\"\n")
        
        # UTF-16 encoding
        with open(output_dir / "utf16.csv", "w", encoding="utf-16") as f:
            f.write("external_id,name\n")
            f.write("ext_001,Test Company\n")
        
        # Semicolon delimiter
        with open(output_dir / "semicolon_delim.csv", "w") as f:
            f.write("external_id;customer_id;name;start_date;arr\n")
            f.write("ext_001;cust_001;Test;2024-01-01;10000\n")
    
    def _export_data(self):
        """Export all generated data."""
        logger.info("Exporting data...")
        
        # Create output structure
        data_dir = self.output_dir / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        
        # Export JSON
        json_exporter = JSONExporter(output_dir=data_dir)
        
        # Convert models to dicts (use model_dump for Pydantic v2)
        def to_dict(obj):
            if hasattr(obj, 'model_dump'):
                return obj.model_dump()
            elif hasattr(obj, 'dict'):
                return obj.dict()
            return obj
        
        customers_dict = [to_dict(c) for c in self.customers]
        contracts_dict = [to_dict(c) for c in self.contracts]
        invoices_dict = [to_dict(inv) for inv in self.invoices]
        obligations_dict = [to_dict(o) for o in self.obligations]
        schedules_dict = [to_dict(s) for s in self.schedules]
        
        # Export main data
        json_exporter.export(customers_dict, "customers")
        json_exporter.export(contracts_dict, "contracts")
        json_exporter.export(invoices_dict, "invoices")
        json_exporter.export(obligations_dict, "obligations")
        json_exporter.export(schedules_dict, "schedules")
        
        # Export contract terms
        terms_dict = [t.to_dict() for t in self.contract_terms]
        json_exporter.export(terms_dict, "contract_terms")
        
        # Export expected issues (ground truth)
        expected_dir = self.output_dir / "expected_outputs"
        expected_dir.mkdir(parents=True, exist_ok=True)
        
        issues_dict = [i.to_dict() for i in self.expected_issues]
        with open(expected_dir / "expected_issues.json", "w") as f:
            json.dump(issues_dict, f, indent=2, default=str)
        
        # Export AI test cases
        if self.ai_test_cases:
            with open(expected_dir / "ai_test_cases.json", "w") as f:
                json.dump(self.ai_test_cases, f, indent=2, default=str)
        
        # Export rule coverage
        rule_coverage = self._calculate_rule_coverage()
        with open(expected_dir / "rule_coverage.json", "w") as f:
            json.dump(rule_coverage, f, indent=2)
        
        # Export CSV
        csv_dir = data_dir / "csv"
        csv_dir.mkdir(parents=True, exist_ok=True)
        csv_exporter = CSVExporter(output_dir=csv_dir)
        
        csv_exporter.export(customers_dict, "customers")
        csv_exporter.export(contracts_dict, "contracts")
        csv_exporter.export(invoices_dict, "invoices")
        
        logger.info(f"Data exported to {self.output_dir}")
    
    def _calculate_rule_coverage(self) -> Dict[str, Any]:
        """Calculate rule coverage from expected issues."""
        rule_counts = {}
        for issue in self.expected_issues:
            rule_id = issue.rule_id
            if rule_id not in rule_counts:
                rule_counts[rule_id] = 0
            rule_counts[rule_id] += 1
        
        # All 70 rules
        all_rules = [
            # Tier 0: Data Quality
            "R100", "R101", "R102", "R103", "R104", "R105",
            # Tier 1: Billing
            "R001", "R002", "R003", "R004", "R005", "R006", "R007", "R008", "R009", "R010", "R017", "R018",
            # Tier 2: Discounts
            "R011", "R012", "R013", "R014", "R015", "R016",
            # Tier 3: RevRec
            "R020", "R021", "R022", "R023", "R024", "R025", "R026", "R027",
            # Tier 4: Credits
            "R110", "R111", "R112", "R113",
            # Tier 5: Usage
            "R150", "R151", "R152", "R153", "R154",
            # Tier 6: Lifecycle
            "R060", "R061", "R062", "R063", "R064", "R160", "R161",
            # Tier 7: Multi-Entity
            "R170", "R171", "R172", "R173",
            # Tier 8: Cross-Snapshot
            "R080", "R081", "R082", "R083",
            # Tier 9: Tax/Fees
            "R120", "R121", "R122",
            # Tier 10: FX/Currency
            "R130", "R131", "R132",
        ]
        
        covered = [r for r in all_rules if r in rule_counts]
        missing = [r for r in all_rules if r not in rule_counts]
        
        return {
            "total_rules": len(all_rules),
            "covered_rules": len(covered),
            "coverage_pct": len(covered) / len(all_rules) * 100,
            "rule_counts": rule_counts,
            "covered": covered,
            "missing": missing,
        }
    
    def _generate_summary(self) -> Dict[str, Any]:
        """Generate summary of generated data."""
        return {
            "size": self.size,
            "seed": self.seed,
            "tenants": len(self.tenants),
            "snapshots": self.config["snapshots"],
            "customers": len(self.customers),
            "contracts": len(self.contracts),
            "invoices": len(self.invoices),
            "obligations": len(self.obligations),
            "schedules": len(self.schedules),
            "usage_events": len(self.usage_events),
            "contract_terms": len(self.contract_terms),
            "expected_issues": len(self.expected_issues),
            "ai_test_cases": len(self.ai_test_cases),
            "llm_enabled": self.llm_client is not None,
            "output_dir": str(self.output_dir),
            "generated_at": datetime.now().isoformat(),
        }


def main():
    parser = argparse.ArgumentParser(description="Generate comprehensive test dataset")
    parser.add_argument("--size", choices=list(SIZE_CONFIGS.keys()), default="small",
                        help="Dataset size")
    parser.add_argument("--output", default="output/comprehensive",
                        help="Output directory")
    parser.add_argument("--seed", type=int, help="Random seed")
    parser.add_argument("--with-ai", action="store_true", default=True,
                        help="Include AI test cases")
    parser.add_argument("--with-connectors", action="store_true",
                        help="Include connector payloads")
    parser.add_argument("--with-uploads", action="store_true",
                        help="Include upload edge cases")
    parser.add_argument("--with-llm", action="store_true",
                        help="Enable LLM synthesis for realistic text")
    parser.add_argument("--verbose", action="store_true",
                        help="Verbose output")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Check LLM availability
    if args.with_llm and not LLM_AVAILABLE:
        logger.warning("LLM synthesis requested but openai package not available. Continuing without LLM.")
        args.with_llm = False
    
    generator = ComprehensiveDataGenerator(
        size=args.size,
        seed=args.seed,
        output_dir=args.output,
        with_llm=args.with_llm,
    )
    
    summary = generator.generate(
        with_ai=args.with_ai,
        with_connectors=args.with_connectors,
        with_uploads=args.with_uploads,
    )
    
    print("\n" + "="*60)
    print("GENERATION SUMMARY")
    print("="*60)
    for key, value in summary.items():
        print(f"  {key}: {value}")
    print("="*60)
    
    # Save summary
    with open(Path(args.output) / "summary.json", "w") as f:
        json.dump(summary, f, indent=2)
    
    print(f"\nOutput saved to: {args.output}")


if __name__ == "__main__":
    main()
