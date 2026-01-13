/**
 * Tier 0: Data Quality Gate Rules
 * R100-R105 - Run first, can block or cap confidence
 */
import type { Rule, RuleContext, RuleIssue } from '../../types.js';

// R100: Stale Usage Feed
export const R100_StaleUsageFeed: Rule = {
  id: 'R100',
  version: '1.0.0',
  name: 'Stale Usage Feed',
  description: 'Usage data has not been updated within the configured staleness threshold',
  category: 'data_quality',
  tier: 'data_quality',
  severity: 'medium',
  priority: 1,
  requiresData: ['usage_events'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { dataQuality, config, snapshotId } = ctx;
    
    if (!dataQuality.usageDataStale) {
      return [];
    }

    return [{
      ruleId: 'R100',
      ruleVersion: '1.0.0',
      category: 'data_quality',
      severity: 'medium',
      confidence: 1.0,
      expected: { maxAgeHours: config.gating.usageStalenessHours },
      actual: { ageHours: dataQuality.usageDataAgeHours },
      dimensions: { snapshotId, type: 'usage_staleness' },
      dataQualityFlags: ['usage_stale'],
      metadata: { blocksRules: ['R150', 'R151', 'R152', 'R153', 'R154'] },
    }];
  },
};

// R101: Missing CRM Sync
export const R101_MissingCRMSync: Rule = {
  id: 'R101',
  version: '1.0.0',
  name: 'Missing CRM Sync',
  description: 'Contract/CRM data has not been synced within the configured threshold',
  category: 'data_quality',
  tier: 'data_quality',
  severity: 'medium',
  priority: 2,
  requiresData: ['contracts'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { dataQuality, config, snapshotId } = ctx;
    
    if (!dataQuality.crmDataStale) {
      return [];
    }

    return [{
      ruleId: 'R101',
      ruleVersion: '1.0.0',
      category: 'data_quality',
      severity: 'medium',
      confidence: 1.0,
      expected: { maxAgeHours: config.gating.crmStalenessHours },
      actual: { ageHours: dataQuality.crmDataAgeHours },
      dimensions: { snapshotId, type: 'crm_staleness' },
      dataQualityFlags: ['crm_stale'],
    }];
  },
};

// R102: Incomplete Snapshot
export const R102_IncompleteSnapshot: Rule = {
  id: 'R102',
  version: '1.0.0',
  name: 'Incomplete Snapshot',
  description: 'Snapshot has significantly fewer records than expected compared to prior',
  category: 'data_quality',
  tier: 'data_quality',
  severity: 'high',
  priority: 3,
  requiresData: ['contracts', 'invoices', 'prior_snapshot'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { dataQuality, snapshotId } = ctx;
    
    // Consider incomplete if less than 90%
    if (dataQuality.snapshotCompleteness >= 0.9) {
      return [];
    }

    return [{
      ruleId: 'R102',
      ruleVersion: '1.0.0',
      category: 'data_quality',
      severity: 'high',
      confidence: 1.0,
      expected: { completeness: 0.9 },
      actual: { completeness: dataQuality.snapshotCompleteness },
      dimensions: { snapshotId, type: 'snapshot_completeness' },
      dataQualityFlags: ['incomplete_snapshot'],
      metadata: { 
        priorSnapshotId: dataQuality.priorSnapshot?.id,
        dropPct: ((1 - dataQuality.snapshotCompleteness) * 100).toFixed(1),
      },
    }];
  },
};

// R103: Low Readiness Contract
export const R103_LowReadinessContract: Rule = {
  id: 'R103',
  version: '1.0.0',
  name: 'Low Readiness Contract',
  description: 'Contract has low extraction readiness score, reducing confidence',
  category: 'data_quality',
  tier: 'data_quality',
  severity: 'info',
  priority: 4,
  requiresData: ['contracts'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { contracts, dataQuality, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const contract of contracts) {
      const readiness = dataQuality.contractReadiness.get(contract.id);
      
      // Skip if ready or no readiness data
      if (readiness === undefined || readiness >= 0.7) {
        continue;
      }

      issues.push({
        ruleId: 'R103',
        ruleVersion: '1.0.0',
        category: 'data_quality',
        severity: 'info',
        confidence: readiness,
        expected: { readiness: 0.7 },
        actual: { readiness },
        dimensions: { 
          snapshotId, 
          contractId: contract.id,
          type: 'contract_readiness',
        },
        contractId: contract.id,
        customerId: contract.customer_id || undefined,
        dataQualityFlags: ['low_readiness'],
        metadata: {
          confidenceCap: config.gating.confidenceCapIfNotReady,
        },
      });
    }

    return issues;
  },
};

// R104: FX Rate Unavailable
export const R104_FXRateUnavailable: Rule = {
  id: 'R104',
  version: '1.0.0',
  name: 'FX Rate Unavailable',
  description: 'Exchange rate not available for currency conversion',
  category: 'data_quality',
  tier: 'data_quality',
  severity: 'medium',
  priority: 5,
  requiresData: ['invoices', 'fx_rates'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { invoices, dataQuality, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];
    const missingCurrencies = new Set<string>();

    for (const invoice of invoices) {
      if (invoice.currency === config.fx.baseCurrency) {
        continue;
      }

      if (!dataQuality.fxRatesAvailable.has(invoice.currency)) {
        missingCurrencies.add(invoice.currency);
      }
    }

    for (const currency of missingCurrencies) {
      issues.push({
        ruleId: 'R104',
        ruleVersion: '1.0.0',
        category: 'data_quality',
        severity: 'medium',
        confidence: 1.0,
        expected: { fxRateAvailable: true },
        actual: { fxRateAvailable: false, currency },
        dimensions: { 
          snapshotId, 
          currency,
          type: 'fx_rate_missing',
        },
        dataQualityFlags: ['fx_rate_missing'],
        metadata: { 
          baseCurrency: config.fx.baseCurrency,
          affectedInvoices: invoices.filter(i => i.currency === currency).length,
        },
      });
    }

    return issues;
  },
};

// R105: Missing Master Data
export const R105_MissingMasterData: Rule = {
  id: 'R105',
  version: '1.0.0',
  name: 'Missing Master Data',
  description: 'Required master data (customer, product) is missing',
  category: 'data_quality',
  tier: 'data_quality',
  severity: 'low',
  priority: 6,
  requiresData: ['contracts', 'invoices', 'customers', 'products'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { dataQuality, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const warning of dataQuality.missingMasterData) {
      issues.push({
        ruleId: 'R105',
        ruleVersion: '1.0.0',
        category: 'data_quality',
        severity: 'low',
        confidence: 1.0,
        expected: { masterDataComplete: true },
        actual: { masterDataComplete: false, warning },
        dimensions: { 
          snapshotId, 
          type: 'missing_master_data',
          warning,
        },
        dataQualityFlags: ['missing_master_data'],
      });
    }

    return issues;
  },
};

// Export all data quality rules
export const dataQualityRules: Rule[] = [
  R100_StaleUsageFeed,
  R101_MissingCRMSync,
  R102_IncompleteSnapshot,
  R103_LowReadinessContract,
  R104_FXRateUnavailable,
  R105_MissingMasterData,
];
