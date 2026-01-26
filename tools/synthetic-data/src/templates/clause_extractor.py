"""
Clause extractor for building templates from contracts.
"""

import re
from typing import Any, Optional
from .cuad_loader import CUADLoader, CUAD_CLAUSE_TYPES

# Mapping from our clause types to CUAD clause types
CLAUSE_TYPES = [
    "Parties",
    "Agreement_Date",
    "Effective_Date",
    "Expiration_Date",
    "Renewal_Term",
    "Notice_Period",
    "Price_Restrictions",
    "Payment_Terms",
    "Termination",
    "Governing_Law",
    "License_Grant",
    "Liability_Cap",
    "Indemnification",
    "Confidentiality",
    "IP_Ownership",
]

# Mapping to CUAD types
CLAUSE_TYPE_TO_CUAD = {
    "Parties": "Parties",
    "Agreement_Date": "Agreement Date",
    "Effective_Date": "Effective Date",
    "Expiration_Date": "Expiration Date",
    "Renewal_Term": "Renewal Term",
    "Notice_Period": "Notice Period To Terminate Renewal",
    "Price_Restrictions": "Price Restrictions",
    "Payment_Terms": "Minimum Commitment",
    "Termination": "Termination For Convenience",
    "Governing_Law": "Governing Law",
    "License_Grant": "License Grant",
    "Liability_Cap": "Cap On Liability",
    "Indemnification": "Covenant Not To Sue",
    "IP_Ownership": "Ip Ownership Assignment",
}


class ClauseExtractor:
    """
    Extracts and processes clause templates from contracts.
    """
    
    def __init__(self, cuad_loader: Optional[CUADLoader] = None):
        """
        Initialize the clause extractor.
        
        Args:
            cuad_loader: Optional CUAD loader instance
        """
        self.cuad_loader = cuad_loader
        self._templates: dict[str, list[str]] = {}
        self._processed = False
    
    def set_cuad_loader(self, loader: CUADLoader) -> None:
        """Set the CUAD loader instance."""
        self.cuad_loader = loader
        self._processed = False
    
    def extract_templates(self) -> dict[str, list[str]]:
        """
        Extract clause templates from CUAD dataset.
        
        Returns:
            Dictionary mapping clause types to template texts
        """
        if self._processed and self._templates:
            return self._templates
        
        if self.cuad_loader is None or not self.cuad_loader.is_loaded():
            # Return fallback templates
            return self._get_fallback_templates()
        
        # Extract from CUAD
        for our_type, cuad_type in CLAUSE_TYPE_TO_CUAD.items():
            clauses = self.cuad_loader.get_clauses_by_type(cuad_type)
            if clauses:
                # Clean and filter clauses
                cleaned = [self._clean_clause(c) for c in clauses]
                cleaned = [c for c in cleaned if c and len(c) > 20]
                self._templates[our_type] = cleaned[:50]  # Limit to 50 examples
        
        self._processed = True
        return self._templates
    
    def _clean_clause(self, text: str) -> str:
        """Clean clause text for use as template."""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Remove page numbers and headers
        text = re.sub(r'Page \d+ of \d+', '', text)
        text = re.sub(r'\d+\s*$', '', text)
        
        return text
    
    def get_template(
        self,
        clause_type: str,
        index: Optional[int] = None
    ) -> Optional[str]:
        """
        Get a clause template.
        
        Args:
            clause_type: Type of clause to get
            index: Optional specific index, random if None
            
        Returns:
            Clause template text
        """
        if not self._processed:
            self.extract_templates()
        
        templates = self._templates.get(clause_type, [])
        if not templates:
            return self._get_fallback_template(clause_type)
        
        if index is not None and 0 <= index < len(templates):
            return templates[index]
        
        import random
        return random.choice(templates)
    
    def get_random_template(self, clause_type: str) -> Optional[str]:
        """Get a random template for the clause type."""
        return self.get_template(clause_type)
    
    def _get_fallback_templates(self) -> dict[str, list[str]]:
        """Get fallback templates when CUAD is not available."""
        return {
            clause_type: [self._get_fallback_template(clause_type)]
            for clause_type in CLAUSE_TYPES
            if self._get_fallback_template(clause_type)
        }
    
    def _get_fallback_template(self, clause_type: str) -> Optional[str]:
        """Get a single fallback template for a clause type."""
        fallbacks = {
            "Parties": (
                'This Agreement is entered into by and between [PARTY_A] '
                '("Company") and [PARTY_B] ("Customer").'
            ),
            "Agreement_Date": (
                'This Agreement is effective as of [DATE] (the "Effective Date").'
            ),
            "Effective_Date": (
                'This Agreement shall become effective on [DATE] and shall '
                'remain in effect until terminated in accordance with its terms.'
            ),
            "Expiration_Date": (
                'This Agreement shall expire on [END_DATE] unless earlier '
                'terminated or renewed in accordance with its terms.'
            ),
            "Renewal_Term": (
                'This Agreement shall automatically renew for successive '
                '[RENEWAL_PERIOD] periods unless either party provides written '
                'notice of non-renewal at least [NOTICE_DAYS] days prior to the '
                'expiration of the then-current term.'
            ),
            "Notice_Period": (
                'Either party may terminate this Agreement upon [NOTICE_DAYS] '
                'days prior written notice to the other party.'
            ),
            "Price_Restrictions": (
                'The fees set forth in this Agreement shall remain fixed for the '
                'Initial Term. Upon renewal, fees may be increased by no more than '
                '[PERCENTAGE]% per year with at least [NOTICE_DAYS] days prior notice.'
            ),
            "Payment_Terms": (
                'Customer shall pay all invoices within [PAYMENT_DAYS] days of the '
                'invoice date. Late payments shall accrue interest at the rate of '
                '[INTEREST_RATE]% per month or the maximum rate permitted by law.'
            ),
            "Termination": (
                'Either party may terminate this Agreement for cause upon [NOTICE_DAYS] '
                'days written notice if the other party materially breaches this Agreement '
                'and fails to cure such breach within the notice period.'
            ),
            "Governing_Law": (
                'This Agreement shall be governed by and construed in accordance with '
                'the laws of the State of [STATE], without regard to its conflicts of '
                'law principles.'
            ),
            "License_Grant": (
                'Subject to the terms and conditions of this Agreement, Company hereby '
                'grants to Customer a non-exclusive, non-transferable license to access '
                'and use the Services during the Term solely for Customer\'s internal '
                'business purposes.'
            ),
            "Liability_Cap": (
                'IN NO EVENT SHALL EITHER PARTY\'S AGGREGATE LIABILITY ARISING OUT OF OR '
                'RELATED TO THIS AGREEMENT EXCEED THE TOTAL AMOUNT PAID BY CUSTOMER UNDER '
                'THIS AGREEMENT DURING THE [PERIOD] IMMEDIATELY PRECEDING THE CLAIM.'
            ),
        }
        return fallbacks.get(clause_type)
    
    def inject_values(
        self,
        template: str,
        values: dict[str, Any]
    ) -> str:
        """
        Inject values into a template.
        
        Args:
            template: Template text with placeholders
            values: Dictionary of values to inject
            
        Returns:
            Template with values injected
        """
        result = template
        
        # Replace bracketed placeholders
        for key, value in values.items():
            placeholder = f"[{key.upper()}]"
            result = result.replace(placeholder, str(value))
        
        return result


def extract_clause_templates(
    contracts: list[dict[str, Any]]
) -> dict[str, list[str]]:
    """
    Build a library of clause templates indexed by type.
    
    Args:
        contracts: List of contract dictionaries
        
    Returns:
        Dictionary mapping clause types to template texts
    """
    extractor = ClauseExtractor()
    return extractor.extract_templates()
