/**
 * Detection Run Processor
 * 
 * Executes detection rules against a snapshot and persists issues.
 * Supports AI-powered enrichment (Tier 2) when enabled.
 */
import type { Logger } from 'pino';
import type { Kysely } from 'kysely';
import type { Database, Snapshot } from '@cogtics/db';
import type { DetectRunJobPayload, DetectionConfig } from '@cogtics/schemas';
import {
  generateDetectionRunId,
  generateIssueId,
  generateIssueSourceId,
  DetectionConfigSchema,
} from '@cogtics/schemas';
import {
  initializeRules,
  runDetection,
  DEFAULT_DETECTION_CONFIG,
  type RuleContext,
  type DataQualityReport,
  type ContractWithTerms,
  type InvoiceWithLines,
  type ScheduleWithObligation,
  type RuleIssue,
} from '@cogtics/rules';
import { llm } from '@cogtics/utils';
import type { AIDiscoveredIssue, AIEnrichedIssue } from '@cogtics/rules';

const { DetectionLLM, AnomalyDetectionLLM } = llm;

interface JobResult {
  success: boolean;
  message: string;
  data?: unknown;
  processingTimeMs?: number;
}

// Initialize rules registry at module load
initializeRules();

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
    const detectionConfig: DetectionConfig = config 
      ? DetectionConfigSchema.parse(config)
      : { ...DEFAULT_DETECTION_CONFIG };

    // 4. Build data quality report
    const dataQuality = buildDataQualityReport(data, detectionConfig);

    // 5. Build rule context
    const context: RuleContext = {
      tenantId,
      snapshotId,
      snapshotDate: data.snapshot.created_at,
      runId,
      config: detectionConfig,
      dataQuality,
      contracts: data.contracts,
      invoices: data.invoices,
      payments: data.payments,
      usageEvents: data.usageEvents,
      customers: data.customers,
      products: data.products,
      schedules: data.schedules,
      obligations: data.obligations,
      fxRates: data.fxRates,
      priorIssues: data.priorIssues,
      currentRunIssues: [],
    };

    // 6. Run detection rules
    logger.info({ rulesConfig: Object.keys(detectionConfig) }, 'Running detection rules');
    const result = await runDetection(context, {});

    logger.info({
      issuesTotal: result.issuesTotal,
      issuesBySeverity: result.issuesBySeverity,
      issuesByCategory: result.issuesByCategory,
      ruleResults: result.ruleResults.length,
      durationMs: result.durationMs,
    }, 'Detection rules completed');

    // 6.5. AI Enrichment (Tier 2) - if enabled
    let enrichedIssues: AIEnrichedIssue[] = [];
    let aiEnrichmentStats: Record<string, unknown> | null = null;

    if (detectionConfig.aiEnrichment?.enabled && result.issues.length > 0) {
      logger.info({ issueCount: result.issues.length }, 'Starting AI enrichment');
      
      try {
        const enrichmentStart = Date.now();
        const llm = new DetectionLLM();
        
        // Limit issues to enrich based on config
        const maxIssues = detectionConfig.aiEnrichment.maxIssuesPerRun || 50;
        const minConfidence = detectionConfig.aiEnrichment.minConfidenceToEnrich || 0.5;
        
        // Filter issues by confidence and limit
        const issuesToEnrich = result.issues
          .filter(i => i.confidence >= minConfidence)
          .slice(0, maxIssues);
        
        if (issuesToEnrich.length > 0) {
          enrichedIssues = await llm.enrichIssues(issuesToEnrich, {
            contracts: data.contracts,
            invoices: data.invoices,
            customers: data.customers,
          });
          
          aiEnrichmentStats = {
            totalIssues: result.issues.length,
            enrichedCount: enrichedIssues.length,
            skippedCount: result.issues.length - issuesToEnrich.length,
            durationMs: Date.now() - enrichmentStart,
          };
          
          logger.info({
            enrichedCount: enrichedIssues.length,
            durationMs: aiEnrichmentStats.durationMs,
          }, 'AI enrichment completed');
        }
      } catch (aiError) {
        logger.warn({ error: aiError }, 'AI enrichment failed, continuing with rule-based issues');
        aiEnrichmentStats = {
          error: aiError instanceof Error ? aiError.message : 'Unknown error',
          enrichedCount: 0,
        };
      }
    }

    // Create a map of enriched issues by issue key for lookup
    const enrichedByKey = new Map<string, AIEnrichedIssue>();
    for (const enriched of enrichedIssues) {
      enrichedByKey.set(enriched.issueKey, enriched);
    }

    // 6.6. AI Anomaly Detection (Tier 3) - if enabled
    let aiDiscoveries: AIDiscoveredIssue[] = [];
    let aiAnomalyStats: Record<string, unknown> | null = null;

    if (detectionConfig.aiAnomalyDetection?.enabled) {
      logger.info('Starting AI anomaly detection');
      
      try {
        const anomalyStart = Date.now();
        const anomalyLLM = new AnomalyDetectionLLM();
        
        aiDiscoveries = await anomalyLLM.detectAnomalies(
          context,
          result.issues,
          {
            minConfidenceToReport: detectionConfig.aiAnomalyDetection.minConfidenceToReport || 0.7,
            maxAnomaliesPerRun: detectionConfig.aiAnomalyDetection.maxAnomaliesPerRun || 20,
            categories: detectionConfig.aiAnomalyDetection.categories || ['semantic', 'pattern'],
          }
        );

        aiAnomalyStats = {
          anomaliesFound: aiDiscoveries.length,
          byCategory: aiDiscoveries.reduce((acc, d) => {
            acc[d.category] = (acc[d.category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          durationMs: Date.now() - anomalyStart,
        };

        logger.info({
          anomaliesFound: aiDiscoveries.length,
          durationMs: aiAnomalyStats.durationMs,
        }, 'AI anomaly detection completed');

        // Persist AI discoveries
        for (const discovery of aiDiscoveries) {
          await db.insertInto('ai_discovered_issues' as any).values({
            id: discovery.id,
            tenant_id: tenantId,
            snapshot_id: snapshotId,
            run_id: runId,
            category: discovery.category,
            severity: discovery.severity,
            confidence: discovery.confidence,
            title: discovery.title,
            description: discovery.description,
            evidence_json: discovery.evidence,
            reasoning: discovery.reasoning,
            review_status: 'pending',
            created_at: new Date(),
            updated_at: new Date(),
          }).execute();
        }

      } catch (anomalyError) {
        logger.warn({ error: anomalyError }, 'AI anomaly detection failed, continuing without');
        aiAnomalyStats = {
          error: anomalyError instanceof Error ? anomalyError.message : 'Unknown error',
          anomaliesFound: 0,
        };
      }
    }

    // 7. Persist issues
    for (const issue of result.issues) {
      const issueId = generateIssueId();
      // issueKey is added dynamically by the runner
      const issueKey = (issue as RuleIssue & { issueKey?: string }).issueKey;
      
      // Check if we have AI enrichment for this issue
      const enrichedIssue = issueKey ? enrichedByKey.get(issueKey) : undefined;
      
      await db.insertInto('issues').values({
        id: issueId,
        tenant_id: tenantId,
        snapshot_id: snapshotId,
        run_id: runId,
        rule_id: issue.ruleId,
        rule_version: issue.ruleVersion,
        issue_key: issueKey ?? '',
        category: issue.category,
        status: 'open' as any,
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

    }

    // 8. Update detection run with results
    await db.updateTable('detection_runs')
      .set({
        status: 'completed',
        finished_at: new Date(),
        issues_total: result.issuesTotal,
        issues_by_severity: result.issuesBySeverity,
        issues_by_category: result.issuesByCategory,
        stats_json: {
          durationMs: Date.now() - startTime,
          contractsAnalyzed: data.contracts.length,
          invoicesAnalyzed: data.invoices.length,
          rulesExecuted: result.ruleResults.filter(r => !r.skipped).length,
          rulesSkipped: result.ruleResults.filter(r => r.skipped).length,
          rulesetVersion: result.rulesetVersion,
          // AI stats (stored in stats_json)
          aiEnrichment: aiEnrichmentStats,
          aiAnomalyDetection: aiAnomalyStats,
        },
      })
      .where('id', '=', runId)
      .execute();

    logger.info({ runId, issueCount: result.issuesTotal }, 'Detection run completed');

    return {
      success: true,
      message: `Detection completed: ${result.issuesTotal} issues found`,
      data: {
        runId,
        issuesTotal: result.issuesTotal,
        issuesBySeverity: result.issuesBySeverity,
        issuesByCategory: result.issuesByCategory,
        ruleResults: result.ruleResults,
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
 * Build data quality report for the detection context.
 */
function buildDataQualityReport(
  data: SnapshotData,
  config: DetectionConfig
): DataQualityReport {
  // Calculate usage data age
  let latestUsage = new Date(0);
  for (const e of data.usageEvents) {
    const eventDate = e.event_date instanceof Date ? e.event_date : new Date(e.event_date);
    if (eventDate > latestUsage) {
      latestUsage = eventDate;
    }
  }
  const usageAgeHours = data.usageEvents.length > 0
    ? (Date.now() - latestUsage.getTime()) / (1000 * 60 * 60)
    : 0;

  // Calculate CRM data age (using contract created_at/updated_at)
  let latestContract = new Date(0);
  for (const c of data.contracts) {
    const updatedAt = c.updated_at
      ? c.updated_at instanceof Date
        ? c.updated_at
        : new Date(c.updated_at)
      : c.created_at instanceof Date
        ? c.created_at
        : new Date(c.created_at);
    if (updatedAt > latestContract) {
      latestContract = updatedAt;
    }
  }
  const crmAgeHours = data.contracts.length > 0
    ? (Date.now() - latestContract.getTime()) / (1000 * 60 * 60)
    : 0;

  // Build contract readiness map (use 1.0 as default if no readiness data)
  const contractReadiness = new Map<string, number>();
  for (const contract of data.contracts) {
    // Check if contract has readiness data in metadata
    const metadata = contract.metadata_json as Record<string, unknown> | null;
    const readiness = typeof metadata?.readinessScore === 'number' 
      ? metadata.readinessScore 
      : 1.0;
    contractReadiness.set(contract.id, readiness);
  }

  // Available FX currencies
  const fxCurrencies = new Set<string>();
  for (const key of data.fxRates.keys()) {
    const [from] = key.split('_');
    fxCurrencies.add(from);
  }

  // Check for missing master data
  const missingMasterData: string[] = [];
  const customerIds = new Set(data.customers.map(c => c.id));
  const productIds = new Set(data.products.map(p => p.id));

  for (const contract of data.contracts) {
    if (contract.customer_id && !customerIds.has(contract.customer_id)) {
      missingMasterData.push(`Contract ${contract.id} references missing customer ${contract.customer_id}`);
    }
  }

  for (const invoice of data.invoices) {
    if (invoice.customer_id && !customerIds.has(invoice.customer_id)) {
      missingMasterData.push(`Invoice ${invoice.id} references missing customer ${invoice.customer_id}`);
    }
    for (const line of invoice.lines) {
      if (line.product_id && !productIds.has(line.product_id)) {
        missingMasterData.push(`Invoice line ${line.id} references missing product ${line.product_id}`);
      }
    }
  }

  // Calculate snapshot completeness (compare to prior snapshot if available)
  let snapshotCompleteness = 1.0;
  if (data.priorSnapshot) {
    // Simple heuristic: compare record counts
    // In production, you'd do more sophisticated comparison
    const priorContractCount = data.priorIssues.length > 0 ? data.contracts.length : 1;
    if (priorContractCount > 0 && data.contracts.length < priorContractCount * 0.5) {
      snapshotCompleteness = data.contracts.length / priorContractCount;
    }
  }

  return {
    snapshotCompleteness,
    usageDataStale: usageAgeHours > config.gating.usageStalenessHours,
    usageDataAgeHours: usageAgeHours,
    crmDataStale: crmAgeHours > config.gating.crmStalenessHours,
    crmDataAgeHours: crmAgeHours,
    contractReadiness,
    missingMasterData: missingMasterData.slice(0, 10), // Limit to first 10 warnings
    fxRatesAvailable: fxCurrencies,
    priorSnapshot: data.priorSnapshot,
  };
}

/**
 * Snapshot data structure for detection.
 */
interface SnapshotData {
  snapshot: Snapshot;
  contracts: ContractWithTerms[];
  invoices: InvoiceWithLines[];
  payments: any[];
  usageEvents: any[];
  customers: any[];
  products: any[];
  schedules: ScheduleWithObligation[];
  obligations: any[];
  fxRates: Map<string, number>;
  priorSnapshot?: Snapshot;
  priorIssues: any[];
}

/**
 * Load snapshot data for detection.
 */
async function loadSnapshotData(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string
): Promise<SnapshotData> {
  // Load the snapshot itself
  const snapshot = await db
    .selectFrom('snapshots')
    .selectAll()
    .where('id', '=', snapshotId)
    .where('tenant_id', '=', tenantId)
    .executeTakeFirst();

  if (!snapshot) {
    throw new Error(`Snapshot ${snapshotId} not found`);
  }
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

  // Load customers first (needed to attach to contracts and invoices)
  const customers = await db
    .selectFrom('customers')
    .selectAll()
    .where('tenant_id', '=', tenantId)
    .where('snapshot_id', '=', snapshotId)
    .execute();

  // Attach terms and customers to contracts
  const contractsWithTerms: ContractWithTerms[] = contracts.map(c => {
    const version = versions.find(v => v.contract_id === c.id);
    const contractTerms = version 
      ? terms.filter(t => t.contract_version_id === version.id)
      : [];
    const customer = customers.find(cust => cust.id === c.customer_id);
    return { ...c, terms: contractTerms, customer };
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

  // Attach lines and customers to invoices
  const invoicesWithLines: InvoiceWithLines[] = invoices.map(inv => ({
    ...inv,
    lines: lines.filter(l => l.invoice_id === inv.id),
    customer: customers.find(cust => cust.id === inv.customer_id),
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

  const schedulesWithObligations: ScheduleWithObligation[] = schedules.map(s => ({
    ...s,
    obligation: obligations.find(o => o.id === s.obligation_id),
  }));

  // Load FX rates
  const fxRatesRaw = await db
    .selectFrom('fx_rates')
    .select(['source_currency', 'target_currency', 'rate_date', 'rate'])
    .where('tenant_id', '=', tenantId)
    .execute();

  const fxRates = new Map<string, number>();
  for (const rate of fxRatesRaw) {
    const dateKey = rate.rate_date instanceof Date
      ? rate.rate_date.toISOString().split('T')[0]
      : String(rate.rate_date);
    const key = `${rate.source_currency}_${rate.target_currency}_${dateKey}`;
    fxRates.set(key, Number(rate.rate));
  }

  // Load prior snapshot for cross-snapshot rules
  const priorSnapshot = await db
    .selectFrom('snapshots')
    .selectAll()
    .where('tenant_id', '=', tenantId)
    .where('created_at', '<', snapshot.created_at)
    .orderBy('created_at', 'desc')
    .limit(1)
    .executeTakeFirst();

  // Load prior issues if prior snapshot exists
  const priorIssues = priorSnapshot
    ? await db
        .selectFrom('issues')
        .selectAll()
        .where('snapshot_id', '=', priorSnapshot.id)
        .execute()
    : [];

  return {
    snapshot,
    contracts: contractsWithTerms,
    invoices: invoicesWithLines,
    payments,
    usageEvents,
    customers,
    products,
    schedules: schedulesWithObligations,
    obligations,
    fxRates,
    priorSnapshot,
    priorIssues,
  };
}
