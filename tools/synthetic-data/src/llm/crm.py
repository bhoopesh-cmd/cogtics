"""
CRM notes generator with human-like messiness.
"""

import random
from datetime import date, datetime
from typing import Any, Optional

from .client import LLMClient, get_llm_client, SYSTEM_PROMPTS


class CRMNotesGenerator:
    """
    Generates realistic CRM notes and data with intentional messiness
    to simulate real-world data quality issues.
    """
    
    def __init__(self, llm_client: Optional[LLMClient] = None):
        """Initialize the generator."""
        self.llm_client = llm_client or get_llm_client()
        
        # Common typos and abbreviations
        self.typo_map = {
            "meeting": ["meetng", "meetting", "mtg", "meeting"],
            "discussion": ["disucssion", "discussion", "disc"],
            "contract": ["contarct", "contract", "cntract", "K"],
            "renewal": ["renweal", "renewal", "rnwl"],
            "pricing": ["pricng", "pricing", "priceing"],
            "customer": ["custoemr", "customer", "cust"],
            "regarding": ["regrading", "regarding", "re:"],
            "schedule": ["scheduel", "schedule", "sched"],
            "follow": ["follwo", "follow", "fllw"],
        }
        
        # Name variations
        self.title_variations = {
            "CEO": ["CEO", "Chief Executive Officer", "ceo", "C.E.O."],
            "CTO": ["CTO", "Chief Technology Officer", "cto", "C.T.O."],
            "VP": ["VP", "Vice President", "V.P.", "vp"],
            "Director": ["Director", "Dir", "Dir."],
            "Manager": ["Manager", "Mgr", "Mgr."],
        }
    
    def generate_deal_notes(
        self,
        customer_name: str,
        deal_stage: str = "negotiation",
        contact_name: Optional[str] = None,
        topics: Optional[list[str]] = None,
        use_llm: bool = True,
        messiness_level: float = 0.3,
    ) -> str:
        """
        Generate deal/opportunity notes.
        
        Args:
            customer_name: Customer company name
            deal_stage: Current deal stage
            contact_name: Contact person name
            topics: Discussion topics
            use_llm: Whether to use LLM
            messiness_level: How messy to make the text (0-1)
            
        Returns:
            Deal notes text
        """
        if use_llm and self.llm_client.is_configured():
            notes = self._generate_llm_notes(
                customer_name, deal_stage, contact_name, topics
            )
        else:
            notes = self._generate_template_notes(
                customer_name, deal_stage, contact_name, topics
            )
        
        # Apply messiness
        if messiness_level > 0:
            notes = self._add_messiness(notes, messiness_level)
        
        return notes
    
    def _generate_llm_notes(
        self,
        customer_name: str,
        deal_stage: str,
        contact_name: Optional[str],
        topics: Optional[list[str]],
    ) -> str:
        """Generate notes using LLM."""
        topic_str = ", ".join(topics) if topics else "general business discussion"
        contact_str = f" with {contact_name}" if contact_name else ""
        
        prompt = f"""Write informal CRM notes for a sales call{contact_str} at {customer_name}.

Deal stage: {deal_stage}
Topics discussed: {topic_str}

Write 2-3 sentences as a sales rep would, with some abbreviations and informal language.
Include a next step or action item."""

        result = self.llm_client.generate(
            prompt,
            system_prompt=SYSTEM_PROMPTS["crm_notes"],
            temperature=0.8,
            max_tokens=150,
        )
        
        return result if result else self._generate_template_notes(
            customer_name, deal_stage, contact_name, topics
        )
    
    def _generate_template_notes(
        self,
        customer_name: str,
        deal_stage: str,
        contact_name: Optional[str],
        topics: Optional[list[str]],
    ) -> str:
        """Generate notes from templates."""
        templates = {
            "prospecting": [
                f"Initial outreach to {customer_name}. Left VM, will follow up next week.",
                f"Cold call to {customer_name}. Spoke briefly, scheduling demo.",
                f"Intro meeting w/ {customer_name}. Interested in platform capabilities.",
            ],
            "qualification": [
                f"Discovery call with {customer_name}. Good fit for enterprise tier.",
                f"Qual call - {customer_name} looking to replace current solution.",
                f"Needs assessment complete. {customer_name} has budget, timeline Q2.",
            ],
            "negotiation": [
                f"Pricing discussion with {customer_name}. Pushing back on per-seat model.",
                f"Contract review in progress. Legal wants changes to liability section.",
                f"Final nego with {customer_name}. Close to agreement on 3-year term.",
            ],
            "closed_won": [
                f"Deal closed! {customer_name} signed 12-month agreement.",
                f"Contract executed. {customer_name} kicking off implementation next week.",
                f"Won! {customer_name} going with enterprise package.",
            ],
        }
        
        stage_templates = templates.get(deal_stage, templates["negotiation"])
        base = random.choice(stage_templates)
        
        if contact_name:
            base = base.replace("Spoke", f"Spoke with {contact_name}")
        
        return base
    
    def _add_messiness(self, text: str, level: float) -> str:
        """Add realistic messiness to text."""
        words = text.split()
        result = []
        
        for word in words:
            # Random chance to apply messiness
            if random.random() < level:
                word_lower = word.lower().strip(".,!?")
                if word_lower in self.typo_map:
                    # Replace with a variation (including correct spelling)
                    variants = self.typo_map[word_lower]
                    replacement = random.choice(variants)
                    # Preserve punctuation
                    if word[-1] in ".,!?":
                        replacement += word[-1]
                    word = replacement
            result.append(word)
        
        return " ".join(result)
    
    def generate_messy_customer_name(
        self,
        clean_name: str,
        messiness_level: float = 0.5,
    ) -> str:
        """
        Generate a customer name with realistic data quality issues.
        
        Args:
            clean_name: Clean customer name
            messiness_level: How messy (0-1)
            
        Returns:
            Customer name with potential issues
        """
        if random.random() > messiness_level:
            return clean_name
        
        variations = [
            clean_name,  # Keep original sometimes
            clean_name.upper(),
            clean_name.lower(),
            clean_name.title(),
            clean_name.replace("Corporation", "Corp"),
            clean_name.replace("Corp.", "Corporation"),
            clean_name.replace("Company", "Co."),
            clean_name.replace("Co.", "Company"),
            clean_name.replace("Incorporated", "Inc"),
            clean_name.replace("Inc.", "Incorporated"),
            clean_name.replace("Limited", "Ltd"),
            clean_name.replace("Ltd.", "Limited"),
            clean_name.replace("  ", " "),  # Extra spaces
            " " + clean_name,  # Leading space
            clean_name + " ",  # Trailing space
            clean_name.replace(",", ""),  # Missing comma
        ]
        
        return random.choice(variations)
    
    def generate_messy_address(
        self,
        street: str,
        city: str,
        state: str,
        zip_code: str,
        messiness_level: float = 0.5,
    ) -> dict[str, str]:
        """
        Generate address with realistic variations.
        
        Args:
            street: Street address
            city: City name
            state: State/province
            zip_code: ZIP/postal code
            messiness_level: How messy (0-1)
            
        Returns:
            Address dictionary with potential variations
        """
        if random.random() > messiness_level:
            return {
                "street": street,
                "city": city,
                "state": state,
                "zip_code": zip_code,
            }
        
        # Street variations
        street_variations = [
            street,
            street.replace("Street", "St"),
            street.replace("St", "Street"),
            street.replace("Avenue", "Ave"),
            street.replace("Ave", "Avenue"),
            street.replace("Boulevard", "Blvd"),
            street.replace("Suite", "Ste"),
            street.replace("Ste", "Suite"),
            street.replace("#", "Suite "),
        ]
        
        # State variations
        state_variations = [
            state,
            state.upper(),
            state.lower(),
        ]
        
        return {
            "street": random.choice(street_variations),
            "city": city,
            "state": random.choice(state_variations),
            "zip_code": zip_code,
        }
    
    def generate_renewal_notes(
        self,
        customer_name: str,
        contract_end: date,
        renewal_likelihood: str = "likely",
    ) -> str:
        """Generate renewal discussion notes."""
        days_until = (contract_end - date.today()).days
        
        templates = {
            "likely": [
                f"Renewal discussion with {customer_name}. Very happy with platform, likely to renew for 2 yrs.",
                f"QBR with {customer_name}. Strong usage metrics, renewal looking good.",
                f"Renewal call - {customer_name} wants to expand seats. Preparing new quote.",
            ],
            "at_risk": [
                f"Renewal meeting with {customer_name}. Concerns about pricing vs competitors.",
                f"At-risk renewal - {customer_name} evaluating alternatives. Set up exec sponsor call.",
                f"Tough call with {customer_name}. Budget constraints, may need discount to retain.",
            ],
            "unlikely": [
                f"Bad news from {customer_name}. Going with competitor. Exit interview scheduled.",
                f"Churn likely - {customer_name} not seeing ROI. Last ditch effort next week.",
                f"Lost renewal at {customer_name}. Strategic shift away from our category.",
            ],
        }
        
        notes = random.choice(templates.get(renewal_likelihood, templates["likely"]))
        
        if days_until < 60:
            notes += f" Contract expires in {days_until} days."
        
        return notes
