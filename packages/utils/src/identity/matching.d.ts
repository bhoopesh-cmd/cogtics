/**
 * Identity Matching Utilities
 *
 * Blocking key generation and feature computation for identity resolution.
 */
import type { MatchFeatures } from '@cogtics/schemas';
/**
 * Customer record for matching
 */
export interface CustomerForMatching {
    id: string;
    name: string;
    email: string | null;
    external_id: string;
    source_system: string;
    metadata_json?: unknown;
}
/**
 * Blocking key types
 */
export type BlockingKeyType = 'domain' | 'normalized_name' | 'tax_id' | 'address';
/**
 * Generate blocking keys for a customer
 * Blocking keys are used to reduce candidate pair generation to O(n) instead of O(n²)
 */
export declare function generateBlockingKeys(customer: CustomerForMatching, keyTypes?: BlockingKeyType[]): Map<string, string>;
/**
 * Compute match features between two customers
 */
export declare function computeMatchFeatures(customerA: CustomerForMatching, customerB: CustomerForMatching): MatchFeatures;
/**
 * Find matching blocking keys between two customers
 */
export declare function findMatchingBlockingKeys(keysA: Map<string, string>, keysB: Map<string, string>): string[];
/**
 * Build blocking key index from customers
 * Returns a map of blocking key -> customer IDs
 */
export declare function buildBlockingKeyIndex(customers: CustomerForMatching[], keyTypes: BlockingKeyType[]): Map<string, Set<string>>;
/**
 * Generate candidate pairs using blocking keys
 * Returns pairs of customer IDs that share at least one blocking key
 */
export declare function generateCandidatePairs(customers: CustomerForMatching[], keyTypes: BlockingKeyType[], suppressedPairs?: Set<string>): Array<{
    idA: string;
    idB: string;
    blockingKeys: string[];
}>;
//# sourceMappingURL=matching.d.ts.map