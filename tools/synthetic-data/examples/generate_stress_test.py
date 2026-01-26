"""
Comprehensive Stress Test Data Generator for Cogtics

Generates complete test datasets with:
- Billing discrepancies for rule detection
- Data quality anomalies
- Contract lifecycle events (amendments, renewals, cancellations)
- Multi-tenant / multi-snapshot support with drift
- Multi-currency with FX
- Raw connector payloads (Stripe, Salesforce, etc.)
- Usage-based billing with overages
- Payments, credits, refunds
- Products, price plans, discounts
- Invoice line items and contract terms/clauses
- Duplicate/idempotency test cases
- Job/queue payload fixtures
- Expected outputs for validation

Usage:
    python generate_stress_test.py --scenario medium
    python generate_stress_test.py --scenario stress --tenants 3 --snapshots 2
    python generate_stress_test.py --scenario burst --connectors stripe,salesforce
    python generate_stress_test.py --scenario medium --with-expected-outputs
"""

import argparse
import json
import logging
import random
import sys
from datetime import date, datetime, timedelta
import copy
from decimal import Decimal
from pathlib import Path
from typing import Any, Optional
from collections import defaultdict

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config import config
from src.support.generators import FakerSupport

# Core generators
from src.core.billing import generate_expected_invoices, calculate_expected_amount
from src.core.obligations import identify_obligations
from src.core.allocation import allocate_prices
from src.core.schedules import generate_schedule
from src.core.recognition import create_recognition_events
from src.core.deferred import compute_deferred_balances

# Scenarios
from src.scenarios.discrepancies import (
    generate_discrepancy_invoices,
    RULE_DETECTION_SCENARIOS,
    DiscrepancyType,
    DiscrepancyScenario,
)
from src.scenarios.anomalies import AnomalyGenerator, inject_anomalies, AnomalyType, AnomalyConfig, DEFAULT_ANOMALIES
from src.scenarios.load import LoadScenario, ScaleGenerator, LOAD_SCENARIOS

# Lifecycle
from src.lifecycle.events import ContractLifecycleManager, Amendment, Renewal, Cancellation
from src.lifecycle.multi_tenant import MultiTenantGenerator, TenantConfig, SnapshotDrift
from src.lifecycle.multi_currency import MultiCurrencySupport, Currency, FXRateProvider

# Connectors
from src.connectors.stripe import StripePayloadGenerator
from src.connectors.salesforce import SalesforcePayloadGenerator
from src.connectors.hubspot import HubSpotPayloadGenerator
from src.connectors.netsuite import NetSuitePayloadGenerator

# Models
from src.models.contracts import Contract, ContractStatus, BillingFrequency, ContractTerm, ContractClause
from src.models.invoices import Invoice, InvoiceLine, InvoiceStatus
from src.models.customers import Customer, CustomerStatus
from src.models.payments import Payment, PaymentStatus, Refund, Credit, CreditType
from src.models.usage import UsageRecord, UsageSummary, MeterType
from src.models.products import Product, PricePlan, Discount, DiscountType, PricingModel

# Exporters
from src.exporters.json_export import JSONExporter
from src.exporters.csv_export import CSVExporter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class StressTestGenerator:
    """
    Comprehensive stress test data generator with all features wired.
    """
    
    def __init__(
        self,
        scenario: LoadScenario,
        seed: int = 42,
        output_dir: Path = None,
        num_tenants: int = 1,
        num_snapshots: int = 1,
    ):
        self.scenario = scenario
        self.seed = seed
        self.output_dir = output_dir or config.get_output_path("stress_test")
        self.num_tenants = num_tenants
        self.num_snapshots = num_snapshots
        
        random.seed(seed)
        
        # Initialize base faker
        self.base_faker = FakerSupport(seed=seed)
        
        # Multi-tenant setup
        self.tenant_configs = self._create_tenant_configs()
        self.multi_tenant_gen = MultiTenantGenerator(
            tenants=self.tenant_configs,
            faker_support=self.base_faker,
            seed=seed,
        )
        
        # Other generators
        self.lifecycle_mgr = ContractLifecycleManager(self.base_faker, seed)
        self.anomaly_gen = AnomalyGenerator(seed=seed)
        self.multi_currency = MultiCurrencySupport()
        self.fx_provider = FXRateProvider()
        
        # Connector generators
        self.stripe = StripePayloadGenerator(seed)
        self.salesforce = SalesforcePayloadGenerator(seed)
        self.hubspot = HubSpotPayloadGenerator(seed)
        self.netsuite = NetSuitePayloadGenerator(seed)
        
        # Statistics
        self.stats = {
            "tenants": 0,
            "snapshots": 0,
            "customers": 0,
            "contracts": 0,
            "contract_terms": 0,
            "contract_clauses": 0,
            "invoices": 0,
            "invoice_lines": 0,
            "payments": 0,
            "refunds": 0,
            "credits": 0,
            "products": 0,
            "price_plans": 0,
            "discounts": 0,
            "usage_records": 0,
            "usage_summaries": 0,
            "discrepancies": 0,
            "anomalies": 0,
            "duplicates": 0,
            "lifecycle_events": 0,
            "job_payloads": 0,
            "connector_payloads": {},
        }
    
    def _create_tenant_configs(self) -> list[TenantConfig]:
        """Create tenant configurations based on num_tenants."""
        configs = []
        industries = ["technology", "healthcare", "finance", "retail", "manufacturing"]
        
        for i in range(self.num_tenants):
            # Scale customers per tenant
            customer_count = max(5, self.scenario.customer_count // self.num_tenants)
            
            configs.append(TenantConfig(
                tenant_id=f"tenant_{i:03d}",
                name=f"Tenant {i + 1}",
                customer_count=customer_count,
                contract_scale=1.0,
                multi_currency=self.scenario.multi_currency or i > 0,
                usage_based=self.scenario.usage_based or i % 2 == 0,
                amendments_enabled=self.scenario.amendments_enabled,
                anomaly_rate=self.scenario.anomaly_rate,
                discrepancy_rate=self.scenario.discrepancy_rate,
                industry=industries[i % len(industries)],
            ))
        
        return configs
    
    def _create_scaled_anomaly_configs(self) -> dict[str, AnomalyConfig]:
        """Create anomaly configs scaled by scenario.anomaly_rate."""
        # Default rate is 0.05, so we scale relative to that
        scale_factor = self.scenario.anomaly_rate / 0.05
        
        scaled_configs = {}
        for key, config in DEFAULT_ANOMALIES.items():
            scaled_config = copy.copy(config)
            # Scale probability, capped at 1.0
            scaled_config.probability = min(1.0, config.probability * scale_factor)
            scaled_configs[key] = scaled_config
        
        return scaled_configs
    
    def _create_scaled_discrepancy_scenarios(self) -> dict[str, DiscrepancyScenario]:
        """Create discrepancy scenarios scaled by scenario.discrepancy_rate."""
        # Default rate is 0.10, so we scale relative to that
        scale_factor = self.scenario.discrepancy_rate / 0.10
        
        scaled_scenarios = {}
        for key, scenario in RULE_DETECTION_SCENARIOS.items():
            scaled_scenario = copy.copy(scenario)
            # Scale probability, capped at 1.0
            scaled_scenario.probability = min(1.0, scenario.probability * scale_factor)
            scaled_scenarios[key] = scaled_scenario
        
        return scaled_scenarios
    
    def generate(
        self,
        enable_discrepancies: bool = True,
        enable_anomalies: bool = True,
        enable_lifecycle: bool = True,
        enable_multi_currency: bool = True,
        enable_duplicates: bool = True,
        generate_expected_outputs: bool = False,
        connectors: list[str] = None,
    ) -> dict[str, Any]:
        """
        Generate the full stress test dataset.
        """
        logger.info("=" * 70)
        logger.info("STRESS TEST DATA GENERATOR")
        logger.info("=" * 70)
        logger.info(f"Scenario: {self.scenario.name}")
        logger.info(f"Tenants: {self.num_tenants}")
        logger.info(f"Snapshots per tenant: {self.num_snapshots}")
        logger.info(f"Target customers: {self.scenario.customer_count}")
        logger.info(f"Discrepancies: {enable_discrepancies}")
        logger.info(f"Anomalies: {enable_anomalies}")
        logger.info(f"Lifecycle: {enable_lifecycle}")
        logger.info(f"Duplicates: {enable_duplicates}")
        logger.info(f"Expected outputs: {generate_expected_outputs}")
        logger.info(f"Connectors: {connectors}")
        logger.info("=" * 70)
        
        result = {
            "customers": [],
            "contracts": [],
            "contract_terms": [],
            "contract_clauses": [],
            "invoices": [],
            "invoice_lines": [],
            "payments": [],
            "refunds": [],
            "credits": [],
            "products": [],
            "price_plans": [],
            "discounts": [],
            "usage_records": [],
            "usage_summaries": [],
            "discrepancy_log": [],
            "anomaly_log": [],
            "duplicate_log": [],
            "lifecycle_events": [],
            "snapshot_drifts": [],
            "job_payloads": [],
            "connector_payloads": {},
            "deferred_balances": [],
            "recognition_events": [],
            "expected_outputs": {},
        }
        
        # Step 1: Generate multi-tenant data with snapshots
        logger.info("Step 1: Generating multi-tenant data...")
        all_customers = []
        all_contracts = []
        all_invoices = []
        all_usage = []
        all_products = []
        all_price_plans = []
        all_discounts = []
        snapshot_drifts = []
        
        # Track products/plans per tenant for enrichment
        tenant_products = {}
        tenant_price_plans = {}
        processed_invoice_ids = set()  # Track which invoices have been processed for line items
        
        for tenant_config in self.tenant_configs:
            logger.info(f"  Tenant: {tenant_config.tenant_id}")
            
            # Generate initial snapshot
            tenant_data = self.multi_tenant_gen.generate_tenant_data(tenant_config)
            
            customers = tenant_data["customers"]
            contracts = tenant_data["contracts"]
            invoices = tenant_data["invoices"]
            
            # Get the snapshot_id from first customer (they all have same snapshot)
            initial_snapshot_id = customers[0]["snapshot_id"] if customers else f"snap_{tenant_config.tenant_id}_001"
            
            # Generate products/price_plans/discounts FOR THIS TENANT
            products, price_plans, discounts = self._generate_products_for_tenant(
                tenant_config.tenant_id,
                initial_snapshot_id,
            )
            all_products.extend(products)
            all_price_plans.extend(price_plans)
            all_discounts.extend(discounts)
            tenant_products[tenant_config.tenant_id] = products
            tenant_price_plans[tenant_config.tenant_id] = price_plans
            
            # Enrich contracts with terms and clauses (using tenant-specific products)
            contracts, terms, clauses = self._enrich_contracts(contracts, products, price_plans)
            result["contract_terms"].extend(terms)
            result["contract_clauses"].extend(clauses)
            
            # Generate invoice line items
            invoices, lines = self._add_invoice_lines(invoices, contracts, price_plans, processed_invoice_ids)
            result["invoice_lines"].extend(lines)
            
            all_customers.extend(customers)
            all_contracts.extend(contracts)
            all_invoices.extend(invoices)
            
            # Generate additional snapshots with drift
            for snap_idx in range(1, self.num_snapshots):
                logger.info(f"    Snapshot {snap_idx + 1} with drift...")
                new_data, drift = self.multi_tenant_gen.generate_snapshot_drift(
                    tenant_config.tenant_id,
                    {
                        "new_customer_rate": 0.05,
                        "churn_rate": 0.02,
                        "new_contract_rate": 0.10,
                        "amendment_rate": 0.08,
                        "renewal_rate": 0.05,
                        "cancellation_rate": 0.03,
                        "payment_rate": 0.7,
                    }
                )
                snapshot_drifts.append({
                    "tenant_id": tenant_config.tenant_id,
                    "from_snapshot": drift.from_snapshot_id,
                    "to_snapshot": drift.to_snapshot_id,
                    "changes": drift.summary,
                })
                
                # Add ALL data from drift snapshot (not just changed items)
                drift_customers = new_data.get("customers", [])
                drift_contracts = new_data.get("contracts", [])
                drift_invoices = new_data.get("invoices", [])
                
                # Enrich drift contracts and invoices
                if drift_contracts:
                    drift_contracts, drift_terms, drift_clauses = self._enrich_contracts(
                        drift_contracts, 
                        tenant_products.get(tenant_config.tenant_id, []),
                        tenant_price_plans.get(tenant_config.tenant_id, []),
                    )
                    result["contract_terms"].extend(drift_terms)
                    result["contract_clauses"].extend(drift_clauses)
                
                if drift_invoices:
                    drift_invoices, drift_lines = self._add_invoice_lines(
                        drift_invoices, 
                        drift_contracts,
                        tenant_price_plans.get(tenant_config.tenant_id, []),
                        processed_invoice_ids,
                    )
                    result["invoice_lines"].extend(drift_lines)
                
                all_customers.extend(drift_customers)
                all_contracts.extend(drift_contracts)
                all_invoices.extend(drift_invoices)
                
                # Generate usage records for new contracts from drift
                if tenant_config.usage_based and drift_contracts:
                    # Find only truly new contracts (not just updated ones)
                    new_contract_ids = {
                        c.get("entity_id") for c in drift.changes 
                        if c.get("type") == "new_contract"
                    }
                    new_drift_contracts = [
                        c for c in drift_contracts 
                        if c.get("id") in new_contract_ids
                    ]
                    if new_drift_contracts:
                        drift_usage = self._generate_usage_records(new_drift_contracts, tenant_config)
                        all_usage.extend(drift_usage)
            
            # Generate usage records for initial contracts if enabled
            if tenant_config.usage_based:
                usage = self._generate_usage_records(contracts, tenant_config)
                all_usage.extend(usage)
        
        result["products"] = all_products
        result["price_plans"] = all_price_plans
        result["discounts"] = all_discounts
        self.stats["products"] = len(all_products)
        self.stats["price_plans"] = len(all_price_plans)
        self.stats["discounts"] = len(all_discounts)
        logger.info(f"  Generated {len(all_products)} products, {len(all_price_plans)} plans, {len(all_discounts)} discounts")
        
        result["customers"] = all_customers
        result["contracts"] = all_contracts
        result["invoices"] = all_invoices
        result["usage_records"] = all_usage
        result["snapshot_drifts"] = snapshot_drifts
        
        self.stats["tenants"] = len(self.tenant_configs)
        self.stats["snapshots"] = self.num_tenants * self.num_snapshots
        self.stats["customers"] = len(all_customers)
        self.stats["contracts"] = len(all_contracts)
        self.stats["contract_terms"] = len(result["contract_terms"])
        self.stats["contract_clauses"] = len(result["contract_clauses"])
        self.stats["invoices"] = len(all_invoices)
        self.stats["invoice_lines"] = len(result["invoice_lines"])
        self.stats["usage_records"] = len(all_usage)
        
        logger.info(f"  Total: {len(all_customers)} customers, {len(all_contracts)} contracts, {len(all_invoices)} invoices")
        
        # Step 3: Apply multi-currency
        if enable_multi_currency:
            logger.info("Step 3: Applying multi-currency...")
            all_contracts = self._apply_multi_currency(all_contracts)
            result["contracts"] = all_contracts
        
        # Step 4: Generate lifecycle events
        if enable_lifecycle:
            logger.info("Step 4: Generating lifecycle events...")
            all_contracts, lifecycle_events = self._generate_lifecycle(all_contracts)
            result["contracts"] = all_contracts
            result["lifecycle_events"] = [self._event_to_dict(e) for e in lifecycle_events]
            self.stats["lifecycle_events"] = len(lifecycle_events)
            logger.info(f"  Generated {len(lifecycle_events)} lifecycle events")
        
        # Step 5: Generate discrepancy invoices
        if enable_discrepancies:
            logger.info("Step 5: Generating discrepancy invoices...")
            scaled_discrepancy_scenarios = self._create_scaled_discrepancy_scenarios()
            contract_models = [self._dict_to_contract(c) for c in all_contracts]
            disc_invoices, disc_log = generate_discrepancy_invoices(
                contract_models,
                scaled_discrepancy_scenarios,
                date.today(),
                self.base_faker,
            )
            
            disc_invoice_dicts = [self._invoice_to_dict(inv) for inv in disc_invoices]
            # Add line items to discrepancy invoices
            disc_invoice_dicts, disc_lines = self._add_invoice_lines(disc_invoice_dicts, all_contracts, all_price_plans, processed_invoice_ids)
            result["invoice_lines"].extend(disc_lines)
            
            all_invoices.extend(disc_invoice_dicts)
            result["invoices"] = all_invoices
            result["discrepancy_log"] = disc_log
            self.stats["discrepancies"] = len(disc_log)
            self.stats["invoices"] = len(all_invoices)
            logger.info(f"  Generated {len(disc_log)} discrepancies")
        
        # Step 6: Inject anomalies (using scenario-scaled rates)
        if enable_anomalies:
            logger.info("Step 6: Injecting data anomalies...")
            scaled_anomaly_configs = self._create_scaled_anomaly_configs()
            all_customers, cust_anomalies = inject_anomalies(all_customers, "customer", scaled_anomaly_configs)
            all_contracts, cont_anomalies = inject_anomalies(all_contracts, "contract", scaled_anomaly_configs)
            all_invoices, inv_anomalies = inject_anomalies(all_invoices, "invoice", scaled_anomaly_configs)
            
            all_anomalies = cust_anomalies + cont_anomalies + inv_anomalies
            result["customers"] = all_customers
            result["contracts"] = all_contracts
            result["invoices"] = all_invoices
            result["anomaly_log"] = all_anomalies
            self.stats["anomalies"] = len(all_anomalies)
            logger.info(f"  Injected {len(all_anomalies)} anomalies")
        
        # Step 7: Generate duplicates for idempotency testing
        if enable_duplicates:
            logger.info("Step 7: Generating duplicate records...")
            duplicates, dup_log = self._generate_duplicates(all_customers, all_contracts, all_invoices)
            result["customers"].extend(duplicates.get("customers", []))
            result["contracts"].extend(duplicates.get("contracts", []))
            result["invoices"].extend(duplicates.get("invoices", []))
            result["duplicate_log"] = dup_log
            self.stats["duplicates"] = len(dup_log)
            logger.info(f"  Generated {len(dup_log)} duplicate records")
        
        # Step 8: Generate payments, refunds, credits
        logger.info("Step 8: Generating payments, refunds, credits...")
        payments, refunds, credits = self._generate_payments(result["invoices"], result["customers"])
        result["payments"] = payments
        result["refunds"] = refunds
        result["credits"] = credits
        self.stats["payments"] = len(payments)
        self.stats["refunds"] = len(refunds)
        self.stats["credits"] = len(credits)
        logger.info(f"  Generated {len(payments)} payments, {len(refunds)} refunds, {len(credits)} credits")
        
        # Step 9: Generate usage summaries
        if result["usage_records"]:
            logger.info("Step 9: Generating usage summaries...")
            usage_summaries = self._generate_usage_summaries(result["usage_records"], result["contracts"])
            result["usage_summaries"] = usage_summaries
            self.stats["usage_summaries"] = len(usage_summaries)
            logger.info(f"  Generated {len(usage_summaries)} usage summaries")
        
        # Step 10: Compute RevRec
        logger.info("Step 10: Computing revenue recognition...")
        revrec_data = self._compute_revrec(result["contracts"])
        result["deferred_balances"] = revrec_data["balances"]
        result["recognition_events"] = revrec_data["events"]
        logger.info(f"  Computed {len(revrec_data['events'])} recognition events")
        
        # Step 11: Generate job/queue payloads
        logger.info("Step 11: Generating job payloads...")
        job_payloads = self._generate_job_payloads(result)
        result["job_payloads"] = job_payloads
        self.stats["job_payloads"] = len(job_payloads)
        logger.info(f"  Generated {len(job_payloads)} job payloads")
        
        # Step 12: Generate connector payloads
        if connectors:
            logger.info("Step 12: Generating connector payloads...")
            connector_data = self._generate_connector_payloads(
                result["customers"], result["contracts"], result["invoices"], connectors
            )
            result["connector_payloads"] = connector_data
            for conn, data in connector_data.items():
                count = sum(len(v) for v in data.values())
                self.stats["connector_payloads"][conn] = count
                logger.info(f"  Generated {count} {conn} payloads")
        
        # Step 13: Generate expected outputs
        if generate_expected_outputs:
            logger.info("Step 13: Generating expected outputs...")
            expected = self._generate_expected_outputs(result)
            result["expected_outputs"] = expected
            logger.info(f"  Generated expected outputs for {len(expected)} categories")
        
        # Final stats reconciliation - update to match actual exported data
        self._reconcile_stats(result)
        
        result["stats"] = self.stats
        return result
    
    def _reconcile_stats(self, result: dict[str, Any]) -> None:
        """Reconcile stats to match actual data after all modifications."""
        # Core entities
        self.stats["customers"] = len(result.get("customers", []))
        self.stats["contracts"] = len(result.get("contracts", []))
        self.stats["contract_terms"] = len(result.get("contract_terms", []))
        self.stats["contract_clauses"] = len(result.get("contract_clauses", []))
        self.stats["invoices"] = len(result.get("invoices", []))
        self.stats["invoice_lines"] = len(result.get("invoice_lines", []))
        
        # Financial entities
        self.stats["payments"] = len(result.get("payments", []))
        self.stats["refunds"] = len(result.get("refunds", []))
        self.stats["credits"] = len(result.get("credits", []))
        
        # Products and pricing
        self.stats["products"] = len(result.get("products", []))
        self.stats["price_plans"] = len(result.get("price_plans", []))
        self.stats["discounts"] = len(result.get("discounts", []))
        
        # Usage
        self.stats["usage_records"] = len(result.get("usage_records", []))
        self.stats["usage_summaries"] = len(result.get("usage_summaries", []))
        
        # RevRec
        self.stats["recognition_events"] = len(result.get("recognition_events", []))
        self.stats["deferred_balances"] = len(result.get("deferred_balances", []))
        
        # Logs
        self.stats["discrepancies"] = len(result.get("discrepancy_log", []))
        self.stats["anomalies"] = len(result.get("anomaly_log", []))
        self.stats["duplicates"] = len(result.get("duplicate_log", []))
        self.stats["lifecycle_events"] = len(result.get("lifecycle_events", []))
        
        # Job payloads
        self.stats["job_payloads"] = len(result.get("job_payloads", []))
        
        # Connector payloads - count all connectors in the result
        connector_data = result.get("connector_payloads", {})
        self.stats["connector_payloads"] = {}
        for conn, data in connector_data.items():
            if isinstance(data, dict):
                count = sum(len(v) for v in data.values() if isinstance(v, list))
            elif isinstance(data, list):
                count = len(data)
            else:
                count = 0
            self.stats["connector_payloads"][conn] = count
    
    def _generate_products_for_tenant(
        self,
        tenant_id: str,
        snapshot_id: str,
    ) -> tuple[list[dict], list[dict], list[dict]]:
        """Generate products, price plans, and discounts for a specific tenant."""
        products = []
        price_plans = []
        discounts = []
        
        product_templates = [
            {"name": "Platform Subscription", "type": "subscription", "category": "core"},
            {"name": "API Access", "type": "usage_based", "category": "add-on"},
            {"name": "Professional Services", "type": "professional_services", "category": "services"},
            {"name": "Premium Support", "type": "support", "category": "support"},
            {"name": "Data Storage", "type": "usage_based", "category": "infrastructure"},
            {"name": "Enterprise Features", "type": "add_on", "category": "enterprise"},
        ]
        
        for i, template in enumerate(product_templates):
            product_id = f"prod_{self.base_faker._short_uuid()}"
            product = {
                "id": product_id,
                "tenant_id": tenant_id,
                "snapshot_id": snapshot_id,
                "external_id": self.base_faker._full_uuid(),
                "sku": f"SKU-{1000 + i}",
                "name": template["name"],
                "description": f"{template['name']} - enterprise-grade solution",
                "product_type": template["type"],
                "category": template["category"],
                "status": "active",
            }
            products.append(product)
            
            # Create price plans for each product
            plan_configs = [
                {"name": "Monthly", "cadence": "monthly", "multiplier": 1},
                {"name": "Annual", "cadence": "annual", "multiplier": 10},
            ]
            
            # base_price in dollars (consistent with other amounts like ARR, invoice totals)
            base_price = random.choice([99, 199, 499, 999, 2499])  # dollars
            
            for plan_cfg in plan_configs:
                plan = {
                    "id": f"plan_{self.base_faker._short_uuid()}",
                    "tenant_id": tenant_id,
                    "snapshot_id": snapshot_id,
                    "product_id": product_id,
                    "external_id": self.base_faker._full_uuid(),
                    "name": f"{template['name']} - {plan_cfg['name']}",
                    "pricing_model": "flat" if template["type"] == "subscription" else "per_unit",
                    "billing_cadence": plan_cfg["cadence"],
                    "currency": "USD",
                    "base_price": base_price * plan_cfg["multiplier"],  # dollars
                    "unit_price": base_price if template["type"] != "subscription" else None,  # dollars
                    "status": "active",
                }
                price_plans.append(plan)
        
        # Create discounts
        discount_configs = [
            {"name": "Early Bird", "type": "percentage", "value": 10},
            {"name": "Volume Discount", "type": "percentage", "value": 15},
            {"name": "Startup Credit", "type": "fixed_amount", "value": 500},
            {"name": "Referral Bonus", "type": "percentage", "value": 20},
        ]
        
        for disc_cfg in discount_configs:
            discount = {
                "id": f"disc_{self.base_faker._short_uuid()}",
                "tenant_id": tenant_id,
                "snapshot_id": snapshot_id,
                "external_id": self.base_faker._full_uuid(),
                "name": disc_cfg["name"],
                "discount_type": disc_cfg["type"],
                "value": disc_cfg["value"],
                "currency": "USD" if disc_cfg["type"] == "fixed_amount" else None,
                "duration": random.choice(["once", "forever", "repeating"]),
                "duration_months": random.randint(3, 12) if random.random() > 0.5 else None,
            }
            discounts.append(discount)
        
        return products, price_plans, discounts
    
    def _enrich_contracts(
        self,
        contracts: list[dict],
        products: list[dict],
        price_plans: list[dict],
    ) -> tuple[list[dict], list[dict], list[dict]]:
        """Add terms and clauses to contracts."""
        all_terms = []
        all_clauses = []
        
        clause_templates = [
            {"type": "payment", "text": "Payment is due within 30 days of invoice date."},
            {"type": "termination", "text": "Either party may terminate with 30 days written notice."},
            {"type": "liability", "text": "Liability is limited to fees paid in the prior 12 months."},
            {"type": "confidentiality", "text": "Both parties agree to maintain confidentiality of proprietary information."},
            {"type": "data_protection", "text": "Provider will comply with applicable data protection regulations."},
            {"type": "warranty", "text": "Service is provided 'as is' without warranty of merchantability."},
        ]
        
        for contract in contracts:
            contract_id = contract["id"]
            
            # Add 1-3 terms per contract
            num_terms = random.randint(1, 3)
            selected_products = random.sample(products, min(num_terms, len(products)))
            
            for i, product in enumerate(selected_products):
                # Find a matching price plan
                matching_plans = [p for p in price_plans if p["product_id"] == product["id"]]
                plan = random.choice(matching_plans) if matching_plans else None
                
                # For subscription/flat pricing, quantity should be 1 to avoid inflating vs ARR
                # For usage-based/per-unit, allow quantity > 1
                is_flat_pricing = product["product_type"] == "subscription" or (plan and plan.get("pricing_model") == "flat")
                quantity = 1 if is_flat_pricing else random.randint(1, 10)
                unit_price = plan["base_price"] if plan else random.randint(100, 1000)
                
                term = {
                    "id": f"term_{self.base_faker._short_uuid()}",
                    "tenant_id": contract["tenant_id"],
                    "snapshot_id": contract["snapshot_id"],
                    "contract_id": contract_id,
                    "external_id": self.base_faker._full_uuid(),
                    "product_id": product["id"],
                    "price_plan_id": plan["id"] if plan else None,
                    "name": product["name"],
                    "term_type": "recurring" if product["product_type"] == "subscription" else "one_time",
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "total_value": quantity * unit_price,
                    "currency": contract.get("currency", "USD"),  # Use contract's currency
                    "start_date": contract["start_date"],
                    "end_date": contract["end_date"],
                    "billing_frequency": contract.get("billing_frequency", "monthly"),
                }
                all_terms.append(term)
            
            # Add 2-4 clauses per contract
            num_clauses = random.randint(2, 4)
            selected_clauses = random.sample(clause_templates, min(num_clauses, len(clause_templates)))
            
            for i, clause_tmpl in enumerate(selected_clauses):
                clause = {
                    "id": f"clause_{self.base_faker._short_uuid()}",
                    "tenant_id": contract["tenant_id"],
                    "snapshot_id": contract["snapshot_id"],
                    "contract_id": contract_id,
                    "external_id": self.base_faker._full_uuid(),
                    "clause_type": clause_tmpl["type"],
                    "title": clause_tmpl["type"].replace("_", " ").title(),
                    "text": clause_tmpl["text"],
                    "order": i + 1,
                }
                all_clauses.append(clause)
            
            # Update contract with term/clause counts
            contract["term_count"] = num_terms
            contract["clause_count"] = num_clauses
        
        return contracts, all_terms, all_clauses
    
    def _add_invoice_lines(
        self,
        invoices: list[dict],
        contracts: list[dict],
        price_plans: list[dict],
        processed_invoice_ids: set = None,
    ) -> tuple[list[dict], list[dict]]:
        """Add line items to invoices and reconcile totals."""
        all_lines = []
        contract_lookup = {c["id"]: c for c in contracts}
        if processed_invoice_ids is None:
            processed_invoice_ids = set()
        
        for invoice in invoices:
            # Skip if already processed to avoid duplicate lines
            if invoice["id"] in processed_invoice_ids:
                continue
            processed_invoice_ids.add(invoice["id"])
            contract = contract_lookup.get(invoice.get("contract_id"), {})
            original_total = Decimal(str(invoice.get("total", 0)))
            
            # Generate 1-3 line items
            num_lines = random.randint(1, 3)
            invoice_lines = []
            
            # Distribute the original total across lines
            remaining = original_total
            for i in range(num_lines):
                is_last = (i == num_lines - 1)
                
                if is_last:
                    line_amount = remaining
                else:
                    line_amount = (original_total / num_lines).quantize(Decimal("0.01"))
                    remaining -= line_amount
                
                # Ensure quantity * unit_price = amount (exactly)
                quantity = random.randint(1, 10)
                unit_price = (line_amount / quantity).quantize(Decimal("0.01"))
                amount = (unit_price * quantity).quantize(Decimal("0.01"))
                
                # Use consistent tax rate for this invoice (same rate for all lines)
                tax_rate = Decimal(str(random.choice([0, 0.05, 0.08, 0.10]))) if i == 0 else invoice_lines[0]["_tax_rate"]
                tax_amount = (amount * tax_rate).quantize(Decimal("0.01"))
                
                line = {
                    "id": f"line_{self.base_faker._short_uuid()}",
                    "tenant_id": invoice.get("tenant_id"),
                    "snapshot_id": invoice.get("snapshot_id"),
                    "invoice_id": invoice["id"],
                    "external_id": self.base_faker._full_uuid(),
                    "description": random.choice([
                        "Platform Subscription",
                        "API Usage",
                        "Support Services",
                        "Professional Services",
                        "Additional Users",
                    ]),
                    "quantity": quantity,
                    "unit_price": float(unit_price),
                    "amount": float(amount),
                    "tax_rate": float(tax_rate),
                    "tax_amount": float(tax_amount),
                    "currency": invoice.get("currency", "USD"),
                    "period_start": invoice.get("period_start"),
                    "period_end": invoice.get("period_end"),
                    "_tax_rate": tax_rate,  # Temp field for consistent tax rate
                }
                invoice_lines.append(line)
            
            # Calculate invoice totals from line items (reconciliation)
            subtotal = sum(Decimal(str(line["amount"])) for line in invoice_lines)
            total_tax = sum(Decimal(str(line["tax_amount"])) for line in invoice_lines)
            total = subtotal + total_tax
            
            # Update invoice to match line items
            invoice["subtotal"] = float(subtotal)
            invoice["tax"] = float(total_tax)
            invoice["total"] = float(total)
            invoice["line_count"] = num_lines
            
            # Remove temp field and add to all_lines
            for line in invoice_lines:
                del line["_tax_rate"]
                all_lines.append(line)
        
        return invoices, all_lines
    
    def _generate_usage_records(
        self,
        contracts: list[dict],
        tenant_config: TenantConfig,
    ) -> list[dict]:
        """Generate usage records for usage-based contracts within contract windows."""
        usage_records = []
        meters = ["api_calls", "storage_gb", "compute_hours", "transactions", "messages"]
        
        # Use scenario time range for context
        time_range_days = self.scenario.time_range_months * 30
        
        for contract in contracts:
            if random.random() > 0.5:  # 50% of contracts have usage
                num_records = random.randint(10, 100)
                
                # Get contract date window
                start_date = contract.get("start_date")
                end_date = contract.get("end_date")
                
                if isinstance(start_date, str):
                    start_date = date.fromisoformat(start_date[:10])
                if isinstance(end_date, str):
                    end_date = date.fromisoformat(end_date[:10])
                
                # Constrain to contract window and scenario time range
                earliest = max(start_date, date.today() - timedelta(days=time_range_days)) if start_date else date.today() - timedelta(days=time_range_days)
                latest = min(end_date, date.today()) if end_date else date.today()
                
                if earliest >= latest:
                    earliest = latest - timedelta(days=30)
                
                date_range_days = (latest - earliest).days
                if date_range_days <= 0:
                    date_range_days = 30
                
                for _ in range(num_records):
                    meter = random.choice(meters)
                    # Generate timestamp within contract window
                    days_offset = random.randint(0, date_range_days)
                    timestamp = datetime.combine(earliest + timedelta(days=days_offset), datetime.min.time())
                    timestamp = timestamp.replace(
                        hour=random.randint(0, 23),
                        minute=random.randint(0, 59),
                        second=random.randint(0, 59),
                    )
                    
                    record = {
                        "id": f"usage_{self.base_faker._short_uuid()}",
                        "tenant_id": contract["tenant_id"],
                        "snapshot_id": contract["snapshot_id"],
                        "customer_id": contract["customer_id"],
                        "contract_id": contract["id"],
                        "external_id": self.base_faker._full_uuid(),
                        "meter_name": meter,
                        "meter_type": "api_calls" if meter == "api_calls" else "custom",
                        "quantity": random.randint(1, 10000),
                        "timestamp": timestamp.isoformat(),
                        "currency": contract.get("currency", "USD"),
                        "properties": {"source": "synthetic"},
                    }
                    usage_records.append(record)
        
        return usage_records
    
    def _generate_duplicates(
        self,
        customers: list[dict],
        contracts: list[dict],
        invoices: list[dict],
    ) -> tuple[dict[str, list], list[dict]]:
        """Generate duplicate records for idempotency testing, scaled with dataset."""
        duplicates = {"customers": [], "contracts": [], "invoices": []}
        dup_log = []
        
        # Scale duplicates proportionally (~3% of each entity type)
        dup_rate = 0.03
        
        num_cust_dups = max(1, int(len(customers) * dup_rate))
        for cust in random.sample(customers, min(num_cust_dups, len(customers))):
            dup = cust.copy()
            dup["id"] = f"dup_{cust['id']}"
            # Keep same external_id to test idempotency
            duplicates["customers"].append(dup)
            dup_log.append({
                "type": "customer",
                "original_id": cust["id"],
                "duplicate_id": dup["id"],
                "external_id": cust.get("external_id"),
                "reason": "idempotency_test",
            })
        
        num_contract_dups = max(1, int(len(contracts) * dup_rate))
        for contract in random.sample(contracts, min(num_contract_dups, len(contracts))):
            dup = contract.copy()
            dup["id"] = f"dup_{contract['id']}"
            duplicates["contracts"].append(dup)
            dup_log.append({
                "type": "contract",
                "original_id": contract["id"],
                "duplicate_id": dup["id"],
                "external_id": contract.get("external_id"),
                "reason": "idempotency_test",
            })
        
        num_invoice_dups = max(1, int(len(invoices) * dup_rate))
        for invoice in random.sample(invoices, min(num_invoice_dups, len(invoices))):
            dup = invoice.copy()
            dup["id"] = f"dup_{invoice['id']}"
            duplicates["invoices"].append(dup)
            dup_log.append({
                "type": "invoice",
                "original_id": invoice["id"],
                "duplicate_id": dup["id"],
                "external_id": invoice.get("external_id"),
                "reason": "idempotency_test",
            })
        
        return duplicates, dup_log
    
    def _generate_job_payloads(self, data: dict[str, Any]) -> list[dict]:
        """Generate job/queue payload fixtures for worker testing, scaled with dataset."""
        job_payloads = []
        contracts = data.get("contracts", [])
        invoices = data.get("invoices", [])
        
        # Scale job counts with dataset size
        revrec_job_count = max(5, int(len(contracts) * 0.3))  # 30% of contracts
        invoice_job_count = max(3, int(len(contracts) * 0.2))  # 20% of contracts
        validation_job_count = max(1, len(self.tenant_configs))  # 1 per tenant
        
        # Sync jobs (one per tenant per connector)
        connectors = ["stripe", "salesforce", "hubspot", "netsuite"]
        for tenant in self.tenant_configs:
            for connector in random.sample(connectors, min(2, len(connectors))):
                job_payloads.append({
                    "id": f"job_{self.base_faker._short_uuid()}",
                    "type": "sync_connector",
                    "tenant_id": tenant.tenant_id,
                    "connector": connector,
                    "created_at": datetime.now().isoformat(),
                    "status": "pending",
                    "payload": {
                        "full_sync": random.random() > 0.7,
                        "since": (date.today() - timedelta(days=7)).isoformat(),
                    },
                })
        
        # RevRec calculation jobs - scaled with contracts
        for contract in random.sample(contracts, min(revrec_job_count, len(contracts))):
            job_payloads.append({
                "id": f"job_{self.base_faker._short_uuid()}",
                "type": "calculate_revrec",
                "tenant_id": contract.get("tenant_id"),
                "contract_id": contract.get("id"),
                "created_at": datetime.now().isoformat(),
                "status": "pending",
                "payload": {
                    "as_of_date": date.today().isoformat(),
                    "recalculate": random.random() > 0.5,
                },
            })
        
        # Invoice generation jobs - scaled with contracts
        for contract in random.sample(contracts, min(invoice_job_count, len(contracts))):
            job_payloads.append({
                "id": f"job_{self.base_faker._short_uuid()}",
                "type": "generate_invoice",
                "tenant_id": contract.get("tenant_id"),
                "contract_id": contract.get("id"),
                "created_at": datetime.now().isoformat(),
                "status": "pending",
                "payload": {
                    "period_start": date.today().replace(day=1).isoformat(),
                    "period_end": date.today().isoformat(),
                },
            })
        
        # Data validation jobs - one per tenant
        for tenant in self.tenant_configs:
            job_payloads.append({
                "id": f"job_{self.base_faker._short_uuid()}",
                "type": "validate_data",
                "tenant_id": tenant.tenant_id,
                "created_at": datetime.now().isoformat(),
                "status": "pending",
                "payload": {
                    "check_orphans": True,
                    "check_duplicates": True,
                    "check_anomalies": True,
                },
            })
        
        # Batch processing jobs - for stress testing
        batch_count = max(2, int(len(invoices) * 0.01))  # 1% of invoices
        for _ in range(batch_count):
            job_payloads.append({
                "id": f"job_{self.base_faker._short_uuid()}",
                "type": "batch_invoice_process",
                "tenant_id": random.choice(self.tenant_configs).tenant_id if self.tenant_configs else "default",
                "created_at": datetime.now().isoformat(),
                "status": "pending",
                "payload": {
                    "batch_size": random.choice([50, 100, 500, 1000]),
                    "operation": random.choice(["send", "finalize", "void"]),
                },
            })
        
        return job_payloads
    
    def _generate_expected_outputs(self, data: dict[str, Any]) -> dict[str, Any]:
        """Generate expected outputs for validation."""
        expected = {
            "rule_violations": [],
            "data_quality_issues": [],
            "billing_reconciliation": [],
            "lifecycle_outcomes": [],
            "duplicate_detections": [],
        }
        
        # Expected rule violations from discrepancies
        for disc in data.get("discrepancy_log", []):
            if disc.get("applied"):
                violation = {
                    "invoice_id": disc.get("invoice_id"),
                    "contract_id": disc.get("contract_id"),
                    "expected_rule": disc.get("scenario", disc.get("type")),
                    "expected_severity": "high" if disc.get("type") in ["amount_over", "amount_under"] else "medium",
                    "expected_details": {
                        "type": disc.get("type"),
                        "variance_pct": disc.get("variance_pct"),
                    },
                }
                expected["rule_violations"].append(violation)
        
        # Expected data quality issues from anomalies
        for anomaly in data.get("anomaly_log", []):
            if anomaly.get("applied"):
                issue = {
                    "record_id": anomaly.get("record_id"),
                    "record_type": anomaly.get("record_type"),
                    "field": anomaly.get("field"),
                    "anomaly_type": anomaly.get("type"),
                    "expected_action": self._get_expected_action(anomaly.get("type")),
                    "original_value": anomaly.get("original_value"),
                }
                expected["data_quality_issues"].append(issue)
        
        # Expected billing reconciliation
        for disc in data.get("discrepancy_log", []):
            if disc.get("type") in ["amount_over", "amount_under"]:
                recon = {
                    "invoice_id": disc.get("invoice_id"),
                    "expected_amount": disc.get("original_amount"),
                    "actual_amount": disc.get("new_amount"),
                    "expected_status": "amount_variance",
                    "variance_amount": abs(disc.get("new_amount", 0) - disc.get("original_amount", 0)),
                }
                expected["billing_reconciliation"].append(recon)
        
        # Expected lifecycle outcomes
        for event in data.get("lifecycle_events", []):
            outcome = {
                "contract_id": event.get("contract_id"),
                "event_type": event.get("event_type"),
                "expected_status_after": self._get_expected_status(event.get("event_type")),
            }
            expected["lifecycle_outcomes"].append(outcome)
        
        # Expected duplicate detections
        for dup in data.get("duplicate_log", []):
            detection = {
                "original_id": dup.get("original_id"),
                "duplicate_id": dup.get("duplicate_id"),
                "external_id": dup.get("external_id"),
                "expected_action": "deduplicate",
                "entity_type": dup.get("type"),
            }
            expected["duplicate_detections"].append(detection)
        
        return expected
    
    def _get_expected_action(self, anomaly_type: str) -> str:
        """Get expected remediation action for anomaly type."""
        actions = {
            "null_required_field": "flag_for_review",
            "empty_string": "flag_for_review",
            "invalid_email": "normalize_or_null",
            "extra_whitespace": "trim",
            "inconsistent_case": "normalize_case",
            "impossible_date_range": "flag_for_review",
            "negative_amount": "flag_for_review",
            "orphan_record": "flag_or_delete",
            "precision_error": "round",
        }
        return actions.get(anomaly_type, "review")
    
    def _get_expected_status(self, event_type: str) -> str:
        """Get expected contract status after lifecycle event."""
        statuses = {
            "amendment": "active",
            "renewal": "renewed",
            "cancellation": "cancelled",
            "upgrade": "active",
            "downgrade": "active",
        }
        return statuses.get(event_type, "active")
    
    def _apply_multi_currency(self, contracts: list[dict]) -> list[dict]:
        """Apply multi-currency support to contracts."""
        for contract in contracts:
            if self.scenario.multi_currency or random.random() > 0.7:
                contract = self.multi_currency.generate_multi_currency_contract(contract)
        return contracts
    
    def _generate_lifecycle(
        self,
        contracts: list[dict],
    ) -> tuple[list[dict], list[Any]]:
        """Generate lifecycle events for contracts."""
        all_events = []
        updated_contracts = []
        
        for contract_dict in contracts:
            contract = self._dict_to_contract(contract_dict)
            
            # Increased probabilities for better test coverage:
            # - 40% chance of 1 amendment (up from 30%)
            # - 15% chance of renewal (up from 0%)
            # - 8% chance of cancellation (up from 5%)
            num_amendments = 1 if self.scenario.amendments_enabled and random.random() < 0.40 else 0
            renewal_count = 1 if random.random() < 0.15 else 0
            cancelled = random.random() < 0.08
            
            updated, events = self.lifecycle_mgr.generate_contract_with_history(
                contract,
                num_amendments=num_amendments,
                renewal_count=renewal_count,
                cancelled=cancelled,
            )
            
            updated_contracts.append(self._contract_to_dict(updated))
            all_events.extend(events)
        
        return updated_contracts, all_events
    
    def _generate_payments(
        self,
        invoices: list[dict],
        customers: list[dict],
    ) -> tuple[list[dict], list[dict], list[dict]]:
        """Generate payments, refunds, and credits."""
        payments = []
        refunds = []
        credits = []
        
        for invoice in invoices:
            if invoice.get("status") == "paid":
                payment = {
                    "id": f"pay_{self.base_faker._short_uuid()}",
                    "tenant_id": invoice.get("tenant_id"),
                    "snapshot_id": invoice.get("snapshot_id"),
                    "invoice_id": invoice.get("id"),
                    "customer_id": invoice.get("customer_id"),
                    "external_id": self.base_faker._full_uuid(),
                    "amount": invoice.get("total"),
                    "currency": invoice.get("currency", "USD"),
                    "payment_date": invoice.get("invoice_date"),
                    "payment_method": random.choice(["credit_card", "ach", "wire", "check"]),
                    "status": "succeeded",
                    "reference": f"REF-{random.randint(100000, 999999)}",
                }
                payments.append(payment)
                
                # 5% chance of refund
                if random.random() < 0.05:
                    refund_amount = float(invoice.get("total", 0)) * random.uniform(0.1, 0.5)
                    refund = {
                        "id": f"ref_{self.base_faker._short_uuid()}",
                        "tenant_id": invoice.get("tenant_id"),
                        "snapshot_id": invoice.get("snapshot_id"),
                        "payment_id": payment["id"],
                        "invoice_id": invoice.get("id"),
                        "customer_id": invoice.get("customer_id"),
                        "external_id": self.base_faker._full_uuid(),
                        "amount": round(refund_amount, 2),
                        "currency": invoice.get("currency", "USD"),
                        "refund_date": datetime.now().isoformat(),
                        "reason": random.choice(["customer_request", "billing_error", "service_issue", "duplicate_charge"]),
                        "status": "succeeded",
                    }
                    refunds.append(refund)
        
        # Generate credits for some customers (use customer's tenant/snapshot and currency)
        # Scale with dataset size - 15% of customers get credits for better test coverage
        num_credits = max(3, int(len(customers) * 0.15))  # 15% of customers get credits
        
        for _ in range(num_credits):
            customer = random.choice(customers)
            # Find a contract for this customer to get currency
            customer_contracts = [inv for inv in invoices if inv.get("customer_id") == customer["id"]]
            currency = customer_contracts[0].get("currency", "USD") if customer_contracts else "USD"
            
            amount = random.randint(50, 500)
            credit = {
                "id": f"cred_{self.base_faker._short_uuid()}",
                "tenant_id": customer.get("tenant_id"),
                "snapshot_id": customer.get("snapshot_id"),
                "customer_id": customer["id"],
                "external_id": self.base_faker._full_uuid(),
                "credit_type": random.choice(["promotional", "referral", "goodwill", "service_credit"]),
                "original_amount": amount,
                "remaining_amount": random.randint(0, amount),
                "currency": currency,  # Use customer's currency
                "issued_date": date.today().isoformat(),
                "expiry_date": (date.today() + timedelta(days=random.randint(30, 365))).isoformat(),
                "status": "active",
                "reason": random.choice(["New customer promo", "Referral bonus", "Service disruption credit"]),
            }
            credits.append(credit)
        
        return payments, refunds, credits
    
    def _generate_usage_summaries(
        self,
        usage_records: list[dict],
        contracts: list[dict],
    ) -> list[dict]:
        """Generate usage summaries from records."""
        # Build contract lookup for tenant/snapshot info
        contract_lookup = {c["id"]: c for c in contracts}
        
        groups = defaultdict(list)
        for record in usage_records:
            key = (record.get("contract_id"), record.get("meter_name"))
            groups[key].append(record)
        
        summaries = []
        for (contract_id, meter_name), records in groups.items():
            # Get tenant/snapshot from the first record or contract
            first_record = records[0]
            contract = contract_lookup.get(contract_id, {})
            tenant_id = first_record.get("tenant_id") or contract.get("tenant_id")
            snapshot_id = first_record.get("snapshot_id") or contract.get("snapshot_id")
            
            total_qty = sum(float(r.get("quantity", 0)) for r in records)
            included = random.randint(0, int(total_qty * 0.8))  # Include 0-80% of usage
            overage = max(0, total_qty - included)
            
            # Define pricing
            unit_price = round(random.uniform(0.001, 0.01), 4)
            overage_price = round(unit_price * random.uniform(1.5, 2.5), 4)  # Overage costs more
            
            # Calculate total_amount from actual prices and quantities
            included_amount = min(total_qty, included) * unit_price
            overage_amount = overage * overage_price
            total_amount = round(included_amount + overage_amount, 2)
            
            # Get currency from contract
            currency = contract.get("currency", "USD")
            
            summary = {
                "id": f"usum_{self.base_faker._short_uuid()}",
                "tenant_id": tenant_id,
                "snapshot_id": snapshot_id,
                "contract_id": contract_id,
                "meter_name": meter_name,
                "meter_type": "api_calls" if "api" in meter_name else "custom",
                "period_start": date.today().replace(day=1).isoformat(),
                "period_end": date.today().isoformat(),
                "total_quantity": total_qty,
                "included_quantity": included,
                "overage_quantity": overage,
                "billable_quantity": overage,  # Only overage is billable
                "unit_price": unit_price,
                "overage_price": overage_price,
                "included_amount": round(included_amount, 2),
                "overage_amount": round(overage_amount, 2),
                "total_amount": total_amount,
                "currency": currency,
                "record_count": len(records),
            }
            summaries.append(summary)
        
        return summaries
    
    def _compute_revrec(self, contracts: list[dict]) -> dict[str, list]:
        """Compute revenue recognition for contracts."""
        all_events = []
        all_balances = []
        
        for contract_dict in contracts:
            try:
                arr = Decimal(str(contract_dict.get("arr", 0)))
                if arr <= 0:
                    continue
                
                start_date = contract_dict.get("start_date")
                end_date = contract_dict.get("end_date")
                
                if isinstance(start_date, str):
                    start_date = date.fromisoformat(start_date[:10])
                if isinstance(end_date, str):
                    end_date = date.fromisoformat(end_date[:10])
                
                if not start_date or not end_date:
                    continue
                
                obligations = identify_obligations(
                    contract_id=contract_dict.get("id"),
                    start_date=start_date,
                    end_date=end_date,
                    arr=arr,
                )
                
                if not obligations:
                    continue
                
                allocations = allocate_prices(obligations, arr)
                
                for obl, alloc in zip(obligations, allocations):
                    schedules = generate_schedule(obl, alloc, "monthly")
                    events = create_recognition_events(schedules, date.today())
                    balances = compute_deferred_balances(schedules, events, alloc.allocated_amount)
                    
                    for event in events:
                        all_events.append({
                            "contract_id": contract_dict.get("id"),
                            "obligation_id": obl.id,
                            "event_date": event.event_date.isoformat(),
                            "recognized_amount": float(event.recognized_amount),
                            "event_type": event.event_type.value,
                        })
                    
                    for balance in balances:
                        all_balances.append({
                            "contract_id": contract_dict.get("id"),
                            "obligation_id": obl.id,
                            "period_end": balance.period_end.isoformat(),
                            "opening_balance": float(balance.opening_balance),
                            "recognized": float(balance.recognized),
                            "closing_balance": float(balance.closing_balance),
                        })
            except Exception as e:
                logger.warning(f"RevRec failed for contract {contract_dict.get('id')}: {e}")
        
        return {"events": all_events, "balances": all_balances}
    
    def _generate_connector_payloads(
        self,
        customers: list[dict],
        contracts: list[dict],
        invoices: list[dict],
        connectors: list[str],
    ) -> dict[str, dict[str, list]]:
        """Generate raw connector payloads, scaled with scenario size."""
        result = {}
        customer_lookup = {c["id"]: c for c in customers}
        
        # Scale limit with scenario - use all data for stress scenarios
        # For small scenarios use smaller limits to keep output manageable
        base_limit = self.scenario.customer_count * 10  # Scale with target customer count
        limit = max(100, min(base_limit, len(customers), len(contracts), len(invoices)))
        
        for connector in connectors:
            conn_data = {"customers": [], "contracts": [], "invoices": []}
            
            if connector == "stripe":
                for cust in customers[:limit]:
                    conn_data["customers"].append(self.stripe.generate_customer(cust))
                for contract in contracts[:limit]:
                    stripe_cust_id = f"cus_{self.base_faker._short_uuid()}"
                    conn_data["contracts"].append(
                        self.stripe.generate_subscription(contract, stripe_cust_id)
                    )
                for invoice in invoices[:limit]:
                    stripe_cust_id = f"cus_{self.base_faker._short_uuid()}"
                    conn_data["invoices"].append(
                        self.stripe.generate_invoice(invoice, stripe_cust_id)
                    )
            
            elif connector == "salesforce":
                for cust in customers[:limit]:
                    conn_data["customers"].append(self.salesforce.generate_account(cust))
                for contract in contracts[:limit]:
                    sf_acct_id = self.salesforce._sf_id("001")
                    conn_data["contracts"].append(
                        self.salesforce.generate_contract(contract, sf_acct_id)
                    )
            
            elif connector == "hubspot":
                for cust in customers[:limit]:
                    conn_data["customers"].append(self.hubspot.generate_company(cust))
                for contract in contracts[:limit]:
                    hs_company_id = self.hubspot._hs_id()
                    conn_data["contracts"].append(
                        self.hubspot.generate_deal(contract, hs_company_id)
                    )
            
            elif connector == "netsuite":
                for cust in customers[:limit]:
                    conn_data["customers"].append(self.netsuite.generate_customer(cust))
                for invoice in invoices[:limit]:
                    ns_cust_id = self.netsuite._ns_id()
                    conn_data["invoices"].append(
                        self.netsuite.generate_invoice(invoice, ns_cust_id)
                    )
            
            result[connector] = conn_data
        
        return result
    
    def _dict_to_contract(self, d: dict) -> Contract:
        """Convert dict to Contract model."""
        start_date = d.get("start_date")
        end_date = d.get("end_date")
        
        if isinstance(start_date, str):
            start_date = date.fromisoformat(start_date[:10])
        if isinstance(end_date, str):
            end_date = date.fromisoformat(end_date[:10])
        
        return Contract(
            id=d.get("id", ""),
            tenant_id=d.get("tenant_id", ""),
            snapshot_id=d.get("snapshot_id", ""),
            external_id=d.get("external_id", ""),
            customer_id=d.get("customer_id"),
            name=d.get("name"),
            status=ContractStatus(d.get("status", "active")),
            start_date=start_date,
            end_date=end_date,
            arr=Decimal(str(d.get("arr", 0))),
            currency=d.get("currency", "USD"),
            billing_frequency=BillingFrequency(d.get("billing_frequency", "monthly")),
        )
    
    def _contract_to_dict(self, c: Contract) -> dict:
        """Convert Contract model to dict."""
        return {
            "id": c.id,
            "tenant_id": c.tenant_id,
            "snapshot_id": c.snapshot_id,
            "external_id": c.external_id,
            "customer_id": c.customer_id,
            "name": c.name,
            "status": c.status.value if hasattr(c.status, 'value') else c.status,
            "start_date": c.start_date.isoformat() if c.start_date else None,
            "end_date": c.end_date.isoformat() if c.end_date else None,
            "arr": float(c.arr) if c.arr else 0,
            "currency": c.currency,
            "billing_frequency": c.billing_frequency.value if hasattr(c.billing_frequency, 'value') else c.billing_frequency,
        }
    
    def _invoice_to_dict(self, inv: Invoice) -> dict:
        """Convert Invoice model to dict."""
        return {
            "id": inv.id,
            "tenant_id": inv.tenant_id,
            "snapshot_id": inv.snapshot_id,
            "external_id": inv.external_id,
            "customer_id": inv.customer_id,
            "contract_id": inv.contract_id,
            "invoice_number": inv.invoice_number,
            "invoice_date": inv.invoice_date.isoformat() if inv.invoice_date else None,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "subtotal": float(inv.subtotal) if inv.subtotal else 0,
            "tax": float(inv.tax) if inv.tax else 0,
            "total": float(inv.total) if inv.total else 0,
            "status": inv.status.value if hasattr(inv.status, 'value') else inv.status,
            "period_start": inv.period_start.isoformat() if inv.period_start else None,
            "period_end": inv.period_end.isoformat() if inv.period_end else None,
            "metadata": inv.metadata,
        }
    
    def _event_to_dict(self, event) -> dict:
        """Convert lifecycle event to dict."""
        result = {
            "event_type": event.event_type.value,
            "contract_id": event.contract_id,
            "effective_date": event.effective_date.isoformat(),
            "reason": event.reason,
            "metadata": event.metadata,
        }
        
        # Add type-specific fields
        if hasattr(event, 'old_arr'):
            result["old_arr"] = float(event.old_arr) if event.old_arr else None
            result["new_arr"] = float(event.new_arr) if event.new_arr else None
        
        return result
    
    def export(self, data: dict[str, Any]) -> dict[str, str]:
        """Export generated data to files."""
        logger.info("Exporting data...")
        
        json_exporter = JSONExporter(self.output_dir / "json")
        csv_exporter = CSVExporter(self.output_dir / "csv")
        
        exported = {}
        
        # Export ALL entities
        entities_to_export = [
            "customers", "contracts", "contract_terms", "contract_clauses",
            "invoices", "invoice_lines", "payments", "refunds", "credits",
            "products", "price_plans", "discounts",
            "usage_records", "usage_summaries",
            "recognition_events", "deferred_balances",
            "job_payloads",
        ]
        
        for entity in entities_to_export:
            if data.get(entity):
                json_path = json_exporter.export(data[entity], f"{entity}.json")
                csv_path = csv_exporter.export(data[entity], f"{entity}.csv")
                exported[entity] = {"json": str(json_path), "csv": str(csv_path)}
                logger.info(f"  Exported {len(data[entity])} {entity}")
        
        # Export logs
        logs_to_export = ["discrepancy_log", "anomaly_log", "duplicate_log", "lifecycle_events", "snapshot_drifts"]
        for log_name in logs_to_export:
            if data.get(log_name):
                json_exporter.export(data[log_name], f"{log_name}.json")
        
        # Export expected outputs
        if data.get("expected_outputs"):
            expected_dir = self.output_dir / "expected_outputs"
            expected_dir.mkdir(parents=True, exist_ok=True)
            for category, outputs in data["expected_outputs"].items():
                if outputs:
                    with open(expected_dir / f"{category}.json", "w") as f:
                        json.dump(outputs, f, indent=2, default=str)
            logger.info(f"  Exported expected outputs to {expected_dir}")
        
        # Export connector payloads
        for connector, conn_data in data.get("connector_payloads", {}).items():
            conn_dir = self.output_dir / "connectors" / connector
            conn_dir.mkdir(parents=True, exist_ok=True)
            for entity, records in conn_data.items():
                if records:
                    with open(conn_dir / f"{entity}.json", "w") as f:
                        json.dump(records, f, indent=2, default=str)
        
        # Export stats
        stats_path = self.output_dir / "stats.json"
        with open(stats_path, "w") as f:
            json.dump(data.get("stats", {}), f, indent=2)
        
        logger.info(f"Exported to {self.output_dir}")
        return exported


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Generate comprehensive stress test data for Cogtics"
    )
    parser.add_argument(
        "--scenario",
        choices=list(LOAD_SCENARIOS.keys()),
        default="small",
        help="Load scenario to use",
    )
    parser.add_argument(
        "--tenants",
        type=int,
        default=1,
        help="Number of tenants to generate",
    )
    parser.add_argument(
        "--snapshots",
        type=int,
        default=1,
        help="Number of snapshots per tenant (for drift testing)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Output directory",
    )
    parser.add_argument(
        "--no-discrepancies",
        action="store_true",
        help="Disable billing discrepancy generation",
    )
    parser.add_argument(
        "--no-anomalies",
        action="store_true",
        help="Disable data anomaly injection",
    )
    parser.add_argument(
        "--no-lifecycle",
        action="store_true",
        help="Disable lifecycle event generation",
    )
    parser.add_argument(
        "--no-duplicates",
        action="store_true",
        help="Disable duplicate record generation",
    )
    parser.add_argument(
        "--with-expected-outputs",
        action="store_true",
        help="Generate expected outputs for validation",
    )
    parser.add_argument(
        "--connectors",
        type=str,
        default="",
        help="Comma-separated list of connectors (stripe,salesforce,hubspot,netsuite)",
    )
    
    args = parser.parse_args()
    
    scenario = LOAD_SCENARIOS[args.scenario]
    connectors = [c.strip() for c in args.connectors.split(",") if c.strip()]
    
    generator = StressTestGenerator(
        scenario=scenario,
        seed=args.seed,
        output_dir=args.output_dir,
        num_tenants=args.tenants,
        num_snapshots=args.snapshots,
    )
    
    data = generator.generate(
        enable_discrepancies=not args.no_discrepancies,
        enable_anomalies=not args.no_anomalies,
        enable_lifecycle=not args.no_lifecycle,
        enable_duplicates=not args.no_duplicates,
        generate_expected_outputs=args.with_expected_outputs,
        enable_multi_currency=scenario.multi_currency,
        connectors=connectors if connectors else None,
    )
    
    generator.export(data)
    
    print("\n" + "=" * 70)
    print("STRESS TEST GENERATION COMPLETE")
    print("=" * 70)
    for key, value in generator.stats.items():
        if isinstance(value, dict):
            print(f"  {key}:")
            for k, v in value.items():
                print(f"    {k}: {v}")
        else:
            print(f"  {key}: {value}")
    print("=" * 70)
    print(f"Output: {generator.output_dir}")


if __name__ == "__main__":
    main()
