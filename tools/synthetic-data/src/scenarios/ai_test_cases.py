"""
AI Test Cases Scenario Generator

Generates synthetic data specifically designed to test AI detection capabilities:
- Semantic anomalies that rules can't detect
- Cross-contract patterns
- Contextual inconsistencies
- Novel issue patterns
- Low-confidence extraction scenarios

These test cases are designed to be caught by AI (Tier 3) rather than rules (Tier 1).

Coverage includes:
1. Semantic Anomalies
   - Pricing tier mismatch (Enterprise tier with Starter pricing)
   - Unusual discount (90% on new customer)
   - Suspicious narrative (description inconsistent with product)

2. Cross-Contract Patterns
   - Price variance (same product, >30% difference)
   - Term conflict (Net 30 vs Net 60)
   - Discount escalation (increasing discount for churning customer)

3. Low-Confidence Extractions
   - 30% extraction confidence (flagged for review)
   - Conflicting terms (different values from same contract)
"""

import random
import uuid
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum

from .billing import ExpectedIssue


class AITestCaseType(Enum):
    """Types of AI-detectable test cases"""
    # Semantic Anomalies
    SEMANTIC_PRICING_MISMATCH = "semantic_pricing_mismatch"
    SEMANTIC_PRICING_TIER = "semantic_pricing_tier"
    SEMANTIC_UNUSUAL_DISCOUNT = "semantic_unusual_discount"
    SEMANTIC_SUSPICIOUS_NARRATIVE = "semantic_suspicious_narrative"
    
    # Cross-Contract Patterns
    CROSS_CONTRACT_INCONSISTENCY = "cross_contract_inconsistency"
    CROSS_CONTRACT_PRICE_VARIANCE = "cross_contract_price_variance"
    CROSS_CONTRACT_TERM_CONFLICT = "cross_contract_term_conflict"
    CROSS_CONTRACT_DISCOUNT_ESCALATION = "cross_contract_discount_escalation"
    
    # Legacy types
    UNUSUAL_DISCOUNT_PATTERN = "unusual_discount_pattern"
    TIMING_ANOMALY = "timing_anomaly"
    CUSTOMER_SEGMENT_MISMATCH = "customer_segment_mismatch"
    CONTEXTUAL_CONFLICT = "contextual_conflict"
    STATISTICAL_OUTLIER = "statistical_outlier"
    PATTERN_DEVIATION = "pattern_deviation"
    
    # Low-Confidence Extractions
    LOW_CONFIDENCE_30 = "low_confidence_30"
    LOW_CONFIDENCE_CONFLICTING = "low_confidence_conflicting"
    LOW_CONFIDENCE_AMBIGUOUS = "low_confidence_ambiguous"

@dataclass
class AITestCase:
    """Definition of an AI test case"""
    id: str
    type: AITestCaseType
    description: str
    severity: str  # info, low, medium, high, critical
    confidence_expected: float  # Expected AI confidence
    detection_method: str  # semantic, pattern, anomaly, contextual
    evidence: Dict[str, Any]
    contracts_affected: List[str]
    invoices_affected: List[str]
    expected_reasoning: str
    tenant_id: str = "tenant_001"
    snapshot_id: str = "snap_001"
    customer_id: Optional[str] = None
    category: str = "ai_detection"
    
    def to_expected_issue(self) -> ExpectedIssue:
        """Convert to ExpectedIssue for ground truth."""
        return ExpectedIssue(
            id=self.id,
            rule_id=f"AI_{self.type.value.upper()}",
            category=self.category,
            severity=self.severity,
            tenant_id=self.tenant_id,
            snapshot_id=self.snapshot_id,
            contract_id=self.contracts_affected[0] if self.contracts_affected else None,
            invoice_id=self.invoices_affected[0] if self.invoices_affected else None,
            customer_id=self.customer_id,
            expected_amount=Decimal(str(self.evidence.get("expected_value", 0))) if self.evidence.get("expected_value") else None,
            actual_amount=Decimal(str(self.evidence.get("actual_value", 0))) if self.evidence.get("actual_value") else None,
            variance_pct=self.evidence.get("variance_pct"),
            description=self.description,
            detection_tier="ai",
            edge_case_type=self.detection_method,
        )


# Scenario configurations from the plan
AI_SEMANTIC_SCENARIOS = {
    "pricing_tier_mismatch": {
        "count": 15,
        "description": "Enterprise tier contract with Starter pricing",
        "evidence_template": {"tier": "Enterprise", "arr": 1200},
    },
    "unusual_discount": {
        "count": 15,
        "description": "90% discount on new customer (0 tenure)",
        "evidence_template": {"discount_pct": 90, "tenure_months": 0},
    },
    "suspicious_narrative": {
        "count": 10,
        "description": "Invoice description inconsistent with product",
        "evidence_template": {"description": "Platform license", "sku_type": "Professional Services"},
    },
}

AI_CROSS_CONTRACT_SCENARIOS = {
    "price_variance": {
        "count": 10,
        "description": "Same product, >30% price difference for same customer",
    },
    "term_conflict": {
        "count": 10,
        "description": "Net 30 on one contract, Net 60 on another",
    },
    "discount_escalation": {
        "count": 5,
        "description": "Increasing discount for customer showing churn signals",
    },
}

AI_LOW_CONFIDENCE_SCENARIOS = {
    "extraction_confidence_30": {
        "count": 15,
        "confidence": 0.30,
        "expected": "flagged for review",
    },
    "conflicting_terms": {
        "count": 10,
        "description": "Different values extracted from same contract",
    },
}


class AITestCaseGenerator:
    """Generator for comprehensive AI-specific test cases"""
    
    def __init__(
        self,
        tenant_id: str = "tenant_001",
        snapshot_id: str = "snap_001",
        seed: int = None,
    ):
        self.tenant_id = tenant_id
        self.snapshot_id = snapshot_id
        if seed:
            random.seed(seed)
        self.test_cases: List[AITestCase] = []
        self._counter = 0
    
    def _generate_id(self) -> str:
        self._counter += 1
        return f"ai_case_{self._counter:04d}"
    
    def generate_semantic_pricing_tier_mismatch(
        self,
        contracts: List[Dict],
        count: int = 15,
    ) -> List[AITestCase]:
        """
        Generate semantic pricing tier mismatches:
        Enterprise tier contract with Starter pricing
        """
        cases = []
        if not contracts:
            return cases
        
        for _ in range(min(count, len(contracts))):
            contract = random.choice(contracts)
            contract_value = float(contract.get('arr', contract.get('total_value', 0)))
            
            # Determine expected tier based on value
            if contract_value >= 100000:
                expected_tier = "Enterprise"
                actual_tier = "Starter"
                expected_arr = 100000
                actual_arr = 1200
            elif contract_value >= 50000:
                expected_tier = "Professional"
                actual_tier = "Basic"
                expected_arr = 50000
                actual_arr = 5000
            else:
                expected_tier = "Standard"
                actual_tier = "Starter"
                expected_arr = 20000
                actual_arr = 1200
            
            cases.append(AITestCase(
                id=self._generate_id(),
                type=AITestCaseType.SEMANTIC_PRICING_TIER,
                description=f"{expected_tier} tier contract priced at {actual_tier} tier rates",
                severity="high",
                confidence_expected=0.85,
                detection_method="semantic",
                evidence={
                    "expected_tier": expected_tier,
                    "actual_tier": actual_tier,
                    "expected_arr": expected_arr,
                    "actual_arr": actual_arr,
                    "pricing_deviation_pct": ((expected_arr - actual_arr) / expected_arr * 100) if expected_arr else 0,
                },
                contracts_affected=[contract.get('id', '')],
                invoices_affected=[],
                expected_reasoning=f"Contract characteristics suggest {expected_tier} tier but pricing indicates {actual_tier}",
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                customer_id=contract.get('customer_id'),
            ))
        
        return cases
    
    def generate_unusual_discount_scenarios(
        self,
        contracts: List[Dict],
        count: int = 15,
    ) -> List[AITestCase]:
        """
        Generate unusual discount patterns:
        - 90% discount on new customer (0 tenure)
        - Excessive discount without approval evidence
        """
        cases = []
        if not contracts:
            return cases
        
        for _ in range(min(count, len(contracts))):
            contract = random.choice(contracts)
            
            # Simulate unusual discount scenarios
            discount_pct = random.uniform(70, 95)  # 70-95% unusual
            tenure_months = random.randint(0, 2)  # New customer
            
            cases.append(AITestCase(
                id=self._generate_id(),
                type=AITestCaseType.SEMANTIC_UNUSUAL_DISCOUNT,
                description=f"Unusually high discount ({discount_pct:.0f}%) on customer with {tenure_months} months tenure",
                severity="critical" if discount_pct > 85 else "high",
                confidence_expected=0.90,
                detection_method="semantic",
                evidence={
                    "discount_pct": discount_pct,
                    "tenure_months": tenure_months,
                    "typical_discount_range": [5, 25],
                    "deviation_from_max": discount_pct - 25,
                },
                contracts_affected=[contract.get('id', '')],
                invoices_affected=[],
                expected_reasoning="Discount far exceeds typical range; new customer should not qualify for such deep discount",
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                customer_id=contract.get('customer_id'),
            ))
        
        return cases
    
    def generate_suspicious_narrative_scenarios(
        self,
        invoices: List[Dict],
        count: int = 10,
    ) -> List[AITestCase]:
        """
        Generate suspicious narrative mismatches:
        - Invoice description inconsistent with product SKU
        - Service description for license product
        """
        cases = []
        if not invoices:
            return cases
        
        mismatches = [
            {"description": "Platform License", "sku_type": "Professional Services", "product": "PS-IMPL-001"},
            {"description": "Annual Support", "sku_type": "One-Time Implementation", "product": "IMPL-SETUP"},
            {"description": "Usage Credits", "sku_type": "Seat License", "product": "ENT-SEAT-100"},
            {"description": "Training Services", "sku_type": "Subscription", "product": "SUB-MONTHLY"},
        ]
        
        for _ in range(min(count, len(invoices))):
            invoice = random.choice(invoices)
            mismatch = random.choice(mismatches)
            
            cases.append(AITestCase(
                id=self._generate_id(),
                type=AITestCaseType.SEMANTIC_SUSPICIOUS_NARRATIVE,
                description=f"Invoice description '{mismatch['description']}' inconsistent with SKU type '{mismatch['sku_type']}'",
                severity="medium",
                confidence_expected=0.75,
                detection_method="semantic",
                evidence={
                    "invoice_description": mismatch['description'],
                    "product_sku": mismatch['product'],
                    "expected_sku_type": mismatch['sku_type'],
                    "narrative_conflict": True,
                },
                contracts_affected=[invoice.get('contract_id', '')],
                invoices_affected=[invoice.get('id', '')],
                expected_reasoning="Invoice line description does not match the expected service type for this product SKU",
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                customer_id=invoice.get('customer_id'),
            ))
        
        return cases
    
    def generate_cross_contract_price_variance(
        self,
        contracts: List[Dict],
        count: int = 10,
    ) -> List[AITestCase]:
        """
        Generate cross-contract price variance:
        Same product, >30% price difference for same customer
        """
        cases = []
        
        # Group contracts by customer
        customer_contracts = {}
        for c in contracts:
            cust_id = c.get('customer_id')
            if cust_id:
                if cust_id not in customer_contracts:
                    customer_contracts[cust_id] = []
                customer_contracts[cust_id].append(c)
        
        # Find customers with multiple contracts
        for cust_id, clist in customer_contracts.items():
            if len(clist) >= 2 and len(cases) < count:
                # Get values
                values = [float(c.get('arr', c.get('total_value', 0))) for c in clist]
                if len(values) >= 2 and max(values) > 0:
                    variance_pct = (max(values) - min(values)) / max(values) * 100
                    
                    if variance_pct > 30:
                        cases.append(AITestCase(
                            id=self._generate_id(),
                            type=AITestCaseType.CROSS_CONTRACT_PRICE_VARIANCE,
                            description=f"Same customer has {variance_pct:.0f}% price variance across contracts",
                            severity="high",
                            confidence_expected=0.80,
                            detection_method="pattern",
                            evidence={
                                "customer_id": cust_id,
                                "contract_values": values,
                                "min_value": min(values),
                                "max_value": max(values),
                                "variance_pct": variance_pct,
                            },
                            contracts_affected=[c.get('id', '') for c in clist],
                            invoices_affected=[],
                            expected_reasoning="Same customer should have consistent pricing; large variance indicates potential error or unauthorized discount",
                            tenant_id=self.tenant_id,
                            snapshot_id=self.snapshot_id,
                            customer_id=cust_id,
                        ))
        
        return cases
    
    def generate_cross_contract_term_conflict(
        self,
        contracts: List[Dict],
        count: int = 10,
    ) -> List[AITestCase]:
        """
        Generate cross-contract term conflicts:
        Net 30 on one contract, Net 60 on another for same customer
        """
        cases = []
        
        # Group contracts by customer
        customer_contracts = {}
        for c in contracts:
            cust_id = c.get('customer_id')
            if cust_id:
                if cust_id not in customer_contracts:
                    customer_contracts[cust_id] = []
                customer_contracts[cust_id].append(c)
        
        for cust_id, clist in customer_contracts.items():
            if len(clist) >= 2 and len(cases) < count:
                # Simulate different payment terms
                terms = [random.choice([15, 30, 45, 60]) for _ in clist]
                
                if max(terms) != min(terms):
                    cases.append(AITestCase(
                        id=self._generate_id(),
                        type=AITestCaseType.CROSS_CONTRACT_TERM_CONFLICT,
                        description=f"Customer has conflicting payment terms: Net {min(terms)} vs Net {max(terms)}",
                        severity="medium",
                        confidence_expected=0.75,
                        detection_method="pattern",
                        evidence={
                            "customer_id": cust_id,
                            "payment_terms": terms,
                            "term_variance": max(terms) - min(terms),
                        },
                        contracts_affected=[c.get('id', '') for c in clist],
                        invoices_affected=[],
                        expected_reasoning="Payment terms should be consistent for same customer; variance may cause collection issues",
                        tenant_id=self.tenant_id,
                        snapshot_id=self.snapshot_id,
                        customer_id=cust_id,
                    ))
        
        return cases
    
    def generate_discount_escalation(
        self,
        contracts: List[Dict],
        count: int = 5,
    ) -> List[AITestCase]:
        """
        Generate discount escalation patterns:
        Increasing discount for customer showing churn signals
        """
        cases = []
        
        # Group contracts by customer with dates
        customer_contracts = {}
        for c in contracts:
            cust_id = c.get('customer_id')
            if cust_id:
                if cust_id not in customer_contracts:
                    customer_contracts[cust_id] = []
                customer_contracts[cust_id].append(c)
        
        for cust_id, clist in customer_contracts.items():
            if len(clist) >= 2 and len(cases) < count:
                # Simulate escalating discounts (churn prevention)
                discounts = sorted([random.uniform(10, 50) for _ in range(len(clist))])  # Escalating
                
                if discounts[-1] - discounts[0] > 15:  # Significant escalation
                    cases.append(AITestCase(
                        id=self._generate_id(),
                        type=AITestCaseType.CROSS_CONTRACT_DISCOUNT_ESCALATION,
                        description=f"Discount escalated from {discounts[0]:.0f}% to {discounts[-1]:.0f}% over {len(clist)} contracts",
                        severity="high",
                        confidence_expected=0.85,
                        detection_method="pattern",
                        evidence={
                            "customer_id": cust_id,
                            "discount_progression": discounts,
                            "escalation_amount": discounts[-1] - discounts[0],
                            "churn_risk_indicators": ["discount_escalation", "multiple_renewals"],
                        },
                        contracts_affected=[c.get('id', '') for c in clist],
                        invoices_affected=[],
                        expected_reasoning="Escalating discounts may indicate churn prevention; requires review of customer health",
                        tenant_id=self.tenant_id,
                        snapshot_id=self.snapshot_id,
                        customer_id=cust_id,
                    ))
        
        return cases
    
    def generate_low_confidence_extractions(
        self,
        contracts: List[Dict],
        count: int = 15,
    ) -> List[AITestCase]:
        """
        Generate low-confidence extraction scenarios:
        - 30% extraction confidence (flagged for review)
        """
        cases = []
        if not contracts:
            return cases
        
        for _ in range(min(count, len(contracts))):
            contract = random.choice(contracts)
            confidence = random.uniform(0.15, 0.40)  # 15-40% confidence
            
            cases.append(AITestCase(
                id=self._generate_id(),
                type=AITestCaseType.LOW_CONFIDENCE_30,
                description=f"Term extraction confidence {confidence*100:.0f}% - flagged for manual review",
                severity="medium",
                confidence_expected=confidence,
                detection_method="extraction",
                evidence={
                    "extraction_confidence": confidence,
                    "threshold": 0.60,
                    "terms_extracted": random.randint(3, 8),
                    "terms_uncertain": random.randint(2, 5),
                    "expected_action": "manual_review",
                },
                contracts_affected=[contract.get('id', '')],
                invoices_affected=[],
                expected_reasoning="Low confidence extraction requires human validation before relying on extracted terms",
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                customer_id=contract.get('customer_id'),
            ))
        
        return cases
    
    def generate_conflicting_terms(
        self,
        contracts: List[Dict],
        count: int = 10,
    ) -> List[AITestCase]:
        """
        Generate conflicting term extractions:
        Different values extracted from same contract section
        """
        cases = []
        if not contracts:
            return cases
        
        conflict_types = [
            {"term": "ARR", "value1": 50000, "value2": 60000, "source1": "Section 3.1", "source2": "Exhibit A"},
            {"term": "Quantity", "value1": 100, "value2": 150, "source1": "Order Form", "source2": "Schedule 1"},
            {"term": "Term Length", "value1": "12 months", "value2": "24 months", "source1": "Page 1", "source2": "Page 5"},
            {"term": "Discount", "value1": "15%", "value2": "20%", "source1": "Amendment 1", "source2": "Original"},
        ]
        
        for _ in range(min(count, len(contracts))):
            contract = random.choice(contracts)
            conflict = random.choice(conflict_types)
            
            cases.append(AITestCase(
                id=self._generate_id(),
                type=AITestCaseType.LOW_CONFIDENCE_CONFLICTING,
                description=f"Conflicting {conflict['term']} values: {conflict['value1']} vs {conflict['value2']}",
                severity="high",
                confidence_expected=0.50,
                detection_method="extraction",
                evidence={
                    "term_type": conflict['term'],
                    "value_1": conflict['value1'],
                    "value_2": conflict['value2'],
                    "source_1": conflict['source1'],
                    "source_2": conflict['source2'],
                    "conflict_type": "multiple_values",
                },
                contracts_affected=[contract.get('id', '')],
                invoices_affected=[],
                expected_reasoning=f"Multiple conflicting values for {conflict['term']} found in different sections; requires clarification",
                tenant_id=self.tenant_id,
                snapshot_id=self.snapshot_id,
                customer_id=contract.get('customer_id'),
            ))
        
        return cases

    def generate_semantic_pricing_mismatch(
        self,
        contracts: List[Dict],
        products: List[Dict]
    ) -> Optional[AITestCase]:
        """
        Generate a semantic pricing mismatch:
        - Premium customer on basic tier pricing
        - Enterprise product with starter pricing
        """
        if len(contracts) < 2:
            return None
            
        # Find contracts for same customer with different products
        customer_contracts = {}
        for c in contracts:
            cust_id = c.get('customer_id')
            if cust_id not in customer_contracts:
                customer_contracts[cust_id] = []
            customer_contracts[cust_id].append(c)
        
        # Find a customer with multiple contracts
        multi_contract_customers = [
            (cid, clist) for cid, clist in customer_contracts.items() 
            if len(clist) >= 2
        ]
        
        if not multi_contract_customers:
            return None
            
        cust_id, customer_contracts_list = random.choice(multi_contract_customers)
        contract = random.choice(customer_contracts_list)
        
        # Create mismatch: high-value customer with low pricing
        contract_value = float(contract.get('total_value', 0))
        expected_tier = 'enterprise' if contract_value > 50000 else 'standard'
        actual_tier = 'starter' if expected_tier == 'enterprise' else 'enterprise'
        
        return AITestCase(
            id=f"ai_semantic_{random.randint(1000, 9999)}",
            type=AITestCaseType.SEMANTIC_PRICING_MISMATCH,
            description=f"Contract value ({contract_value}) suggests {expected_tier} tier but pricing appears to be {actual_tier} tier",
            severity="high",
            confidence_expected=0.85,
            detection_method="semantic",
            evidence={
                "contract_value": contract_value,
                "expected_tier": expected_tier,
                "actual_tier": actual_tier,
                "pricing_deviation_pct": 40,
            },
            contracts_affected=[contract['id']],
            invoices_affected=[],
            expected_reasoning="Contract value and customer segment suggest enterprise pricing should apply"
        )
    
    def generate_cross_contract_inconsistency(
        self,
        contracts: List[Dict],
        customers: List[Dict]
    ) -> Optional[AITestCase]:
        """
        Generate cross-contract inconsistency:
        - Same customer getting different discount rates
        - Inconsistent payment terms for similar deals
        """
        # Group contracts by customer
        customer_contracts = {}
        for c in contracts:
            cust_id = c.get('customer_id')
            if cust_id not in customer_contracts:
                customer_contracts[cust_id] = []
            customer_contracts[cust_id].append(c)
        
        # Find customers with inconsistent contracts
        for cust_id, clist in customer_contracts.items():
            if len(clist) >= 2:
                # Check for value inconsistency
                values = [float(c.get('total_value', 0)) for c in clist]
                if len(values) >= 2:
                    max_val, min_val = max(values), min(values)
                    if max_val > 0 and (max_val - min_val) / max_val > 0.5:
                        # Significant value difference
                        return AITestCase(
                            id=f"ai_cross_{random.randint(1000, 9999)}",
                            type=AITestCaseType.CROSS_CONTRACT_INCONSISTENCY,
                            description=f"Customer {cust_id} has contracts with significantly different pricing (${min_val:.2f} vs ${max_val:.2f})",
                            severity="medium",
                            confidence_expected=0.75,
                            detection_method="pattern",
                            evidence={
                                "customer_id": cust_id,
                                "contract_values": values,
                                "variance_pct": ((max_val - min_val) / max_val) * 100,
                            },
                            contracts_affected=[c['id'] for c in clist],
                            invoices_affected=[],
                            expected_reasoning="Same customer should have consistent pricing across contracts"
                        )
        return None
    
    def generate_unusual_discount_pattern(
        self,
        contracts: List[Dict]
    ) -> Optional[AITestCase]:
        """
        Generate unusual discount patterns:
        - Discount higher than typical
        - Stacking discounts that shouldn't combine
        """
        contract = random.choice(contracts) if contracts else None
        if not contract:
            return None
            
        # Simulate unusual discount
        unusual_discount = random.uniform(0.40, 0.60)  # 40-60% discount
        
        return AITestCase(
            id=f"ai_discount_{random.randint(1000, 9999)}",
            type=AITestCaseType.UNUSUAL_DISCOUNT_PATTERN,
            description=f"Contract has unusually high discount ({unusual_discount*100:.1f}%) compared to typical range (10-25%)",
            severity="high",
            confidence_expected=0.80,
            detection_method="anomaly",
            evidence={
                "contract_id": contract['id'],
                "discount_pct": unusual_discount * 100,
                "typical_range": [10, 25],
                "deviation_from_mean": unusual_discount * 100 - 17.5,
            },
            contracts_affected=[contract['id']],
            invoices_affected=[],
            expected_reasoning="Discount significantly exceeds typical range for this product/customer segment"
        )
    
    def generate_timing_anomaly(
        self,
        invoices: List[Dict]
    ) -> Optional[AITestCase]:
        """
        Generate timing anomalies:
        - Invoice date patterns that don't match contract terms
        - Unusual billing frequency changes
        """
        if len(invoices) < 3:
            return None
            
        # Group invoices by contract
        contract_invoices = {}
        for inv in invoices:
            cid = inv.get('contract_id')
            if cid:
                if cid not in contract_invoices:
                    contract_invoices[cid] = []
                contract_invoices[cid].append(inv)
        
        # Find contract with timing anomaly
        for cid, inv_list in contract_invoices.items():
            if len(inv_list) >= 3:
                # Calculate intervals
                dates = sorted([inv.get('invoice_date') for inv in inv_list if inv.get('invoice_date')])
                if len(dates) >= 3:
                    intervals = []
                    for i in range(1, len(dates)):
                        if isinstance(dates[i], datetime) and isinstance(dates[i-1], datetime):
                            intervals.append((dates[i] - dates[i-1]).days)
                    
                    if intervals and max(intervals) > min(intervals) * 2:
                        return AITestCase(
                            id=f"ai_timing_{random.randint(1000, 9999)}",
                            type=AITestCaseType.TIMING_ANOMALY,
                            description=f"Invoice timing for contract {cid} is inconsistent (intervals: {intervals})",
                            severity="medium",
                            confidence_expected=0.70,
                            detection_method="pattern",
                            evidence={
                                "contract_id": cid,
                                "intervals_days": intervals,
                                "variance": max(intervals) - min(intervals),
                            },
                            contracts_affected=[cid],
                            invoices_affected=[inv['id'] for inv in inv_list],
                            expected_reasoning="Billing intervals vary significantly, suggesting potential process issue"
                        )
        return None
    
    def generate_statistical_outlier(
        self,
        contracts: List[Dict],
        invoices: List[Dict]
    ) -> Optional[AITestCase]:
        """
        Generate statistical outliers:
        - Contract value far from typical
        - Invoice amount significantly different from historical
        """
        if not contracts:
            return None
            
        values = [float(c.get('total_value', 0)) for c in contracts if c.get('total_value')]
        if len(values) < 5:
            return None
            
        mean_val = sum(values) / len(values)
        # Find outliers (3+ standard deviations)
        std_val = (sum((v - mean_val) ** 2 for v in values) / len(values)) ** 0.5
        
        outlier_contracts = [
            c for c in contracts 
            if c.get('total_value') and abs(float(c['total_value']) - mean_val) > 3 * std_val
        ]
        
        if outlier_contracts:
            outlier = random.choice(outlier_contracts)
            outlier_value = float(outlier['total_value'])
            
            return AITestCase(
                id=f"ai_outlier_{random.randint(1000, 9999)}",
                type=AITestCaseType.STATISTICAL_OUTLIER,
                description=f"Contract value ${outlier_value:.2f} is a statistical outlier (mean: ${mean_val:.2f}, std: ${std_val:.2f})",
                severity="medium",
                confidence_expected=0.85,
                detection_method="anomaly",
                evidence={
                    "contract_id": outlier['id'],
                    "value": outlier_value,
                    "mean": mean_val,
                    "std_deviation": std_val,
                    "z_score": (outlier_value - mean_val) / std_val if std_val > 0 else 0,
                },
                contracts_affected=[outlier['id']],
                invoices_affected=[],
                expected_reasoning="Contract value is more than 3 standard deviations from mean"
            )
        return None
    
    def generate_all_test_cases(
        self,
        contracts: List[Dict],
        invoices: List[Dict],
        customers: List[Dict],
        products: List[Dict]
    ) -> List[AITestCase]:
        """Generate all types of AI test cases with comprehensive coverage"""
        
        test_cases = []
        
        # New comprehensive generators (lists)
        list_generators = [
            # Semantic anomalies
            lambda: self.generate_semantic_pricing_tier_mismatch(contracts, count=15),
            lambda: self.generate_unusual_discount_scenarios(contracts, count=15),
            lambda: self.generate_suspicious_narrative_scenarios(invoices, count=10),
            # Cross-contract patterns
            lambda: self.generate_cross_contract_price_variance(contracts, count=10),
            lambda: self.generate_cross_contract_term_conflict(contracts, count=10),
            lambda: self.generate_discount_escalation(contracts, count=5),
            # Low-confidence extractions
            lambda: self.generate_low_confidence_extractions(contracts, count=15),
            lambda: self.generate_conflicting_terms(contracts, count=10),
        ]
        
        for gen in list_generators:
            try:
                cases = gen()
                test_cases.extend(cases)
            except Exception as e:
                print(f"Warning: Failed to generate test cases: {e}")
        
        # Legacy single-case generators
        single_generators = [
            lambda: self.generate_semantic_pricing_mismatch(contracts, products),
            lambda: self.generate_cross_contract_inconsistency(contracts, customers),
            lambda: self.generate_unusual_discount_pattern(contracts),
            lambda: self.generate_timing_anomaly(invoices),
            lambda: self.generate_statistical_outlier(contracts, invoices),
        ]
        
        for gen in single_generators:
            try:
                case = gen()
                if case:
                    test_cases.append(case)
            except Exception as e:
                print(f"Warning: Failed to generate test case: {e}")
        
        self.test_cases = test_cases
        return test_cases
    
    def generate_comprehensive_ai_scenarios(
        self,
        contracts: List[Dict],
        invoices: List[Dict],
    ) -> tuple[List[AITestCase], List[ExpectedIssue]]:
        """
        Generate comprehensive AI test scenarios with ground truth.
        
        Returns:
            Tuple of (ai_test_cases, expected_issues)
        """
        test_cases = []
        expected_issues = []
        
        # Generate all scenario types
        scenarios = [
            self.generate_semantic_pricing_tier_mismatch(contracts),
            self.generate_unusual_discount_scenarios(contracts),
            self.generate_suspicious_narrative_scenarios(invoices),
            self.generate_cross_contract_price_variance(contracts),
            self.generate_cross_contract_term_conflict(contracts),
            self.generate_discount_escalation(contracts),
            self.generate_low_confidence_extractions(contracts),
            self.generate_conflicting_terms(contracts),
        ]
        
        for scenario_cases in scenarios:
            test_cases.extend(scenario_cases)
            for tc in scenario_cases:
                expected_issues.append(tc.to_expected_issue())
        
        self.test_cases = test_cases
        return test_cases, expected_issues
    
    def to_ground_truth(self) -> List[Dict]:
        """Convert test cases to ground truth format for validation"""
        return [
            {
                "id": tc.id,
                "type": tc.type.value,
                "description": tc.description,
                "severity": tc.severity,
                "confidence_expected": tc.confidence_expected,
                "detection_method": tc.detection_method,
                "contracts_affected": tc.contracts_affected,
                "invoices_affected": tc.invoices_affected,
                "expected_reasoning": tc.expected_reasoning,
                "evidence": tc.evidence,
            }
            for tc in self.test_cases
        ]


def generate_ai_test_dataset(
    num_contracts: int = 200,
    num_invoices: int = 1000,
    seed: int = None
) -> Dict[str, Any]:
    """
    Generate a complete dataset with AI test cases.
    
    Returns:
        Dict with contracts, invoices, customers, products, and ai_test_cases
    """
    from ..models.contracts import ContractGenerator
    from ..models.customers import CustomerGenerator
    from ..models.invoices import InvoiceGenerator
    from ..models.products import ProductGenerator
    
    # Initialize generators
    if seed:
        random.seed(seed)
    
    # Generate base data
    customer_gen = CustomerGenerator()
    customers = [customer_gen.generate() for _ in range(50)]
    
    product_gen = ProductGenerator()
    products = [product_gen.generate() for _ in range(20)]
    
    contract_gen = ContractGenerator()
    contracts = []
    for _ in range(num_contracts):
        customer = random.choice(customers)
        contract = contract_gen.generate(customer_id=customer['id'])
        contracts.append(contract)
    
    invoice_gen = InvoiceGenerator()
    invoices = []
    for _ in range(num_invoices):
        contract = random.choice(contracts)
        invoice = invoice_gen.generate(contract_id=contract['id'])
        invoices.append(invoice)
    
    # Generate AI test cases
    ai_generator = AITestCaseGenerator(seed=seed)
    ai_test_cases = ai_generator.generate_all_test_cases(
        contracts, invoices, customers, products
    )
    
    return {
        "contracts": contracts,
        "invoices": invoices,
        "customers": customers,
        "products": products,
        "ai_test_cases": ai_generator.to_ground_truth(),
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "num_contracts": len(contracts),
            "num_invoices": len(invoices),
            "num_ai_test_cases": len(ai_test_cases),
            "seed": seed,
        }
    }
