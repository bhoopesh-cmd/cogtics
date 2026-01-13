/**
 * Text Normalization Utilities for Identity Matching
 */

// Common company suffixes to remove
const COMPANY_SUFFIXES = [
  'inc', 'incorporated', 'corp', 'corporation', 'llc', 'llp', 'ltd', 'limited',
  'co', 'company', 'gmbh', 'ag', 'sa', 'srl', 'bv', 'nv', 'pty', 'plc',
  'holdings', 'group', 'international', 'intl', 'global', 'worldwide',
];

const SUFFIX_REGEX = new RegExp(
  `\\b(${COMPANY_SUFFIXES.join('|')})\\b\\.?`,
  'gi'
);

/**
 * Normalize a company name for comparison
 * - Lowercase
 * - Remove punctuation
 * - Remove common suffixes (Inc., LLC, Corp., etc.)
 * - Collapse whitespace
 */
export function normalizeCompanyName(name: string): string {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Remove punctuation
    .replace(SUFFIX_REGEX, '') // Remove company suffixes
    .replace(/\s+/g, ' ')      // Collapse whitespace
    .trim();
}

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string | null {
  if (!email || !email.includes('@')) return null;
  
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return null;
  
  // Exclude common personal email domains
  const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'mail.com'];
  if (personalDomains.includes(domain)) return null;
  
  return domain;
}

/**
 * Normalize address for comparison
 */
export function normalizeAddress(address: string): string {
  if (!address) return '';
  
  return address
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|way|place|pl)\b/g, '')
    .replace(/\b(suite|ste|unit|apt|apartment|floor|fl)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize phone number to digits only
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Tokenize a name into words for overlap comparison
 */
export function tokenizeName(name: string): string[] {
  if (!name) return [];
  
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1)
    .sort();
}

/**
 * Calculate Jaro similarity between two strings
 */
function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);
  
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) /
    3
  );
}

/**
 * Calculate Jaro-Winkler similarity between two strings
 * Returns a value between 0 and 1, where 1 is an exact match
 */
export function jaroWinkler(s1: string, s2: string, prefixScale = 0.1): number {
  if (s1 === s2) return 1;
  
  const jaroScore = jaroSimilarity(s1, s2);
  
  // Calculate common prefix length (max 4)
  let prefixLength = 0;
  const minLength = Math.min(s1.length, s2.length, 4);
  
  for (let i = 0; i < minLength; i++) {
    if (s1[i] === s2[i]) {
      prefixLength++;
    } else {
      break;
    }
  }
  
  return jaroScore + prefixLength * prefixScale * (1 - jaroScore);
}

/**
 * Calculate token overlap ratio between two sets
 */
export function tokenOverlap(tokens1: string[], tokens2: string[]): number {
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  
  let overlap = 0;
  for (const token of set1) {
    if (set2.has(token)) overlap++;
  }
  
  const unionSize = set1.size + set2.size - overlap;
  return overlap / unionSize;
}

/**
 * Generate a hash for blocking key purposes
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
