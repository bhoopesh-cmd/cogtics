"""
Test Script for Synthetic Data Generator

Run this before generate_full_dataset.py to verify:
1. All imports work
2. Dependencies are installed
3. Configuration is loaded
4. Basic generators work (without LLM)

Usage:
    python examples/test_setup.py
"""

import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

def test_imports():
    """Test all module imports."""
    print("=" * 60)
    print("TESTING IMPORTS")
    print("=" * 60)
    
    errors = []
    
    # Core dependencies
    deps = [
        ("pydantic", "Pydantic models"),
        ("faker", "Faker data generation"),
        ("dotenv", "Environment loading (python-dotenv)"),
        ("dateutil", "Date utilities (python-dateutil)"),
    ]
    
    for module, desc in deps:
        try:
            __import__(module)
            print(f"  ✓ {desc}")
        except ImportError as e:
            print(f"  ✗ {desc} - FAILED: {e}")
            errors.append(module)
    
    # Optional dependencies
    optional = [
        ("pandas", "Pandas (CSV export)"),
        ("openai", "OpenAI (LLM synthesis)"),
        ("jinja2", "Jinja2 (PDF templates)"),
    ]
    
    print("\nOptional dependencies:")
    for module, desc in optional:
        try:
            __import__(module)
            print(f"  ✓ {desc}")
        except ImportError:
            print(f"  ⚠ {desc} - Not installed (optional)")
    
    # WeasyPrint (often has issues)
    print("\nPDF generation:")
    try:
        from weasyprint import HTML
        print("  ✓ WeasyPrint available")
    except ImportError:
        print("  ⚠ WeasyPrint not available - PDFs will be saved as HTML")
    except OSError as e:
        print(f"  ⚠ WeasyPrint has system dependency issue: {e}")
    
    return len(errors) == 0


def test_config():
    """Test configuration loading."""
    print("\n" + "=" * 60)
    print("TESTING CONFIGURATION")
    print("=" * 60)
    
    try:
        from src.config import config
        print(f"  ✓ Config loaded")
        print(f"    - Output dir: {config.OUTPUT_DIR}")
        print(f"    - Tenant ID: {config.DEFAULT_TENANT_ID}")
        
        if config.is_llm_configured():
            print(f"    - OpenAI API key: Configured ✓")
            print(f"    - Model: {config.OPENAI_MODEL}")
        else:
            print(f"    - OpenAI API key: Not configured (LLM features disabled)")
        
        return True
    except Exception as e:
        print(f"  ✗ Config failed: {e}")
        return False


def test_models():
    """Test Pydantic models."""
    print("\n" + "=" * 60)
    print("TESTING MODELS")
    print("=" * 60)
    
    try:
        from src.models.contracts import Contract, ContractStatus, BillingFrequency
        from src.models.invoices import Invoice, InvoiceStatus
        from src.models.customers import Customer, CustomerStatus
        from src.models.revrec import RevenueObligation, ObligationType
        
        # Create sample instances
        customer = Customer(
            id="cus_test",
            tenant_id="test",
            snapshot_id="snap_test",
            external_id="ext_123",
            name="Test Company",
            email="test@example.com",
            status=CustomerStatus.ACTIVE,
        )
        print(f"  ✓ Customer model: {customer.name}")
        
        from datetime import date
        from decimal import Decimal
        
        contract = Contract(
            id="con_test",
            tenant_id="test",
            snapshot_id="snap_test",
            external_id="ext_456",
            customer_id=customer.id,
            name="Test Agreement",
            status=ContractStatus.ACTIVE,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            arr=Decimal("120000"),
            billing_frequency=BillingFrequency.MONTHLY,
        )
        print(f"  ✓ Contract model: {contract.name}")
        
        invoice = Invoice(
            id="inv_test",
            tenant_id="test",
            snapshot_id="snap_test",
            external_id="ext_789",
            invoice_number="INV-2024-000001",
            invoice_date=date(2024, 1, 1),
            total=Decimal("10000"),
            status=InvoiceStatus.OPEN,
        )
        print(f"  ✓ Invoice model: {invoice.invoice_number}")
        
        return True
    except Exception as e:
        print(f"  ✗ Models failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_faker_support():
    """Test Faker generators."""
    print("\n" + "=" * 60)
    print("TESTING FAKER SUPPORT")
    print("=" * 60)
    
    try:
        from src.support.generators import FakerSupport
        
        faker = FakerSupport(seed=42)
        
        # Test ID generation
        ids = faker.generate_ids("test_")
        print(f"  ✓ ID generation: {ids['id'][:20]}...")
        
        # Test customer generation
        customer = faker.generate_customer()
        print(f"  ✓ Customer generation: {customer['name']}")
        
        # Test date generation
        dates = faker.generate_contract_dates(term_months=12)
        print(f"  ✓ Date generation: {dates['start_date']} to {dates['end_date']}")
        
        # Test ARR generation
        arr = faker.generate_arr()
        print(f"  ✓ ARR generation: ${arr:,.2f}")
        
        return True
    except Exception as e:
        print(f"  ✗ Faker failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_core_logic():
    """Test billing and RevRec logic."""
    print("\n" + "=" * 60)
    print("TESTING CORE LOGIC (Billing/RevRec)")
    print("=" * 60)
    
    try:
        from datetime import date
        from decimal import Decimal
        
        # Test billing
        from src.core.billing import get_expected_billing_periods, calculate_expected_amount
        from src.models.contracts import Contract, BillingFrequency, ContractStatus
        
        contract = Contract(
            id="con_test",
            tenant_id="test",
            snapshot_id="snap_test",
            external_id="ext_123",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            arr=Decimal("120000"),
            billing_frequency=BillingFrequency.MONTHLY,
            status=ContractStatus.ACTIVE,
        )
        
        periods = get_expected_billing_periods(contract, date(2024, 6, 1))
        print(f"  ✓ Billing periods: {len(periods)} periods generated")
        
        if periods:
            amount = calculate_expected_amount(contract, periods[0])
            print(f"  ✓ Expected amount: ${amount:,.2f}/period")
        
        # Test obligations
        from src.core.obligations import identify_obligations
        
        obligations = identify_obligations(
            contract_id="con_test",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            arr=Decimal("120000"),
        )
        print(f"  ✓ Obligations identified: {len(obligations)}")
        
        # Test allocation
        from src.core.allocation import allocate_prices
        
        allocations = allocate_prices(obligations, Decimal("120000"))
        print(f"  ✓ Price allocation: {len(allocations)} allocations")
        
        # Test schedules
        from src.core.schedules import generate_schedule
        
        if obligations and allocations:
            schedules = generate_schedule(obligations[0], allocations[0], "monthly")
            print(f"  ✓ Schedule generation: {len(schedules)} periods")
        
        return True
    except Exception as e:
        print(f"  ✗ Core logic failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_exporters():
    """Test exporters (without actually writing files)."""
    print("\n" + "=" * 60)
    print("TESTING EXPORTERS")
    print("=" * 60)
    
    try:
        from src.exporters.json_export import JSONExporter, JSONEncoder
        from src.exporters.csv_export import CSVExporter
        from src.exporters.pdf_export import PDFExporter
        
        print("  ✓ JSON exporter imported")
        print("  ✓ CSV exporter imported")
        print("  ✓ PDF exporter imported")
        
        # Test JSON encoder
        import json
        from datetime import date
        from decimal import Decimal
        
        test_data = {"date": date.today(), "amount": Decimal("100.50")}
        json_str = json.dumps(test_data, cls=JSONEncoder)
        print(f"  ✓ JSON encoding works: {json_str[:50]}...")
        
        return True
    except Exception as e:
        print(f"  ✗ Exporters failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_llm_client():
    """Test LLM client (without making API calls)."""
    print("\n" + "=" * 60)
    print("TESTING LLM CLIENT (no API calls)")
    print("=" * 60)
    
    try:
        from src.llm.client import LLMClient, get_llm_client
        from src.llm.contracts import HybridContractGenerator
        from src.llm.invoices import InvoiceTextGenerator
        from src.llm.crm import CRMNotesGenerator
        
        client = get_llm_client()
        print(f"  ✓ LLM client created")
        print(f"    - Configured: {client.is_configured()}")
        print(f"    - Model: {client.model}")
        
        # Test generators (without LLM)
        invoice_gen = InvoiceTextGenerator(llm_client=client)
        desc = invoice_gen.generate_line_description(
            "Platform Subscription",
            use_llm=False  # Don't use LLM
        )
        print(f"  ✓ Invoice text (no LLM): {desc[:40]}...")
        
        crm_gen = CRMNotesGenerator(llm_client=client)
        notes = crm_gen.generate_deal_notes(
            "Test Company",
            deal_stage="negotiation",
            use_llm=False  # Don't use LLM
        )
        print(f"  ✓ CRM notes (no LLM): {notes[:40]}...")
        
        return True
    except Exception as e:
        print(f"  ✗ LLM client failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_templates():
    """Test template system."""
    print("\n" + "=" * 60)
    print("TESTING TEMPLATES")
    print("=" * 60)
    
    try:
        from src.templates.contract_types import ContractType, REQUIRED_CLAUSES
        from src.templates.clause_extractor import ClauseExtractor, CLAUSE_TYPES
        from src.templates.template_store import TemplateStore
        
        print(f"  ✓ Contract types loaded: {len(ContractType)} types")
        print(f"  ✓ Clause types: {len(CLAUSE_TYPES)} types")
        
        # Test extractor with fallback templates
        extractor = ClauseExtractor()
        templates = extractor.extract_templates()
        print(f"  ✓ Fallback templates: {len(templates)} clause types")
        
        # Test template injection
        template = extractor.get_template("Parties")
        if template:
            filled = extractor.inject_values(template, {
                "party_a": "Test Corp",
                "party_b": "Customer Inc"
            })
            print(f"  ✓ Template injection: {filled[:50]}...")
        
        return True
    except Exception as e:
        print(f"  ✗ Templates failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("SYNTHETIC DATA GENERATOR - SETUP TEST")
    print("=" * 60)
    print("This verifies all components work before running the full generator.\n")
    
    results = []
    
    results.append(("Imports", test_imports()))
    results.append(("Configuration", test_config()))
    results.append(("Models", test_models()))
    results.append(("Faker Support", test_faker_support()))
    results.append(("Core Logic", test_core_logic()))
    results.append(("Exporters", test_exporters()))
    results.append(("LLM Client", test_llm_client()))
    results.append(("Templates", test_templates()))
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status}: {name}")
    
    print(f"\n  {passed}/{total} tests passed")
    
    if passed == total:
        print("\n  ✓ All tests passed! You can run generate_full_dataset.py")
        print("\n  Recommended first run (no LLM, no PDFs):")
        print("    python examples/generate_full_dataset.py --size small")
        return 0
    else:
        print("\n  ✗ Some tests failed. Fix issues before running the generator.")
        print("\n  Common fixes:")
        print("    pip install -r requirements.txt")
        return 1


if __name__ == "__main__":
    sys.exit(main())
