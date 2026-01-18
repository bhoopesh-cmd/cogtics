/**
 * Evidence Generation Processor (Phase 8)
 * 
 * Generates immutable, audit-grade evidence packs for detected issues.
 */
import type { Logger } from 'pino';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';
import type { EvidenceGenerateJobPayload } from '@cogtics/schemas';
import {
  generateEvidenceId,
  generateEvidenceSourceId,
  generateEvidenceCalcId,
  generateEvidenceClauseId,
  generateEvidenceAuditId,
  generateEvidenceRunId,
} from '@cogtics/schemas';
import {
  calculateCompletenessScore,
  getCompletenessLabel,
  type CompletenessInput,
} from '@cogtics/rules';

interface JobResult {
  success: boolean;
  message: string;
  data?: unknown;
  processingTimeMs?: number;
}

interface EvidencePackData {
  summary: string;
  expected: Record<string, unknown>;
  actual: Record<string, unknown>;
  variance: {
    amount: number | null;
    percentage: number | null;
    direction: 'over' | 'under' | 'none';
    description: string;
  };
  snapshotMetadata: {
    snapshotId: string;
    snapshotDate: string;
    rulesetVersion: string;
    ruleId: string;
    ruleVersion: string;
    detectionRunId?: string;
  };
}

/**
 * Process evidence generation job.
 * Generates evidence packs for all issues in a snapshot or specific issues.
 */
export async function processEvidenceGenerateJob(
  payload: EvidenceGenerateJobPayload,
  logger: Logger,
  db: Kysely<Database>
): Promise<JobResult> {
  const { tenantId, snapshotId, detectionRunId, issueIds, force } = payload;
  const startTime = Date.now();
  const runId = generateEvidenceRunId();

  logger.info({ runId, snapshotId, issueIds }, 'Starting evidence generation');

  try {
    // 1. Create evidence generation run record
    await db.insertInto('evidence_generation_runs').values({
      id: runId,
      tenant_id: tenantId,
      snapshot_id: snapshotId,
      detection_run_id: detectionRunId || null,
      status: 'running',
      total_issues: 0,
      processed_issues: 0,
      failed_issues: 0,
      skipped_issues: 0,
      started_at: new Date(),
    }).execute();

    // 2. Get issues to process
    let query = db
      .selectFrom('issues')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('snapshot_id', '=', snapshotId);

    if (issueIds && issueIds.length > 0) {
      query = query.where('id', 'in', issueIds);
    }

    const issues = await query.execute();

    logger.info({ issueCount: issues.length }, 'Found issues to process');

    // Update total count
    await db.updateTable('evidence_generation_runs')
      .set({ total_issues: issues.length })
      .where('id', '=', runId)
      .execute();

    let processedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const completenessScores: number[] = [];

    // 3. Process each issue
    for (const issue of issues) {
      try {
        // Check if evidence already exists and skip if not forcing
        if (!force) {
          const existingEvidence = await db
            .selectFrom('issue_evidence')
            .select('id')
            .where('issue_id', '=', issue.id)
            .executeTakeFirst();

          if (existingEvidence) {
            skippedCount++;
            continue;
          }
        }

        // Generate evidence for this issue
        const result = await generateEvidenceForIssue(
          db,
          tenantId,
          snapshotId,
          issue,
          detectionRunId,
          logger
        );

        if (result.success) {
          processedCount++;
          completenessScores.push(result.completenessScore);
        } else {
          failedCount++;
        }

        // Update progress periodically
        if ((processedCount + failedCount + skippedCount) % 100 === 0) {
          await db.updateTable('evidence_generation_runs')
            .set({
              processed_issues: processedCount,
              failed_issues: failedCount,
              skipped_issues: skippedCount,
            })
            .where('id', '=', runId)
            .execute();
        }
      } catch (error) {
        logger.error({ error, issueId: issue.id }, 'Failed to generate evidence for issue');
        failedCount++;
      }
    }

    // 4. Calculate average completeness score
    const avgCompletenessScore = completenessScores.length > 0
      ? completenessScores.reduce((a, b) => a + b, 0) / completenessScores.length
      : null;

    // 5. Update run with final stats
    await db.updateTable('evidence_generation_runs')
      .set({
        status: 'completed',
        processed_issues: processedCount,
        failed_issues: failedCount,
        skipped_issues: skippedCount,
        avg_completeness_score: avgCompletenessScore,
        stats_json: {
          durationMs: Date.now() - startTime,
          totalIssues: issues.length,
          completenessDistribution: {
            complete: completenessScores.filter(s => s >= 0.9).length,
            partial: completenessScores.filter(s => s >= 0.7 && s < 0.9).length,
            incomplete: completenessScores.filter(s => s < 0.7).length,
          },
        },
        finished_at: new Date(),
      })
      .where('id', '=', runId)
      .execute();

    logger.info({
      runId,
      processedCount,
      failedCount,
      skippedCount,
      avgCompletenessScore,
    }, 'Evidence generation completed');

    return {
      success: true,
      message: `Evidence generated for ${processedCount} issues`,
      data: {
        runId,
        processedCount,
        failedCount,
        skippedCount,
        avgCompletenessScore,
      },
      processingTimeMs: Date.now() - startTime,
    };

  } catch (error) {
    logger.error({ error, runId }, 'Evidence generation run failed');

    // Update run status to failed
    await db.updateTable('evidence_generation_runs')
      .set({
        status: 'failed',
        finished_at: new Date(),
        error_code: 'EVIDENCE_ERROR',
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
 * Generate evidence for a single issue
 */
async function generateEvidenceForIssue(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string,
  issue: any,
  detectionRunId: string | undefined,
  logger: Logger
): Promise<{ success: boolean; completenessScore: number }> {
  const startTime = Date.now();
  const evidenceId = generateEvidenceId();
  const auditId = generateEvidenceAuditId();

  try {
    // 1. Get current evidence version (for versioning)
    const latestEvidence = await db
      .selectFrom('issue_evidence')
      .select('evidence_version')
      .where('issue_id', '=', issue.id)
      .orderBy('evidence_version', 'desc')
      .executeTakeFirst();

    const evidenceVersion = (latestEvidence?.evidence_version || 0) + 1;

    // 2. Load snapshot to get actual creation date
    const snapshot = await db
      .selectFrom('snapshots')
      .select(['id', 'created_at'])
      .where('id', '=', snapshotId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }

    // 3. Load issue sources
    const issueSources = await db
      .selectFrom('issue_sources')
      .selectAll()
      .where('issue_id', '=', issue.id)
      .execute();

    // 4. Load related entities
    const relatedData = await loadRelatedEntities(db, tenantId, snapshotId, issue, issueSources);

    // 5. Load contract clauses if contract exists
    const clauses = issue.contract_id
      ? await loadContractClauses(db, tenantId, snapshotId, issue.contract_id)
      : [];

    // 6. Build evidence pack data
    const evidencePack = buildEvidencePack(issue, relatedData, detectionRunId, snapshot);

    // 7. Calculate completeness score
    const completenessInput: CompletenessInput = {
      expectedSources: getExpectedSourceCount(issue.rule_id),
      actualSources: issueSources.length,
      contractReadinessScore: relatedData.contractReadiness?.confidence_score || null,
      hasCalculations: true, // We always have calculations for billing rules
      calculationsReproducible: true,
      hasClauses: !!issue.contract_id,
      expectedClauseCount: issue.contract_id ? 1 : 0,
      actualClauseCount: clauses.length,
    };

    const { score: completenessScore, breakdown } = calculateCompletenessScore(completenessInput);

    // 8. Generate summary title
    const title = generateEvidenceTitle(issue);
    const summary = generateEvidenceSummary(issue, relatedData);

    // 9. Insert evidence record
    await db.insertInto('issue_evidence').values({
      id: evidenceId,
      tenant_id: tenantId,
      snapshot_id: snapshotId,
      issue_id: issue.id,
      evidence_version: evidenceVersion,
      evidence_type: 'full',
      title,
      summary,
      data_json: evidencePack,
      completeness_score: completenessScore,
      completeness_breakdown: breakdown,
      s3_key: null, // Will be set if we need to offload to S3
      rule_id: issue.rule_id,
      rule_version: issue.rule_version,
    }).execute();

    // 10. Insert evidence sources
    for (const source of issueSources) {
      await db.insertInto('issue_evidence_sources').values({
        id: generateEvidenceSourceId(),
        tenant_id: tenantId,
        evidence_id: evidenceId,
        issue_id: issue.id,
        source_type: source.source_type as any,
        source_id: source.source_id,
        source_system: source.source_system,
        source_external_id: null,
        field_name: source.field_name,
        field_value_json: source.field_value_json,
        s3_key: null,
        snapshot_value_json: null,
      }).execute();
    }

    // 10. Insert calculation records
    const calculations = buildCalculationRecords(issue, relatedData);
    for (let i = 0; i < calculations.length; i++) {
      const calc = calculations[i];
      await db.insertInto('issue_evidence_calculations').values({
        id: generateEvidenceCalcId(),
        tenant_id: tenantId,
        evidence_id: evidenceId,
        issue_id: issue.id,
        calc_name: calc.name,
        calc_type: calc.type,
        formula: calc.formula,
        inputs_json: calc.inputs,
        outputs_json: calc.outputs,
        rule_id: issue.rule_id,
        rule_version: issue.rule_version,
        sequence_number: i,
        is_reproducible: true,
        notes: null,
      }).execute();
    }

    // 11. Insert clause records
    for (const clause of clauses.slice(0, 5)) { // Limit to 5 most relevant clauses
      await db.insertInto('issue_evidence_clauses').values({
        id: generateEvidenceClauseId(),
        tenant_id: tenantId,
        evidence_id: evidenceId,
        issue_id: issue.id,
        clause_id: clause.id,
        contract_id: issue.contract_id,
        contract_version_id: clause.contract_version_id,
        document_id: clause.document_id,
        clause_type: clause.clause_type,
        clause_label: clause.clause_label,
        excerpt: clause.text.substring(0, 10000), // Truncate very long clauses
        full_text_s3_key: null,
        start_offset: clause.start_offset,
        end_offset: clause.end_offset,
        page_number: clause.page_number,
        relevance_score: 0.8, // Default relevance
      }).execute();
    }

    // 12. Create audit record
    await db.insertInto('issue_evidence_audit').values({
      id: auditId,
      tenant_id: tenantId,
      issue_id: issue.id,
      evidence_id: evidenceId,
      evidence_version: evidenceVersion,
      action: evidenceVersion > 1 ? 'regenerated' : 'generated',
      status: 'completed',
      trigger_type: detectionRunId ? 'detection_run' : 'auto',
      actor_user_id: null,
      previous_version: evidenceVersion > 1 ? evidenceVersion - 1 : null,
      completeness_score: completenessScore,
      processing_time_ms: Date.now() - startTime,
      error_code: null,
      error_message: null,
      metadata_json: {},
      generated_at: new Date(),
    }).execute();

    return { success: true, completenessScore };

  } catch (error) {
    // Create failed audit record
    await db.insertInto('issue_evidence_audit').values({
      id: auditId,
      tenant_id: tenantId,
      issue_id: issue.id,
      evidence_id: null,
      evidence_version: 1,
      action: 'failed',
      status: 'failed',
      trigger_type: detectionRunId ? 'detection_run' : 'auto',
      actor_user_id: null,
      previous_version: null,
      completeness_score: null,
      processing_time_ms: Date.now() - startTime,
      error_code: 'GENERATION_FAILED',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      metadata_json: {},
      generated_at: new Date(),
    }).execute();

    throw error;
  }
}

/**
 * Load related entities for evidence
 */
async function loadRelatedEntities(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string,
  issue: any,
  sources: any[]
): Promise<{
  contract: any | null;
  invoice: any | null;
  customer: any | null;
  contractReadiness: any | null;
  invoiceLines: any[];
}> {
  let contract = null;
  let invoice = null;
  let customer = null;
  let contractReadiness = null;
  let invoiceLines: any[] = [];

  // Load contract
  if (issue.contract_id) {
    contract = await db
      .selectFrom('contracts')
      .selectAll()
      .where('id', '=', issue.contract_id)
      .executeTakeFirst();

    // Load contract readiness
    const version = await db
      .selectFrom('contract_versions')
      .select('id')
      .where('contract_id', '=', issue.contract_id)
      .orderBy('version', 'desc')
      .executeTakeFirst();

    if (version) {
      contractReadiness = await db
        .selectFrom('contract_readiness')
        .selectAll()
        .where('contract_version_id', '=', version.id)
        .executeTakeFirst();
    }
  }

  // Load invoice
  if (issue.invoice_id) {
    invoice = await db
      .selectFrom('invoices')
      .selectAll()
      .where('id', '=', issue.invoice_id)
      .executeTakeFirst();

    // Load invoice lines
    invoiceLines = await db
      .selectFrom('invoice_lines')
      .selectAll()
      .where('invoice_id', '=', issue.invoice_id)
      .execute();
  }

  // Load customer
  if (issue.customer_id) {
    customer = await db
      .selectFrom('customers')
      .selectAll()
      .where('id', '=', issue.customer_id)
      .executeTakeFirst();
  }

  return { contract, invoice, customer, contractReadiness, invoiceLines };
}

/**
 * Load contract clauses for evidence
 */
async function loadContractClauses(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string,
  contractId: string
): Promise<any[]> {
  // Get latest contract version
  const version = await db
    .selectFrom('contract_versions')
    .select('id')
    .where('contract_id', '=', contractId)
    .orderBy('version', 'desc')
    .executeTakeFirst();

  if (!version) return [];

  // Load clauses
  return db
    .selectFrom('contract_clauses')
    .selectAll()
    .where('contract_version_id', '=', version.id)
    .where('clause_type', 'in', ['section', 'paragraph'])
    .orderBy('sequence_number', 'asc')
    .limit(10)
    .execute();
}

/**
 * Build the evidence pack data structure
 */
function buildEvidencePack(
  issue: any,
  relatedData: any,
  detectionRunId: string | undefined,
  snapshot: { id: string; created_at: Date }
): EvidencePackData {
  const expected = issue.expected_json || {};
  const actual = issue.actual_json || {};

  // Calculate variance
  const expectedAmount = typeof expected.amount === 'number' ? expected.amount : null;
  const actualAmount = typeof actual.amount === 'number' ? actual.amount : null;
  let variance = {
    amount: null as number | null,
    percentage: null as number | null,
    direction: 'none' as 'over' | 'under' | 'none',
    description: 'Unable to calculate variance',
  };

  if (expectedAmount !== null && actualAmount !== null) {
    const varianceAmount = actualAmount - expectedAmount;
    const variancePct = expectedAmount !== 0 ? (varianceAmount / expectedAmount) * 100 : null;
    variance = {
      amount: varianceAmount,
      percentage: variancePct,
      direction: varianceAmount > 0 ? 'over' : varianceAmount < 0 ? 'under' : 'none',
      description: varianceAmount !== 0
        ? `${Math.abs(varianceAmount).toFixed(2)} ${issue.currency} ${varianceAmount > 0 ? 'over' : 'under'} expected`
        : 'No variance detected',
    };
  }

  return {
    summary: generateEvidenceSummary(issue, relatedData),
    expected,
    actual,
    variance,
    snapshotMetadata: {
      snapshotId: issue.snapshot_id,
      snapshotDate: snapshot.created_at.toISOString(),
      rulesetVersion: issue.rule_version || '1.0.0',
      ruleId: issue.rule_id,
      ruleVersion: issue.rule_version,
      detectionRunId,
    },
  };
}

/**
 * Build calculation records for evidence
 */
function buildCalculationRecords(issue: any, relatedData: any): Array<{
  name: string;
  type: string;
  formula: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}> {
  const calculations: Array<{
    name: string;
    type: string;
    formula: string;
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
  }> = [];

  const expected = issue.expected_json || {};
  const actual = issue.actual_json || {};

  // Add expected amount calculation if available
  if (typeof expected.amount === 'number' && relatedData.contract) {
    calculations.push({
      name: 'expected_amount',
      type: 'expected_amount',
      formula: 'contract.arr / billing_periods',
      inputs: {
        arr: relatedData.contract.arr,
        billingFrequency: relatedData.contract.billing_frequency,
      },
      outputs: {
        expectedAmount: expected.amount,
      },
    });
  }

  // Add actual amount calculation if invoice exists
  if (typeof actual.amount === 'number' && relatedData.invoice) {
    calculations.push({
      name: 'actual_amount',
      type: 'actual_amount',
      formula: 'invoice.total',
      inputs: {
        invoiceId: relatedData.invoice.id,
        invoiceNumber: relatedData.invoice.invoice_number,
      },
      outputs: {
        actualAmount: actual.amount,
      },
    });
  }

  // Add variance calculation
  if (typeof expected.amount === 'number' && typeof actual.amount === 'number') {
    const variance = actual.amount - expected.amount;
    calculations.push({
      name: 'variance',
      type: 'variance',
      formula: 'actual - expected',
      inputs: {
        expected: expected.amount,
        actual: actual.amount,
      },
      outputs: {
        variance,
        variancePct: expected.amount !== 0 ? (variance / expected.amount) * 100 : null,
      },
    });
  }

  return calculations;
}

/**
 * Generate evidence title based on issue type
 */
function generateEvidenceTitle(issue: any): string {
  const ruleLabels: Record<string, string> = {
    R001: 'Missing Invoice Evidence',
    R002: 'Underbilling Evidence',
    R003: 'Overbilling Evidence',
    R004: 'Wrong Unit Price Evidence',
    R005: 'Wrong Quantity Evidence',
    R006: 'Duplicate Billing Evidence',
    R007: 'Billing Beyond Term Evidence',
    R008: 'Billing Before Start Evidence',
    R009: 'Currency Mismatch Evidence',
    R010: 'Billing Frequency Mismatch Evidence',
  };

  return ruleLabels[issue.rule_id] || `${issue.rule_id} Evidence`;
}

/**
 * Generate human-readable evidence summary
 */
function generateEvidenceSummary(issue: any, relatedData: any): string {
  const contract = relatedData.contract;
  const invoice = relatedData.invoice;
  const customer = relatedData.customer;

  const parts: string[] = [];

  // Add rule description
  const ruleDescriptions: Record<string, string> = {
    R001: 'Missing invoice detected for active contract',
    R002: 'Invoice amount is less than expected based on contract terms',
    R003: 'Invoice amount exceeds expected based on contract terms',
    R004: 'Invoice line item unit price does not match contracted price',
    R005: 'Invoice line item quantity does not match expected',
    R006: 'Multiple invoices detected for the same contract and period',
    R007: 'Invoice date is after contract end date',
    R008: 'Invoice date is before contract start date',
    R009: 'Invoice currency does not match contract currency',
    R010: 'Invoice timing does not match contract billing frequency',
  };

  parts.push(ruleDescriptions[issue.rule_id] || `Issue detected by rule ${issue.rule_id}`);

  // Add contract info
  if (contract) {
    parts.push(`Contract: ${contract.name || contract.external_id}`);
  }

  // Add customer info
  if (customer) {
    parts.push(`Customer: ${customer.name}`);
  }

  // Add impact
  if (issue.impact_amount) {
    parts.push(`Impact: ${issue.impact_amount.toFixed(2)} ${issue.currency}`);
  }

  return parts.join('. ') + '.';
}

/**
 * Get expected source count based on rule type
 */
function getExpectedSourceCount(ruleId: string): number {
  const sourceCounts: Record<string, number> = {
    R001: 1, // Contract only
    R002: 2, // Contract + Invoice
    R003: 2, // Contract + Invoice
    R004: 3, // Contract + Invoice + Line
    R005: 3, // Contract + Invoice + Line
    R006: 2, // Multiple invoices
    R007: 2, // Contract + Invoice
    R008: 2, // Contract + Invoice
    R009: 2, // Contract + Invoice
    R010: 2, // Contract + Invoice
  };

  return sourceCounts[ruleId] || 1;
}
