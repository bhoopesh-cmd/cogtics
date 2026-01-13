/**
 * Detection Configuration
 * Default configuration and policy management
 */
import {
  DetectionConfigSchema,
  type DetectionConfig,
  type FxConfig,
  type ProrationConfig,
  type TaxFeesConfig,
  type CreditsConfig,
  type ZeroValueConfig,
  type ThresholdsConfig,
  type GatingConfig,
  type AutoRenewalConfig,
} from '@cogtics/schemas';

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_FX_CONFIG: FxConfig = {
  rateSource: 'ecb',
  rateDate: 'invoice_date',
  tolerancePct: 0.02,
  baseCurrency: 'USD',
};

export const DEFAULT_PRORATION_CONFIG: ProrationConfig = {
  method: 'daily_exact',
  midPeriodAmendmentHandling: 'prorate',
  rampScheduleRecognition: 'as_invoiced',
};

export const DEFAULT_TAX_FEES_CONFIG: TaxFeesConfig = {
  excludeFromComparison: true,
  taxLineItemCodes: ['TAX', 'VAT', 'GST', 'SALES_TAX'],
  feeLineItemCodes: ['SHIPPING', 'HANDLING', 'DELIVERY'],
};

export const DEFAULT_CREDITS_CONFIG: CreditsConfig = {
  netWithInvoices: true,
  treatAsSeparateRevenue: false,
};

export const DEFAULT_ZERO_VALUE_CONFIG: ZeroValueConfig = {
  treatAsValid: true,
  skipBillingRules: true,
};

export const DEFAULT_THRESHOLDS_CONFIG: ThresholdsConfig = {
  amountVariancePct: 0.01,
  amountVarianceAbs: 100,
  timingVarianceDays: 5,
  highImpactThreshold: 10000,
  criticalImpactThreshold: 50000,
};

export const DEFAULT_GATING_CONFIG: GatingConfig = {
  skipIfContractNotReady: false,
  confidenceCapIfNotReady: 0.3,
  skipIfUsageStale: true,
  usageStalenessHours: 24,
  skipIfCRMStale: true,
  crmStalenessHours: 48,
};

export const DEFAULT_AUTO_RENEWAL_CONFIG: AutoRenewalConfig = {
  detectImplicitRenewal: true,
  renewalGraceDays: 30,
};

export const DEFAULT_DETECTION_CONFIG: DetectionConfig = {
  fx: DEFAULT_FX_CONFIG,
  proration: DEFAULT_PRORATION_CONFIG,
  taxFees: DEFAULT_TAX_FEES_CONFIG,
  credits: DEFAULT_CREDITS_CONFIG,
  zeroValue: DEFAULT_ZERO_VALUE_CONFIG,
  thresholds: DEFAULT_THRESHOLDS_CONFIG,
  gating: DEFAULT_GATING_CONFIG,
  autoRenewal: DEFAULT_AUTO_RENEWAL_CONFIG,
};

// ============================================
// Configuration Helpers
// ============================================

/**
 * Merge partial config with defaults
 */
export function mergeConfig(partial?: Partial<DetectionConfig>): DetectionConfig {
  if (!partial) {
    return { ...DEFAULT_DETECTION_CONFIG };
  }

  return {
    fx: { ...DEFAULT_FX_CONFIG, ...partial.fx },
    proration: { ...DEFAULT_PRORATION_CONFIG, ...partial.proration },
    taxFees: { ...DEFAULT_TAX_FEES_CONFIG, ...partial.taxFees },
    credits: { ...DEFAULT_CREDITS_CONFIG, ...partial.credits },
    zeroValue: { ...DEFAULT_ZERO_VALUE_CONFIG, ...partial.zeroValue },
    thresholds: { ...DEFAULT_THRESHOLDS_CONFIG, ...partial.thresholds },
    gating: { ...DEFAULT_GATING_CONFIG, ...partial.gating },
    autoRenewal: { ...DEFAULT_AUTO_RENEWAL_CONFIG, ...partial.autoRenewal },
    enabledRules: partial.enabledRules,
    disabledRules: partial.disabledRules,
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: unknown): DetectionConfig {
  return DetectionConfigSchema.parse(config);
}

/**
 * Check if a rule is enabled by configuration
 */
export function isRuleEnabled(
  ruleId: string,
  config: DetectionConfig,
  defaultEnabled: boolean = true
): boolean {
  // Explicit enable list takes precedence
  if (config.enabledRules && config.enabledRules.length > 0) {
    return config.enabledRules.includes(ruleId);
  }

  // Check disable list
  if (config.disabledRules && config.disabledRules.includes(ruleId)) {
    return false;
  }

  return defaultEnabled;
}

/**
 * Get severity threshold based on impact amount
 */
export function getSeverityByImpact(
  impactAmount: number,
  config: DetectionConfig
): 'low' | 'medium' | 'high' | 'critical' {
  const absImpact = Math.abs(impactAmount);
  
  if (absImpact >= config.thresholds.criticalImpactThreshold) {
    return 'critical';
  }
  if (absImpact >= config.thresholds.highImpactThreshold) {
    return 'high';
  }
  if (absImpact >= config.thresholds.amountVarianceAbs * 10) {
    return 'medium';
  }
  return 'low';
}

/**
 * Check if amount variance is within tolerance
 */
export function isWithinTolerance(
  expected: number,
  actual: number,
  config: DetectionConfig
): boolean {
  const variance = Math.abs(expected - actual);
  
  // Check absolute threshold
  if (variance <= config.thresholds.amountVarianceAbs) {
    return true;
  }

  // Check percentage threshold
  if (expected !== 0) {
    const variancePct = variance / Math.abs(expected);
    if (variancePct <= config.thresholds.amountVariancePct) {
      return true;
    }
  }

  return false;
}

/**
 * Check if timing variance is within tolerance
 */
export function isWithinTimingTolerance(
  expectedDate: Date,
  actualDate: Date,
  config: DetectionConfig
): boolean {
  const diffMs = Math.abs(expectedDate.getTime() - actualDate.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= config.thresholds.timingVarianceDays;
}

/**
 * Get confidence cap based on data quality
 */
export function getConfidenceCap(
  contractReady: boolean,
  config: DetectionConfig
): number {
  if (!contractReady && !config.gating.skipIfContractNotReady) {
    return config.gating.confidenceCapIfNotReady;
  }
  return 1.0;
}

// Export current ruleset version
export const RULESET_VERSION = '1.0.0';
