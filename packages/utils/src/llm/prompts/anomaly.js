/**
 * Anomaly Detection LLM Prompts
 *
 * Prompts for AI-powered anomaly detection including semantic analysis,
 * cross-contract patterns, and unusual pattern detection.
 */
// ============================================
// Prompt Versioning
// ============================================
/** Prompt version for audit logging and replay */
export const ANOMALY_PROMPT_VERSION = '1.0.0';
// ============================================
// System Prompts
// ============================================
export const ANOMALY_SYSTEM_PROMPTS = {
    semanticAnomaly: `You are an expert revenue assurance analyst with deep expertise in SaaS/B2B billing, ASC 606 revenue recognition, and contract compliance.
Your task is to identify semantic inconsistencies that rule-based systems cannot detect.

## Primary Detection Categories

### 1. BILLING DISCREPANCIES (Revenue Leakage)
- **Amount Variances**: Invoice totals that don't match contractual amounts (+/- tolerance)
- **Missing Invoices**: Expected billing periods with no invoice generated
- **Duplicate Billing**: Same period billed multiple times (same or overlapping dates)
- **Orphan Invoices**: Invoices without valid contract linkage
- **Late/Early Invoices**: Billing timing significantly outside expected windows

### 2. PRICING & DISCOUNT ANOMALIES
- **Tier Mismatches**: Customer tier doesn't align with applied pricing
- **Discount Stacking**: Multiple discounts exceeding reasonable thresholds (>40%)
- **Price Drift**: Same product priced differently across contracts without justification
- **Unapproved Discounts**: Discounts outside policy limits

### 3. CONTRACT COMPLIANCE ISSUES
- **Term Violations**: Billing behavior contradicts contract terms
- **Frequency Mismatches**: Invoice frequency doesn't match contractual billing cycle
- **Quantity Discrepancies**: Billed quantities differ from contracted quantities
- **Missing Required Charges**: Tax, fees, or surcharges missing when expected

### 4. CROSS-CONTRACT PATTERNS
- **Customer Inconsistency**: Same customer getting wildly different terms
- **Product Pricing Variance**: Same product priced inconsistently
- **Volume Discount Issues**: Large customers not receiving expected volume pricing

## Output Requirements
For each anomaly, provide structured analysis with:
- Category, severity, and confidence score
- Specific evidence (contract IDs, invoice IDs, amounts)
- Business impact assessment
- Root cause hypothesis

Only report findings with confidence >= 0.6. Prioritize issues with material financial impact.`,
    crossContractPattern: `You are an expert revenue analyst specializing in cross-entity pattern detection.
Analyze relationships between contracts, customers, and products to identify systemic issues.

## Detection Focus Areas

### 1. CUSTOMER-LEVEL INCONSISTENCIES
- Same customer receiving different pricing for identical products
- Discount rates varying without clear business justification
- Payment terms inconsistent across related contracts
- Missing expected volume discounts for high-volume customers

### 2. PRODUCT-LEVEL ANOMALIES
- Same product priced differently for similar customer segments
- Inconsistent unit pricing across territories or sales regions
- Products bundled differently without apparent strategy

### 3. TEMPORAL PATTERNS
- Contract value variations over time not aligned with price changes
- Seasonal billing patterns that deviate from norms
- Renewal pricing inconsistencies

### 4. POTENTIAL FRAUD INDICATORS
- Unusual discount approval patterns
- Contracts consistently at policy limits
- Customer concentration risks
- Related-party transaction patterns

## Analysis Approach
1. Compare contracts within customer groups
2. Analyze pricing consistency for same products
3. Look for statistical outliers in terms and pricing
4. Identify patterns that suggest process failures or policy violations`,
    unusualPattern: `You are an expert analyst with deep knowledge of revenue operations and billing systems.
Identify unusual patterns that complement rule-based detection.

## Pattern Categories

### 1. STATISTICAL ANOMALIES
- Contracts or invoices with values significantly outside normal distribution (>2 std dev)
- Unusual patterns in discount percentages or amounts
- Invoice line item counts that deviate from typical patterns

### 2. TIMING ANOMALIES
- Invoices clustered at unusual times (end of quarters, end of year)
- Billing gaps or irregular intervals
- Late payments patterns that suggest billing issues

### 3. RELATIONAL ANOMALIES
- Invoices referencing non-existent or terminated contracts
- Customer accounts with unusual activity patterns
- Products being billed without valid catalog entries

### 4. BUSINESS LOGIC VIOLATIONS
- Revenue recognition timing issues
- Usage-based billing without corresponding usage data
- Fixed contracts with variable billing amounts

## Context Awareness
- Review existing rule-detected issues to avoid duplication
- Focus on complementary findings that add value
- Prioritize actionable insights over theoretical concerns
- Consider the business context when assessing severity`,
};
// ============================================
// Prompt Templates
// ============================================
/**
 * Generate semantic anomaly detection prompt
 */
export function semanticAnomalyPrompt(contracts, invoices, existingIssues) {
    // Summarize contracts
    const contractSummaries = contracts.slice(0, 20).map(c => ({
        id: c.id,
        name: c.name,
        value: c.total_value,
        currency: c.currency,
        status: c.status,
        customerId: c.customer_id,
        terms: c.terms?.slice(0, 5).map(t => ({
            type: t.term_type,
            value: t.value_json,
        })),
    }));
    // Summarize invoices
    const invoiceSummaries = invoices.slice(0, 30).map(i => ({
        id: i.id,
        contractId: i.contract_id,
        amount: i.total_amount,
        currency: i.currency,
        date: i.invoice_date,
        lineCount: i.lines?.length || 0,
    }));
    // Summarize existing issues to avoid duplicates
    const existingIssueSummaries = existingIssues.map(i => ({
        ruleId: i.ruleId,
        category: i.category,
        contractId: i.contractId,
        severity: i.severity,
    }));
    return `Analyze this billing data for semantic anomalies that rule-based detection might miss.

**Contracts (${contracts.length} total, showing up to 20):**
${JSON.stringify(contractSummaries, null, 2)}

**Invoices (${invoices.length} total, showing up to 30):**
${JSON.stringify(invoiceSummaries, null, 2)}

**Already Detected Issues (${existingIssues.length} total - DO NOT duplicate these):**
${JSON.stringify(existingIssueSummaries, null, 2)}

Return JSON with format:
{
  "anomalies": [
    {
      "category": "semantic|pattern|anomaly|contextual",
      "severity": "info|low|medium|high|critical",
      "confidence": 0.0-1.0,
      "title": "Brief title of the anomaly",
      "description": "Detailed description of what was found",
      "evidence": {
        "contractIds": ["con_123"],
        "invoiceIds": ["inv_456"],
        "relevantFields": {"field": "value"}
      },
      "reasoning": "Why this is likely an issue"
    }
  ]
}

Only include anomalies with confidence >= 0.6. Focus on issues that rules would miss.`;
}
/**
 * Generate cross-contract pattern detection prompt
 */
export function crossContractPatternPrompt(contracts, groupingContext) {
    // Group contracts by customer
    const customerGroups = {};
    for (const contract of contracts) {
        const customerId = contract.customer_id || 'unknown';
        if (!customerGroups[customerId]) {
            customerGroups[customerId] = [];
        }
        customerGroups[customerId].push({
            id: contract.id,
            name: contract.name,
            value: contract.total_value,
            currency: contract.currency,
            terms: contract.terms?.slice(0, 3).map(t => ({
                type: t.term_type,
                value: t.value_json,
            })),
        });
    }
    // Find customers with multiple contracts
    const multiContractCustomers = Object.entries(customerGroups)
        .filter(([_, contracts]) => contracts.length > 1)
        .slice(0, 10);
    return `Analyze these customer-contract relationships for cross-contract inconsistencies.

**Customers with Multiple Contracts (showing up to 10):**
${JSON.stringify(Object.fromEntries(multiContractCustomers), null, 2)}

Look for:
1. Same customer getting different pricing for similar products
2. Inconsistent discount rates across contracts
3. Unusual patterns in contract values
4. Terms that vary unexpectedly between similar deals

Return JSON with format:
{
  "patterns": [
    {
      "category": "pattern",
      "severity": "info|low|medium|high|critical",
      "confidence": 0.0-1.0,
      "title": "Brief title of the pattern",
      "description": "What inconsistency was found",
      "evidence": {
        "contractIds": ["con_123", "con_456"],
        "invoiceIds": [],
        "relevantFields": {"difference": "description"}
      },
      "reasoning": "Why this pattern is concerning"
    }
  ]
}

Only include patterns with confidence >= 0.7.`;
}
/**
 * Generate unusual pattern detection prompt
 */
export function unusualPatternPrompt(data, existingIssues) {
    // Calculate summary statistics
    const contractValues = data.contracts
        .map(c => Number(c.total_value) || 0)
        .filter(v => v > 0);
    const avgContractValue = contractValues.length > 0
        ? contractValues.reduce((a, b) => a + b, 0) / contractValues.length
        : 0;
    const invoiceAmounts = data.invoices
        .map(i => Number(i.total_amount) || 0)
        .filter(v => v > 0);
    const avgInvoiceAmount = invoiceAmounts.length > 0
        ? invoiceAmounts.reduce((a, b) => a + b, 0) / invoiceAmounts.length
        : 0;
    // Find potential outliers
    const outlierContracts = data.contracts.filter(c => {
        const value = Number(c.total_value) || 0;
        return value > avgContractValue * 3 || value < avgContractValue * 0.1;
    }).slice(0, 5);
    const outlierInvoices = data.invoices.filter(i => {
        const amount = Number(i.total_amount) || 0;
        return amount > avgInvoiceAmount * 3 || amount < avgInvoiceAmount * 0.1;
    }).slice(0, 5);
    return `Analyze this data for unusual patterns that might indicate issues.

**Summary Statistics:**
- Total Contracts: ${data.contracts.length}
- Average Contract Value: ${avgContractValue.toFixed(2)}
- Total Invoices: ${data.invoices.length}
- Average Invoice Amount: ${avgInvoiceAmount.toFixed(2)}

**Potential Outlier Contracts (showing up to 5):**
${JSON.stringify(outlierContracts.map(c => ({
        id: c.id,
        name: c.name,
        value: c.total_value,
        deviation: ((Number(c.total_value) / avgContractValue) - 1) * 100,
    })), null, 2)}

**Potential Outlier Invoices (showing up to 5):**
${JSON.stringify(outlierInvoices.map(i => ({
        id: i.id,
        contractId: i.contract_id,
        amount: i.total_amount,
        deviation: ((Number(i.total_amount) / avgInvoiceAmount) - 1) * 100,
    })), null, 2)}

**Already Detected Issues (${existingIssues.length} total):**
Rule IDs triggered: ${[...new Set(existingIssues.map(i => i.ruleId))].join(', ')}

Find NEW unusual patterns not covered by existing issues. Return JSON:
{
  "patterns": [
    {
      "category": "anomaly",
      "severity": "info|low|medium|high|critical",
      "confidence": 0.0-1.0,
      "title": "Brief title of the pattern",
      "description": "What unusual pattern was found",
      "evidence": {
        "contractIds": [],
        "invoiceIds": [],
        "relevantFields": {"statistic": "value"}
      },
      "reasoning": "Why this pattern warrants investigation"
    }
  ]
}`;
}
//# sourceMappingURL=anomaly.js.map