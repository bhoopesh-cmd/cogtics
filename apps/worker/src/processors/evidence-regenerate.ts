/**
 * Evidence Regeneration Processor (Phase 8)
 * 
 * Regenerates evidence for a specific issue on demand.
 */
import type { Logger } from 'pino';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';
import type { EvidenceRegenerateJobPayload } from '@cogtics/schemas';
import {
  generateEvidenceId,
  generateEvidenceSourceId,
  generateEvidenceCalcId,
  generateEvidenceClauseId,
  generateEvidenceAuditId,
} from '@cogtics/schemas';
import {
  calculateCompletenessScore,
  type CompletenessInput,
} from '@cogtics/rules';

interface JobResult {
  success: boolean;
  message: string;
  data?: unknown;
  processingTimeMs?: number;
}

/**
 * Process evidence regeneration job.
 * Regenerates evidence for a single issue.
 */
export async function processEvidenceRegenerateJob(
  payload: EvidenceRegenerateJobPayload,
  logger: Logger,
  db: Kysely<Database>
): Promise<JobResult> {
  const { tenantId, issueId, force, actorUserId, reason } = payload;
  const startTime = Date.now();
  const auditId = generateEvidenceAuditId();

  // Declare version variables outside try block so they're accessible in catch
  let previousVersion = 0;
  let newVersion = 1;

  logger.info({ issueId, actorUserId }, 'Starting evidence regeneration');

  try {
    // 1. Load the issue
    const issue = await db
      .selectFrom('issues')
      .selectAll()
      .where('id', '=', issueId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!issue) {
      return {
        success: false,
        message: 'Issue not found',
        processingTimeMs: Date.now() - startTime,
      };
    }

    // 2. Get current evidence version
    const latestEvidence = await db
      .selectFrom('issue_evidence')
      .select(['id', 'evidence_version'])
      .where('issue_id', '=', issueId)
      .orderBy('evidence_version', 'desc')
      .executeTakeFirst();

    previousVersion = latestEvidence?.evidence_version || 0;
    newVersion = previousVersion + 1;
    const evidenceId = generateEvidenceId();

    // 3. Load snapshot to get actual creation date
    const snapshot = await db
      .selectFrom('snapshots')
      .select(['id', 'created_at'])
      .where('id', '=', issue.snapshot_id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!snapshot) {
      throw new Error(`Snapshot ${issue.snapshot_id} not found`);
    }

    // 4. Load issue sources
    const issueSources = await db
      .selectFrom('issue_sources')
      .selectAll()
      .where('issue_id', '=', issueId)
      .execute();

    // 5. Load related entities
    const relatedData = await loadRelatedEntities(db, tenantId, issue.snapshot_id, issue);

    // 6. Load contract clauses
    const clauses = issue.contract_id
      ? await loadContractClauses(db, issue.contract_id)
      : [];

    // 7. Build evidence pack
    const evidencePack = buildEvidencePack(issue, relatedData, snapshot);

    // 8. Calculate completeness score
    const completenessInput: CompletenessInput = {
      expectedSources: getExpectedSourceCount(issue.rule_id),
      actualSources: issueSources.length,
      contractReadinessScore: relatedData.contractReadiness?.confidence_score || null,
      hasCalculations: true,
      calculationsReproducible: true,
      hasClauses: !!issue.contract_id,
      expectedClauseCount: issue.contract_id ? 1 : 0,
      actualClauseCount: clauses.length,
    };

    const { score: completenessScore, breakdown } = calculateCompletenessScore(completenessInput);

    // 9. Generate title and summary
    const title = generateEvidenceTitle(issue);
    const summary = generateEvidenceSummary(issue, relatedData);

    // 10. Insert new evidence record
    await db.insertInto('issue_evidence').values({
      id: evidenceId,
      tenant_id: tenantId,
      snapshot_id: issue.snapshot_id,
      issue_id: issueId,
      evidence_version: newVersion,
      evidence_type: 'full',
      title,
      summary,
      data_json: evidencePack,
      completeness_score: completenessScore,
      completeness_breakdown: breakdown,
      s3_key: null,
      rule_id: issue.rule_id,
      rule_version: issue.rule_version,
    }).execute();

    // 10. Insert evidence sources
    for (const source of issueSources) {
      await db.insertInto('issue_evidence_sources').values({
        id: generateEvidenceSourceId(),
        tenant_id: tenantId,
        evidence_id: evidenceId,
        issue_id: issueId,
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

    // 11. Insert calculation records
    const calculations = buildCalculationRecords(issue, relatedData);
    for (let i = 0; i < calculations.length; i++) {
      const calc = calculations[i];
      await db.insertInto('issue_evidence_calculations').values({
        id: generateEvidenceCalcId(),
        tenant_id: tenantId,
        evidence_id: evidenceId,
        issue_id: issueId,
        calc_name: calc.name,
        calc_type: calc.type as any,
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

    // 12. Insert clause records
    for (const clause of clauses.slice(0, 5)) {
      await db.insertInto('issue_evidence_clauses').values({
        id: generateEvidenceClauseId(),
        tenant_id: tenantId,
        evidence_id: evidenceId,
        issue_id: issueId,
        clause_id: clause.id,
        contract_id: issue.contract_id,
        contract_version_id: clause.contract_version_id,
        document_id: clause.document_id,
        clause_type: clause.clause_type,
        clause_label: clause.clause_label,
        excerpt: clause.text.substring(0, 10000),
        full_text_s3_key: null,
        start_offset: clause.start_offset,
        end_offset: clause.end_offset,
        page_number: clause.page_number,
        relevance_score: 0.8,
      }).execute();
    }

    // 13. Create audit record
    await db.insertInto('issue_evidence_audit').values({
      id: auditId,
      tenant_id: tenantId,
      issue_id: issueId,
      evidence_id: evidenceId,
      evidence_version: newVersion,
      action: 'regenerated',
      status: 'completed',
      trigger_type: 'manual',
      actor_user_id: actorUserId || null,
      previous_version: previousVersion > 0 ? previousVersion : null,
      completeness_score: completenessScore,
      processing_time_ms: Date.now() - startTime,
      error_code: null,
      error_message: null,
      metadata_json: { reason: reason || null },
      generated_at: new Date(),
    }).execute();

    logger.info({
      issueId,
      evidenceId,
      newVersion,
      completenessScore,
    }, 'Evidence regeneration completed');

    return {
      success: true,
      message: `Evidence regenerated (version ${newVersion})`,
      data: {
        evidenceId,
        evidenceVersion: newVersion,
        previousVersion,
        completenessScore,
      },
      processingTimeMs: Date.now() - startTime,
    };

  } catch (error) {
    logger.error({ error, issueId }, 'Evidence regeneration failed');

    // Create failed audit record with the version that was being attempted
    await db.insertInto('issue_evidence_audit').values({
      id: auditId,
      tenant_id: tenantId,
      issue_id: issueId,
      evidence_id: null,
      evidence_version: newVersion,
      action: 'failed',
      status: 'failed',
      trigger_type: 'manual',
      actor_user_id: actorUserId || null,
      previous_version: previousVersion > 0 ? previousVersion : null,
      completeness_score: null,
      processing_time_ms: Date.now() - startTime,
      error_code: 'REGENERATION_FAILED',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      metadata_json: { reason: reason || null },
      generated_at: new Date(),
    }).execute();

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs: Date.now() - startTime,
    };
  }
}

// Helper functions (shared with evidence-generate.ts)

async function loadRelatedEntities(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string,
  issue: any
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

  if (issue.contract_id) {
    contract = await db
      .selectFrom('contracts')
      .selectAll()
      .where('id', '=', issue.contract_id)
      .executeTakeFirst();

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

  if (issue.invoice_id) {
    invoice = await db
      .selectFrom('invoices')
      .selectAll()
      .where('id', '=', issue.invoice_id)
      .executeTakeFirst();

    invoiceLines = await db
      .selectFrom('invoice_lines')
      .selectAll()
      .where('invoice_id', '=', issue.invoice_id)
      .execute();
  }

  if (issue.customer_id) {
    customer = await db
      .selectFrom('customers')
      .selectAll()
      .where('id', '=', issue.customer_id)
      .executeTakeFirst();
  }

  return { contract, invoice, customer, contractReadiness, invoiceLines };
}

async function loadContractClauses(
  db: Kysely<Database>,
  contractId: string
): Promise<any[]> {
  const version = await db
    .selectFrom('contract_versions')
    .select('id')
    .where('contract_id', '=', contractId)
    .orderBy('version', 'desc')
    .executeTakeFirst();

  if (!version) return [];

  return db
    .selectFrom('contract_clauses')
    .selectAll()
    .where('contract_version_id', '=', version.id)
    .where('clause_type', 'in', ['section', 'paragraph'])
    .orderBy('sequence_number', 'asc')
    .limit(10)
    .execute();
}

function buildEvidencePack(issue: any, relatedData: any, snapshot: { id: string; created_at: Date }): any {
  const expected = issue.expected_json || {};
  const actual = issue.actual_json || {};

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
    },
  };
}

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

  if (typeof expected.amount === 'number' && relatedData.contract) {
    calculations.push({
      name: 'expected_amount',
      type: 'expected_amount',
      formula: 'contract.arr / billing_periods',
      inputs: {
        arr: relatedData.contract.arr,
        billingFrequency: relatedData.contract.billing_frequency,
      },
      outputs: { expectedAmount: expected.amount },
    });
  }

  if (typeof actual.amount === 'number' && relatedData.invoice) {
    calculations.push({
      name: 'actual_amount',
      type: 'actual_amount',
      formula: 'invoice.total',
      inputs: {
        invoiceId: relatedData.invoice.id,
        invoiceNumber: relatedData.invoice.invoice_number,
      },
      outputs: { actualAmount: actual.amount },
    });
  }

  if (typeof expected.amount === 'number' && typeof actual.amount === 'number') {
    const variance = actual.amount - expected.amount;
    calculations.push({
      name: 'variance',
      type: 'variance',
      formula: 'actual - expected',
      inputs: { expected: expected.amount, actual: actual.amount },
      outputs: {
        variance,
        variancePct: expected.amount !== 0 ? (variance / expected.amount) * 100 : null,
      },
    });
  }

  return calculations;
}

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

function generateEvidenceSummary(issue: any, relatedData: any): string {
  const contract = relatedData.contract;
  const customer = relatedData.customer;
  const parts: string[] = [];

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
  if (contract) parts.push(`Contract: ${contract.name || contract.external_id}`);
  if (customer) parts.push(`Customer: ${customer.name}`);
  if (issue.impact_amount) parts.push(`Impact: ${issue.impact_amount.toFixed(2)} ${issue.currency}`);

  return parts.join('. ') + '.';
}

function getExpectedSourceCount(ruleId: string): number {
  const sourceCounts: Record<string, number> = {
    R001: 1, R002: 2, R003: 2, R004: 3, R005: 3,
    R006: 2, R007: 2, R008: 2, R009: 2, R010: 2,
  };
  return sourceCounts[ruleId] || 1;
}
