/**
 * Term Extraction
 *
 * Rule-based and pattern-based extraction of contract terms.
 */
import type { ClauseSegment } from './segmentation.js';
export type TermType = 'pricing_model' | 'billing_cadence' | 'discount' | 'contract_value' | 'payment_terms' | 'uplift' | 'start_date' | 'end_date' | 'term_length' | 'billing_start_date' | 'renewal_terms' | 'termination_terms' | 'auto_renew' | 'notice_period' | 'early_termination_fee' | 'termination_notice_period' | 'usage_caps' | 'quantity' | 'min_commit' | 'usage_metric' | 'overage_rate' | 'unit_price' | 'currency' | 'tiered_pricing' | 'ramp_pricing' | 'credits' | 'implementation_fee' | 'deposit' | 'mfn_clause' | 'discount_start' | 'discount_end' | 'discount_cap' | 'discount_stacking' | 'proration_rule' | 'invoicing_timing' | 'tax_treatment' | 'withholding_tax' | 'jurisdiction' | 'true_up_clause' | 'reconciliation_period' | 'party_customer' | 'party_vendor' | 'party_affiliate';
export type ExtractionMethod = 'rule' | 'pattern' | 'llm';
export interface ExtractedTerm {
    termType: TermType;
    value: unknown;
    confidence: number;
    sourceClauseIndex: number;
    extractionMethod: ExtractionMethod;
    matchedText: string;
    startOffset: number;
    endOffset: number;
}
/**
 * Extract terms from clause segments
 */
export declare function extractTerms(clauses: ClauseSegment[]): ExtractedTerm[];
/**
 * Extract terms directly from text (without pre-segmented clauses)
 */
export declare function extractTermsFromText(text: string): ExtractedTerm[];
/**
 * Get all supported term types
 */
export declare function getSupportedTermTypes(): TermType[];
/**
 * Check if a term type is supported for extraction
 */
export declare function isTermTypeSupported(termType: string): termType is TermType;
//# sourceMappingURL=extraction.d.ts.map