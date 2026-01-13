/**
 * Identity Matching Utilities
 * 
 * Blocking key generation and feature computation for identity resolution.
 */
import type { MatchFeatures } from '@cogtics/schemas';
import {
  normalizeCompanyName,
  extractDomain,
  normalizeAddress,
  jaroWinkler,
  tokenizeName,
  tokenOverlap,
  hashString,
} from './normalize.js';

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
export function generateBlockingKeys(
  customer: CustomerForMatching,
  keyTypes: BlockingKeyType[] = ['domain', 'normalized_name']
): Map<string, string> {
  const keys = new Map<string, string>();
  
  for (const keyType of keyTypes) {
    const key = generateBlockingKey(customer, keyType);
    if (key) {
      keys.set(keyType, key);
    }
  }
  
  return keys;
}

/**
 * Generate a single blocking key
 */
function generateBlockingKey(
  customer: CustomerForMatching,
  keyType: BlockingKeyType
): string | null {
  switch (keyType) {
    case 'domain': {
      const domain = extractDomain(customer.email ?? '');
      return domain ? `domain:${domain}` : null;
    }
    
    case 'normalized_name': {
      const normalizedName = normalizeCompanyName(customer.name);
      if (!normalizedName || normalizedName.length < 3) return null;
      // Use first 3 chars + length as blocking key for fuzzy matching
      return `name:${normalizedName.substring(0, 3)}_${normalizedName.length}`;
    }
    
    case 'tax_id': {
      const metadata = customer.metadata_json as Record<string, unknown> | undefined;
      const taxId = metadata?.tax_id as string;
      if (!taxId) return null;
      return `tax:${taxId.replace(/\D/g, '')}`;
    }
    
    case 'address': {
      const metadata = customer.metadata_json as Record<string, unknown> | undefined;
      const address = metadata?.billing_address as string;
      if (!address) return null;
      const normalized = normalizeAddress(address);
      if (normalized.length < 5) return null;
      return `addr:${hashString(normalized)}`;
    }
    
    default:
      return null;
  }
}

/**
 * Compute match features between two customers
 */
export function computeMatchFeatures(
  customerA: CustomerForMatching,
  customerB: CustomerForMatching
): MatchFeatures {
  // Name similarity
  const nameA = normalizeCompanyName(customerA.name);
  const nameB = normalizeCompanyName(customerB.name);
  const nameSimilarity = nameA && nameB ? jaroWinkler(nameA, nameB) : 0;
  
  // Domain match
  const domainA = extractDomain(customerA.email ?? '');
  const domainB = extractDomain(customerB.email ?? '');
  const domainMatch = !!(domainA && domainB && domainA === domainB);
  
  // Metadata-based matching
  const metaA = (customerA.metadata_json as Record<string, unknown>) ?? {};
  const metaB = (customerB.metadata_json as Record<string, unknown>) ?? {};
  
  // Tax ID match
  const taxIdA = (metaA.tax_id as string) ?? '';
  const taxIdB = (metaB.tax_id as string) ?? '';
  const taxIdMatch = !!(taxIdA && taxIdB && taxIdA === taxIdB);
  
  // Address match
  const addrA = normalizeAddress((metaA.billing_address as string) ?? '');
  const addrB = normalizeAddress((metaB.billing_address as string) ?? '');
  const addressMatch = !!(addrA && addrB && addrA === addrB);
  
  // External ID overlap (different systems, same external ID pattern)
  const externalIdOverlap = 
    customerA.source_system !== customerB.source_system &&
    customerA.external_id === customerB.external_id;
  
  // Name token overlap
  const tokensA = tokenizeName(customerA.name);
  const tokensB = tokenizeName(customerB.name);
  const nameTokensOverlap = tokenOverlap(tokensA, tokensB);
  
  return {
    name_similarity: nameSimilarity,
    domain_match: domainMatch,
    tax_id_match: taxIdMatch,
    address_match: addressMatch,
    external_id_overlap: externalIdOverlap,
    name_tokens_overlap: nameTokensOverlap,
  };
}

/**
 * Find matching blocking keys between two customers
 */
export function findMatchingBlockingKeys(
  keysA: Map<string, string>,
  keysB: Map<string, string>
): string[] {
  const matching: string[] = [];
  
  for (const [type, valueA] of keysA) {
    const valueB = keysB.get(type);
    if (valueB && valueA === valueB) {
      matching.push(valueA);
    }
  }
  
  return matching;
}

/**
 * Build blocking key index from customers
 * Returns a map of blocking key -> customer IDs
 */
export function buildBlockingKeyIndex(
  customers: CustomerForMatching[],
  keyTypes: BlockingKeyType[]
): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  
  for (const customer of customers) {
    const keys = generateBlockingKeys(customer, keyTypes);
    
    for (const key of keys.values()) {
      if (!index.has(key)) {
        index.set(key, new Set());
      }
      index.get(key)!.add(customer.id);
    }
  }
  
  return index;
}

/**
 * Generate candidate pairs using blocking keys
 * Returns pairs of customer IDs that share at least one blocking key
 */
export function generateCandidatePairs(
  customers: CustomerForMatching[],
  keyTypes: BlockingKeyType[],
  suppressedPairs: Set<string> = new Set()
): Array<{ idA: string; idB: string; blockingKeys: string[] }> {
  const customerMap = new Map(customers.map(c => [c.id, c]));
  const index = buildBlockingKeyIndex(customers, keyTypes);
  const candidateMap = new Map<string, Set<string>>();
  
  // Find pairs that share blocking keys
  for (const [blockingKey, customerIds] of index) {
    if (customerIds.size < 2) continue;
    
    const ids = Array.from(customerIds).sort();
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const pairKey = `${ids[i]}:${ids[j]}`;
        
        // Skip suppressed pairs
        if (suppressedPairs.has(pairKey)) continue;
        
        if (!candidateMap.has(pairKey)) {
          candidateMap.set(pairKey, new Set());
        }
        candidateMap.get(pairKey)!.add(blockingKey);
      }
    }
  }
  
  // Convert to array
  return Array.from(candidateMap.entries()).map(([pairKey, keys]) => {
    const [idA, idB] = pairKey.split(':');
    return {
      idA,
      idB,
      blockingKeys: Array.from(keys),
    };
  });
}
