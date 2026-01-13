/**
 * Detection Run Processor
 * 
 * Executes detection rules against a snapshot and persists issues.
 */
import type { Logger } from 'pino';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';
import type { DetectRunJobPayload } from '@cogtics/schemas';
import {
  generateDetectionRunId,
  generateIssueId,
  generateIssueSourceId,
  DetectionConfigSchema,
} from '@cogtics/schemas';

interface JobResult {
  success: boolean;
  message: string;
  data?: unknown;
  processingTimeMs?: number;
}

// Placeholder for rules import - will be added when package is linked
// import * as rules from '@cogtics/rules';

/**
 * Process detection run job.
 */
export async function processDetectRunJob(
  payload: DetectRunJobPayload,
  logger: Logger,
  db: Kysely<Database>
): Promise<JobResult> {
  const { tenantId, snapshotId, rulesetVersion, config } = payload;
  const startTime = Date.now();
  const runId = generateDetectionRunId();

  logger.info({ runId, snapshotId }, 'Starting detection run');

  try {
    // 1. Create detection run record
    await db.insertInto('detection_runs').values({
      id: runId,
      tenant_id: tenantId,
      snapshot_id: snapshotId,
      ruleset_version: rulesetVersion || '1.0.0',
      status: 'running',
      config_json: config || {},
      started_at: new Date(),
    }).execute();

    // 2. Load snapshot data
    const data = await loadSnapshotData(db, tenantId, snapshotId);
    
    logger.info({
      contractCount: data.contracts.length,
      invoiceCount: data.invoices.length,
    }, 'Loaded snapshot data');

    // 3. Parse config
    const detectionConfig = config 
      ? DetectionConfigSchema.parse(config)
      : DetectionConfigSchema.parse({});

    // 4. Run detection (placeholder - actual implementation when rules package is linked)
    // In production, this would be:
    // const result = await rules.runDetection(context, {});
    
    // For now, create a mock result
    const mockIssues: any[] = [];
    const issuesBySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0, info: 0 };
    const issuesByCategory: Record<string, number> = {};

    // 5. Persist issues
    for (const issue of mockIssues) {
      const issueId = generateIssueId();
      
      await db.insertInto('issues').values({
        id: issueId,
        tenant_id: tenantId,
        snapshot_id: snapshotId,
        run_id: runId,
        rule_id: issue.ruleId,
        rule_version: issue.ruleVersion,
        issue_key: issue.issueKey,
        category: issue.category,
        status: 'open',
        severity: issue.severity,
        confidence: issue.confidence,
        impact_amount: issue.impactAmount,
        currency: issue.currency || 'USD',
        expected_json: issue.expected,
        actual_json: issue.actual,
        dimensions_json: issue.dimensions,
        contract_id: issue.contractId,
        invoice_id: issue.invoiceId,
        customer_id: issue.customerId,
        data_quality_flags: issue.dataQualityFlags || [],
        suppressed_by_rule: issue.suppressedByRule,
        rule_metadata_json: issue.metadata || {},
      }).execute();

      // Persist sources
      if (issue.sources) {
        for (const source of issue.sources) {
          await db.insertInto('issue_sources').values({
            id: generateIssueSourceId(),
            tenant_id: tenantId,
            issue_id: issueId,
            source_type: source.sourceType,
            source_id: source.sourceId,
            source_system: source.sourceSystem,
            field_name: source.fieldName,
            field_value_json: source.fieldValue,
          }).execute();
        }
      }

      // Update counts
      issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;
      issuesByCategory[issue.category] = (issuesByCategory[issue.category] || 0) + 1;
    }

    // 6. Update detection run with results
    await db.updateTable('detection_runs')
      .set({
        status: 'completed',
        finished_at: new Date(),
        issues_total: mockIssues.length,
        issues_by_severity: issuesBySeverity,
        issues_by_category: issuesByCategory,
        stats_json: {
          durationMs: Date.now() - startTime,
          contractsAnalyzed: data.contracts.length,
          invoicesAnalyzed: data.invoices.length,
        },
      })
      .where('id', '=', runId)
      .execute();

    logger.info({ runId, issueCount: mockIssues.length }, 'Detection run completed');

    return {
      success: true,
      message: `Detection completed: ${mockIssues.length} issues found`,
      data: {
        runId,
        issuesTotal: mockIssues.length,
        issuesBySeverity,
        issuesByCategory,
      },
      processingTimeMs: Date.now() - startTime,
    };

  } catch (error) {
    logger.error({ error, runId }, 'Detection run failed');

    // Update run status to failed
    await db.updateTable('detection_runs')
      .set({
        status: 'failed',
        finished_at: new Date(),
        error_code: 'DETECTION_ERROR',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .where('id', '=', runId)
      .execute();

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Load snapshot data for detection.
 */
async function loadSnapshotData(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string
): Promise<{
  contracts: any[];
  invoices: any[];
  payments: any[];
  usageEvents: any[];
  customers: any[];
  products: any[];
  schedules: any[];
  obligations: any[];
}> {
  // Load contracts with terms
  const contracts = await db
    .selectFrom('contracts')
    .selectAll()
    .where('tenant_id', '=', tenantId)
    .where('snapshot_id', '=', snapshotId)
    .execute();

  // Load contract terms
  const contractIds = contracts.map(c => c.id);
  const versions = await db
    .selectFrom('contract_versions')
    .selectAll()
    .where('contract_id', 'in', contractIds.length > 0 ? contractIds : ['_none_'])
    .execute();
  
  const versionIds = versions.map(v => v.id);
  const terms = await db
    .selectFrom('contract_terms')
    .selectAll()
    .where('contract_version_id', 'in', versionIds.length > 0 ? versionIds : ['_none_'])
    .execute();

  // Attach terms to contracts
  const contractsWithTerms = contracts.map(c => {
    const version = versions.find(v => v.contract_id === c.id);
    const contractTerms = version 
      ? terms.filter(t => t.contract_version_id === version.id)
      : [];
    return { ...c, terms: contractTerms };
  });

  // Load invoices with lines
  const invoices = await db
    .selectFrom('invoices')
    .selectAll()
    .where('tenant_id', '=', tenantId)
    .where('snapshot_id', '=', snapshotId)
    .execute();

  const invoiceIds = invoices.map(i => i.id);
  const lines = await db
    .selectFrom('invoice_lines')
    .selectAll()
    .where('invoice_id', 'in', invoiceIds.length > 0 ? invoiceIds : ['_none_'])
    .execute();

  const invoicesWithLines = invoices.map(inv => ({
    ...inv,
    lines: lines.filter(l => l.invoice_id === inv.id),
  }));

  // Load other entities
  const payments = await db
    .selectFrom('payments')
    .selectAll()
    .where('tenant_id', '=', tenantId)
    .where('snapshot_id', '=', snapshotId)
    .execute();

  const usageEvents = await db
    .selectFrom('usage_events')
    .selectAll()
    .where('tenant_id', '=', tenantId)
    .where('snapshot_id', '=', snapshotId)
    .execute();

  const customers = await db
    .selectFrom('customers')
    .selectAll()
    .where('tenant_id', '=', tenantId)
    .where('snapshot_id', '=', snapshotId)
    .execute();

  const products = await db
    .selectFrom('products')
    .selectAll()
    .where('tenant_id', '=', tenantId)
    .where('snapshot_id', '=', snapshotId)
    .execute();

  // Load rev-rec data
  const obligations = await db
    .selectFrom('revenue_obligations')
    .selectAll()
    .where('tenant_id', '=', tenantId)
    .where('snapshot_id', '=', snapshotId)
    .execute();

  const obligationIds = obligations.map(o => o.id);
  const schedules = await db
    .selectFrom('revenue_schedules')
    .selectAll()
    .where('obligation_id', 'in', obligationIds.length > 0 ? obligationIds : ['_none_'])
    .execute();

  const schedulesWithObligations = schedules.map(s => ({
    ...s,
    obligation: obligations.find(o => o.id === s.obligation_id),
  }));

  return {
    contracts: contractsWithTerms,
    invoices: invoicesWithLines,
    payments,
    usageEvents,
    customers,
    products,
    schedules: schedulesWithObligations,
    obligations,
  };
}
