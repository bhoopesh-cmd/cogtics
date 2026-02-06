/**
 * Detection Validation Tool
 *
 * Compares actual detection results against expected ground truth
 * from synthetic data to calculate precision, recall, and F1 scores.
 *
 * Usage:
 *   pnpm tsx tools/validation/detection-validator.ts [--data-dir <path>] [--api-url <url>]
 */

import fs from 'fs';
import path from 'path';

// Types
interface ExpectedIssue {
  rule_id: string;
  contract_id: string;
  invoice_id?: string;
  severity: string;
  amount?: number;
  description: string;
}

interface ActualIssue {
  id: string;
  ruleId: string;
  contractId: string;
  invoiceId?: string;
  severity: string;
  amount?: number;
  status: string;
}

interface RuleCoverage {
  total_rules: number;
  covered_rules: number;
  coverage_pct: number;
  rule_counts: Record<string, number>;
  covered: string[];
  missing: string[];
}

interface ValidationResult {
  timestamp: string;
  dataDir: string;
  summary: {
    totalExpected: number;
    totalActual: number;
    truePositives: number;
    falsePositives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  byRule: Record<string, {
    expected: number;
    actual: number;
    truePositives: number;
    falsePositives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    f1Score: number;
  }>;
  bySeverity: Record<string, {
    expected: number;
    actual: number;
    accuracyPct: number;
  }>;
  ruleCoverage: {
    totalRules: number;
    coveredRules: number;
    missingRules: string[];
  };
  errors: string[];
}

// Configuration
const DEFAULT_DATA_DIR = 'tools/synthetic-data/output/stress_test';
const DEFAULT_API_URL = 'http://localhost:3000';

// Parse command line args
function parseArgs(): { dataDir: string; apiUrl: string } {
  const args = process.argv.slice(2);
  let dataDir = DEFAULT_DATA_DIR;
  let apiUrl = DEFAULT_API_URL;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--data-dir' && args[i + 1]) {
      dataDir = args[i + 1];
      i++;
    } else if (args[i] === '--api-url' && args[i + 1]) {
      apiUrl = args[i + 1];
      i++;
    }
  }

  return { dataDir, apiUrl };
}

// Load expected issues from ground truth
function loadExpectedIssues(dataDir: string): ExpectedIssue[] {
  const filePath = path.join(dataDir, 'expected_outputs/expected_issues.json');

  if (!fs.existsSync(filePath)) {
    throw new Error(`Expected issues file not found: ${filePath}`);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return data.issues || data;
}

// Load rule coverage info
function loadRuleCoverage(dataDir: string): RuleCoverage {
  const filePath = path.join(dataDir, 'expected_outputs/rule_coverage.json');

  if (!fs.existsSync(filePath)) {
    throw new Error(`Rule coverage file not found: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// Fetch actual issues from API
async function fetchActualIssues(apiUrl: string): Promise<ActualIssue[]> {
  try {
    const response = await fetch(`${apiUrl}/issues?limit=10000`, {
      headers: {
        'x-tenant-id': 'tenant_01',
        'x-user-id': 'user_01',
      },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || data.issues || [];
  } catch (error) {
    console.error('Failed to fetch actual issues from API:', error);
    return [];
  }
}

// Create issue key for matching
function createIssueKey(issue: { rule_id?: string; ruleId?: string; contract_id?: string; contractId?: string }): string {
  const ruleId = issue.rule_id || issue.ruleId || '';
  const contractId = issue.contract_id || issue.contractId || '';
  return `${ruleId}:${contractId}`;
}

// Calculate metrics
function calculateMetrics(tp: number, fp: number, fn: number): { precision: number; recall: number; f1Score: number } {
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

  return {
    precision: Math.round(precision * 1000) / 1000,
    recall: Math.round(recall * 1000) / 1000,
    f1Score: Math.round(f1Score * 1000) / 1000,
  };
}

// Main validation function
async function validateDetection(dataDir: string, apiUrl: string): Promise<ValidationResult> {
  console.log('=== Detection Validation ===\n');
  console.log(`Data directory: ${dataDir}`);
  console.log(`API URL: ${apiUrl}\n`);

  const errors: string[] = [];
  const result: ValidationResult = {
    timestamp: new Date().toISOString(),
    dataDir,
    summary: {
      totalExpected: 0,
      totalActual: 0,
      truePositives: 0,
      falsePositives: 0,
      falseNegatives: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
    },
    byRule: {},
    bySeverity: {},
    ruleCoverage: {
      totalRules: 0,
      coveredRules: 0,
      missingRules: [],
    },
    errors: [],
  };

  // Load expected issues
  console.log('Loading expected issues...');
  let expectedIssues: ExpectedIssue[] = [];
  try {
    expectedIssues = loadExpectedIssues(dataDir);
    console.log(`  Loaded ${expectedIssues.length} expected issues`);
  } catch (error) {
    errors.push(`Failed to load expected issues: ${error}`);
  }

  // Load rule coverage
  console.log('Loading rule coverage...');
  let ruleCoverage: RuleCoverage | null = null;
  try {
    ruleCoverage = loadRuleCoverage(dataDir);
    console.log(`  Total rules: ${ruleCoverage.total_rules}`);
    console.log(`  Covered: ${ruleCoverage.covered_rules}`);
  } catch (error) {
    errors.push(`Failed to load rule coverage: ${error}`);
  }

  // Fetch actual issues from API
  console.log('\nFetching actual issues from API...');
  const actualIssues = await fetchActualIssues(apiUrl);
  console.log(`  Fetched ${actualIssues.length} actual issues`);

  if (actualIssues.length === 0) {
    errors.push('No actual issues found. Run detection first.');
    result.errors = errors;
    return result;
  }

  // Create lookup maps
  const expectedKeys = new Set(expectedIssues.map(createIssueKey));
  const actualKeys = new Set(actualIssues.map(createIssueKey));

  // Calculate overall metrics
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  // Count TPs and FPs from actual
  for (const actual of actualIssues) {
    const key = createIssueKey(actual);
    if (expectedKeys.has(key)) {
      truePositives++;
    } else {
      falsePositives++;
    }
  }

  // Count FNs from expected
  for (const expected of expectedIssues) {
    const key = createIssueKey(expected);
    if (!actualKeys.has(key)) {
      falseNegatives++;
    }
  }

  const overallMetrics = calculateMetrics(truePositives, falsePositives, falseNegatives);

  result.summary = {
    totalExpected: expectedIssues.length,
    totalActual: actualIssues.length,
    truePositives,
    falsePositives,
    falseNegatives,
    ...overallMetrics,
  };

  // Calculate per-rule metrics
  console.log('\nCalculating per-rule metrics...');
  const ruleIds = new Set([
    ...expectedIssues.map(i => i.rule_id),
    ...actualIssues.map(i => i.ruleId),
  ]);

  for (const ruleId of ruleIds) {
    const expectedForRule = expectedIssues.filter(i => i.rule_id === ruleId);
    const actualForRule = actualIssues.filter(i => i.ruleId === ruleId);

    const expectedKeysForRule = new Set(expectedForRule.map(createIssueKey));
    const actualKeysForRule = new Set(actualForRule.map(createIssueKey));

    let ruleTp = 0;
    let ruleFp = 0;
    let ruleFn = 0;

    for (const actual of actualForRule) {
      const key = createIssueKey(actual);
      if (expectedKeysForRule.has(key)) {
        ruleTp++;
      } else {
        ruleFp++;
      }
    }

    for (const expected of expectedForRule) {
      const key = createIssueKey(expected);
      if (!actualKeysForRule.has(key)) {
        ruleFn++;
      }
    }

    const ruleMetrics = calculateMetrics(ruleTp, ruleFp, ruleFn);

    result.byRule[ruleId] = {
      expected: expectedForRule.length,
      actual: actualForRule.length,
      truePositives: ruleTp,
      falsePositives: ruleFp,
      falseNegatives: ruleFn,
      ...ruleMetrics,
    };
  }

  // Calculate severity accuracy
  console.log('Calculating severity accuracy...');
  const severities = ['critical', 'high', 'medium', 'low'];
  for (const severity of severities) {
    const expectedForSeverity = expectedIssues.filter(i => i.severity === severity);
    const actualForSeverity = actualIssues.filter(i => i.severity === severity);

    // Check how many actual issues have correct severity
    let correctSeverity = 0;
    for (const actual of actualForSeverity) {
      const key = createIssueKey(actual);
      const expected = expectedIssues.find(e => createIssueKey(e) === key);
      if (expected && expected.severity === actual.severity) {
        correctSeverity++;
      }
    }

    result.bySeverity[severity] = {
      expected: expectedForSeverity.length,
      actual: actualForSeverity.length,
      accuracyPct: actualForSeverity.length > 0
        ? Math.round((correctSeverity / actualForSeverity.length) * 100)
        : 0,
    };
  }

  // Rule coverage
  if (ruleCoverage) {
    const actualRuleIds = new Set(actualIssues.map(i => i.ruleId));
    const missingRules = ruleCoverage.covered.filter(r => !actualRuleIds.has(r));

    result.ruleCoverage = {
      totalRules: ruleCoverage.total_rules,
      coveredRules: actualRuleIds.size,
      missingRules,
    };
  }

  result.errors = errors;

  return result;
}

// Print results
function printResults(result: ValidationResult) {
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATION RESULTS');
  console.log('='.repeat(60));

  console.log('\n## Summary');
  console.log(`Total Expected: ${result.summary.totalExpected}`);
  console.log(`Total Actual:   ${result.summary.totalActual}`);
  console.log(`True Positives: ${result.summary.truePositives}`);
  console.log(`False Positives: ${result.summary.falsePositives}`);
  console.log(`False Negatives: ${result.summary.falseNegatives}`);
  console.log(`\nPrecision: ${(result.summary.precision * 100).toFixed(1)}%`);
  console.log(`Recall:    ${(result.summary.recall * 100).toFixed(1)}%`);
  console.log(`F1 Score:  ${(result.summary.f1Score * 100).toFixed(1)}%`);

  // Pass/Fail thresholds
  const PRECISION_THRESHOLD = 0.9;
  const RECALL_THRESHOLD = 0.9;

  console.log('\n## Thresholds');
  console.log(`Precision >= ${PRECISION_THRESHOLD * 100}%: ${result.summary.precision >= PRECISION_THRESHOLD ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Recall >= ${RECALL_THRESHOLD * 100}%:    ${result.summary.recall >= RECALL_THRESHOLD ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n## Rule Coverage');
  console.log(`Total Rules: ${result.ruleCoverage.totalRules}`);
  console.log(`Covered:     ${result.ruleCoverage.coveredRules}`);
  if (result.ruleCoverage.missingRules.length > 0) {
    console.log(`Missing:     ${result.ruleCoverage.missingRules.join(', ')}`);
  }

  console.log('\n## By Severity');
  for (const [severity, stats] of Object.entries(result.bySeverity)) {
    console.log(`${severity.padEnd(10)} Expected: ${stats.expected}, Actual: ${stats.actual}, Accuracy: ${stats.accuracyPct}%`);
  }

  // Show worst performing rules
  console.log('\n## Worst Performing Rules (by F1)');
  const sortedRules = Object.entries(result.byRule)
    .filter(([_, stats]) => stats.expected > 0)
    .sort((a, b) => a[1].f1Score - b[1].f1Score)
    .slice(0, 10);

  for (const [ruleId, stats] of sortedRules) {
    console.log(`${ruleId.padEnd(10)} F1: ${(stats.f1Score * 100).toFixed(1)}%, P: ${(stats.precision * 100).toFixed(1)}%, R: ${(stats.recall * 100).toFixed(1)}% (${stats.truePositives}/${stats.expected})`);
  }

  if (result.errors.length > 0) {
    console.log('\n## Errors');
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
  }
}

// Save results to file
function saveResults(result: ValidationResult, outputPath: string) {
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);
}

// Main entry point
async function main() {
  const { dataDir, apiUrl } = parseArgs();

  try {
    const result = await validateDetection(dataDir, apiUrl);
    printResults(result);

    // Save results
    const outputPath = `validation-results-${Date.now()}.json`;
    saveResults(result, outputPath);

    // Exit with error code if thresholds not met
    if (result.summary.precision < 0.9 || result.summary.recall < 0.9) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Validation failed:', error);
    process.exit(1);
  }
}

main();
