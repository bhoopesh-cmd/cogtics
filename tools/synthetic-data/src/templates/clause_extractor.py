"""
Clause extractor for building templates from contracts.
"""

import re
from typing import Any, Optional, Union
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
    "Non_Compete",
    "Exclusivity",
    "No_Solicit",
    "No_Solicit_Employees",
    "Non_Disparagement",
    "Change_Of_Control",
    "Anti_Assignment",
    "Audit_Rights",
    "Insurance",
    "Source_Code_Escrow",
    "Post_Termination",
    "Revenue_Sharing",
    "Volume_Restriction",
    "MFN",
    "ROFR",
    "Affiliate_License_Licensee",
    "Affiliate_License_Licensor",
    "Competitive_Restriction_Exception",
    "Document_Name",
    "Irrevocable_Or_Perpetual_License",
    "Joint_IP_Ownership",
    "Non_Transferable_License",
    "Unlimited_License",
    "Liquidated_Damages",
    "Warranty_Duration",
    "Uncapped_Liability",
    "Third_Party_Beneficiary",
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
    "Non_Compete": "Non-Compete",
    "Exclusivity": "Exclusivity",
    "No_Solicit": "No-Solicit Of Customers",
    "No_Solicit_Employees": "No-Solicit Of Employees",
    "Non_Disparagement": "Non-Disparagement",
    "Change_Of_Control": "Change Of Control",
    "Anti_Assignment": "Anti-Assignment",
    "Audit_Rights": "Audit Rights",
    "Insurance": "Insurance",
    "Source_Code_Escrow": "Source Code Escrow",
    "Post_Termination": "Post-Termination Services",
    "Revenue_Sharing": "Revenue/Profit Sharing",
    "Volume_Restriction": "Volume Restriction",
    "MFN": "Most Favored Nation",
    "ROFR": "Rofr/Rofo/Rofn",
    "Affiliate_License_Licensee": "Affiliate License-Licensee",
    "Affiliate_License_Licensor": "Affiliate License-Licensor",
    "Competitive_Restriction_Exception": "Competitive Restriction Exception",
    "Document_Name": "Document Name",
    "Irrevocable_Or_Perpetual_License": "Irrevocable Or Perpetual License",
    "Joint_IP_Ownership": "Joint Ip Ownership",
    "Non_Transferable_License": "Non-Transferable License",
    "Unlimited_License": "Unlimited/All-You-Can-Eat-License",
    "Liquidated_Damages": "Liquidated Damages",
    "Warranty_Duration": "Warranty Duration",
    "Uncapped_Liability": "Uncapped Liability",
    "Third_Party_Beneficiary": "Third Party Beneficiary",
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
            fallbacks = self._get_fallback_templates(clause_type)
            if not fallbacks:
                return None
            if index is not None and 0 <= index < len(fallbacks):
                return fallbacks[index]
            import random
            return random.choice(fallbacks)
        
        if index is not None and 0 <= index < len(templates):
            return templates[index]
        
        import random
        return random.choice(templates)
    
    def get_random_template(self, clause_type: str) -> Optional[str]:
        """Get a random template for the clause type."""
        return self.get_template(clause_type)
    
    def _get_fallback_templates(self, clause_type: Optional[str] = None) -> Union[dict[str, list[str]], list[str]]:
        """Get fallback templates when CUAD is not available."""
        fallbacks: dict[str, list[str]] = {
            "Parties": [
                'This Agreement is entered into by and between [PARTY_A] ("Company") and [PARTY_B] ("Customer").',
                'This Agreement is made by and between [PARTY_A] and [PARTY_B], each a "Party" and together the "Parties."',
                'This Agreement is between [PARTY_A], a corporation, and [PARTY_B], a customer, as of [DATE].',
            ],
            "Agreement_Date": [
                'This Agreement is effective as of [DATE] (the "Effective Date").',
                'The parties enter into this Agreement on [DATE].',
                'This Agreement is dated [DATE] and becomes effective upon execution.',
            ],
            "Effective_Date": [
                'This Agreement shall become effective on [DATE] and shall remain in effect until terminated in accordance with its terms.',
                'The Effective Date of this Agreement is [DATE].',
                'This Agreement starts on [DATE] and continues for the Term described herein.',
            ],
            "Expiration_Date": [
                'This Agreement shall expire on [END_DATE] unless earlier terminated or renewed in accordance with its terms.',
                'The Term ends on [END_DATE], unless extended by written agreement.',
                'This Agreement expires on [END_DATE] unless terminated sooner under this Agreement.',
            ],
            "Renewal_Term": [
                'This Agreement shall automatically renew for successive [RENEWAL_PERIOD] periods unless either party provides written notice of non-renewal at least [NOTICE_DAYS] days prior to the expiration of the then-current term.',
                'The Agreement renews for [RENEWAL_PERIOD] periods unless a party gives notice of non-renewal [NOTICE_DAYS] days before expiration.',
                'Unless timely notice is given, this Agreement renews for [RENEWAL_PERIOD] terms.',
            ],
            "Notice_Period": [
                'Either party may terminate this Agreement upon [NOTICE_DAYS] days prior written notice to the other party.',
                'A party may terminate by providing [NOTICE_DAYS] days advance written notice.',
                'Termination requires at least [NOTICE_DAYS] days written notice to the other party.',
            ],
            "Price_Restrictions": [
                'The fees set forth in this Agreement shall remain fixed for the Initial Term. Upon renewal, fees may be increased by no more than [PERCENTAGE]% per year with at least [NOTICE_DAYS] days prior notice.',
                'Fees are fixed during the Initial Term and may increase up to [PERCENTAGE]% annually upon renewal with [NOTICE_DAYS] days notice.',
                'Pricing will not increase more than [PERCENTAGE]% in any renewal period with [NOTICE_DAYS] days advance notice.',
            ],
            "Payment_Terms": [
                'Customer shall pay all invoices within [PAYMENT_DAYS] days of the invoice date. Late payments shall accrue interest at [INTEREST_RATE]% per month or the maximum rate permitted by law.',
                'All fees are due and payable net [PAYMENT_DAYS] days from invoice date; overdue amounts accrue interest at [INTEREST_RATE]%.',
                'Payment is due within [PAYMENT_DAYS] days following receipt of invoice, with late fees at [INTEREST_RATE]% per month.',
            ],
            "Termination": [
                'Either party may terminate this Agreement for cause upon [NOTICE_DAYS] days written notice if the other party materially breaches this Agreement and fails to cure such breach within the notice period.',
                'A party may terminate for material breach after [NOTICE_DAYS] days notice and failure to cure.',
                'This Agreement may be terminated for cause with [NOTICE_DAYS] days written notice if the breach is not cured.',
            ],
            "Governing_Law": [
                'This Agreement shall be governed by and construed in accordance with the laws of the State of [STATE], without regard to its conflicts of law principles.',
                'The laws of [STATE] govern this Agreement, excluding conflict of law rules.',
                'This Agreement is governed by the laws of [STATE].',
            ],
            "License_Grant": [
                'Subject to the terms of this Agreement, Company grants Customer a non-exclusive, non-transferable license to access and use the Services during the Term for internal business purposes.',
                'Company grants Customer a limited, non-exclusive license to use the Services in accordance with this Agreement.',
                'Customer is granted a non-exclusive license to access the Services for its internal operations during the Term.',
            ],
            "Liability_Cap": [
                'IN NO EVENT SHALL EITHER PARTY\'S AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT EXCEED THE TOTAL AMOUNT PAID BY CUSTOMER DURING THE [PERIOD] IMMEDIATELY PRECEDING THE CLAIM.',
                'Each party\'s total liability under this Agreement is capped at fees paid in the [PERIOD] before the claim.',
                'Aggregate liability shall not exceed the amounts paid under this Agreement during the [PERIOD] prior to the event.',
            ],
            "Indemnification": [
                'Each party shall indemnify, defend, and hold harmless the other party from third-party claims arising from its breach of this Agreement.',
                'Company will indemnify Customer against third-party claims alleging infringement by the Services.',
                'Customer will indemnify Company against claims arising from Customer\'s misuse of the Services.',
            ],
            "Confidentiality": [
                'Each party shall protect the other party\'s Confidential Information using reasonable care and shall not disclose such information except as permitted.',
                'Confidential Information must be kept confidential and used only to perform under this Agreement.',
                'The receiving party shall not disclose Confidential Information to third parties without consent.',
            ],
            "IP_Ownership": [
                'Company retains all right, title, and interest in the Services and underlying technology, and no rights are granted except as expressly stated.',
                'All intellectual property rights in the Services remain with Company.',
                'Customer retains ownership of its data; Company retains ownership of its platform and IP.',
            ],
            "Non_Compete": [
                'During the Term and for [PERIOD] thereafter, Customer shall not compete with Company in [TERRITORY].',
                'Customer agrees not to engage in a business substantially similar to the Services for [PERIOD] after termination.',
                'The parties agree to a non-compete obligation for [PERIOD] within [TERRITORY].',
            ],
            "Exclusivity": [
                'Customer agrees to use Company as its exclusive provider of [SERVICES] during the Term.',
                'The parties agree to an exclusivity arrangement for [PERIOD] covering the Services.',
                'Customer will not engage another provider for the Services while this Agreement is in effect.',
            ],
            "No_Solicit": [
                'Neither party shall solicit the other party\'s customers for [PERIOD] following termination.',
                'For [PERIOD], Customer will not solicit Company\'s customers or prospects.',
                'The parties agree not to solicit each other\'s customers during the Term and for [PERIOD] thereafter.',
            ],
            "No_Solicit_Employees": [
                'Neither party will solicit for employment the other party\'s employees during the Term and for [PERIOD] thereafter.',
                'For [PERIOD], Customer shall not solicit or hire Company employees involved with the Services.',
                'Each party agrees not to recruit the other party\'s employees for [PERIOD] after termination.',
            ],
            "Non_Disparagement": [
                'Each party agrees it will not make disparaging statements about the other party or its products.',
                'The parties shall refrain from any public statements that could reasonably be viewed as disparaging.',
                'Neither party will disparage the other party during the Term and for [PERIOD] thereafter.',
            ],
            "Change_Of_Control": [
                'In the event of a change of control of either party, the other party may terminate this Agreement upon [NOTICE_DAYS] days notice.',
                'A change of control triggers the right to terminate this Agreement with [NOTICE_DAYS] days notice.',
                'This Agreement may be terminated if a party undergoes a change of control.',
            ],
            "Anti_Assignment": [
                'Neither party may assign this Agreement without the prior written consent of the other party, except to a successor in interest.',
                'Assignment is prohibited without written consent, except in connection with a merger or sale of substantially all assets.',
                'This Agreement may not be assigned by either party without the other party\'s prior written approval.',
            ],
            "Audit_Rights": [
                'Customer may audit Company\'s compliance with this Agreement upon [NOTICE_DAYS] days prior notice.',
                'Company shall permit audits of relevant records no more than once per year with [NOTICE_DAYS] notice.',
                'Audit rights are granted to Customer to verify compliance, subject to reasonable notice.',
            ],
            "Insurance": [
                'Each party shall maintain commercially reasonable insurance coverage during the Term.',
                'Company will maintain insurance policies with coverage amounts customary for similar services.',
                'The parties shall carry adequate insurance, including general liability coverage.',
            ],
            "Source_Code_Escrow": [
                'Company shall deposit source code for the Services into escrow with a third-party escrow agent.',
                'Source code escrow shall be maintained to ensure access upon specified release conditions.',
                'Company will maintain a source code escrow arrangement for the benefit of Customer.',
            ],
            "Post_Termination": [
                'Upon termination, Company shall provide transition assistance for [PERIOD] at the rates set forth herein.',
                'Following termination, Company will cooperate to transition services for [PERIOD].',
                'Post-termination support will be provided for [PERIOD] on mutually agreed terms.',
            ],
            "Revenue_Sharing": [
                'The parties shall share revenues from the Services in accordance with the percentages set forth in Exhibit [EXHIBIT].',
                'Company shall pay Customer [PERCENTAGE]% of net revenues from the Services.',
                'Revenue sharing will be calculated and paid on a quarterly basis pursuant to Exhibit [EXHIBIT].',
            ],
            "Volume_Restriction": [
                'Customer may not exceed [VOLUME] units of usage per [PERIOD] without Company\'s prior approval.',
                'Usage is limited to [VOLUME] per [PERIOD] unless otherwise agreed.',
                'The Services are subject to a volume cap of [VOLUME] per [PERIOD].',
            ],
            "MFN": [
                'If Company offers more favorable pricing to a similarly situated customer, Customer shall be entitled to such pricing.',
                'Customer will receive pricing no less favorable than any comparable customer (most favored nation).',
                'Company agrees to provide Customer with MFN pricing terms.',
            ],
            "ROFR": [
                'Customer shall have a right of first refusal with respect to any material change in scope.',
                'Company grants Customer a right of first refusal on future offerings described in Exhibit [EXHIBIT].',
                'The parties agree to a right of first refusal on new services for [PERIOD].',
            ],
            "Affiliate_License_Licensee": [
                'Customer\'s Affiliates may use the Services as licensees subject to this Agreement and any applicable order forms.',
                'Affiliates of Customer are permitted to access the Services as licensees under the same terms.',
                'Customer Affiliates may be licensees under this Agreement upon written notice to Company.',
            ],
            "Affiliate_License_Licensor": [
                'Company\'s Affiliates may grant licenses under this Agreement and may enforce its terms.',
                'Affiliates of Company are licensor parties with the same rights and protections as Company.',
                'Company and its Affiliates may act as licensors for the Services.',
            ],
            "Competitive_Restriction_Exception": [
                'Restrictions on competitive use shall not apply to products acquired through an acquisition.',
                'The competitive restriction does not apply where required by applicable law or regulation.',
                'Competitive restrictions exclude internal development that does not compete with the Services.',
            ],
            "Document_Name": [
                'This document is titled [DOCUMENT_NAME] and constitutes the entire agreement between the parties.',
                'The agreement documented herein is the [DOCUMENT_NAME].',
                'This [DOCUMENT_NAME] is entered into by the parties as of [DATE].',
            ],
            "Irrevocable_Or_Perpetual_License": [
                'The license granted herein is perpetual and irrevocable, subject to termination for material breach.',
                'Customer receives an irrevocable license to use the Services for the duration of the Term.',
                'The license is perpetual unless terminated under this Agreement.',
            ],
            "Joint_IP_Ownership": [
                'All jointly developed intellectual property shall be owned jointly by the parties.',
                'Each party will have an undivided interest in jointly created IP, as further described in Exhibit [EXHIBIT].',
                'Joint IP ownership shall be governed by the terms set forth in this Agreement.',
            ],
            "Non_Transferable_License": [
                'The license granted to Customer is non-transferable and may not be assigned without Company\'s consent.',
                'Customer\'s license is personal and non-transferable except as permitted herein.',
                'The license is non-transferable and non-assignable.',
            ],
            "Unlimited_License": [
                'Customer is granted an unlimited, all-you-can-eat license for the Services during the Term.',
                'The license permits unlimited use by Customer without additional per-user fees.',
                'An unlimited license is granted for the Services subject to the terms of this Agreement.',
            ],
            "Liquidated_Damages": [
                'If Company fails to meet the service levels, it shall pay liquidated damages of [AMOUNT] per incident.',
                'Liquidated damages of [AMOUNT] apply for each material breach of the SLA.',
                'The parties agree to liquidated damages in the amount of [AMOUNT] for specified failures.',
            ],
            "Warranty_Duration": [
                'Company warrants the Services for a period of [PERIOD] following delivery.',
                'The warranty period shall be [PERIOD] from the Effective Date.',
                'Warranty coverage lasts for [PERIOD] as described in this Agreement.',
            ],
            "Uncapped_Liability": [
                'Liability is uncapped for breaches of confidentiality and willful misconduct.',
                'The liability cap shall not apply to fraud, gross negligence, or intentional misconduct.',
                'Certain obligations are uncapped, including confidentiality and IP infringement.',
            ],
            "Third_Party_Beneficiary": [
                'This Agreement is for the benefit of the parties and their permitted successors and assigns, and no third party is a beneficiary.',
                'No third party shall have any rights under this Agreement, except as expressly stated.',
                'There are no third-party beneficiaries to this Agreement.',
            ],
        }

        if clause_type is None:
            return fallbacks
        return fallbacks.get(clause_type, [])

    def inject_variation(self, text: str) -> str:
        """Inject light-weight phrasing and structure variation."""
        import random

        if not text or len(text) < 20:
            return text

        result = text

        # Only apply phrasing variations (safe - doesn't break structure)
        variations = [
            ("shall", ["shall", "will", "must"]),
            ("pursuant to", ["pursuant to", "under", "in accordance with"]),
            ("prior written notice", ["prior written notice", "advance written notice", "written notice"]),
            ("hereinafter", ["hereinafter", "hereafter", "subsequently"]),
            ("in the event that", ["in the event that", "if", "should"]),
            ("provided that", ["provided that", "provided, however, that", "subject to"]),
        ]

        for needle, options in variations:
            if re.search(rf"\b{re.escape(needle)}\b", result, flags=re.IGNORECASE):
                replacement = random.choice(options)
                result = re.sub(rf"\b{re.escape(needle)}\b", replacement, result, count=1, flags=re.IGNORECASE)

        # Only add "It is agreed that" to clauses that start with a verb or subject
        # Skip if clause starts with: numbers, quotes, definitions, ALL CAPS title
        first_word = result.split()[0] if result.split() else ""
        starts_with_structure = (
            re.match(r"^\s*[\d\"\'\(\[]", result) or  # Starts with number, quote, paren, bracket
            re.match(r"^\s*[A-Z]{2,}", result) or     # Starts with ALL CAPS (title)
            first_word.lower() in ["the", "this", "a", "an", "each", "all", "any", "no", "if", "when", "upon"]
        )

        if random.random() < 0.15 and not starts_with_structure:
            result = "It is agreed that " + result[0].lower() + result[1:]

        # Don't add numbering prefixes - this causes "1. 3." issues with CUAD content
        # The PDF template already adds clause numbers via clause_label

        return result
    
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
