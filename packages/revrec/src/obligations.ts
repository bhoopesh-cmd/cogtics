/**
 * Obligation Identification
 * 
 * Identifies performance obligations from contract terms.
 */
import type { 
  ContractInput, 
  ContractTermInput, 
  IdentifiedObligation,
  ObligationType,
  AllocationMethod,
  RecognitionMethod,
} from './types.js';

// ============================================
// Term Type to Obligation Mapping
// ============================================

const TERM_TYPE_MAPPINGS: Record<string, {
  obligationType: ObligationType;
  recognitionMethod: RecognitionMethod;
}> = {
  'contract_value': { obligationType: 'subscription', recognitionMethod: 'straight_line' },
  'billing_cadence': { obligationType: 'subscription', recognitionMethod: 'straight_line' },
  'term_length': { obligationType: 'subscription', recognitionMethod: 'straight_line' },
  'support_terms': { obligationType: 'support', recognitionMethod: 'straight_line' },
  'usage_terms': { obligationType: 'usage', recognitionMethod: 'usage_based' },
  'professional_services': { obligationType: 'professional_services', recognitionMethod: 'milestone' },
  'one_time_fee': { obligationType: 'one_time', recognitionMethod: 'as_invoiced' },
  'setup_fee': { obligationType: 'one_time', recognitionMethod: 'as_invoiced' },
  'implementation': { obligationType: 'professional_services', recognitionMethod: 'milestone' },
};

// ============================================
// Main Functions
// ============================================

/**
 * Identifies performance obligations from a contract and its terms.
 * 
 * Rules:
 * 1. Parse contract terms to find distinct performance obligations
 * 2. If no specific terms, create a single subscription obligation from ARR
 * 3. Handle bundled obligations
 * 4. Validate dates and amounts
 */
export function identifyObligations(contract: ContractInput): IdentifiedObligation[] {
  const obligations: IdentifiedObligation[] = [];
  
  // Validate contract dates
  const serviceStartDate = contract.startDate ?? new Date();
  const serviceEndDate = contract.endDate ?? addYears(serviceStartDate, 1);
  
  if (serviceEndDate <= serviceStartDate) {
    throw new Error(`Invalid contract dates: end date (${serviceEndDate.toISOString()}) must be after start date (${serviceStartDate.toISOString()})`);
  }
  
  // If no terms or no value, create default obligation from ARR
  if (!contract.terms || contract.terms.length === 0) {
    return createDefaultObligation(contract, serviceStartDate, serviceEndDate);
  }
  
  // Group terms by obligation type
  const groupedTerms = groupTermsByObligation(contract.terms);
  
  // Create obligations from grouped terms
  for (const [obligationType, terms] of Object.entries(groupedTerms)) {
    const obligation = createObligationFromTerms(
      contract,
      obligationType as ObligationType,
      terms,
      serviceStartDate,
      serviceEndDate
    );
    
    if (obligation) {
      obligations.push(obligation);
    }
  }
  
  // If no obligations were created, fall back to default
  if (obligations.length === 0) {
    return createDefaultObligation(contract, serviceStartDate, serviceEndDate);
  }
  
  return obligations;
}

/**
 * Creates a default subscription obligation when no specific terms are found.
 */
function createDefaultObligation(
  contract: ContractInput,
  serviceStartDate: Date,
  serviceEndDate: Date
): IdentifiedObligation[] {
  const transactionPrice = contract.arr ?? 0;
  
  // Skip if no value
  if (transactionPrice <= 0) {
    return [];
  }
  
  return [{
    obligationType: 'subscription',
    description: generateObligationDescription('subscription', contract.name),
    transactionPrice,
    standaloneSellIingPrice: null,
    serviceStartDate,
    serviceEndDate,
    sourceTermIds: [],
    allocationMethod: 'straight_line',
    recognitionMethod: 'straight_line',
  }];
}

/**
 * Groups terms by their obligation type.
 */
function groupTermsByObligation(
  terms: ContractTermInput[]
): Record<ObligationType, ContractTermInput[]> {
  const groups: Partial<Record<ObligationType, ContractTermInput[]>> = {};
  
  for (const term of terms) {
    const mapping = TERM_TYPE_MAPPINGS[term.termType];
    if (mapping) {
      const type = mapping.obligationType;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type]!.push(term);
    }
  }
  
  return groups as Record<ObligationType, ContractTermInput[]>;
}

/**
 * Creates an obligation from a group of terms.
 */
function createObligationFromTerms(
  contract: ContractInput,
  obligationType: ObligationType,
  terms: ContractTermInput[],
  serviceStartDate: Date,
  serviceEndDate: Date
): IdentifiedObligation | null {
  // Find the transaction price from terms or use ARR
  let transactionPrice = 0;
  let description = '';
  
  for (const term of terms) {
    if (term.termType === 'contract_value') {
      const value = parseContractValue(term.value);
      if (value !== null) {
        transactionPrice = value;
      }
    }
  }
  
  // Fall back to ARR if no value found
  if (transactionPrice === 0) {
    transactionPrice = contract.arr ?? 0;
  }
  
  // Skip zero-value obligations
  if (transactionPrice <= 0) {
    return null;
  }
  
  // Generate description
  description = generateObligationDescription(obligationType, contract.name);
  
  // Get recognition method
  const recognitionMethod = getRecognitionMethod(obligationType, terms);
  
  return {
    obligationType,
    description,
    transactionPrice,
    standaloneSellIingPrice: null,
    serviceStartDate,
    serviceEndDate,
    sourceTermIds: terms.map(t => t.id),
    allocationMethod: 'straight_line',
    recognitionMethod,
  };
}

/**
 * Parses a contract value from term value.
 */
function parseContractValue(value: unknown): number | null {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    // Remove currency symbols and commas
    const cleaned = value.replace(/[$,]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if ('amount' in obj && typeof obj.amount === 'number') {
      return obj.amount;
    }
    if ('value' in obj && typeof obj.value === 'number') {
      return obj.value;
    }
  }
  
  return null;
}

/**
 * Generates a human-readable description for an obligation.
 */
function generateObligationDescription(
  obligationType: ObligationType,
  contractName: string | null
): string {
  const prefix = contractName ? `${contractName} - ` : '';
  
  switch (obligationType) {
    case 'subscription':
      return `${prefix}Subscription Service`;
    case 'usage':
      return `${prefix}Usage-Based Service`;
    case 'one_time':
      return `${prefix}One-Time Fee`;
    case 'professional_services':
      return `${prefix}Professional Services`;
    case 'support':
      return `${prefix}Support Services`;
    default:
      return `${prefix}Service`;
  }
}

/**
 * Determines the recognition method based on obligation type and terms.
 */
function getRecognitionMethod(
  obligationType: ObligationType,
  terms: ContractTermInput[]
): RecognitionMethod {
  // Check if any term specifies a recognition method
  for (const term of terms) {
    const mapping = TERM_TYPE_MAPPINGS[term.termType];
    if (mapping) {
      return mapping.recognitionMethod;
    }
  }
  
  // Default based on obligation type
  switch (obligationType) {
    case 'subscription':
    case 'support':
      return 'straight_line';
    case 'usage':
      return 'usage_based';
    case 'professional_services':
      return 'milestone';
    case 'one_time':
      return 'as_invoiced';
    default:
      return 'straight_line';
  }
}

// ============================================
// Utility Functions
// ============================================

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}
