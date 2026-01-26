"""
Billing discrepancy scenarios for testing rule detection.

Creates invoices that deliberately mismatch expected contract billing
to trigger detection rules.
"""

import random
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from enum import Enum
from typing import Any, Optional

from ..models.contracts import Contract, BillingFrequency
from ..models.invoices import Invoice, InvoiceLine, InvoiceStatus
from ..core.billing import calculate_expected_amount, get_expected_billing_periods


class DiscrepancyType(str, Enum):
    """Types of billing discrepancies to generate."""
    # Amount issues
    AMOUNT_OVER = "amount_over"  # Invoice > expected
    AMOUNT_UNDER = "amount_under"  # Invoice < expected
    AMOUNT_ZERO = "amount_zero"  # Zero amount invoice
    AMOUNT_NEGATIVE = "amount_negative"  # Negative amount
    
    # Timing issues
    MISSING_INVOICE = "missing_invoice"  # Expected invoice not generated
    DUPLICATE_INVOICE = "duplicate_invoice"  # Same period billed twice
    EARLY_INVOICE = "early_invoice"  # Invoice before period start
    LATE_INVOICE = "late_invoice"  # Invoice after expected date
    
    # Frequency issues
    WRONG_FREQUENCY = "wrong_frequency"  # Monthly billed quarterly, etc.
    EXTRA_INVOICE = "extra_invoice"  # More invoices than expected
    
    # Relationship issues
    ORPHAN_INVOICE = "orphan_invoice"  # Invoice with no matching contract
    WRONG_CUSTOMER = "wrong_customer"  # Invoice assigned to wrong customer
    
    # Tax issues
    MISSING_TAX = "missing_tax"  # Tax should be there but isn't
    WRONG_TAX_RATE = "wrong_tax_rate"  # Tax rate incorrect
    
    # Line item issues
    MISSING_LINE = "missing_line"  # Expected line item missing
    EXTRA_LINE = "extra_line"  # Unexpected line item
    WRONG_QUANTITY = "wrong_quantity"  # Quantity mismatch


@dataclass
class DiscrepancyScenario:
    """Configuration for a discrepancy scenario."""
    type: DiscrepancyType
    probability: float = 0.1  # 10% default
    severity: str = "medium"  # low, medium, high
    variance_min: float = 0.05  # 5% minimum variance
    variance_max: float = 0.25  # 25% maximum variance
    description: Optional[str] = None
    
    def should_apply(self) -> bool:
        """Check if this scenario should be applied."""
        return random.random() < self.probability


# Pre-defined scenario sets for testing
RULE_DETECTION_SCENARIOS = {
    "R001_amount_mismatch": DiscrepancyScenario(
        type=DiscrepancyType.AMOUNT_OVER,
        probability=0.15,
        variance_min=0.05,
        variance_max=0.20,
        description="Invoice amount higher than expected by 5-20%",
    ),
    "R002_missing_invoice": DiscrepancyScenario(
        type=DiscrepancyType.MISSING_INVOICE,
        probability=0.10,
        description="Expected invoice not generated",
    ),
    "R003_duplicate_invoice": DiscrepancyScenario(
        type=DiscrepancyType.DUPLICATE_INVOICE,
        probability=0.05,
        description="Same billing period invoiced twice",
    ),
    "R004_timing_variance": DiscrepancyScenario(
        type=DiscrepancyType.LATE_INVOICE,
        probability=0.12,
        variance_min=5,
        variance_max=30,
        description="Invoice date 5-30 days after expected",
    ),
    "R005_frequency_mismatch": DiscrepancyScenario(
        type=DiscrepancyType.WRONG_FREQUENCY,
        probability=0.08,
        description="Billing frequency doesn't match contract",
    ),
    "R006_orphan_invoice": DiscrepancyScenario(
        type=DiscrepancyType.ORPHAN_INVOICE,
        probability=0.05,
        description="Invoice with no matching contract",
    ),
    "R007_underbilling": DiscrepancyScenario(
        type=DiscrepancyType.AMOUNT_UNDER,
        probability=0.10,
        variance_min=0.10,
        variance_max=0.30,
        description="Invoice amount lower than expected by 10-30%",
    ),
    "R008_wrong_quantity": DiscrepancyScenario(
        type=DiscrepancyType.WRONG_QUANTITY,
        probability=0.08,
        variance_min=0.10,
        variance_max=0.50,
        description="Line item quantity doesn't match contract",
    ),
    "R009_tax_missing": DiscrepancyScenario(
        type=DiscrepancyType.MISSING_TAX,
        probability=0.07,
        description="Tax not applied when expected",
    ),
    "R010_extra_charges": DiscrepancyScenario(
        type=DiscrepancyType.EXTRA_LINE,
        probability=0.06,
        description="Unexpected line items on invoice",
    ),
}


def apply_discrepancy(
    invoice: Invoice,
    scenario: DiscrepancyScenario,
    contract: Optional[Contract] = None,
) -> tuple[Invoice, dict[str, Any]]:
    """
    Apply a discrepancy to an invoice.
    
    Args:
        invoice: Original invoice
        scenario: Discrepancy scenario to apply
        contract: Related contract (for context)
        
    Returns:
        Tuple of (modified invoice, discrepancy details)
    """
    details = {
        "type": scenario.type.value,
        "original_amount": float(invoice.total),
        "applied": False,
    }
    
    if scenario.type == DiscrepancyType.AMOUNT_OVER:
        variance = random.uniform(scenario.variance_min, scenario.variance_max)
        new_total = invoice.total * (1 + Decimal(str(variance)))
        invoice.total = new_total.quantize(Decimal("0.01"))
        invoice.subtotal = invoice.total - invoice.tax
        details["variance_pct"] = variance * 100
        details["new_amount"] = float(invoice.total)
        details["applied"] = True
    
    elif scenario.type == DiscrepancyType.AMOUNT_UNDER:
        variance = random.uniform(scenario.variance_min, scenario.variance_max)
        new_total = invoice.total * (1 - Decimal(str(variance)))
        invoice.total = max(Decimal("0.01"), new_total.quantize(Decimal("0.01")))
        invoice.subtotal = invoice.total - invoice.tax
        details["variance_pct"] = -variance * 100
        details["new_amount"] = float(invoice.total)
        details["applied"] = True
    
    elif scenario.type == DiscrepancyType.AMOUNT_ZERO:
        details["original_total"] = float(invoice.total)
        invoice.total = Decimal("0")
        invoice.subtotal = Decimal("0")
        details["applied"] = True
    
    elif scenario.type == DiscrepancyType.LATE_INVOICE:
        days = int(random.uniform(scenario.variance_min, scenario.variance_max))
        invoice.invoice_date = invoice.invoice_date + timedelta(days=days)
        if invoice.due_date:
            invoice.due_date = invoice.due_date + timedelta(days=days)
        details["days_late"] = days
        details["applied"] = True
    
    elif scenario.type == DiscrepancyType.EARLY_INVOICE:
        days = int(random.uniform(scenario.variance_min, scenario.variance_max))
        invoice.invoice_date = invoice.invoice_date - timedelta(days=days)
        if invoice.due_date:
            invoice.due_date = invoice.due_date - timedelta(days=days)
        details["days_early"] = days
        details["applied"] = True
    
    elif scenario.type == DiscrepancyType.WRONG_CUSTOMER:
        details["original_customer_id"] = invoice.customer_id
        invoice.customer_id = f"cus_wrong_{random.randint(1000, 9999)}"
        details["new_customer_id"] = invoice.customer_id
        details["applied"] = True
    
    elif scenario.type == DiscrepancyType.MISSING_TAX:
        # Calculate what tax SHOULD have been applied (5-10% of subtotal)
        # Then leave it at 0 to simulate missing tax
        expected_tax_rate = Decimal(str(random.uniform(0.05, 0.10)))
        base_amount = invoice.subtotal or invoice.total
        expected_tax = (base_amount * expected_tax_rate).quantize(Decimal("0.01"))
        
        # The invoice should have had this tax but doesn't
        details["expected_tax"] = float(expected_tax)
        details["expected_tax_rate"] = float(expected_tax_rate * 100)
        details["missing_amount"] = float(expected_tax)
        # Invoice total stays as-is (without tax), simulating missing tax
        invoice.tax = Decimal("0")
        details["applied"] = True
    
    elif scenario.type == DiscrepancyType.WRONG_TAX_RATE:
        # Apply random tax rate between 3% and 15%
        wrong_rate = Decimal(str(random.uniform(0.03, 0.15)))
        new_tax = (invoice.subtotal or invoice.total) * wrong_rate
        details["original_tax"] = float(invoice.tax)
        invoice.tax = new_tax.quantize(Decimal("0.01"))
        invoice.total = (invoice.subtotal or invoice.total) + invoice.tax
        details["new_tax"] = float(invoice.tax)
        details["tax_rate"] = float(wrong_rate * 100)
        details["applied"] = True
    
    elif scenario.type == DiscrepancyType.ORPHAN_INVOICE:
        # Clear the contract reference to create an orphan
        details["original_contract_id"] = invoice.contract_id
        invoice.contract_id = None
        details["applied"] = True
    
    elif scenario.type == DiscrepancyType.EXTRA_LINE:
        # Add an unexpected line item to the invoice
        extra_amount = Decimal(str(random.uniform(50, 500))).quantize(Decimal("0.01"))
        extra_line = InvoiceLine(
            id=f"line_extra_{random.randint(10000, 99999)}",
            tenant_id=invoice.tenant_id,
            snapshot_id=invoice.snapshot_id,
            invoice_id=invoice.id,
            description=random.choice([
                "Setup Fee",
                "Processing Charge", 
                "Administrative Fee",
                "Late Fee",
                "Expedite Charge",
            ]),
            quantity=Decimal("1"),
            unit_price=extra_amount,
            amount=extra_amount,
        )
        if not hasattr(invoice, 'lines') or invoice.lines is None:
            invoice.lines = []
        invoice.lines.append(extra_line)
        invoice.total = invoice.total + extra_amount
        invoice.subtotal = (invoice.subtotal or Decimal("0")) + extra_amount
        details["extra_line_amount"] = float(extra_amount)
        details["extra_line_description"] = extra_line.description
        details["new_total"] = float(invoice.total)
        details["applied"] = True
    
    elif scenario.type == DiscrepancyType.WRONG_QUANTITY:
        # Modify quantity on line items (if any exist)
        if hasattr(invoice, 'lines') and invoice.lines:
            line = invoice.lines[0]
            original_qty = line.quantity
            # Multiply or divide quantity randomly
            if random.random() > 0.5:
                new_qty = original_qty * Decimal(str(random.randint(2, 5)))
            else:
                new_qty = max(Decimal("1"), original_qty / Decimal(str(random.randint(2, 3))))
            line.quantity = new_qty.quantize(Decimal("1"))
            # Recalculate line amount
            line.amount = (line.quantity * line.unit_price).quantize(Decimal("0.01"))
            details["original_quantity"] = float(original_qty)
            details["new_quantity"] = float(line.quantity)
            details["applied"] = True
        else:
            # No lines to modify - create a line with wrong quantity
            wrong_qty = Decimal(str(random.randint(5, 20)))
            unit_price = (invoice.total / wrong_qty).quantize(Decimal("0.01"))
            wrong_line = InvoiceLine(
                id=f"line_wrongqty_{random.randint(10000, 99999)}",
                tenant_id=invoice.tenant_id,
                snapshot_id=invoice.snapshot_id,
                invoice_id=invoice.id,
                description="Platform Subscription",
                quantity=wrong_qty,
                unit_price=unit_price,
                amount=invoice.total,
            )
            if not hasattr(invoice, 'lines') or invoice.lines is None:
                invoice.lines = []
            invoice.lines.append(wrong_line)
            details["wrong_quantity"] = float(wrong_qty)
            details["applied"] = True
    
    elif scenario.type == DiscrepancyType.WRONG_FREQUENCY:
        # Change billing period to suggest wrong frequency
        if invoice.period_start and invoice.period_end:
            original_days = (invoice.period_end - invoice.period_start).days
            # If monthly (~30 days), make it look quarterly (~90 days)
            # If quarterly, make it look monthly
            if original_days < 45:
                new_end = invoice.period_start + timedelta(days=90)
            else:
                new_end = invoice.period_start + timedelta(days=30)
            details["original_period_days"] = original_days
            details["new_period_days"] = (new_end - invoice.period_start).days
            invoice.period_end = new_end
            details["applied"] = True
    
    elif scenario.type == DiscrepancyType.EXTRA_INVOICE:
        # Mark this as an extra invoice (the generation logic handles creating it)
        details["is_extra"] = True
        details["applied"] = True
    
    elif scenario.type == DiscrepancyType.DUPLICATE_INVOICE:
        # Duplicate invoices are handled separately in generate_discrepancy_invoices()
        # Mark as applied here to avoid false "not applied" logs
        details["handled_separately"] = True
        details["applied"] = True
    
    # Add metadata about the discrepancy
    invoice.metadata["_discrepancy"] = details
    
    return invoice, details


def generate_discrepancy_invoices(
    contracts: list[Contract],
    scenarios: Optional[dict[str, DiscrepancyScenario]] = None,
    as_of: Optional[date] = None,
    faker_support = None,
) -> tuple[list[Invoice], list[dict[str, Any]]]:
    """
    Generate invoices with deliberate discrepancies.
    
    Args:
        contracts: List of contracts to generate invoices for
        scenarios: Scenario configurations (defaults to RULE_DETECTION_SCENARIOS)
        as_of: Reference date
        faker_support: FakerSupport instance for ID generation
        
    Returns:
        Tuple of (invoices, discrepancy_log)
    """
    from ..support.generators import FakerSupport
    
    if scenarios is None:
        scenarios = RULE_DETECTION_SCENARIOS
    
    if as_of is None:
        as_of = date.today()
    
    if faker_support is None:
        faker_support = FakerSupport()
    
    invoices = []
    discrepancy_log = []
    
    for contract in contracts:
        # Get expected billing periods
        periods = get_expected_billing_periods(contract, as_of)
        
        for period in periods:
            # Check for MISSING_INVOICE scenario
            missing_scenario = scenarios.get("R002_missing_invoice")
            if missing_scenario and missing_scenario.should_apply():
                discrepancy_log.append({
                    "contract_id": contract.id,
                    "period": {"start": period["start"].isoformat(), "end": period["end"].isoformat()},
                    "type": DiscrepancyType.MISSING_INVOICE.value,
                    "applied": True,
                })
                continue  # Skip this invoice
            
            # Generate base invoice
            expected_amount = calculate_expected_amount(contract, period)
            
            invoice = Invoice(
                id=faker_support.generate_invoice_id(),
                tenant_id=faker_support.tenant_id,
                snapshot_id=faker_support.snapshot_id,
                customer_id=contract.customer_id,
                contract_id=contract.id,
                external_id=faker_support._full_uuid(),
                invoice_number=faker_support.generate_invoice_number(),
                invoice_date=period["start"],
                due_date=period["start"] + timedelta(days=30),
                subtotal=expected_amount,
                tax=Decimal("0"),
                total=expected_amount,
                status=InvoiceStatus.PAID if period["end"] < as_of else InvoiceStatus.OPEN,
                period_start=period["start"],
                period_end=period["end"],
            )
            
            # Apply random discrepancies
            for scenario_name, scenario in scenarios.items():
                if scenario.type == DiscrepancyType.MISSING_INVOICE:
                    continue  # Already handled
                
                if scenario.should_apply():
                    invoice, details = apply_discrepancy(invoice, scenario, contract)
                    details["contract_id"] = contract.id
                    details["invoice_id"] = invoice.id
                    details["scenario"] = scenario_name
                    discrepancy_log.append(details)
                    break  # Only one discrepancy per invoice
            
            invoices.append(invoice)
            
            # Check for DUPLICATE_INVOICE scenario
            dup_scenario = scenarios.get("R003_duplicate_invoice")
            if dup_scenario and dup_scenario.should_apply():
                # Create duplicate
                dup_invoice = Invoice(
                    id=faker_support.generate_invoice_id(),
                    tenant_id=faker_support.tenant_id,
                    snapshot_id=faker_support.snapshot_id,
                    customer_id=contract.customer_id,
                    contract_id=contract.id,
                    external_id=faker_support._full_uuid(),
                    invoice_number=faker_support.generate_invoice_number(),
                    invoice_date=invoice.invoice_date + timedelta(days=random.randint(1, 10)),
                    due_date=invoice.due_date,
                    subtotal=invoice.subtotal,
                    tax=invoice.tax,
                    total=invoice.total,
                    status=invoice.status,
                    period_start=invoice.period_start,
                    period_end=invoice.period_end,
                    metadata={"_discrepancy": {"type": "duplicate", "original_id": invoice.id}},
                )
                invoices.append(dup_invoice)
                discrepancy_log.append({
                    "contract_id": contract.id,
                    "invoice_id": dup_invoice.id,
                    "original_invoice_id": invoice.id,
                    "type": DiscrepancyType.DUPLICATE_INVOICE.value,
                    "applied": True,
                })
    
    return invoices, discrepancy_log
