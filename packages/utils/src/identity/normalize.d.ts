/**
 * Text Normalization Utilities for Identity Matching
 */
/**
 * Normalize a company name for comparison
 * - Lowercase
 * - Remove punctuation
 * - Remove common suffixes (Inc., LLC, Corp., etc.)
 * - Collapse whitespace
 */
export declare function normalizeCompanyName(name: string): string;
/**
 * Extract domain from email address
 */
export declare function extractDomain(email: string): string | null;
/**
 * Normalize address for comparison
 */
export declare function normalizeAddress(address: string): string;
/**
 * Normalize phone number to digits only
 */
export declare function normalizePhone(phone: string): string;
/**
 * Tokenize a name into words for overlap comparison
 */
export declare function tokenizeName(name: string): string[];
/**
 * Calculate Jaro-Winkler similarity between two strings
 * Returns a value between 0 and 1, where 1 is an exact match
 */
export declare function jaroWinkler(s1: string, s2: string, prefixScale?: number): number;
/**
 * Calculate token overlap ratio between two sets
 */
export declare function tokenOverlap(tokens1: string[], tokens2: string[]): number;
/**
 * Generate a hash for blocking key purposes
 */
export declare function hashString(str: string): string;
//# sourceMappingURL=normalize.d.ts.map