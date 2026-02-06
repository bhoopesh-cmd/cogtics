# AI-Augmented Detection Engine Implementation Plan

## Executive Summary

This document outlines the comprehensive plan to enhance Cogtics' detection engine with AI/LLM capabilities, moving from purely rule-based detection to a hybrid system that combines:

- **Rule-based detection** (fast, deterministic, auditable)
- **LLM-powered analysis** (intelligent, contextual, prescriptive)

The goal is to achieve **prescriptive analytics**: not just identifying issues (descriptive) or predicting trends (predictive), but actively recommending what actions to take.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Target Architecture](#2-target-architecture)
3. [Implementation Plan](#3-implementation-plan)
4. [Data Synthesis Plan](#4-data-synthesis-plan)
5. [Testing and Validation Plan](#5-testing-and-validation-plan)
6. [Success Metrics](#6-success-metrics)
7. [Risk Mitigation](#7-risk-mitigation)
8. [Timeline and Milestones](#8-timeline-and-milestones)

---

## 1. Current State Analysis

### 1.1 What Exists

| Component | Implementation | Status |
|-----------|---------------|--------|
| Rule-based detection | 59 rules across 11 tiers | ✅ Working |
| LLM contract extraction | OpenAI GPT-4 integration | ✅ Working |
| Simulation engine | Deterministic calculations | ✅ Working |
| CSV column mapping | AI-powered suggestions | ✅ Working |

### 1.2 Current Detection Architecture

```
Snapshot Data → Rule Registry → Runner → Deduplicator → Scorer → Issues
```

**Limitations:**
- Rules only catch explicitly coded patterns
- No semantic understanding of contract language
- No cross-contract pattern recognition
- No proactive recommendations
- Issues lack business context explanations

### 1.3 Current Rule Coverage

| Tier | Category | Rules | Coverage |
|------|----------|-------|----------|
| 0 | Data Quality | 6 | R100-R105 |
| 1 | Billing | 10 | R001-R010 |
| 2 | Discounts | 6 | R011-R016 |
| 3 | Rev-Rec | 8 | R020-R027 |
| 4 | Credits | 4 | R110-R113 |
| 5 | Usage | 5 | R150-R154 |
| 6 | Lifecycle | 7 | R060-R064, R160-R161 |
| 7 | Multi-Entity | 4 | R170-R173 |
| 8 | Cross-Snapshot | 4 | R080-R083 |
| 9 | Tax/Fees | 2 | R120-R121 |
| 10 | FX/Currency | 3 | R130-R132 |

### 1.4 Existing LLM Infrastructure

**Location:** `packages/utils/src/llm/`

```typescript
// Existing capabilities in ContractLLM class
class ContractLLM {
  extractTerms(): Promise<ExtractedTerms>
  resolveConflict(): Promise<ConflictResolution>
  detectOverrideLanguage(): Promise<OverrideDetection>
  explainExtraction(): Promise<Explanation>
}
```

**Configuration:**
- Provider: OpenAI (GPT-4o, GPT-4o-mini)
- Features: JSON mode, retry logic, batch processing
- Environment: `OPENAI_API_KEY`, `OPENAI_MODEL`

---

## 2. Target Architecture

### 2.1 Hybrid Detection System

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DETECTION ENGINE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  TIER 1: Rule-Based Detection                               │   │
│  │  ─────────────────────────────────────────────────────────  │   │
│  │  • 59 deterministic rules                                   │   │
│  │  • Millisecond execution                                    │   │
│  │  • 100% auditable                                           │   │
│  │  • Zero API cost                                            │   │
│  │                                                             │   │
│  │  Output: RuleIssue[] with confidence scores                 │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                             │                                       │
│                             ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  TIER 2: AI Issue Enrichment                                │   │
│  │  ─────────────────────────────────────────────────────────  │   │
│  │  • Root cause analysis                                      │   │
│  │  • Business impact explanation                              │   │
│  │  • Fix recommendations                                      │   │
│  │  • Related issue correlation                                │   │
│  │                                                             │   │
│  │  Output: AIEnrichedIssue[] with explanations                │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                             │                                       │
│                             ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  TIER 3: AI Anomaly Detection                               │   │
│  │  ─────────────────────────────────────────────────────────  │   │
│  │  • Semantic inconsistencies                                 │   │
│  │  • Cross-contract patterns                                  │   │
│  │  • Novel anomalies rules missed                             │   │
│  │  • Contextual analysis                                      │   │
│  │                                                             │   │
│  │  Output: AIDiscoveredIssue[] (flagged for review)           │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                             │                                       │
│                             ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  TIER 4: Prescriptive Recommendations                       │   │
│  │  ─────────────────────────────────────────────────────────  │   │
│  │  • Simulation scenario generation                           │   │
│  │  • Impact prediction                                        │   │
│  │  • Prioritized action list                                  │   │
│  │  • One-click fix proposals                                  │   │
│  │                                                             │   │
│  │  Output: AIRecommendation[] with simulation configs         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Snapshot │───▶│  Rules   │───▶│ AI Enrich│───▶│ AI Detect│
│   Data   │    │  (59)    │    │  (LLM)   │    │  (LLM)   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │               │               │
                     ▼               ▼               ▼
              ┌──────────┐    ┌──────────┐    ┌──────────┐
              │  Rule    │    │ Enriched │    │   AI     │
              │  Issues  │    │  Issues  │    │ Findings │
              └──────────┘    └──────────┘    └──────────┘
                     │               │               │
                     └───────────────┴───────────────┘
                                     │
                                     ▼
                          ┌──────────────────┐
                          │   Combined       │
                          │   Issue List     │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ AI Prescriptive  │
                          │ Recommendations  │
                          └──────────────────┘
```

### 2.3 New Type Definitions

```typescript
// packages/rules/src/types.ts

/**
 * AI-enriched issue with business context
 */
interface AIEnrichedIssue extends RuleIssue {
  aiAnalysis: {
    rootCause: string;
    businessImpact: string;
    suggestedFix: string;
    confidence: number;
    relatedIssueIds: string[];
    explanation: string;  // Plain language for business users
  };
}

/**
 * AI-discovered issue (not found by rules)
 */
interface AIDiscoveredIssue {
  id: string;
  category: 'semantic' | 'pattern' | 'anomaly' | 'contextual';
  severity: IssueSeverity;
  confidence: number;
  title: string;
  description: string;
  evidence: {
    contractIds: string[];
    invoiceIds: string[];
    relevantFields: Record<string, unknown>;
  };
  reasoning: string;  // AI's explanation of why this is an issue
  requiresReview: true;  // Always flagged for human review
}

/**
 * AI-generated recommendation
 */
interface AIRecommendation {
  id: string;
  issueIds: string[];  // Issues this addresses
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedImpact: {
    revenueChange: number;
    currency: string;
    confidence: number;
  };
  suggestedSimulation: {
    overrides: SimulationOverride[];
    description: string;
  };
  effort: 'low' | 'medium' | 'high';
  reasoning: string;
}
```

---

## 3. Implementation Plan

### Phase 1: AI Issue Enrichment (Week 1-2)

**Goal:** Add AI explanations and recommendations to detected issues

#### 3.1.1 Extend LLM Client

**File:** `packages/utils/src/llm/detection.ts` (new)

```typescript
import { ContractLLM } from './client.js';
import type { RuleIssue, AIEnrichedIssue } from '@cogtics/rules';

export class DetectionLLM extends ContractLLM {
  /**
   * Enrich detected issues with AI analysis
   */
  async enrichIssues(
    issues: RuleIssue[],
    context: {
      contracts: ContractWithTerms[];
      invoices: InvoiceWithLines[];
      customers: Customer[];
    }
  ): Promise<AIEnrichedIssue[]> {
    // Batch issues by contract for efficiency
    const batches = this.batchByContract(issues, context);
    const enriched: AIEnrichedIssue[] = [];
    
    for (const batch of batches) {
      const result = await this.callLLM({
        systemPrompt: ISSUE_ENRICHMENT_SYSTEM_PROMPT,
        userPrompt: this.buildEnrichmentPrompt(batch),
        responseFormat: 'json',
      });
      
      enriched.push(...this.parseEnrichmentResponse(result, batch.issues));
    }
    
    return enriched;
  }
  
  /**
   * Generate fix recommendation for an issue
   */
  async suggestFix(
    issue: RuleIssue,
    context: IssueContext
  ): Promise<FixSuggestion> {
    const result = await this.callLLM({
      systemPrompt: FIX_SUGGESTION_SYSTEM_PROMPT,
      userPrompt: this.buildFixPrompt(issue, context),
      responseFormat: 'json',
    });
    
    return this.parseFixResponse(result);
  }
}
```

#### 3.1.2 Create Enrichment Prompts

**File:** `packages/utils/src/llm/prompts/detection.ts` (new)

```typescript
export const ISSUE_ENRICHMENT_SYSTEM_PROMPT = `
You are a revenue integrity analyst for a SaaS billing system.
Your task is to analyze detected billing discrepancies and provide:

1. ROOT CAUSE: Why did this discrepancy occur?
2. BUSINESS IMPACT: What is the financial and operational impact?
3. SUGGESTED FIX: What specific action should be taken?
4. EXPLANATION: Plain language summary for business stakeholders

You will receive:
- The detected issue with rule ID and details
- The related contract terms
- The related invoice data
- Customer context

Respond in JSON format matching the schema provided.
Be specific, actionable, and quantify impact where possible.
`;

export const FIX_SUGGESTION_SYSTEM_PROMPT = `
You are a revenue operations expert recommending fixes for billing issues.

For each issue, provide:
1. IMMEDIATE ACTION: What to do right now
2. ROOT CAUSE FIX: How to prevent recurrence
3. SIMULATION CONFIG: Parameters to test the fix
4. ESTIMATED IMPACT: Revenue change if fixed

Be practical and specific. Reference actual field names and values.
`;
```

#### 3.1.3 Integrate with Detection Worker

**File:** `apps/worker/src/processors/detect-run.ts` (modify)

```typescript
import { DetectionLLM } from '@cogtics/utils/llm/detection';

export async function processDetectRunJob(payload, logger, db) {
  // ... existing rule detection code ...
  
  const result = await runDetection(context, {});
  
  // NEW: AI enrichment (if enabled)
  let enrichedIssues = result.issues;
  if (config.aiEnrichment?.enabled && result.issues.length > 0) {
    const llm = new DetectionLLM();
    enrichedIssues = await llm.enrichIssues(
      result.issues.slice(0, config.aiEnrichment.maxIssues || 50),
      { contracts: data.contracts, invoices: data.invoices, customers: data.customers }
    );
    
    logger.info({ 
      enrichedCount: enrichedIssues.length 
    }, 'AI enrichment completed');
  }
  
  // Persist enriched issues
  for (const issue of enrichedIssues) {
    await db.insertInto('issues').values({
      // ... existing fields ...
      ai_analysis_json: issue.aiAnalysis || null,
    }).execute();
  }
}
```

#### 3.1.4 Database Schema Update

**File:** `packages/db/migrations/XXXX_add_ai_analysis.ts` (new)

```sql
ALTER TABLE issues 
ADD COLUMN ai_analysis_json JSONB;

ALTER TABLE issues
ADD COLUMN ai_enriched_at TIMESTAMPTZ;

CREATE INDEX idx_issues_ai_enriched 
ON issues(ai_enriched_at) 
WHERE ai_analysis_json IS NOT NULL;
```

---

### Phase 2: AI Anomaly Detection (Week 3-4)

**Goal:** Find issues that rules missed using semantic analysis

#### 3.2.1 Anomaly Detection Service

**File:** `packages/utils/src/llm/anomaly-detection.ts` (new)

```typescript
export class AnomalyDetectionLLM extends ContractLLM {
  /**
   * Detect anomalies that rules might miss
   */
  async detectAnomalies(
    context: RuleContext,
    existingIssues: RuleIssue[]
  ): Promise<AIDiscoveredIssue[]> {
    const analyses = await Promise.all([
      this.detectSemanticAnomalies(context),
      this.detectCrossContractPatterns(context),
      this.detectUnusualPatterns(context, existingIssues),
    ]);
    
    return analyses.flat();
  }
  
  /**
   * Find semantic inconsistencies
   * E.g., "Enterprise" tier contract with $99/mo pricing
   */
  private async detectSemanticAnomalies(
    context: RuleContext
  ): Promise<AIDiscoveredIssue[]> {
    const prompt = this.buildSemanticAnalysisPrompt(context);
    const result = await this.callLLM({
      systemPrompt: SEMANTIC_ANOMALY_SYSTEM_PROMPT,
      userPrompt: prompt,
      responseFormat: 'json',
    });
    
    return this.parseAnomalyResponse(result, 'semantic');
  }
  
  /**
   * Find patterns across multiple contracts
   * E.g., Same customer treated differently across contracts
   */
  private async detectCrossContractPatterns(
    context: RuleContext
  ): Promise<AIDiscoveredIssue[]> {
    // Group contracts by customer
    const byCustomer = groupBy(context.contracts, c => c.customer_id);
    const anomalies: AIDiscoveredIssue[] = [];
    
    for (const [customerId, contracts] of byCustomer) {
      if (contracts.length < 2) continue;
      
      const result = await this.callLLM({
        systemPrompt: CROSS_CONTRACT_SYSTEM_PROMPT,
        userPrompt: this.buildCrossContractPrompt(contracts, context.invoices),
        responseFormat: 'json',
      });
      
      anomalies.push(...this.parseAnomalyResponse(result, 'pattern'));
    }
    
    return anomalies;
  }
}
```

#### 3.2.2 Anomaly Detection Prompts

```typescript
export const SEMANTIC_ANOMALY_SYSTEM_PROMPT = `
You are analyzing contracts and invoices for semantic inconsistencies.

Look for issues like:
- Pricing tier mismatches (Enterprise contract with Starter pricing)
- Unusual discount patterns (90% discount on new customer)
- Inconsistent billing frequencies
- Missing expected charges
- Unusual payment terms

For each anomaly found, provide:
- TITLE: Brief description
- DESCRIPTION: Detailed explanation
- EVIDENCE: Specific data points that indicate the issue
- REASONING: Why this is likely an issue, not just unusual
- CONFIDENCE: 0.0-1.0 (only report if > 0.7)

Only report genuine anomalies. Unusual != wrong.
`;

export const CROSS_CONTRACT_SYSTEM_PROMPT = `
You are analyzing multiple contracts for the same customer to find inconsistencies.

Look for:
- Different pricing for same products
- Inconsistent discount treatment
- Billing frequency mismatches
- Terms that should be consistent but aren't
- Potential revenue leakage from inconsistent treatment

Be specific about which contracts have the inconsistency.
`;
```

---

### Phase 3: Prescriptive Recommendations (Week 5-6)

**Goal:** Generate actionable recommendations and simulation scenarios

#### 3.3.1 Recommendation Engine

**File:** `packages/utils/src/llm/recommendations.ts` (new)

```typescript
export class RecommendationLLM extends ContractLLM {
  /**
   * Generate recommendations from detected issues
   */
  async generateRecommendations(
    issues: AIEnrichedIssue[],
    context: RuleContext
  ): Promise<AIRecommendation[]> {
    // Group related issues
    const clusters = this.clusterRelatedIssues(issues);
    const recommendations: AIRecommendation[] = [];
    
    for (const cluster of clusters) {
      const rec = await this.generateClusterRecommendation(cluster, context);
      recommendations.push(rec);
    }
    
    // Sort by impact
    return recommendations.sort((a, b) => 
      b.estimatedImpact.revenueChange - a.estimatedImpact.revenueChange
    );
  }
  
  /**
   * Generate simulation configuration for a recommendation
   */
  async generateSimulationConfig(
    recommendation: AIRecommendation,
    context: RuleContext
  ): Promise<SimulationConfig> {
    const result = await this.callLLM({
      systemPrompt: SIMULATION_CONFIG_SYSTEM_PROMPT,
      userPrompt: this.buildSimulationPrompt(recommendation, context),
      responseFormat: 'json',
    });
    
    return this.parseSimulationConfig(result);
  }
}
```

#### 3.3.2 Integration with Simulation

**File:** `apps/api/src/routes/issues/recommendations.ts` (new)

```typescript
import { RecommendationLLM } from '@cogtics/utils/llm/recommendations';

export async function registerRecommendationRoutes(app: FastifyInstance) {
  // GET /issues/:id/recommendations
  app.get('/:id/recommendations', async (request, reply) => {
    const { id } = request.params;
    const issue = await getIssue(db, id);
    
    const llm = new RecommendationLLM();
    const recommendations = await llm.generateRecommendations(
      [issue],
      await loadContext(issue.snapshot_id)
    );
    
    return recommendations;
  });
  
  // POST /issues/:id/recommendations/:recId/simulate
  app.post('/:id/recommendations/:recId/simulate', async (request, reply) => {
    const { id, recId } = request.params;
    const recommendation = await getRecommendation(recId);
    
    // Create simulation from recommendation
    const simulation = await createSimulation({
      snapshotId: recommendation.snapshotId,
      name: `AI Recommendation: ${recommendation.title}`,
      overrides: recommendation.suggestedSimulation.overrides,
    });
    
    // Queue simulation run
    await queueJob('simulation.run', { simulationId: simulation.id });
    
    return { simulationId: simulation.id };
  });
}
```

---

### Phase 4: Configuration and Controls (Week 7)

#### 3.4.1 Detection Configuration Schema

**File:** `packages/schemas/src/detection-config.ts` (extend)

```typescript
export const AIDetectionConfigSchema = z.object({
  // Existing config...
  
  // AI Enrichment
  aiEnrichment: z.object({
    enabled: z.boolean().default(false),
    maxIssuesPerRun: z.number().min(1).max(100).default(50),
    minConfidenceToEnrich: z.number().min(0).max(1).default(0.5),
    includeRecommendations: z.boolean().default(true),
  }).optional(),
  
  // AI Anomaly Detection
  aiAnomalyDetection: z.object({
    enabled: z.boolean().default(false),
    minConfidenceToReport: z.number().min(0).max(1).default(0.7),
    maxAnomaliesPerRun: z.number().min(1).max(50).default(20),
    categories: z.array(z.enum(['semantic', 'pattern', 'anomaly', 'contextual'])).default(['semantic', 'pattern']),
  }).optional(),
  
  // Cost Controls
  llmCostControls: z.object({
    maxCostPerRunUsd: z.number().min(0).default(1.0),
    preferredModel: z.enum(['gpt-4o', 'gpt-4o-mini', 'gpt-4.1-mini']).default('gpt-4o-mini'),
    enableCaching: z.boolean().default(true),
  }).optional(),
});
```

---

## 4. Data Synthesis Plan

### 4.1 Current Data Gaps

The existing synthetic data generator produces 14 discrepancies but lacks:

| Gap | Impact | Resolution |
|-----|--------|------------|
| Contract terms (quantity, price) | R005/R004 can't validate | Add explicit term data |
| Tax configuration | Tax rules can't fire | Add customer tax status |
| Consecutive invoices | Frequency/duplicate detection fails | Generate invoice series |
| Semantic edge cases | AI anomaly detection untested | Add semantic test cases |
| Scale | Statistical validation impossible | Generate 200+ contracts |

### 4.2 Enhanced Synthetic Data Structure

```python
# tools/synthetic-data/src/config.py

COMPREHENSIVE_TEST_DATASET = {
    # Scale
    "customers": 50,
    "contracts": 200,
    "invoices": 1000,
    "products": 25,
    
    # Discrepancy Distribution
    "discrepancies": {
        # Billing tier (should be 100% detected by rules)
        "amount_over": 20,
        "amount_under": 20,
        "duplicate_invoice": 15,
        "missing_invoice": 15,
        
        # Need contract terms
        "wrong_quantity": 15,
        "wrong_unit_price": 15,
        
        # Need tax config
        "missing_tax": 15,
        "wrong_tax_rate": 10,
        
        # Timing
        "late_invoice": 10,
        "early_invoice": 10,
        "wrong_frequency": 15,
        
        # Relationship
        "orphan_invoice": 10,
        "wrong_customer": 10,
    },
    
    # AI-specific test cases
    "ai_test_cases": {
        # Semantic anomalies
        "pricing_tier_mismatch": 10,      # Enterprise contract, Starter price
        "unusual_discount": 10,           # 90% discount on new customer
        "inconsistent_treatment": 10,     # Same customer, different pricing
        
        # Cross-contract patterns
        "customer_inconsistency": 10,     # Same product, different prices
        "billing_frequency_mix": 5,       # Monthly + Annual for same customer
        
        # Edge cases
        "zero_value_contract": 5,         # $0 ARR with active invoices
        "negative_amounts": 5,            # Credits > Invoice total
        "future_dated": 5,                # Invoice dated in future
    },
    
    # Contract terms for validation
    "contract_terms_coverage": {
        "quantity_terms": True,           # Explicit seat counts
        "unit_price_terms": True,         # Per-seat pricing
        "discount_terms": True,           # Discount percentages
        "billing_frequency_terms": True,  # Monthly/Annual/Quarterly
        "payment_terms": True,            # Net 30, etc.
    },
}
```

### 4.3 New Synthetic Data Generator

**File:** `tools/synthetic-data/examples/generate_ai_test_dataset.py` (new)

```python
"""
AI Detection Test Dataset Generator

Generates comprehensive test data for validating:
1. Rule-based detection (59 rules)
2. AI enrichment quality
3. AI anomaly detection
4. Prescriptive recommendations

Usage:
    python generate_ai_test_dataset.py --output ./output/ai_test
    python generate_ai_test_dataset.py --with-ground-truth
"""

import json
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import List, Dict, Any

from src.config import COMPREHENSIVE_TEST_DATASET
from src.core.billing import generate_expected_invoices
from src.scenarios.discrepancies import generate_discrepancy_invoices
from src.scenarios.ai_test_cases import generate_ai_test_cases
from src.support.generators import FakerSupport


@dataclass
class ExpectedIssue:
    """Ground truth for validation."""
    issue_type: str
    rule_id: str  # Expected rule to fire, or "AI" for AI-only
    contract_id: str
    invoice_id: str | None
    severity: str
    expected_impact: float | None
    description: str
    

@dataclass
class ExpectedAIOutput:
    """Expected AI behavior for validation."""
    issue_id: str
    expected_root_cause_keywords: List[str]
    expected_fix_keywords: List[str]
    expected_recommendation_type: str | None


class AITestDatasetGenerator:
    """Generate comprehensive test data with ground truth."""
    
    def __init__(self, config: Dict = None):
        self.config = config or COMPREHENSIVE_TEST_DATASET
        self.faker = FakerSupport()
        self.expected_issues: List[ExpectedIssue] = []
        self.expected_ai_outputs: List[ExpectedAIOutput] = []
    
    def generate(self) -> Dict[str, Any]:
        """Generate complete dataset with ground truth."""
        
        # 1. Generate base entities
        customers = self._generate_customers()
        products = self._generate_products()
        contracts = self._generate_contracts(customers, products)
        
        # 2. Generate invoices with discrepancies
        invoices, discrepancy_log = self._generate_invoices(contracts)
        
        # 3. Generate AI-specific test cases
        ai_test_cases = self._generate_ai_test_cases(contracts, invoices)
        
        # 4. Build expected issues (ground truth)
        self._build_expected_issues(discrepancy_log, ai_test_cases)
        
        return {
            "customers": [asdict(c) for c in customers],
            "products": [asdict(p) for p in products],
            "contracts": [asdict(c) for c in contracts],
            "invoices": [asdict(i) for i in invoices],
            "expected_issues": [asdict(e) for e in self.expected_issues],
            "expected_ai_outputs": [asdict(e) for e in self.expected_ai_outputs],
            "metadata": {
                "total_discrepancies": len(self.expected_issues),
                "rule_detectable": len([e for e in self.expected_issues if e.rule_id != "AI"]),
                "ai_only": len([e for e in self.expected_issues if e.rule_id == "AI"]),
            }
        }
    
    def _generate_ai_test_cases(self, contracts, invoices):
        """Generate semantic anomalies and edge cases for AI testing."""
        ai_cases = []
        
        # Pricing tier mismatch
        for i in range(self.config["ai_test_cases"]["pricing_tier_mismatch"]):
            case = self._create_pricing_tier_mismatch(contracts, invoices)
            ai_cases.append(case)
            self.expected_issues.append(ExpectedIssue(
                issue_type="semantic_anomaly",
                rule_id="AI",  # Only AI should catch this
                contract_id=case["contract_id"],
                invoice_id=case.get("invoice_id"),
                severity="medium",
                expected_impact=case.get("impact"),
                description=f"Pricing tier mismatch: {case['description']}"
            ))
        
        # Add more AI test case types...
        
        return ai_cases


def main():
    generator = AITestDatasetGenerator()
    dataset = generator.generate()
    
    output_dir = Path("./output/ai_test")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save individual files
    for key in ["customers", "products", "contracts", "invoices"]:
        with open(output_dir / f"{key}.json", "w") as f:
            json.dump(dataset[key], f, indent=2, default=str)
    
    # Save ground truth
    with open(output_dir / "expected_issues.json", "w") as f:
        json.dump(dataset["expected_issues"], f, indent=2)
    
    with open(output_dir / "expected_ai_outputs.json", "w") as f:
        json.dump(dataset["expected_ai_outputs"], f, indent=2)
    
    # Print summary
    print(f"Generated dataset:")
    print(f"  Customers: {len(dataset['customers'])}")
    print(f"  Contracts: {len(dataset['contracts'])}")
    print(f"  Invoices: {len(dataset['invoices'])}")
    print(f"  Expected issues: {dataset['metadata']['total_discrepancies']}")
    print(f"    - Rule-detectable: {dataset['metadata']['rule_detectable']}")
    print(f"    - AI-only: {dataset['metadata']['ai_only']}")


if __name__ == "__main__":
    main()
```

### 4.4 AI Test Case Generator

**File:** `tools/synthetic-data/src/scenarios/ai_test_cases.py` (new)

```python
"""
AI-specific test cases that rules won't catch.

These test semantic understanding, pattern recognition,
and contextual analysis capabilities.
"""

from dataclasses import dataclass
from decimal import Decimal
from typing import List, Dict, Any
import random


@dataclass
class AITestCase:
    """Test case designed for AI detection."""
    case_type: str
    description: str
    contract_id: str
    invoice_id: str | None
    evidence: Dict[str, Any]
    expected_detection: str  # "AI_SEMANTIC", "AI_PATTERN", "AI_ANOMALY"
    severity: str
    impact: Decimal | None


class AITestCaseGenerator:
    """Generate test cases that require AI to detect."""
    
    def generate_pricing_tier_mismatch(
        self,
        contract,
        invoice,
    ) -> AITestCase:
        """
        Create a semantic anomaly: Enterprise tier with Starter pricing.
        Rules can't catch this because it requires understanding
        that "Enterprise" should cost more than $99/mo.
        """
        # Modify contract to have Enterprise tier
        contract.metadata_json = contract.metadata_json or {}
        contract.metadata_json["tier"] = "Enterprise"
        contract.metadata_json["tier_expected_arr_min"] = 50000
        
        # But set ARR to Starter-level pricing
        contract.arr = Decimal("1188")  # $99/mo
        
        return AITestCase(
            case_type="pricing_tier_mismatch",
            description=f"Enterprise tier contract {contract.id} priced at $99/mo (Starter pricing)",
            contract_id=contract.id,
            invoice_id=None,
            evidence={
                "tier": "Enterprise",
                "arr": float(contract.arr),
                "expected_min_arr": 50000,
            },
            expected_detection="AI_SEMANTIC",
            severity="high",
            impact=Decimal("50000") - contract.arr,
        )
    
    def generate_unusual_discount(
        self,
        contract,
        invoice,
    ) -> AITestCase:
        """
        Create a pattern anomaly: 90% discount on a new customer.
        Rules might allow any discount %, but AI should flag this.
        """
        # Apply extreme discount
        original_amount = invoice.total
        discount_pct = Decimal("0.90")
        invoice.total = original_amount * (1 - discount_pct)
        invoice.metadata_json = invoice.metadata_json or {}
        invoice.metadata_json["discount_pct"] = float(discount_pct * 100)
        invoice.metadata_json["discount_reason"] = "Special promotion"
        
        # Mark customer as new
        contract.metadata_json = contract.metadata_json or {}
        contract.metadata_json["customer_tenure_months"] = 0
        
        return AITestCase(
            case_type="unusual_discount",
            description=f"90% discount applied to new customer on invoice {invoice.id}",
            contract_id=contract.id,
            invoice_id=invoice.id,
            evidence={
                "discount_pct": 90,
                "customer_tenure_months": 0,
                "original_amount": float(original_amount),
                "discounted_amount": float(invoice.total),
            },
            expected_detection="AI_PATTERN",
            severity="medium",
            impact=original_amount - invoice.total,
        )
    
    def generate_cross_contract_inconsistency(
        self,
        contracts: List,
        invoices: List,
    ) -> AITestCase:
        """
        Create inconsistency across contracts for same customer.
        Same product, different pricing without justification.
        """
        if len(contracts) < 2:
            return None
        
        # Pick two contracts for same customer
        c1, c2 = contracts[0], contracts[1]
        
        # Set same product but different pricing
        c1.metadata_json = c1.metadata_json or {}
        c2.metadata_json = c2.metadata_json or {}
        c1.metadata_json["product_sku"] = "PROD-001"
        c2.metadata_json["product_sku"] = "PROD-001"
        
        c1.arr = Decimal("12000")  # $1000/mo
        c2.arr = Decimal("6000")   # $500/mo - 50% less for same product!
        
        return AITestCase(
            case_type="cross_contract_inconsistency",
            description=f"Same product PROD-001 priced differently across contracts {c1.id} and {c2.id}",
            contract_id=c1.id,  # Primary
            invoice_id=None,
            evidence={
                "product_sku": "PROD-001",
                "contract_1_arr": float(c1.arr),
                "contract_2_arr": float(c2.arr),
                "variance_pct": 50,
            },
            expected_detection="AI_PATTERN",
            severity="high",
            impact=c1.arr - c2.arr,
        )
```

---

## 5. Testing and Validation Plan

### 5.1 Validation Metrics

#### 5.1.1 Detection Accuracy (Rules + AI Combined)

| Metric | Formula | Target | Minimum |
|--------|---------|--------|---------|
| **Precision** | TP / (TP + FP) | > 92% | > 85% |
| **Recall** | TP / (TP + FN) | > 95% | > 90% |
| **F1 Score** | 2 × (P × R) / (P + R) | > 0.93 | > 0.87 |

#### 5.1.2 Rule-Only Metrics (Tier 1)

| Metric | Target |
|--------|--------|
| Rule recall on rule-detectable issues | > 98% |
| Rule precision | > 95% |
| False positive rate | < 5% |
| Execution time (1000 invoices) | < 500ms |

#### 5.1.3 AI Enrichment Metrics (Tier 2)

| Metric | Measurement | Target |
|--------|-------------|--------|
| **Explanation quality** | Human rating 1-5 | > 4.0 |
| **Root cause accuracy** | Correct identification rate | > 85% |
| **Fix relevance** | Would fix actually work? | > 80% |
| **Latency** | Time per batch (50 issues) | < 10s |
| **Cost** | USD per detection run | < $0.50 |

#### 5.1.4 AI Anomaly Detection Metrics (Tier 3)

| Metric | Target |
|--------|--------|
| Novel discovery rate (finds issues rules missed) | > 10% |
| Precision (reported anomalies are real) | > 70% |
| False positive rate | < 30% |

#### 5.1.5 Prescriptive Metrics (Tier 4)

| Metric | Target |
|--------|--------|
| Recommendation adoption rate | > 50% |
| Impact prediction accuracy | ±10% |
| Time to resolution (with AI help) | 40% reduction |

### 5.2 Test Suite Structure

```
tests/
├── unit/
│   ├── rules/
│   │   ├── test_billing_rules.py       # R001-R010
│   │   ├── test_discount_rules.py      # R011-R016
│   │   └── ...
│   └── llm/
│       ├── test_enrichment.py
│       ├── test_anomaly_detection.py
│       └── test_recommendations.py
│
├── integration/
│   ├── test_detection_pipeline.py      # Full pipeline
│   ├── test_ai_enrichment_flow.py
│   └── test_simulation_integration.py
│
├── validation/
│   ├── validate_synthetic_data.py      # Against ground truth
│   ├── compute_metrics.py              # P/R/F1 calculation
│   └── generate_report.py              # Human-readable report
│
└── fixtures/
    ├── synthetic/
    │   ├── customers.json
    │   ├── contracts.json
    │   ├── invoices.json
    │   ├── expected_issues.json        # Ground truth
    │   └── expected_ai_outputs.json    # AI behavior expectations
    └── edge_cases/
        ├── semantic_anomalies.json
        └── cross_contract_patterns.json
```

### 5.3 Validation Script

**File:** `tools/synthetic-data/validate_comprehensive.py` (new)

```python
"""
Comprehensive Detection Validation

Validates:
1. Rule-based detection accuracy
2. AI enrichment quality
3. AI anomaly detection performance
4. Combined system metrics

Usage:
    python validate_comprehensive.py --data ./output/ai_test
    python validate_comprehensive.py --data ./output/ai_test --with-ai
"""

import json
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict, Tuple
import statistics


@dataclass
class ValidationMetrics:
    """Comprehensive validation results."""
    # Detection metrics
    true_positives: int
    false_positives: int
    false_negatives: int
    precision: float
    recall: float
    f1_score: float
    
    # Breakdown
    by_rule: Dict[str, Dict]
    by_type: Dict[str, Dict]
    
    # AI metrics (if enabled)
    ai_novel_discoveries: int = 0
    ai_enrichment_quality: float = 0.0
    ai_latency_ms: float = 0.0
    ai_cost_usd: float = 0.0


def validate_detection(
    expected_issues: List[Dict],
    detected_issues: List[Dict],
) -> ValidationMetrics:
    """Calculate validation metrics."""
    
    # Match expected to detected
    matches = []
    unmatched_expected = []
    unmatched_detected = list(detected_issues)
    
    for expected in expected_issues:
        match = find_matching_issue(expected, unmatched_detected)
        if match:
            matches.append((expected, match))
            unmatched_detected.remove(match)
        else:
            unmatched_expected.append(expected)
    
    tp = len(matches)
    fp = len(unmatched_detected)
    fn = len(unmatched_expected)
    
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    return ValidationMetrics(
        true_positives=tp,
        false_positives=fp,
        false_negatives=fn,
        precision=precision,
        recall=recall,
        f1_score=f1,
        by_rule=compute_by_rule_metrics(expected_issues, detected_issues),
        by_type=compute_by_type_metrics(expected_issues, detected_issues),
    )


def find_matching_issue(expected: Dict, detected_list: List[Dict]) -> Dict | None:
    """Find matching detected issue for expected issue."""
    for detected in detected_list:
        # Match by contract + invoice + rule type
        if (detected.get("contract_id") == expected.get("contract_id") and
            detected.get("invoice_id") == expected.get("invoice_id") and
            rule_matches(detected.get("rule_id"), expected.get("rule_id"))):
            return detected
    return None


def generate_report(metrics: ValidationMetrics) -> str:
    """Generate human-readable validation report."""
    return f"""
================================================================================
                    DETECTION VALIDATION REPORT
================================================================================

OVERALL METRICS
---------------
  Precision:  {metrics.precision:.1%}  (target: >92%)  {'✓' if metrics.precision > 0.92 else '✗'}
  Recall:     {metrics.recall:.1%}  (target: >95%)  {'✓' if metrics.recall > 0.95 else '✗'}
  F1 Score:   {metrics.f1_score:.3f}   (target: >0.93) {'✓' if metrics.f1_score > 0.93 else '✗'}

CONFUSION MATRIX
----------------
  True Positives:  {metrics.true_positives}
  False Positives: {metrics.false_positives}
  False Negatives: {metrics.false_negatives}

BY RULE
-------
{format_by_rule(metrics.by_rule)}

BY DISCREPANCY TYPE
-------------------
{format_by_type(metrics.by_type)}

AI METRICS (if enabled)
-----------------------
  Novel Discoveries:    {metrics.ai_novel_discoveries}
  Enrichment Quality:   {metrics.ai_enrichment_quality:.2f}/5.0
  Avg Latency:          {metrics.ai_latency_ms:.0f}ms
  Cost per Run:         ${metrics.ai_cost_usd:.2f}

================================================================================
"""


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="./output/ai_test")
    parser.add_argument("--with-ai", action="store_true")
    args = parser.parse_args()
    
    data_dir = Path(args.data)
    
    # Load ground truth
    with open(data_dir / "expected_issues.json") as f:
        expected = json.load(f)
    
    # Run detection and load results
    # (In practice, this would call the detection API)
    detected = run_detection(data_dir)
    
    # Validate
    metrics = validate_detection(expected, detected)
    
    # Generate report
    report = generate_report(metrics)
    print(report)
    
    # Save metrics
    with open(data_dir / "validation_results.json", "w") as f:
        json.dump({
            "precision": metrics.precision,
            "recall": metrics.recall,
            "f1_score": metrics.f1_score,
            "by_rule": metrics.by_rule,
            "by_type": metrics.by_type,
        }, f, indent=2)
    
    # Exit with error if targets not met
    if metrics.f1_score < 0.87:
        print("❌ VALIDATION FAILED: F1 score below minimum threshold")
        exit(1)
    else:
        print("✓ VALIDATION PASSED")


if __name__ == "__main__":
    main()
```

---

## 6. Success Metrics

### 6.1 Technical Metrics

| Metric | Current | Target | Method |
|--------|---------|--------|--------|
| Detection recall | 42.9% | > 95% | Synthetic validation |
| Detection precision | N/A | > 92% | Synthetic validation |
| F1 Score | N/A | > 0.93 | Calculated |
| AI novel discovery rate | 0% | > 10% | AI-only test cases |
| Detection latency | ~120ms | < 500ms | Performance testing |
| AI enrichment latency | N/A | < 10s/batch | Performance testing |

### 6.2 Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Revenue leakage identified | +25% | Compare to rule-only baseline |
| Time to issue resolution | -40% | Measure with/without AI |
| User adoption of AI recommendations | > 50% | Track recommendation clicks |
| False positive escalations | < 10% | User feedback tracking |

### 6.3 Cost Metrics

| Metric | Target | Constraint |
|--------|--------|------------|
| LLM cost per detection run | < $0.50 | Budget control |
| LLM cost per issue enrichment | < $0.01 | Batch efficiency |
| Total monthly AI cost | < $500 | Business constraint |

---

## 7. Risk Mitigation

### 7.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LLM hallucinations | Medium | High | Always flag AI findings for review |
| High latency | Medium | Medium | Async processing, caching |
| API rate limits | Low | Medium | Batch processing, retries |
| Cost overruns | Medium | Medium | Per-run cost limits, model selection |

### 7.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| False positives erode trust | Medium | High | High confidence threshold (0.7+) |
| Users ignore AI suggestions | Medium | Medium | Track adoption, improve UX |
| Sensitive data in prompts | Low | High | Data anonymization, audit logs |

### 7.3 Fallback Strategy

```
IF ai_service_unavailable OR ai_latency > 30s:
    RETURN rule_only_results
    
IF ai_cost_exceeds_limit:
    DISABLE ai_enrichment
    LOG warning
    
IF ai_confidence < 0.5:
    DO NOT display to user
    LOG for analysis
```

---

## 8. Timeline and Milestones

### 8.1 Implementation Timeline

```
Week 1-2: Phase 1 - AI Issue Enrichment
├── Day 1-2: DetectionLLM class implementation
├── Day 3-4: Prompts and response parsing
├── Day 5-6: Worker integration
├── Day 7-8: Database schema updates
├── Day 9-10: Unit tests and debugging

Week 3-4: Phase 2 - AI Anomaly Detection
├── Day 1-3: AnomalyDetectionLLM implementation
├── Day 4-5: Semantic analysis prompts
├── Day 6-7: Cross-contract pattern detection
├── Day 8-10: Integration and testing

Week 5-6: Phase 3 - Prescriptive Recommendations
├── Day 1-3: RecommendationLLM implementation
├── Day 4-5: Simulation integration
├── Day 6-7: API endpoints
├── Day 8-10: Frontend integration

Week 7: Phase 4 - Configuration and Polish
├── Day 1-2: Configuration schema
├── Day 3-4: Cost controls
├── Day 5-7: Documentation and cleanup

Week 8: Validation and Launch
├── Day 1-3: Comprehensive synthetic data generation
├── Day 4-5: Full validation suite execution
├── Day 6-7: Performance optimization
├── Day 8-10: Staged rollout
```

### 8.2 Milestones

| Milestone | Date | Criteria |
|-----------|------|----------|
| M1: AI Enrichment MVP | Week 2 | Issues have AI explanations |
| M2: Anomaly Detection | Week 4 | AI finds issues rules miss |
| M3: Recommendations | Week 6 | One-click simulation from AI |
| M4: Validation Pass | Week 8 | F1 > 0.93 on synthetic data |
| M5: Production Release | Week 8 | Staged rollout complete |

---

## Appendix A: File Changes Summary

### New Files

| Path | Purpose |
|------|---------|
| `packages/utils/src/llm/detection.ts` | DetectionLLM class |
| `packages/utils/src/llm/anomaly-detection.ts` | AnomalyDetectionLLM class |
| `packages/utils/src/llm/recommendations.ts` | RecommendationLLM class |
| `packages/utils/src/llm/prompts/detection.ts` | AI prompts |
| `apps/api/src/routes/issues/recommendations.ts` | Recommendation API |
| `tools/synthetic-data/examples/generate_ai_test_dataset.py` | Test data generator |
| `tools/synthetic-data/src/scenarios/ai_test_cases.py` | AI test case generator |
| `tools/synthetic-data/validate_comprehensive.py` | Validation script |

### Modified Files

| Path | Changes |
|------|---------|
| `packages/rules/src/types.ts` | Add AIEnrichedIssue, AIDiscoveredIssue |
| `packages/schemas/src/detection-config.ts` | Add AI configuration |
| `apps/worker/src/processors/detect-run.ts` | Integrate AI enrichment |
| `packages/db/migrations/` | Add ai_analysis_json column |

---

## Appendix B: Prompt Templates

See `packages/utils/src/llm/prompts/detection.ts` for full prompt implementations.

---

## Appendix C: API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /issues/:id/ai-analysis` | GET | Get AI enrichment for issue |
| `POST /issues/:id/regenerate-analysis` | POST | Force re-run AI analysis |
| `GET /issues/:id/recommendations` | GET | Get AI recommendations |
| `POST /issues/:id/recommendations/:recId/simulate` | POST | Create simulation from recommendation |
| `GET /detection-runs/:id/ai-findings` | GET | Get AI-discovered anomalies |

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Author: Cogtics Development Team*
