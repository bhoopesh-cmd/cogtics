/**
 * AI-Powered CSV Analyzer
 * 
 * Uses OpenAI to automatically detect entity types and column mappings
 * for uploaded CSV files.
 * 
 * Design principles:
 * - Lean canonical model: only fields needed for revenue integrity
 * - All extra fields go to metadata_json for lineage & future mapping
 * - Config-driven mapping: users map arbitrary columns to canonical OR metadata
 * - Map ALL columns - AI suggests, user confirms
 */

import { createContractLLM, isLLMAvailable } from './client.js';

/**
 * Supported entity types for CSV uploads
 */
export type CSVEntityType = 
  | 'customer' 
  | 'invoice' 
  | 'contract' 
  | 'payment' 
  | 'product' 
  | 'subscription'
  | 'usage'
  | 'credit_memo'
  | 'unknown';

/**
 * Field classification for mapping
 */
export type FieldCategory = 'required' | 'standard' | 'metadata';

/**
 * Lean canonical schema per entity type
 * - required: Must have for revenue integrity (identity, amounts, dates)
 * - standard: Common optional fields with known semantics
 * - Everything else → metadata_json (stored as raw JSON, no code changes needed)
 */
export const ENTITY_SCHEMA: Record<CSVEntityType, {
  required: string[];
  standard: string[];
}> = {
  customer: {
    required: ['external_id', 'name'],
    standard: ['email', 'phone', 'billing_address', 'tax_id', 'currency', 'status'],
  },
  invoice: {
    required: ['external_id', 'customer_id', 'invoice_date', 'amount'],
    standard: ['invoice_number', 'due_date', 'currency', 'status', 'tax_amount', 'discount_amount'],
  },
  contract: {
    required: ['external_id', 'customer_id', 'start_date', 'total_value'],
    standard: ['name', 'end_date', 'currency', 'status', 'auto_renew', 'billing_frequency'],
  },
  payment: {
    required: ['external_id', 'amount', 'payment_date'],
    standard: ['customer_id', 'invoice_id', 'currency', 'payment_method', 'status', 'reference'],
  },
  product: {
    required: ['external_id', 'name'],
    standard: ['sku', 'price', 'currency', 'description', 'status'],
  },
  subscription: {
    required: ['external_id', 'customer_id', 'start_date', 'mrr'],
    standard: ['product_id', 'end_date', 'quantity', 'status', 'billing_period'],
  },
  usage: {
    required: ['external_id', 'customer_id', 'quantity', 'timestamp'],
    standard: ['subscription_id', 'metric_name', 'unit'],
  },
  credit_memo: {
    required: ['external_id', 'customer_id', 'amount'],
    standard: ['invoice_id', 'currency', 'reason', 'status', 'created_at'],
  },
  unknown: {
    required: ['external_id'],
    standard: ['name', 'status', 'created_at'],
  },
};

// Legacy compatibility - combine required + standard for backward compat
export const ENTITY_TARGET_FIELDS: Record<CSVEntityType, string[]> = Object.fromEntries(
  Object.entries(ENTITY_SCHEMA).map(([type, schema]) => [
    type,
    [...schema.required, ...schema.standard],
  ])
) as Record<CSVEntityType, string[]>;

/**
 * Column mapping suggestion from AI
 * Every column gets a mapping - either to canonical field or metadata_json
 */
export interface ColumnMappingSuggestion {
  sourceColumn: string;
  targetField: string;           // Canonical field name OR 'metadata_json'
  category: FieldCategory;       // 'required' | 'standard' | 'metadata'
  metadataKey?: string;          // Key name if storing in metadata_json
  confidence: number;
  reasoning: string;
}

/**
 * Result of AI CSV analysis
 */
export interface CSVAnalysisResult {
  entityType: CSVEntityType;
  entityTypeConfidence: number;
  entityTypeReasoning: string;
  columnMappings: ColumnMappingSuggestion[];  // ALL columns mapped
  requiredMissing: string[];                   // Required fields not found
  suggestions: string[];
  warnings: string[];
  aiPowered: boolean;
}

/**
 * Analyze CSV headers and sample data to detect entity type and column mappings
 */
export async function analyzeCSV(
  headers: string[],
  sampleRows: string[][],
  hints?: {
    fileName?: string;
    userHint?: string;
  }
): Promise<CSVAnalysisResult> {
  // Check if AI is available
  if (!isLLMAvailable()) {
    // Fall back to rule-based analysis
    return analyzeCSVWithRules(headers, sampleRows, hints);
  }

  const llm = createContractLLM();
  if (!llm) {
    return analyzeCSVWithRules(headers, sampleRows, hints);
  }

  try {
    // Build sample data representation
    const sampleDataStr = sampleRows
      .slice(0, 5)
      .map((row, i) => `Row ${i + 1}: ${headers.map((h, j) => `${h}="${row[j] || ''}"`).join(', ')}`)
      .join('\n');

    const systemPrompt = `You are a data analyst specializing in SaaS billing and revenue data.
Your task is to analyze CSV data and determine:
1. What type of business entity the data represents
2. Map EVERY column - either to a canonical field or to metadata_json

IMPORTANT: Map ALL columns. Nothing is skipped:
- Required/standard fields → map to canonical field names
- Other fields → map to metadata_json with a descriptive key

Entity types:
- customer: Company/person records with contact info
- invoice: Billing documents with amounts, dates
- contract: Agreements with terms, dates, values
- payment: Transaction records
- product: SKUs, services, pricing
- subscription: Recurring billing arrangements
- usage: Consumption/metering data
- credit_memo: Refunds, credits, adjustments

Field categories:
- required: Critical for revenue integrity (must have)
- standard: Common optional fields with known semantics
- metadata: All other fields (stored as JSON for lineage)

Return a JSON response.`;

    // Build schema reference for the prompt
    const schemaRef = Object.entries(ENTITY_SCHEMA)
      .filter(([k]) => k !== 'unknown')
      .map(([type, schema]) => 
        `- ${type}: required=[${schema.required.join(', ')}] standard=[${schema.standard.join(', ')}]`
      )
      .join('\n');

    const userPrompt = `Analyze this CSV data and map ALL columns:

File name: ${hints?.fileName || 'unknown'}
${hints?.userHint ? `User hint: ${hints.userHint}` : ''}

Headers: ${headers.join(', ')}

Sample data:
${sampleDataStr}

Schema reference:
${schemaRef}

IMPORTANT: Every column MUST be mapped. Use category "metadata" for any column that doesn't fit a canonical field.

Provide analysis in this JSON format:
{
  "entityType": "customer|invoice|contract|payment|product|subscription|usage|credit_memo|unknown",
  "entityTypeConfidence": 0.0-1.0,
  "entityTypeReasoning": "Brief explanation",
  "columnMappings": [
    {
      "sourceColumn": "original column name",
      "targetField": "canonical_field OR metadata_json",
      "category": "required|standard|metadata",
      "metadataKey": "snake_case_key (only if category=metadata)",
      "confidence": 0.0-1.0,
      "reasoning": "why this mapping"
    }
  ],
  "requiredMissing": ["list of required fields not found in data"],
  "suggestions": ["helpful suggestion 1", "..."],
  "warnings": ["potential issue 1", "..."]
}`;

    const response = await (llm as any).complete(systemPrompt, userPrompt, { json: true });
    
    const parsed = JSON.parse(response);
    const detectedType = parsed.entityType || 'unknown';
    const schema = ENTITY_SCHEMA[detectedType as CSVEntityType] || ENTITY_SCHEMA.unknown;
    
    // Ensure all columns are mapped (AI should do this, but validate)
    const mappedColumns = new Set((parsed.columnMappings || []).map((m: any) => m.sourceColumn));
    const allMappings = [...(parsed.columnMappings || [])];
    
    // Add any columns AI missed as metadata
    for (const header of headers) {
      if (!mappedColumns.has(header)) {
        allMappings.push({
          sourceColumn: header,
          targetField: 'metadata_json',
          category: 'metadata',
          metadataKey: header.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          confidence: 0.5,
          reasoning: 'Unmapped column - stored as metadata',
        });
      }
    }
    
    // Identify missing required fields
    const mappedTargets = allMappings
      .filter((m: any) => m.category === 'required' || m.category === 'standard')
      .map((m: any) => m.targetField);
    const requiredMissing = schema.required.filter(f => !mappedTargets.includes(f));
    
    return {
      entityType: detectedType as CSVEntityType,
      entityTypeConfidence: parsed.entityTypeConfidence || 0.5,
      entityTypeReasoning: parsed.entityTypeReasoning || '',
      columnMappings: allMappings.map((m: any) => ({
        sourceColumn: m.sourceColumn || '',
        targetField: m.targetField || 'metadata_json',
        category: (m.category || 'metadata') as FieldCategory,
        metadataKey: m.metadataKey,
        confidence: m.confidence || 0.5,
        reasoning: m.reasoning || '',
      })),
      requiredMissing: parsed.requiredMissing || requiredMissing,
      suggestions: parsed.suggestions || [],
      warnings: parsed.warnings || [],
      aiPowered: true,
    };
  } catch (error) {
    console.warn('AI CSV analysis failed, falling back to rules:', error);
    return analyzeCSVWithRules(headers, sampleRows, hints);
  }
}

/**
 * Rule-based fallback for CSV analysis when AI is unavailable
 */
function analyzeCSVWithRules(
  headers: string[],
  sampleRows: string[][],
  hints?: { fileName?: string; userHint?: string }
): CSVAnalysisResult {
  const lowerHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'));
  
  // Detect entity type based on column patterns
  // Order matters: more specific patterns first!
  let entityType: CSVEntityType = 'unknown';
  let entityTypeConfidence = 0.3;
  let entityTypeReasoning = 'Unable to determine entity type from columns';

  // Count matches for each entity type to pick the best
  const hasPaymentKeyword = lowerHeaders.some(h => 
    h.includes('payment') || h === 'payment_id' || h === 'payment_date' || h === 'payment_method'
  );
  const hasContractKeyword = lowerHeaders.some(h => 
    h.includes('contract') || h === 'contract_id' || 
    (h.includes('start') && h.includes('date')) || (h.includes('end') && h.includes('date')) ||
    h === 'auto_renew' || h.includes('total_value') || h.includes('term')
  );
  const hasStartEnd = lowerHeaders.some(h => h.includes('start')) && 
                      lowerHeaders.some(h => h.includes('end'));
  const hasInvoiceKeyword = lowerHeaders.some(h => 
    h.includes('invoice') && !h.includes('invoice_id') // invoice_id could be a reference
  );
  const hasCustomerKeyword = lowerHeaders.some(h => 
    (h.includes('customer') || h.includes('company')) && 
    !h.includes('customer_id') && !h.includes('customer_name') // these are references
  );
  const hasEmailPhone = lowerHeaders.some(h => h.includes('email') || h.includes('e_mail')) && 
                        (lowerHeaders.some(h => h.includes('phone')) || lowerHeaders.some(h => h.includes('address')));

  // Payment detection - most specific first (payment_id, payment_date, payment_method)
  if (hasPaymentKeyword) {
    entityType = 'payment';
    entityTypeConfidence = 0.75;
    entityTypeReasoning = 'Contains payment-specific columns (payment_id, payment_date, payment_method)';
  }
  // Contract detection - has contract_id or start/end dates with value
  else if (hasContractKeyword || (hasStartEnd && lowerHeaders.some(h => h.includes('value')))) {
    entityType = 'contract';
    entityTypeConfidence = 0.7;
    entityTypeReasoning = 'Contains contract-related columns (contract_id, start_date, end_date, total_value)';
  }
  // Invoice detection - explicit invoice columns (not just amount+date which could be payment)
  else if (hasInvoiceKeyword || lowerHeaders.some(h => h.includes('invoice_number') || h.includes('inv_no'))) {
    entityType = 'invoice';
    entityTypeConfidence = 0.7;
    entityTypeReasoning = 'Contains invoice-related columns (invoice_number, invoice_date)';
  }
  // Product detection
  else if (
    lowerHeaders.some(h => h.includes('product') || h.includes('sku')) ||
    (lowerHeaders.some(h => h === 'name' || h === 'product_name') && lowerHeaders.some(h => h.includes('price')))
  ) {
    entityType = 'product';
    entityTypeConfidence = 0.6;
    entityTypeReasoning = 'Contains product-related columns (sku, price)';
  }
  // Customer detection - core customer fields like name+email, or company without being a reference
  else if (hasCustomerKeyword || hasEmailPhone) {
    entityType = 'customer';
    entityTypeConfidence = 0.7;
    entityTypeReasoning = 'Contains customer-related columns (name, email, company)';
  }
  // Generic amount+date could be invoice (but low confidence)
  else if (lowerHeaders.some(h => h.includes('amount')) && lowerHeaders.some(h => h.includes('date'))) {
    entityType = 'invoice';
    entityTypeConfidence = 0.5;
    entityTypeReasoning = 'Contains amount and date columns (might be invoice or payment)';
  }

  // Check filename for hints
  const fileName = hints?.fileName?.toLowerCase() || '';
  if (fileName.includes('customer') && entityTypeConfidence < 0.7) {
    entityType = 'customer';
    entityTypeConfidence = 0.8;
    entityTypeReasoning = 'Filename suggests customer data';
  } else if (fileName.includes('invoice') && entityTypeConfidence < 0.7) {
    entityType = 'invoice';
    entityTypeConfidence = 0.8;
    entityTypeReasoning = 'Filename suggests invoice data';
  } else if (fileName.includes('contract') && entityTypeConfidence < 0.7) {
    entityType = 'contract';
    entityTypeConfidence = 0.8;
    entityTypeReasoning = 'Filename suggests contract data';
  }

  // Get schema for detected entity type
  const schema = ENTITY_SCHEMA[entityType] || ENTITY_SCHEMA.unknown;
  const allCanonicalFields = [...schema.required, ...schema.standard];

  // Generate column mappings - EVERY column gets mapped
  const columnMappings: ColumnMappingSuggestion[] = headers.map((header, i) => {
    const lower = lowerHeaders[i] ?? header.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Common patterns - supports both exact and partial matches
    const patterns: Array<{ pattern: RegExp; field: string; conf: number }> = [
      // IDs (specific first) - map entity-specific IDs to external_id for that entity
      { pattern: /payment_id|pay_id/, field: 'external_id', conf: 0.9 },
      { pattern: /contract_id|con_id/, field: 'external_id', conf: 0.9 },
      { pattern: /^invoice_id$|^inv_id$/, field: 'external_id', conf: 0.9 }, // For invoice entities
      { pattern: /customer_id|cust_id/, field: 'customer_id', conf: 0.9 },
      { pattern: /^id$|external_id|ext_id/, field: 'external_id', conf: 0.9 },
      { pattern: /subscription_id|sub_id/, field: 'external_id', conf: 0.9 },
      // Names
      { pattern: /^name$|full_name|company_name|customer_name/, field: 'name', conf: 0.85 },
      // Contact
      { pattern: /e_?mail|email/, field: 'email', conf: 0.9 },
      { pattern: /phone|telephone/, field: 'phone', conf: 0.85 },
      // Addresses
      { pattern: /billing_?address|bill_addr/, field: 'billing_address', conf: 0.85 },
      { pattern: /shipping_?address|ship_addr/, field: 'shipping_address', conf: 0.85 },
      { pattern: /^address/, field: 'billing_address', conf: 0.6 },
      // Contract specific
      { pattern: /total_value|contract_value|^tcv$/, field: 'total_value', conf: 0.9 },
      { pattern: /auto_?renew|renewal/, field: 'auto_renew', conf: 0.85 },
      { pattern: /notice_period/, field: 'notice_period', conf: 0.85 },
      { pattern: /signed_date/, field: 'signed_date', conf: 0.85 },
      { pattern: /billing_frequency|bill_freq/, field: 'billing_frequency', conf: 0.85 },
      // Payment specific
      { pattern: /payment_method|pay_method|^method$/, field: 'payment_method', conf: 0.9 },
      { pattern: /^reference$|^ref$|transaction_ref/, field: 'reference', conf: 0.85 },
      // Financial
      { pattern: /^amount$|total_amount|invoice_amount|payment_amount/, field: 'amount', conf: 0.85 },
      { pattern: /^currency$|^curr$/, field: 'currency', conf: 0.8 },
      { pattern: /tax_amount|^tax$/, field: 'tax_amount', conf: 0.75 },
      { pattern: /discount/, field: 'discount_amount', conf: 0.75 },
      { pattern: /^price$|unit_price/, field: 'price', conf: 0.8 },
      // Dates
      { pattern: /invoice_date|inv_date/, field: 'invoice_date', conf: 0.9 },
      { pattern: /due_date/, field: 'due_date', conf: 0.9 },
      { pattern: /start_date|^start$/, field: 'start_date', conf: 0.8 },
      { pattern: /end_date|^end$/, field: 'end_date', conf: 0.8 },
      { pattern: /payment_date|paid_date/, field: 'payment_date', conf: 0.85 },
      { pattern: /created_at|^created$|create_date/, field: 'created_at', conf: 0.8 },
      // Status
      { pattern: /^status$|^state$/, field: 'status', conf: 0.8 },
      // Invoice specific
      { pattern: /invoice_number|inv_no|invoice_no/, field: 'invoice_number', conf: 0.9 },
      // Other
      { pattern: /tax_id|vat_id|^ein$/, field: 'tax_id', conf: 0.85 },
      { pattern: /^sku$|product_code/, field: 'sku', conf: 0.85 },
      { pattern: /description|^desc$/, field: 'description', conf: 0.7 },
      { pattern: /quantity|^qty$/, field: 'quantity', conf: 0.8 },
      { pattern: /^mrr$|monthly_recurring/, field: 'mrr', conf: 0.9 },
    ];

    // Try to match a canonical field
    for (const { pattern, field, conf } of patterns) {
      if (pattern.test(lower) && allCanonicalFields.includes(field)) {
        const category: FieldCategory = schema.required.includes(field) ? 'required' : 'standard';
        return {
          sourceColumn: header,
          targetField: field,
          category,
          confidence: conf,
          reasoning: `Column name matches pattern for "${field}"`,
        };
      }
    }

    // No canonical match - map to metadata_json
    // Generate a clean metadata key from the header
    const metadataKey = lower.replace(/_+/g, '_').replace(/^_|_$/g, '') || 'column_' + i;
    
    return {
      sourceColumn: header,
      targetField: 'metadata_json',
      category: 'metadata' as FieldCategory,
      metadataKey,
      confidence: 0.5,
      reasoning: 'No canonical field match - stored as metadata for lineage',
    };
  });

  // Identify missing required fields
  const mappedCanonicalFields = columnMappings
    .filter(m => m.category !== 'metadata')
    .map(m => m.targetField);
  const requiredMissing = schema.required.filter(f => !mappedCanonicalFields.includes(f));

  const warnings: string[] = [];
  if (requiredMissing.length > 0) {
    warnings.push(`Missing required fields: ${requiredMissing.join(', ')}`);
  }

  const suggestions: string[] = [
    'Review all mappings - adjust as needed before processing',
  ];
  if (entityTypeConfidence < 0.7) {
    suggestions.push('Entity type confidence is low - please verify');
  }
  const metadataCount = columnMappings.filter(m => m.category === 'metadata').length;
  if (metadataCount > 0) {
    suggestions.push(`${metadataCount} column(s) will be stored as metadata - you can remap them to canonical fields`);
  }

  return {
    entityType,
    entityTypeConfidence,
    entityTypeReasoning,
    columnMappings,
    requiredMissing,
    suggestions,
    warnings,
    aiPowered: false,
  };
}

/**
 * Parse CSV sample from file content
 */
export function parseCSVSample(csvContent: string, maxRows = 10): { headers: string[]; rows: string[][] } {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse header line
  const firstLine = lines[0];
  if (!firstLine) {
    return { headers: [], rows: [] };
  }
  const headers = parseCSVLine(firstLine);
  
  // Parse sample rows
  const rows: string[][] = [];
  for (let i = 1; i < Math.min(lines.length, maxRows + 1); i++) {
    const line = lines[i];
    if (line) {
      rows.push(parseCSVLine(line));
    }
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line handling quotes and escapes
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}
