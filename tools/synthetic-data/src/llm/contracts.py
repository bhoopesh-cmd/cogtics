"""
Hybrid contract generator using CUAD templates + synthetic values + LLM variation.
Supports batched LLM calls for efficient multi-contract generation.
"""

import logging
from datetime import date
from decimal import Decimal
from typing import Any, Optional

from .client import LLMClient, get_llm_client, SYSTEM_PROMPTS
from ..templates import TemplateStore, ClauseExtractor, ContractType
from ..models.contracts import Contract, ContractClause, ClauseType

logger = logging.getLogger(__name__)


class HybridContractGenerator:
    """
    Generates realistic contracts using:
    1. CUAD real templates for authentic legal structure
    2. Synthetic values from billing calculator
    3. LLM rephrasing for variation
    """
    
    def __init__(
        self,
        template_store: Optional[TemplateStore] = None,
        llm_client: Optional[LLMClient] = None,
        use_cuad: bool = True,
    ):
        """
        Initialize the generator.
        
        Args:
            template_store: Template store for CUAD templates
            llm_client: LLM client for text generation
            use_cuad: Whether to use CUAD templates
        """
        self.template_store = template_store or TemplateStore(load_cuad=use_cuad)
        self.llm_client = llm_client or get_llm_client()
        self.use_cuad = use_cuad
    
    def generate_contract_clauses(
        self,
        contract_type: ContractType,
        terms: dict[str, Any],
        use_llm_variation: bool = True,
    ) -> list[ContractClause]:
        """
        Generate contract clauses for a contract.
        
        Args:
            contract_type: Type of contract
            terms: Dictionary of contract terms with values
            use_llm_variation: Whether to use LLM for rephrasing
            
        Returns:
            List of generated clauses
        """
        clauses = []
        structure = self.template_store.get_contract_structure(contract_type)
        
        for i, section in enumerate(structure):
            clause_text = self._generate_clause(
                section["title"],
                terms,
                use_llm_variation,
            )
            
            clauses.append(
                ContractClause(
                    id=f"clause_{i}",
                    tenant_id=terms.get("tenant_id", ""),
                    snapshot_id=terms.get("snapshot_id", ""),
                    contract_version_id=terms.get("contract_version_id", ""),
                    clause_type=ClauseType.SECTION,
                    clause_label=section.get("section", str(i + 1)),
                    text=clause_text,
                    sequence_number=i,
                )
            )
        
        return clauses
    
    def _generate_clause(
        self,
        clause_title: str,
        terms: dict[str, Any],
        use_llm: bool = True,
    ) -> str:
        """Generate a single clause."""
        # Map title to clause type
        clause_type = self._map_title_to_clause_type(clause_title)
        
        # Get template
        template = self.template_store.get_template(clause_type)
        
        if template:
            # Inject values
            filled = self.template_store.inject_values(template, terms)
            
            # Optionally rephrase with LLM
            if use_llm and self.llm_client.is_configured():
                return self._rephrase_clause(filled)
            return filled
        
        # Fall back to LLM generation
        if use_llm and self.llm_client.is_configured():
            return self._generate_clause_from_scratch(clause_title, terms)
        
        return self._get_fallback_clause(clause_title, terms)
    
    def _map_title_to_clause_type(self, title: str) -> str:
        """Map section title to clause type."""
        mappings = {
            "Definitions": "Parties",
            "Services": "License_Grant",
            "Fees and Payment": "Payment_Terms",
            "Term and Termination": "Termination",
            "Confidentiality": "Confidentiality",
            "Intellectual Property": "IP_Ownership",
            "Warranties": "Warranties",
            "Limitation of Liability": "Liability_Cap",
            "Indemnification": "Indemnification",
            "General Provisions": "Governing_Law",
            "Order Details": "Parties",
            "Products/Services": "License_Grant",
            "Pricing": "Price_Restrictions",
            "Payment Terms": "Payment_Terms",
            "Term": "Expiration_Date",
            "Signatures": "Parties",
        }
        return mappings.get(title, "Parties")
    
    def _rephrase_clause(self, clause_text: str) -> str:
        """Use LLM to rephrase a clause for variation."""
        prompt = f"""Rephrase the following contract clause, maintaining the same legal meaning 
but varying the wording and sentence structure. Keep all specific values, dates, and amounts.

Original clause:
{clause_text}

Provide only the rephrased clause text, no explanations."""

        result = self.llm_client.generate(
            prompt,
            system_prompt=SYSTEM_PROMPTS["contract_rephrase"],
            temperature=0.5,
        )
        
        return result if result else clause_text
    
    def _generate_clause_from_scratch(
        self,
        clause_title: str,
        terms: dict[str, Any],
    ) -> str:
        """Generate a clause from scratch using LLM."""
        # Build context from terms
        context_parts = []
        
        if "party_a" in terms:
            context_parts.append(f"Company: {terms['party_a']}")
        if "party_b" in terms:
            context_parts.append(f"Customer: {terms['party_b']}")
        if "arr" in terms:
            context_parts.append(f"Annual Value: ${terms['arr']:,.2f}")
        if "start_date" in terms:
            context_parts.append(f"Start Date: {terms['start_date']}")
        if "end_date" in terms:
            context_parts.append(f"End Date: {terms['end_date']}")
        if "payment_terms" in terms:
            context_parts.append(f"Payment Terms: {terms['payment_terms']}")
        
        context = "\n".join(context_parts)
        
        prompt = f"""Generate a professional contract clause for the section titled "{clause_title}".

Contract Context:
{context}

Generate a complete, legally sound clause appropriate for a commercial software/SaaS agreement.
Include specific values from the context where relevant."""

        result = self.llm_client.generate(
            prompt,
            system_prompt=SYSTEM_PROMPTS["contract_clause"],
            temperature=0.7,
            max_tokens=512,
        )
        
        return result if result else self._get_fallback_clause(clause_title, terms)
    
    def _get_fallback_clause(
        self,
        clause_title: str,
        terms: dict[str, Any],
    ) -> str:
        """Get a fallback clause when templates and LLM are unavailable."""
        party_a = terms.get("party_a", "Company")
        party_b = terms.get("party_b", "Customer")
        
        fallbacks = {
            "Definitions": f"""
1. DEFINITIONS

1.1 "Agreement" means this Master Service Agreement and all exhibits, schedules, and 
amendments hereto.

1.2 "Company" means {party_a}.

1.3 "Customer" means {party_b}.

1.4 "Services" means the software services provided by Company to Customer under this 
Agreement.
""",
            "Fees and Payment": f"""
3. FEES AND PAYMENT

3.1 Fees. Customer shall pay the fees set forth in the applicable Order Form.

3.2 Payment Terms. All invoices are due and payable within {terms.get('payment_days', 30)} 
days of the invoice date.

3.3 Late Payments. Any amounts not paid when due shall accrue interest at the rate of 
1.5% per month or the maximum rate permitted by law, whichever is less.
""",
            "Term and Termination": f"""
4. TERM AND TERMINATION

4.1 Term. This Agreement shall commence on {terms.get('start_date', 'the Effective Date')} 
and continue until {terms.get('end_date', 'terminated in accordance with its terms')}.

4.2 Termination for Cause. Either party may terminate this Agreement upon 30 days' written 
notice if the other party materially breaches this Agreement and fails to cure such breach 
within the notice period.
""",
        }
        
        return fallbacks.get(clause_title, f"[{clause_title} clause text]")
    
    def generate_full_contract_text(
        self,
        contract_type: ContractType,
        terms: dict[str, Any],
        use_llm_variation: bool = True,
    ) -> str:
        """
        Generate complete contract text.
        
        Args:
            contract_type: Type of contract
            terms: Contract terms with values
            use_llm_variation: Whether to use LLM for variation
            
        Returns:
            Full contract text as string
        """
        clauses = self.generate_contract_clauses(
            contract_type, terms, use_llm_variation
        )
        
        # Build header
        header = self._generate_contract_header(contract_type, terms)
        
        # Combine clauses
        clause_texts = []
        for clause in clauses:
            if clause.clause_label:
                clause_texts.append(f"{clause.clause_label}. {clause.text}")
            else:
                clause_texts.append(clause.text)
        
        # Build signature block
        signature = self._generate_signature_block(terms)
        
        return f"{header}\n\n" + "\n\n".join(clause_texts) + f"\n\n{signature}"
    
    def _generate_contract_header(
        self,
        contract_type: ContractType,
        terms: dict[str, Any],
    ) -> str:
        """Generate contract header."""
        type_names = {
            ContractType.MSA: "MASTER SERVICE AGREEMENT",
            ContractType.ORDER_FORM: "ORDER FORM",
            ContractType.SOW: "STATEMENT OF WORK",
            ContractType.AMENDMENT: "AMENDMENT TO AGREEMENT",
            ContractType.LICENSE: "SOFTWARE LICENSE AGREEMENT",
            ContractType.SAAS: "SAAS SUBSCRIPTION AGREEMENT",
        }
        
        title = type_names.get(contract_type, "AGREEMENT")
        party_a = terms.get("party_a", "[Company Name]")
        party_b = terms.get("party_b", "[Customer Name]")
        effective_date = terms.get("start_date", "[Effective Date]")
        
        return f"""{title}

This {title} (the "Agreement") is entered into as of {effective_date} (the "Effective Date") 
by and between:

{party_a} ("Company")

and

{party_b} ("Customer")

(each a "Party" and collectively the "Parties")
"""
    
    def _generate_signature_block(self, terms: dict[str, Any]) -> str:
        """Generate signature block."""
        party_a = terms.get("party_a", "[Company Name]")
        party_b = terms.get("party_b", "[Customer Name]")
        
        return f"""
IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.

{party_a.upper()}                          {party_b.upper()}

By: _________________________              By: _________________________

Name: _______________________              Name: _______________________

Title: ______________________              Title: ______________________

Date: _______________________              Date: _______________________
"""
    
    def generate_contracts_batch(
        self,
        contracts_specs: list[dict[str, Any]],
        use_llm_variation: bool = True,
    ) -> list[list[ContractClause]]:
        """
        Generate clauses for multiple contracts in batched LLM calls.
        
        This is much more efficient than generating contracts one-by-one,
        as it batches multiple clause generations into fewer API calls.
        
        Args:
            contracts_specs: List of contract specifications, each containing:
                - contract_type: ContractType
                - terms: Dictionary of contract terms
            use_llm_variation: Whether to use LLM for text variation
            
        Returns:
            List of clause lists, one per contract
        """
        if not use_llm_variation or not self.llm_client.is_configured():
            # Fall back to non-batched generation without LLM
            return [
                self.generate_contract_clauses(
                    spec.get("contract_type", ContractType.MSA),
                    spec.get("terms", {}),
                    use_llm_variation=False,
                )
                for spec in contracts_specs
            ]
        
        # Prepare batch data for LLM client
        batch_data = []
        
        for spec in contracts_specs:
            contract_type = spec.get("contract_type", ContractType.MSA)
            terms = spec.get("terms", {})
            structure = self.template_store.get_contract_structure(contract_type)
            
            clause_titles = [section["title"] for section in structure]
            templates = {}
            
            for section in structure:
                clause_type = self._map_title_to_clause_type(section["title"])
                template = self.template_store.get_template(clause_type)
                if template:
                    templates[section["title"]] = self.template_store.inject_values(template, terms)
            
            batch_data.append({
                "contract_type": contract_type,
                "terms": terms,
                "clause_titles": clause_titles,
                "templates": templates,
                "structure": structure,
            })
        
        # Generate all clauses in batched API calls
        logger.info(f"Generating clauses for {len(contracts_specs)} contracts in batch mode...")
        all_clause_texts = self.llm_client.generate_contracts_batch(batch_data)
        
        # Convert to ContractClause objects
        results = []
        
        for contract_idx, spec in enumerate(batch_data):
            clause_texts = all_clause_texts[contract_idx] if contract_idx < len(all_clause_texts) else []
            terms = spec["terms"]
            structure = spec["structure"]
            clauses = []
            
            for i, section in enumerate(structure):
                # Use LLM-generated text or fallback
                if i < len(clause_texts) and clause_texts[i]:
                    clause_text = clause_texts[i]
                else:
                    # Fallback to template or static text
                    clause_type = self._map_title_to_clause_type(section["title"])
                    template = self.template_store.get_template(clause_type)
                    if template:
                        clause_text = self.template_store.inject_values(template, terms)
                    else:
                        clause_text = self._get_fallback_clause(section["title"], terms)
                
                clauses.append(
                    ContractClause(
                        id=f"clause_{i}",
                        tenant_id=terms.get("tenant_id", ""),
                        snapshot_id=terms.get("snapshot_id", ""),
                        contract_version_id=terms.get("contract_version_id", ""),
                        clause_type=ClauseType.SECTION,
                        clause_label=section.get("section", str(i + 1)),
                        text=clause_text,
                        sequence_number=i,
                    )
                )
            
            results.append(clauses)
        
        logger.info(f"Batch clause generation complete for {len(results)} contracts")
        return results
