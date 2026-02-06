"""
Full Synthetic Dataset Generator for Cogtics

This script generates a complete synthetic dataset including:
- Customers
- Contracts with clauses
- Revenue obligations and schedules
- Invoices with line items
- Exports to JSON, CSV, and PDF

Usage:
    python generate_full_dataset.py --size small
    python generate_full_dataset.py --size medium --use-llm
    python generate_full_dataset.py --size large --output-dir ./my_output
"""

import argparse
import asyncio
import logging
import sys
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config import config
from src.support.generators import FakerSupport
from src.core.billing import (
    get_expected_billing_periods,
    calculate_expected_amount,
    generate_expected_invoices,
)
from src.core.obligations import identify_obligations
from src.core.allocation import allocate_prices
from src.core.schedules import generate_schedule
from src.core.recognition import create_recognition_events
from src.core.deferred import compute_deferred_balances
from src.llm.contracts import HybridContractGenerator
from src.llm.invoices import InvoiceTextGenerator
from src.llm.crm import CRMNotesGenerator
from src.templates.contract_types import ContractType
from src.models.contracts import (
    Contract,
    ContractVersion,
    ContractTerm,
    ContractStatus,
    BillingFrequency,
    TermType,
)
from src.models.invoices import Invoice, InvoiceLine, InvoiceStatus
from src.models.customers import Customer, CustomerStatus
from src.exporters.json_export import JSONExporter
from src.exporters.csv_export import CSVExporter
from src.exporters.pdf_export import PDFExporter
from src.scenarios.discrepancies import (
    apply_discrepancy,
    DiscrepancyScenario,
    DiscrepancyType,
    RULE_DETECTION_SCENARIOS,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Dataset sizes
SIZES = {
    "minimal": {"customers": 2, "contracts": 4},  # For quick testing
    "small": {"customers": 10, "contracts": 20},
    "medium": {"customers": 50, "contracts": 100},
    "large": {"customers": 200, "contracts": 500},
}


def generate_customers(faker: FakerSupport, count: int) -> list[Customer]:
    """Generate customer records."""
    logger.info(f"Generating {count} customers...")
    customers = []
    
    for i in range(count):
        data = faker.generate_customer()
        
        customers.append(
            Customer(
                id=data["id"],
                tenant_id=data["tenant_id"],
                snapshot_id=data["snapshot_id"],
                external_id=data["external_id"],
                name=data["name"],
                email=data["email"],
                status=CustomerStatus.ACTIVE,
                metadata=data.get("metadata", {}),
                source_system="synthetic",
            )
        )
    
    logger.info(f"Generated {len(customers)} customers")
    return customers


def generate_contracts(
    faker: FakerSupport,
    customers: list[Customer],
    count: int,
    contract_generator: HybridContractGenerator,
    use_llm: bool = False,
) -> tuple[list[Contract], list[dict]]:
    """Generate contract records with terms and clauses using batched LLM calls."""
    logger.info(f"Generating {count} contracts...")
    contracts = []
    all_obligations = []
    
    # First pass: create all contract structures
    contract_data = []
    for i in range(count):
        # Pick a random customer
        customer = customers[i % len(customers)]
        
        # Generate contract dates
        dates = faker.generate_contract_dates(start_year=2024)
        
        # Generate ARR
        arr = faker.generate_arr()
        
        # Generate unit price and quantity that reconcile to ARR
        # Pick a reasonable quantity, then derive unit_price from ARR
        quantity = faker.generate_quantity(min_qty=5, max_qty=50)
        unit_price = (arr / Decimal(str(quantity))).quantize(Decimal("0.01"))
        
        # Create contract
        contract_id = faker.generate_contract_id()
        billing_freq = faker.fake.random_element([
            BillingFrequency.MONTHLY,
            BillingFrequency.QUARTERLY,
            BillingFrequency.ANNUALLY,
        ])
        
        contract = Contract(
            id=contract_id,
            tenant_id=faker.tenant_id,
            snapshot_id=faker.snapshot_id,
            customer_id=customer.id,
            external_id=faker._full_uuid(),
            name=f"Agreement with {customer.name}",
            status=ContractStatus.ACTIVE,
            start_date=dates["start_date"],
            end_date=dates["end_date"],
            arr=arr,
            currency="USD",
            billing_frequency=billing_freq,
            auto_renew=faker.fake.random_element([True, False]),
            source_system="synthetic",
        )
        
        # Create version with terms
        version_id = f"ver_{faker._short_uuid()}"
        terms = [
            ContractTerm(
                id=f"term_{faker._short_uuid()}",
                tenant_id=faker.tenant_id,
                snapshot_id=faker.snapshot_id,
                contract_version_id=version_id,
                term_type=TermType.CONTRACT_VALUE,
                value={"amount": float(arr), "currency": "USD"},
                confidence=95,
                extraction_method="synthetic",
            ),
            ContractTerm(
                id=f"term_{faker._short_uuid()}",
                tenant_id=faker.tenant_id,
                snapshot_id=faker.snapshot_id,
                contract_version_id=version_id,
                term_type=TermType.BILLING_CADENCE,
                value={"frequency": billing_freq.value},
                confidence=95,
                extraction_method="synthetic",
            ),
            ContractTerm(
                id=f"term_{faker._short_uuid()}",
                tenant_id=faker.tenant_id,
                snapshot_id=faker.snapshot_id,
                contract_version_id=version_id,
                term_type=TermType.UNIT_PRICE,
                value={"unitPrice": float(unit_price), "quantity": quantity},
                confidence=90,
                extraction_method="synthetic",
            ),
            # Explicit quantity term for R005 detection
            ContractTerm(
                id=f"term_{faker._short_uuid()}",
                tenant_id=faker.tenant_id,
                snapshot_id=faker.snapshot_id,
                contract_version_id=version_id,
                term_type=TermType.QUANTITY,
                value={"quantity": quantity, "productId": None},
                confidence=95,
                extraction_method="synthetic",
            ),
        ]
        
        # Store data for batch processing
        contract_data.append({
            "contract": contract,
            "customer": customer,
            "dates": dates,
            "arr": arr,
            "version_id": version_id,
            "terms": terms,
        })
    
    # Second pass: batch generate clauses if LLM enabled
    all_clauses = []
    if use_llm:
        logger.info(f"Batching LLM clause generation for {count} contracts...")
        
        # Prepare batch specs for all contracts
        batch_specs = []
        for data in contract_data:
            clause_terms = {
                "party_a": "Cogtics, Inc.",
                "party_b": data["customer"].name,
                "arr": float(data["arr"]),
                "start_date": data["dates"]["start_date"].isoformat(),
                "end_date": data["dates"]["end_date"].isoformat(),
                "payment_terms": "Net 30",
                "tenant_id": faker.tenant_id,
                "snapshot_id": faker.snapshot_id,
                "contract_version_id": data["version_id"],
            }
            batch_specs.append({
                "contract_type": ContractType.MSA,
                "terms": clause_terms,
            })
        
        try:
            # Generate all clauses in batched API calls
            all_clauses = contract_generator.generate_contracts_batch(
                batch_specs,
                use_llm_variation=True,
            )
        except Exception as e:
            logger.warning(f"Failed to batch generate clauses with LLM: {e}")
            all_clauses = [[] for _ in contract_data]
    else:
        all_clauses = [[] for _ in contract_data]
    
    # Third pass: assemble final contracts
    for i, data in enumerate(contract_data):
        contract = data["contract"]
        clauses = all_clauses[i] if i < len(all_clauses) else []
        
        version = ContractVersion(
            id=data["version_id"],
            tenant_id=faker.tenant_id,
            snapshot_id=faker.snapshot_id,
            contract_id=contract.id,
            version=1,
            effective_date=data["dates"]["start_date"],
            terms=data["terms"],
            clauses=clauses,
        )
        
        contract.versions = [version]
        contracts.append(contract)
        
        # Generate revenue obligations
        obligations = identify_obligations(
            contract_id=contract.id,
            start_date=data["dates"]["start_date"],
            end_date=data["dates"]["end_date"],
            arr=data["arr"],
            terms=[{"term_type": "contract_value", "value": float(data["arr"]), "id": data["terms"][0].id}],
            contract_name=contract.name,
        )
        
        if obligations:
            allocations = allocate_prices(obligations, data["arr"])
            
            for obl, alloc in zip(obligations, allocations):
                schedules = generate_schedule(obl, alloc, "monthly")
                events = create_recognition_events(schedules, date.today())
                
                all_obligations.append({
                    "contract_id": contract.id,
                    "obligation": obl,
                    "allocation": alloc,
                    "schedules": schedules,
                    "events": events,
                })
    
    logger.info(f"Generated {len(contracts)} contracts")
    return contracts, all_obligations


def generate_invoices(
    faker: FakerSupport,
    contracts: list[Contract],
    invoice_generator: InvoiceTextGenerator,
    use_llm: bool = False,
    with_discrepancies: bool = False,
) -> tuple[list[Invoice], list[InvoiceLine], list[dict]]:
    """Generate invoices from contracts with optional discrepancies."""
    logger.info("Generating invoices...")
    invoices = []
    all_lines = []
    discrepancy_log = []
    
    import random
    
    for contract in contracts:
        # Generate expected invoices
        expected = generate_expected_invoices(contract, date.today())
        
        for exp in expected:
            invoice_id = faker.generate_invoice_id()
            invoice_number = faker.generate_invoice_number()
            
            # Round amount to 2 decimal places for currency precision
            amount = Decimal(str(exp["expected_amount"])).quantize(Decimal("0.01"))
            
            # Generate consistent line description (always use same format)
            period_start = exp["period_start"]
            period_end = exp["period_end"]
            description = f"Platform Subscription - {period_start.strftime('%b %d')} to {period_end.strftime('%b %d, %Y')}"
            
            # Create invoice line
            line = InvoiceLine(
                id=f"line_{faker._short_uuid()}",
                tenant_id=faker.tenant_id,
                snapshot_id=faker.snapshot_id,
                invoice_id=invoice_id,
                description=description,
                quantity=Decimal("1"),
                unit_price=amount,
                amount=amount,
                currency="USD",
                service_start=period_start,
                service_end=period_end,
            )
            all_lines.append(line)
            
            # Determine invoice status and payment
            is_paid = exp["invoice_date"] < date.today()
            status = InvoiceStatus.PAID if is_paid else InvoiceStatus.OPEN
            amount_paid = amount if is_paid else Decimal("0")
            
            # Create invoice
            invoice = Invoice(
                id=invoice_id,
                tenant_id=faker.tenant_id,
                snapshot_id=faker.snapshot_id,
                customer_id=contract.customer_id,
                contract_id=contract.id,
                external_id=faker._full_uuid(),
                invoice_number=invoice_number,
                invoice_date=exp["invoice_date"],
                due_date=exp["due_date"],
                subtotal=amount,
                tax=Decimal("0"),
                total=amount,
                amount_paid=amount_paid,
                status=status,
                period_start=period_start,
                period_end=period_end,
                lines=[line],
            )
            
            # Apply discrepancy if enabled (50% chance per invoice for stress testing)
            if with_discrepancies and random.random() < 0.5:
                # Pick a random discrepancy type
                scenario_name = random.choice(list(RULE_DETECTION_SCENARIOS.keys()))
                scenario = RULE_DETECTION_SCENARIOS[scenario_name]
                
                invoice, details = apply_discrepancy(invoice, scenario, contract)
                details["contract_id"] = contract.id
                details["invoice_id"] = invoice.id
                details["scenario"] = scenario_name
                discrepancy_log.append(details)
                logger.info(f"  Applied {scenario.type.value} discrepancy to {invoice.id}")
            
            invoices.append(invoice)
    
    logger.info(f"Generated {len(invoices)} invoices with {len(all_lines)} line items")
    if discrepancy_log:
        logger.info(f"Applied {len(discrepancy_log)} discrepancies")
    return invoices, all_lines, discrepancy_log


def export_data(
    customers: list[Customer],
    contracts: list[Contract],
    invoices: list[Invoice],
    invoice_lines: list[InvoiceLine],
    obligations: list[dict],
    output_dir: Path,
    generate_pdfs: bool = False,
) -> None:
    """Export all data to JSON and CSV."""
    logger.info(f"Exporting data to {output_dir}...")
    
    # JSON exports
    json_exporter = JSONExporter(output_dir / "data")
    json_exporter.export_customers(customers)
    json_exporter.export_contracts(contracts)
    json_exporter.export_invoices(invoices)
    
    # CSV exports
    csv_exporter = CSVExporter(output_dir / "data")
    csv_exporter.export_customers(customers)
    csv_exporter.export_contracts(contracts)
    csv_exporter.export_invoices(invoices)
    csv_exporter.export_invoice_lines(invoice_lines)
    
    # Export obligations and schedules
    flat_obligations = []
    flat_schedules = []
    
    for item in obligations:
        obl = item["obligation"]
        flat_obligations.append({
            "contract_id": item["contract_id"],
            "obligation_type": obl.obligation_type.value,
            "transaction_price": float(obl.transaction_price),
            "service_start_date": obl.service_start_date.isoformat(),
            "service_end_date": obl.service_end_date.isoformat(),
            "recognition_method": obl.recognition_method.value,
        })
        
        for sched in item["schedules"]:
            flat_schedules.append({
                "contract_id": item["contract_id"],
                "period_start": sched.period_start.isoformat(),
                "period_end": sched.period_end.isoformat(),
                "scheduled_amount": float(sched.scheduled_amount),
                "recognized_amount": float(sched.recognized_amount),
                "deferred_amount": float(sched.deferred_amount),
            })
    
    csv_exporter.export_obligations(flat_obligations)
    csv_exporter.export_schedules(flat_schedules)
    
    # PDF exports (sample only)
    if generate_pdfs:
        pdf_exporter = PDFExporter()
        
        # Generate sample contract PDFs
        for contract in contracts[:5]:  # First 5 only
            if contract.versions and contract.versions[0].clauses:
                pdf_path = output_dir / "contracts" / f"{contract.id}.pdf"
                pdf_exporter.generate_contract_pdf(
                    contract,
                    contract.versions[0].clauses,
                    str(pdf_path),
                )
        
        # Generate sample invoice PDFs
        for invoice in invoices[:5]:  # First 5 only
            pdf_path = output_dir / "invoices" / f"{invoice.invoice_number}.pdf"
            pdf_exporter.generate_invoice_pdf(
                invoice,
                invoice.lines,
                str(pdf_path),
            )
    
    logger.info("Export complete!")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Generate synthetic data for Cogtics"
    )
    parser.add_argument(
        "--size",
        choices=["minimal", "small", "medium", "large"],
        default="small",
        help="Dataset size (minimal=4 contracts for quick testing)",
    )
    parser.add_argument(
        "--use-llm",
        action="store_true",
        help="Use LLM for text generation (requires OPENAI_API_KEY)",
    )
    parser.add_argument(
        "--generate-pdfs",
        action="store_true",
        help="Generate PDF documents",
    )
    parser.add_argument(
        "--with-discrepancies",
        action="store_true",
        help="Add billing discrepancies for stress testing",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Output directory",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility",
    )
    
    args = parser.parse_args()
    
    # Get size config
    size_config = SIZES[args.size]
    
    # Set output directory
    output_dir = args.output_dir or config.OUTPUT_DIR
    output_dir = Path(output_dir)
    
    logger.info("=" * 60)
    logger.info("COGTICS SYNTHETIC DATA GENERATOR")
    logger.info("=" * 60)
    logger.info(f"Size: {args.size}")
    logger.info(f"Customers: {size_config['customers']}")
    logger.info(f"Contracts: {size_config['contracts']}")
    logger.info(f"Use LLM: {args.use_llm}")
    logger.info(f"Generate PDFs: {args.generate_pdfs}")
    logger.info(f"With Discrepancies: {args.with_discrepancies}")
    logger.info(f"Output: {output_dir}")
    logger.info("=" * 60)
    
    # Check LLM configuration
    if args.use_llm and not config.is_llm_configured():
        logger.warning(
            "LLM requested but OPENAI_API_KEY not configured. "
            "Falling back to template-based generation."
        )
        args.use_llm = False
    
    # Initialize generators
    faker = FakerSupport(seed=args.seed)
    # Enable CUAD for realistic contract templates (downloads from Hugging Face on first run)
    use_cuad = args.use_llm  # Only load CUAD when using LLM for full realism
    contract_generator = HybridContractGenerator(use_cuad=use_cuad)
    invoice_generator = InvoiceTextGenerator()
    
    # Generate data
    customers = generate_customers(faker, size_config["customers"])
    
    contracts, obligations = generate_contracts(
        faker,
        customers,
        size_config["contracts"],
        contract_generator,
        use_llm=args.use_llm,
    )
    
    invoices, invoice_lines, discrepancy_log = generate_invoices(
        faker,
        contracts,
        invoice_generator,
        use_llm=args.use_llm,
        with_discrepancies=args.with_discrepancies,
    )
    
    # Export
    export_data(
        customers,
        contracts,
        invoices,
        invoice_lines,
        obligations,
        output_dir,
        generate_pdfs=args.generate_pdfs,
    )
    
    # Export discrepancy log if generated
    if discrepancy_log:
        import json
        discrepancy_path = output_dir / "data" / "discrepancy_log.json"
        discrepancy_path.parent.mkdir(parents=True, exist_ok=True)
        with open(discrepancy_path, "w") as f:
            json.dump(discrepancy_log, f, indent=2, default=str)
        logger.info(f"Exported discrepancy log: {discrepancy_path}")
    
    # Summary
    logger.info("")
    logger.info("=" * 60)
    logger.info("GENERATION COMPLETE")
    logger.info("=" * 60)
    logger.info(f"Customers: {len(customers)}")
    logger.info(f"Contracts: {len(contracts)}")
    logger.info(f"Obligations: {len(obligations)}")
    logger.info(f"Invoices: {len(invoices)}")
    logger.info(f"Invoice Lines: {len(invoice_lines)}")
    if discrepancy_log:
        logger.info(f"Discrepancies: {len(discrepancy_log)}")
    logger.info(f"Output Directory: {output_dir}")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
