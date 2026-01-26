/**
 * Synthetic Data Detection Validation Script
 * 
 * This script:
 * 1. Loads synthetic data (contracts, invoices, customers) into Cogtics database
 * 2. Creates a snapshot
 * 3. Runs the detection engine
 * 4. Compares detected issues against expected discrepancies
 * 5. Reports validation results
 */

import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables manually
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

import { getDatabase, closeDatabase } from '../../packages/db/src/client.js';
import type { Database } from '../../packages/db/src/types.js';
import type { Kysely } from 'kysely';
import { getRegistry } from '../../packages/rules/src/registry.js';
import { DEFAULT_DETECTION_CONFIG } from '../../packages/rules/src/config.js';
import { initializeRules } from '../../packages/rules/src/rules/index.js';
import type { RuleContext, RuleIssue } from '../../packages/rules/src/types.js';

// Initialize rule registry
initializeRules();

// ============================================
// Configuration
// ============================================

const TENANT_ID = 'tenant_01';
const SNAPSHOT_ID = 'snap_synthetic_validation';
const DATA_DIR = path.resolve(__dirname, './output/data');

interface Discrepancy {
  type: string;
  original_amount: number;
  applied: boolean;
  contract_id: string;
  invoice_id: string;
  scenario: string;
  variance_pct?: number;
  new_amount?: number;
  expected_tax?: number;
  extra_line_amount?: number;
  extra_line_description?: string;
  original_period_days?: number;
  new_period_days?: number;
  original_quantity?: number;
  new_quantity?: number;
}

// Map synthetic discrepancy types to Cogtics rule IDs
const DISCREPANCY_TO_RULE_MAP: Record<string, string[]> = {
  'amount_under': ['R002'],           // Underbilling
  'amount_over': ['R003'],            // Overbilling
  'duplicate_invoice': ['R006'],      // Duplicate Billing
  'wrong_frequency': ['R010'],        // Billing Frequency Mismatch
  'wrong_quantity': ['R005'],         // Wrong Quantity
  'missing_tax': ['T001', 'T002'],    // Tax rules (may need different tier)
  'extra_line': ['R003', 'R004'],     // Overbilling or Wrong Unit Price
};

// ============================================
// Data Loading Functions
// ============================================

async function loadJsonFile<T>(filename: string): Promise<T> {
  const filePath = path.join(DATA_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

async function cleanupExistingData(db: Kysely<Database>) {
  console.log('Cleaning up existing validation data...');
  
  // Delete in reverse dependency order
  try {
    await db.deleteFrom('issues').where('snapshot_id', '=', SNAPSHOT_ID).execute();
    await db.deleteFrom('detection_runs').where('snapshot_id', '=', SNAPSHOT_ID).execute();
    await db.deleteFrom('invoice_lines').where('snapshot_id', '=', SNAPSHOT_ID).execute();
    await db.deleteFrom('invoices').where('snapshot_id', '=', SNAPSHOT_ID).execute();
    await db.deleteFrom('contract_terms').where('snapshot_id', '=', SNAPSHOT_ID).execute();
    await db.deleteFrom('contract_versions').where('snapshot_id', '=', SNAPSHOT_ID).execute();
    await db.deleteFrom('contracts').where('snapshot_id', '=', SNAPSHOT_ID).execute();
    await db.deleteFrom('customers').where('snapshot_id', '=', SNAPSHOT_ID).execute();
    await db.deleteFrom('snapshots').where('id', '=', SNAPSHOT_ID).execute();
  } catch (e) {
    console.warn('Cleanup warning (may be ok if tables empty):', (e as Error).message);
  }
}

async function loadCustomers(db: Kysely<Database>, customers: any[]) {
  console.log(`Loading ${customers.length} customers...`);
  
  for (const customer of customers) {
    await db.insertInto('customers').values({
      id: customer.id,
      tenant_id: TENANT_ID,
      snapshot_id: SNAPSHOT_ID,
      external_id: customer.external_id,
      external_ids_json: customer.external_ids || {},
      name: customer.name,
      email: customer.email,
      status: customer.status,
      metadata_json: customer.metadata || {},
      source_system: customer.source_system,
      source_batch_id: null,
      source_record_id: null,
    }).onConflict(c => c.column('id').doNothing()).execute();
  }
}

async function loadContracts(db: Kysely<Database>, contracts: any[]) {
  console.log(`Loading ${contracts.length} contracts with terms...`);
  
  for (const contract of contracts) {
    // Insert contract
    await db.insertInto('contracts').values({
      id: contract.id,
      tenant_id: TENANT_ID,
      snapshot_id: SNAPSHOT_ID,
      customer_id: contract.customer_id,
      external_id: contract.external_id,
      external_ids_json: contract.external_ids || {},
      name: contract.name,
      status: contract.status,
      start_date: new Date(contract.start_date),
      end_date: contract.end_date ? new Date(contract.end_date) : null,
      arr: contract.arr,
      currency: contract.currency,
      billing_frequency: contract.billing_frequency,
      auto_renew: contract.auto_renew,
      metadata_json: contract.metadata || {},
      source_system: contract.source_system,
      source_batch_id: null,
      source_record_id: null,
    }).onConflict(c => c.column('id').doNothing()).execute();

    // Insert versions and terms
    if (contract.versions) {
      for (const version of contract.versions) {
        await db.insertInto('contract_versions').values({
          id: version.id,
          tenant_id: TENANT_ID,
          snapshot_id: SNAPSHOT_ID,
          contract_id: contract.id,
          version: version.version,
          effective_date: new Date(version.effective_date),
          source: version.source,
          changes_json: version.changes || null,
        }).onConflict(c => c.column('id').doNothing()).execute();

        if (version.terms) {
          for (const term of version.terms) {
            await db.insertInto('contract_terms').values({
              id: term.id,
              tenant_id: TENANT_ID,
              snapshot_id: SNAPSHOT_ID,
              contract_version_id: version.id,
              term_type: term.term_type,
              value_json: term.value,
              confidence: term.confidence,
              source_clause: term.source_clause,
              source_page: term.source_page,
              extraction_method: 'rule', // Use valid extraction method
              matched_text: term.matched_text,
              start_offset: term.start_offset,
              end_offset: term.end_offset,
            }).onConflict(c => c.column('id').doNothing()).execute();
          }
        }
      }
    }
  }
}

async function loadInvoices(db: Kysely<Database>, invoices: any[]) {
  console.log(`Loading ${invoices.length} invoices with lines...`);
  
  for (const invoice of invoices) {
    await db.insertInto('invoices').values({
      id: invoice.id,
      tenant_id: TENANT_ID,
      snapshot_id: SNAPSHOT_ID,
      customer_id: invoice.customer_id,
      contract_id: invoice.contract_id,
      external_id: invoice.external_id,
      external_ids_json: invoice.external_ids || {},
      invoice_number: invoice.invoice_number,
      invoice_date: new Date(invoice.invoice_date),
      due_date: invoice.due_date ? new Date(invoice.due_date) : null,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      amount_paid: invoice.amount_paid,
      amount_due: invoice.amount_due,
      status: invoice.status,
      period_start: invoice.period_start ? new Date(invoice.period_start) : null,
      period_end: invoice.period_end ? new Date(invoice.period_end) : null,
      metadata_json: invoice.metadata || {},
      source_system: invoice.source_system,
      source_batch_id: null,
      source_record_id: null,
    }).onConflict(c => c.column('id').doNothing()).execute();

    // Insert line items
    if (invoice.lines) {
      for (const line of invoice.lines) {
        await db.insertInto('invoice_lines').values({
          id: line.id,
          tenant_id: TENANT_ID,
          snapshot_id: SNAPSHOT_ID,
          invoice_id: invoice.id,
          product_id: line.product_id,
          external_id: line.external_id,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          amount: line.amount,
          currency: line.currency,
          service_start: line.service_start ? new Date(line.service_start) : null,
          service_end: line.service_end ? new Date(line.service_end) : null,
          metadata_json: line.metadata || {},
        }).onConflict(c => c.column('id').doNothing()).execute();
      }
    }
  }
}

async function createSnapshot(db: Kysely<Database>) {
  console.log('Creating snapshot...');
  
  await db.insertInto('snapshots').values({
    id: SNAPSHOT_ID,
    tenant_id: TENANT_ID,
    status: 'complete',
    metadata_json: { source: 'synthetic_validation' },
    record_counts: {},
    quality_results: [],
  }).onConflict(c => c.column('id').doNothing()).execute();
}

// ============================================
// Detection Functions
// ============================================

interface DetectionResult {
  issues: RuleIssue[];
  durationMs: number;
  rulesExecuted: number;
}

async function runDetectionEngine(db: Kysely<Database>): Promise<DetectionResult> {
  console.log('\nRunning detection engine...');
  const startTime = Date.now();
  
  // Fetch data for detection
  const [contracts, invoices, customers] = await Promise.all([
    db.selectFrom('contracts')
      .selectAll()
      .where('snapshot_id', '=', SNAPSHOT_ID)
      .where('tenant_id', '=', TENANT_ID)
      .execute(),
    db.selectFrom('invoices')
      .selectAll()
      .where('snapshot_id', '=', SNAPSHOT_ID)
      .where('tenant_id', '=', TENANT_ID)
      .execute(),
    db.selectFrom('customers')
      .selectAll()
      .where('snapshot_id', '=', SNAPSHOT_ID)
      .where('tenant_id', '=', TENANT_ID)
      .execute(),
  ]);

  // Fetch contract terms
  const contractVersions = await db.selectFrom('contract_versions')
    .selectAll()
    .where('snapshot_id', '=', SNAPSHOT_ID)
    .execute();

  const contractTerms = await db.selectFrom('contract_terms')
    .selectAll()
    .where('snapshot_id', '=', SNAPSHOT_ID)
    .execute();

  // Fetch invoice lines
  const invoiceLines = await db.selectFrom('invoice_lines')
    .selectAll()
    .where('snapshot_id', '=', SNAPSHOT_ID)
    .execute();

  // Build contracts with terms
  const contractsWithTerms = contracts.map(c => {
    const versions = contractVersions.filter(v => v.contract_id === c.id);
    const terms = contractTerms.filter(t => 
      versions.some(v => v.id === t.contract_version_id)
    );
    return {
      ...c,
      terms: terms.map(t => ({
        ...t,
        value_json: t.value_json,
      })),
    };
  });

  // Build invoices with lines
  const invoicesWithLines = invoices.map(i => ({
    ...i,
    lines: invoiceLines.filter(l => l.invoice_id === i.id),
  }));

  console.log(`  Contracts: ${contracts.length}`);
  console.log(`  Invoices: ${invoices.length}`);
  console.log(`  Customers: ${customers.length}`);

  // Build detection context with all required fields
  const context: RuleContext = {
    tenantId: TENANT_ID,
    snapshotId: SNAPSHOT_ID,
    snapshotDate: new Date(),
    runId: 'run_validation',
    contracts: contractsWithTerms as any,
    invoices: invoicesWithLines as any,
    customers: customers as any,
    payments: [],
    usageEvents: [],
    products: [],
    schedules: [],
    obligations: [],
    fxRates: new Map(),
    priorIssues: [],
    currentRunIssues: [],
    config: DEFAULT_DETECTION_CONFIG,
    dataQuality: {
      snapshotCompleteness: 1.0,
      usageDataStale: false,
      usageDataAgeHours: 0,
      crmDataStale: false,
      crmDataAgeHours: 0,
      contractReadiness: new Map(),
      missingMasterData: [],
      fxRatesAvailable: new Set(),
    },
  };

  // Get registry and run rules directly
  const registry = getRegistry();
  const rules = registry.getInOrder();
  const allIssues: RuleIssue[] = [];
  let rulesExecuted = 0;

  for (const rule of rules) {
    try {
      const issues = rule.run(context);
      allIssues.push(...issues);
      rulesExecuted++;
      
      if (issues.length > 0) {
        console.log(`    ${rule.id} (${rule.name}): ${issues.length} issues`);
      }
    } catch (err) {
      console.warn(`    ${rule.id} error: ${(err as Error).message}`);
    }
  }
  
  const durationMs = Date.now() - startTime;
  console.log(`\nDetection completed in ${durationMs}ms`);
  console.log(`  Total issues found: ${allIssues.length}`);
  console.log(`  Rules executed: ${rulesExecuted}`);
  
  return { issues: allIssues, durationMs, rulesExecuted };
}

// ============================================
// Validation Functions
// ============================================

async function validateResults(
  detectionResult: DetectionResult,
  expectedDiscrepancies: Discrepancy[]
) {
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATION RESULTS');
  console.log('='.repeat(60));

  const issues = detectionResult.issues;
  
  // Group expected discrepancies by type
  const expectedByType = new Map<string, Discrepancy[]>();
  for (const d of expectedDiscrepancies) {
    const arr = expectedByType.get(d.type) || [];
    arr.push(d);
    expectedByType.set(d.type, arr);
  }

  // Group detected issues by rule
  const issuesByRule = new Map<string, typeof issues>();
  for (const issue of issues) {
    const arr = issuesByRule.get(issue.ruleId) || [];
    arr.push(issue);
    issuesByRule.set(issue.ruleId, arr);
  }

  console.log('\n--- Expected Discrepancies (from discrepancy_log.json) ---');
  for (const [type, discrepancies] of expectedByType) {
    const mappedRules = DISCREPANCY_TO_RULE_MAP[type] || ['unknown'];
    console.log(`  ${type}: ${discrepancies.length} expected -> maps to rules: ${mappedRules.join(', ')}`);
  }

  console.log('\n--- Detected Issues (from Cogtics) ---');
  for (const [ruleId, ruleIssues] of issuesByRule) {
    console.log(`  ${ruleId}: ${ruleIssues.length} detected`);
  }

  // Detailed matching
  console.log('\n--- Discrepancy Matching ---');
  
  let matched = 0;
  let unmatched = 0;
  const unmatchedDiscrepancies: Discrepancy[] = [];

  for (const discrepancy of expectedDiscrepancies) {
    const expectedRules = DISCREPANCY_TO_RULE_MAP[discrepancy.type] || [];
    
    // Find matching issue
    const matchingIssue = issues.find(issue => {
      // Check rule matches
      if (!expectedRules.includes(issue.ruleId)) return false;
      
      // Check contract/invoice match
      if (issue.contractId !== discrepancy.contract_id) return false;
      if (issue.invoiceId && issue.invoiceId !== discrepancy.invoice_id) return false;
      
      return true;
    });

    if (matchingIssue) {
      matched++;
      console.log(`  ✓ ${discrepancy.type} (${discrepancy.invoice_id}) -> ${matchingIssue.ruleId}`);
    } else {
      unmatched++;
      unmatchedDiscrepancies.push(discrepancy);
      console.log(`  ✗ ${discrepancy.type} (${discrepancy.invoice_id}) -> NOT FOUND`);
    }
  }

  // Summary
  console.log('\n--- Summary ---');
  console.log(`  Total expected discrepancies: ${expectedDiscrepancies.length}`);
  console.log(`  Total detected issues: ${issues.length}`);
  console.log(`  Matched: ${matched}`);
  console.log(`  Unmatched: ${unmatched}`);
  
  const successRate = (matched / expectedDiscrepancies.length * 100).toFixed(1);
  console.log(`  Success rate: ${successRate}%`);

  if (unmatchedDiscrepancies.length > 0) {
    console.log('\n--- Unmatched Discrepancies Details ---');
    for (const d of unmatchedDiscrepancies) {
      console.log(`  Type: ${d.type}`);
      console.log(`    Contract: ${d.contract_id}`);
      console.log(`    Invoice: ${d.invoice_id}`);
      console.log(`    Scenario: ${d.scenario}`);
      console.log('');
    }
  }

  // Check for extra issues (false positives)
  const extraIssues = issues.filter(issue => {
    return !expectedDiscrepancies.some(d => {
      const expectedRules = DISCREPANCY_TO_RULE_MAP[d.type] || [];
      return expectedRules.includes(issue.ruleId) && 
             issue.contractId === d.contract_id;
    });
  });

  if (extraIssues.length > 0) {
    console.log('\n--- Extra Issues (potential false positives) ---');
    for (const issue of extraIssues) {
      console.log(`  ${issue.ruleId}: Contract ${issue.contractId}, Invoice ${issue.invoiceId || 'N/A'}`);
    }
  }

  // Final verdict
  console.log('\n' + '='.repeat(60));
  if (matched === expectedDiscrepancies.length && extraIssues.length === 0) {
    console.log('✓ VALIDATION PASSED: All 14 discrepancies detected correctly!');
  } else if (matched === expectedDiscrepancies.length) {
    console.log(`⚠ VALIDATION PARTIAL: All discrepancies found, but ${extraIssues.length} extra issues detected`);
  } else {
    console.log(`✗ VALIDATION FAILED: ${unmatched} discrepancies not detected`);
  }
  console.log('='.repeat(60));

  return { matched, unmatched, extraIssues: extraIssues.length };
}

// ============================================
// Main Execution
// ============================================

async function main() {
  console.log('='.repeat(60));
  console.log('Cogtics Detection Validation - Synthetic Data Test');
  console.log('='.repeat(60));
  console.log('');

  const db = getDatabase();

  try {
    // Load synthetic data files
    console.log('Loading synthetic data files...');
    const [customers, contracts, invoices, discrepancies] = await Promise.all([
      loadJsonFile<any[]>('customers.json'),
      loadJsonFile<any[]>('contracts.json'),
      loadJsonFile<any[]>('invoices.json'),
      loadJsonFile<Discrepancy[]>('discrepancy_log.json'),
    ]);

    console.log(`  Customers: ${customers.length}`);
    console.log(`  Contracts: ${contracts.length}`);
    console.log(`  Invoices: ${invoices.length}`);
    console.log(`  Expected discrepancies: ${discrepancies.length}`);

    // Clean and load data
    await cleanupExistingData(db);
    await createSnapshot(db);
    await loadCustomers(db, customers);
    await loadContracts(db, contracts);
    await loadInvoices(db, invoices);

    console.log('\nData loaded successfully!');

    // Run detection
    const detectionResult = await runDetectionEngine(db);

    // Validate results
    await validateResults(detectionResult, discrepancies);

  } catch (error) {
    console.error('Validation failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

main();
