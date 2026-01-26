"""
Invoice text generator with realistic variations.
"""

import random
from datetime import date
from decimal import Decimal
from typing import Any, Optional

from .client import LLMClient, get_llm_client, SYSTEM_PROMPTS


class InvoiceTextGenerator:
    """
    Generates realistic invoice line item descriptions and memo text.
    """
    
    def __init__(self, llm_client: Optional[LLMClient] = None):
        """Initialize the generator."""
        self.llm_client = llm_client or get_llm_client()
    
    def generate_line_description(
        self,
        product_name: str,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None,
        quantity: int = 1,
        use_llm: bool = True,
    ) -> str:
        """
        Generate a line item description.
        
        Args:
            product_name: Name of the product/service
            period_start: Service period start
            period_end: Service period end
            quantity: Quantity/seats
            use_llm: Whether to use LLM for variation
            
        Returns:
            Invoice line description
        """
        # Build base description
        base = self._build_base_description(
            product_name, period_start, period_end, quantity
        )
        
        if use_llm and self.llm_client.is_configured():
            return self._vary_description(base)
        
        return base
    
    def _build_base_description(
        self,
        product_name: str,
        period_start: Optional[date],
        period_end: Optional[date],
        quantity: int,
    ) -> str:
        """Build base description without LLM variation."""
        parts = [product_name]
        
        # Add period
        if period_start and period_end:
            period_str = self._format_period(period_start, period_end)
            parts.append(f"- {period_str}")
        elif period_start:
            parts.append(f"- Starting {period_start.strftime('%B %Y')}")
        
        # Add quantity if > 1
        if quantity > 1:
            parts.append(f"({quantity} seats)")
        
        return " ".join(parts)
    
    def _format_period(self, start: date, end: date) -> str:
        """Format a billing period."""
        formats = [
            lambda s, e: f"{s.strftime('%B %Y')}",
            lambda s, e: f"{s.strftime('%b %d')} - {e.strftime('%b %d, %Y')}",
            lambda s, e: f"{s.strftime('%m/%d/%Y')} - {e.strftime('%m/%d/%Y')}",
            lambda s, e: f"Q{(s.month - 1) // 3 + 1} {s.year}",
        ]
        return random.choice(formats)(start, end)
    
    def _vary_description(self, base: str) -> str:
        """Use LLM to create a variation of the description."""
        prompt = f"""Rewrite this invoice line item description in a slightly different way.
Keep it professional and include all the same information.
Make small variations in wording and format.

Original: {base}

Provide only the new description, no explanation."""

        result = self.llm_client.generate(
            prompt,
            system_prompt=SYSTEM_PROMPTS["invoice_description"],
            temperature=0.5,
            max_tokens=100,
        )
        
        return result.strip() if result else base
    
    def generate_invoice_memo(
        self,
        contract_name: Optional[str] = None,
        po_number: Optional[str] = None,
        notes: Optional[str] = None,
        use_llm: bool = True,
    ) -> str:
        """
        Generate invoice memo/notes field.
        
        Args:
            contract_name: Associated contract name
            po_number: Purchase order number
            notes: Additional notes
            use_llm: Whether to use LLM
            
        Returns:
            Invoice memo text
        """
        parts = []
        
        if contract_name:
            parts.append(f"Contract: {contract_name}")
        if po_number:
            parts.append(f"PO: {po_number}")
        if notes:
            parts.append(notes)
        
        if not parts:
            return ""
        
        base = " | ".join(parts)
        
        if use_llm and self.llm_client.is_configured():
            return self._humanize_memo(base)
        
        return base
    
    def _humanize_memo(self, memo: str) -> str:
        """Add slight variations to memo text."""
        # Simple variations without LLM
        variations = [
            memo,
            memo.replace(" | ", " - "),
            memo.replace(" | ", "\n"),
            f"Ref: {memo}",
        ]
        return random.choice(variations)
    
    def generate_payment_reference(
        self,
        invoice_number: str,
        customer_name: str,
    ) -> str:
        """Generate payment reference text."""
        templates = [
            f"Payment for {invoice_number}",
            f"{customer_name} - {invoice_number}",
            f"Inv#{invoice_number}",
            f"Invoice {invoice_number} payment",
        ]
        return random.choice(templates)
    
    def generate_product_variations(
        self,
        base_product: str,
        count: int = 5,
    ) -> list[str]:
        """
        Generate variations of a product name.
        
        Args:
            base_product: Base product name
            count: Number of variations
            
        Returns:
            List of product name variations
        """
        if not self.llm_client.is_configured():
            return [base_product] * count
        
        prompt = f"""Generate {count} different ways to describe this product on an invoice.
Keep it professional and clear.

Product: {base_product}

Return one product description per line, no numbering."""

        result = self.llm_client.generate(
            prompt,
            system_prompt=SYSTEM_PROMPTS["invoice_description"],
            temperature=0.8,
        )
        
        if result:
            lines = [l.strip() for l in result.strip().split("\n") if l.strip()]
            return lines[:count] if lines else [base_product] * count
        
        return [base_product] * count
