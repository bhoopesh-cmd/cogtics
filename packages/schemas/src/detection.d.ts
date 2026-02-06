/**
 * Detection Engine Schemas (Phase 7)
 * Zod schemas for detection runs, issues, and configuration
 */
import { z } from 'zod';
export declare function generateDetectionRunId(): string;
export declare function generateIssueId(): string;
export declare function generateIssueStatusHistoryId(): string;
export declare function generateIssueSourceId(): string;
export declare function generateDetectionConfigId(): string;
export declare function generateFxRateId(): string;
export declare const DetectionRunStatusSchema: z.ZodEnum<["pending", "running", "completed", "failed", "cancelled"]>;
export type DetectionRunStatus = z.infer<typeof DetectionRunStatusSchema>;
export declare const IssueSeveritySchema: z.ZodEnum<["info", "low", "medium", "high", "critical"]>;
export type IssueSeverity = z.infer<typeof IssueSeveritySchema>;
export declare const IssueStatusSchema: z.ZodEnum<["open", "resolved", "dismissed", "acknowledged"]>;
export type IssueStatus = z.infer<typeof IssueStatusSchema>;
export declare const IssueCategorySchema: z.ZodEnum<["data_quality", "billing", "discount", "revrec", "credits", "usage", "lifecycle", "multi_entity", "cross_snapshot", "tax_fees", "fx_currency"]>;
export type IssueCategory = z.infer<typeof IssueCategorySchema>;
export declare const IssueSourceTypeSchema: z.ZodEnum<["contract", "invoice", "invoice_line", "payment", "usage_event", "schedule", "obligation", "customer", "product", "contract_term"]>;
export type IssueSourceType = z.infer<typeof IssueSourceTypeSchema>;
export declare const FxRateSourceSchema: z.ZodEnum<["ecb", "snapshot_rate", "contract_rate", "manual"]>;
export type FxRateSource = z.infer<typeof FxRateSourceSchema>;
export declare const ProrationMethodSchema: z.ZodEnum<["daily_exact", "daily_30", "monthly_proportional", "none"]>;
export type ProrationMethod = z.infer<typeof ProrationMethodSchema>;
export declare const FxConfigSchema: z.ZodObject<{
    rateSource: z.ZodDefault<z.ZodEnum<["ecb", "snapshot_rate", "contract_rate", "manual"]>>;
    rateDate: z.ZodDefault<z.ZodEnum<["invoice_date", "period_end", "snapshot_date"]>>;
    tolerancePct: z.ZodDefault<z.ZodNumber>;
    baseCurrency: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
    rateDate: "invoice_date" | "period_end" | "snapshot_date";
    tolerancePct: number;
    baseCurrency: string;
}, {
    rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
    rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
    tolerancePct?: number | undefined;
    baseCurrency?: string | undefined;
}>;
export type FxConfig = z.infer<typeof FxConfigSchema>;
export declare const ProrationConfigSchema: z.ZodObject<{
    method: z.ZodDefault<z.ZodEnum<["daily_exact", "daily_30", "monthly_proportional", "none"]>>;
    midPeriodAmendmentHandling: z.ZodDefault<z.ZodEnum<["prorate", "full_period", "skip"]>>;
    rampScheduleRecognition: z.ZodDefault<z.ZodEnum<["as_invoiced", "straight_line"]>>;
}, "strip", z.ZodTypeAny, {
    method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
    midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
    rampScheduleRecognition: "straight_line" | "as_invoiced";
}, {
    method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
    midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
    rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
}>;
export type ProrationConfig = z.infer<typeof ProrationConfigSchema>;
export declare const TaxFeesConfigSchema: z.ZodObject<{
    excludeFromComparison: z.ZodDefault<z.ZodBoolean>;
    taxLineItemCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    feeLineItemCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    excludeFromComparison: boolean;
    taxLineItemCodes: string[];
    feeLineItemCodes: string[];
}, {
    excludeFromComparison?: boolean | undefined;
    taxLineItemCodes?: string[] | undefined;
    feeLineItemCodes?: string[] | undefined;
}>;
export type TaxFeesConfig = z.infer<typeof TaxFeesConfigSchema>;
export declare const CreditsConfigSchema: z.ZodObject<{
    netWithInvoices: z.ZodDefault<z.ZodBoolean>;
    treatAsSeparateRevenue: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    netWithInvoices: boolean;
    treatAsSeparateRevenue: boolean;
}, {
    netWithInvoices?: boolean | undefined;
    treatAsSeparateRevenue?: boolean | undefined;
}>;
export type CreditsConfig = z.infer<typeof CreditsConfigSchema>;
export declare const ZeroValueConfigSchema: z.ZodObject<{
    treatAsValid: z.ZodDefault<z.ZodBoolean>;
    skipBillingRules: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    treatAsValid: boolean;
    skipBillingRules: boolean;
}, {
    treatAsValid?: boolean | undefined;
    skipBillingRules?: boolean | undefined;
}>;
export type ZeroValueConfig = z.infer<typeof ZeroValueConfigSchema>;
export declare const ThresholdsConfigSchema: z.ZodObject<{
    amountVariancePct: z.ZodDefault<z.ZodNumber>;
    amountVarianceAbs: z.ZodDefault<z.ZodNumber>;
    timingVarianceDays: z.ZodDefault<z.ZodNumber>;
    highImpactThreshold: z.ZodDefault<z.ZodNumber>;
    criticalImpactThreshold: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    amountVariancePct: number;
    amountVarianceAbs: number;
    timingVarianceDays: number;
    highImpactThreshold: number;
    criticalImpactThreshold: number;
}, {
    amountVariancePct?: number | undefined;
    amountVarianceAbs?: number | undefined;
    timingVarianceDays?: number | undefined;
    highImpactThreshold?: number | undefined;
    criticalImpactThreshold?: number | undefined;
}>;
export type ThresholdsConfig = z.infer<typeof ThresholdsConfigSchema>;
export declare const GatingConfigSchema: z.ZodObject<{
    skipIfContractNotReady: z.ZodDefault<z.ZodBoolean>;
    confidenceCapIfNotReady: z.ZodDefault<z.ZodNumber>;
    skipIfUsageStale: z.ZodDefault<z.ZodBoolean>;
    usageStalenessHours: z.ZodDefault<z.ZodNumber>;
    skipIfCRMStale: z.ZodDefault<z.ZodBoolean>;
    crmStalenessHours: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    skipIfContractNotReady: boolean;
    confidenceCapIfNotReady: number;
    skipIfUsageStale: boolean;
    usageStalenessHours: number;
    skipIfCRMStale: boolean;
    crmStalenessHours: number;
}, {
    skipIfContractNotReady?: boolean | undefined;
    confidenceCapIfNotReady?: number | undefined;
    skipIfUsageStale?: boolean | undefined;
    usageStalenessHours?: number | undefined;
    skipIfCRMStale?: boolean | undefined;
    crmStalenessHours?: number | undefined;
}>;
export type GatingConfig = z.infer<typeof GatingConfigSchema>;
export declare const AutoRenewalConfigSchema: z.ZodObject<{
    detectImplicitRenewal: z.ZodDefault<z.ZodBoolean>;
    renewalGraceDays: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    detectImplicitRenewal: boolean;
    renewalGraceDays: number;
}, {
    detectImplicitRenewal?: boolean | undefined;
    renewalGraceDays?: number | undefined;
}>;
export type AutoRenewalConfig = z.infer<typeof AutoRenewalConfigSchema>;
export declare const AIEnrichmentConfigSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    maxIssuesPerRun: z.ZodDefault<z.ZodNumber>;
    minConfidenceToEnrich: z.ZodDefault<z.ZodNumber>;
    includeRecommendations: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    maxIssuesPerRun: number;
    minConfidenceToEnrich: number;
    includeRecommendations: boolean;
}, {
    enabled?: boolean | undefined;
    maxIssuesPerRun?: number | undefined;
    minConfidenceToEnrich?: number | undefined;
    includeRecommendations?: boolean | undefined;
}>;
export type AIEnrichmentConfig = z.infer<typeof AIEnrichmentConfigSchema>;
export declare const AIAnomalyDetectionConfigSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    minConfidenceToReport: z.ZodDefault<z.ZodNumber>;
    maxAnomaliesPerRun: z.ZodDefault<z.ZodNumber>;
    categories: z.ZodDefault<z.ZodArray<z.ZodEnum<["semantic", "pattern", "anomaly", "contextual"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    minConfidenceToReport: number;
    maxAnomaliesPerRun: number;
    categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
}, {
    enabled?: boolean | undefined;
    minConfidenceToReport?: number | undefined;
    maxAnomaliesPerRun?: number | undefined;
    categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
}>;
export type AIAnomalyDetectionConfig = z.infer<typeof AIAnomalyDetectionConfigSchema>;
export declare const LLMCostControlsConfigSchema: z.ZodObject<{
    maxCostPerRunUsd: z.ZodDefault<z.ZodNumber>;
    preferredModel: z.ZodDefault<z.ZodEnum<["gpt-4o", "gpt-4o-mini"]>>;
    enableCaching: z.ZodDefault<z.ZodBoolean>;
    budgetAlertThresholdUsd: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    maxCostPerRunUsd: number;
    preferredModel: "gpt-4o" | "gpt-4o-mini";
    enableCaching: boolean;
    budgetAlertThresholdUsd?: number | undefined;
}, {
    maxCostPerRunUsd?: number | undefined;
    preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
    enableCaching?: boolean | undefined;
    budgetAlertThresholdUsd?: number | undefined;
}>;
export type LLMCostControlsConfig = z.infer<typeof LLMCostControlsConfigSchema>;
export declare const DetectionConfigSchema: z.ZodObject<{
    fx: z.ZodDefault<z.ZodObject<{
        rateSource: z.ZodDefault<z.ZodEnum<["ecb", "snapshot_rate", "contract_rate", "manual"]>>;
        rateDate: z.ZodDefault<z.ZodEnum<["invoice_date", "period_end", "snapshot_date"]>>;
        tolerancePct: z.ZodDefault<z.ZodNumber>;
        baseCurrency: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
        rateDate: "invoice_date" | "period_end" | "snapshot_date";
        tolerancePct: number;
        baseCurrency: string;
    }, {
        rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
        rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
        tolerancePct?: number | undefined;
        baseCurrency?: string | undefined;
    }>>;
    proration: z.ZodDefault<z.ZodObject<{
        method: z.ZodDefault<z.ZodEnum<["daily_exact", "daily_30", "monthly_proportional", "none"]>>;
        midPeriodAmendmentHandling: z.ZodDefault<z.ZodEnum<["prorate", "full_period", "skip"]>>;
        rampScheduleRecognition: z.ZodDefault<z.ZodEnum<["as_invoiced", "straight_line"]>>;
    }, "strip", z.ZodTypeAny, {
        method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
        midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
        rampScheduleRecognition: "straight_line" | "as_invoiced";
    }, {
        method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
        midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
        rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
    }>>;
    taxFees: z.ZodDefault<z.ZodObject<{
        excludeFromComparison: z.ZodDefault<z.ZodBoolean>;
        taxLineItemCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        feeLineItemCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        excludeFromComparison: boolean;
        taxLineItemCodes: string[];
        feeLineItemCodes: string[];
    }, {
        excludeFromComparison?: boolean | undefined;
        taxLineItemCodes?: string[] | undefined;
        feeLineItemCodes?: string[] | undefined;
    }>>;
    credits: z.ZodDefault<z.ZodObject<{
        netWithInvoices: z.ZodDefault<z.ZodBoolean>;
        treatAsSeparateRevenue: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        netWithInvoices: boolean;
        treatAsSeparateRevenue: boolean;
    }, {
        netWithInvoices?: boolean | undefined;
        treatAsSeparateRevenue?: boolean | undefined;
    }>>;
    zeroValue: z.ZodDefault<z.ZodObject<{
        treatAsValid: z.ZodDefault<z.ZodBoolean>;
        skipBillingRules: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        treatAsValid: boolean;
        skipBillingRules: boolean;
    }, {
        treatAsValid?: boolean | undefined;
        skipBillingRules?: boolean | undefined;
    }>>;
    thresholds: z.ZodDefault<z.ZodObject<{
        amountVariancePct: z.ZodDefault<z.ZodNumber>;
        amountVarianceAbs: z.ZodDefault<z.ZodNumber>;
        timingVarianceDays: z.ZodDefault<z.ZodNumber>;
        highImpactThreshold: z.ZodDefault<z.ZodNumber>;
        criticalImpactThreshold: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        amountVariancePct: number;
        amountVarianceAbs: number;
        timingVarianceDays: number;
        highImpactThreshold: number;
        criticalImpactThreshold: number;
    }, {
        amountVariancePct?: number | undefined;
        amountVarianceAbs?: number | undefined;
        timingVarianceDays?: number | undefined;
        highImpactThreshold?: number | undefined;
        criticalImpactThreshold?: number | undefined;
    }>>;
    gating: z.ZodDefault<z.ZodObject<{
        skipIfContractNotReady: z.ZodDefault<z.ZodBoolean>;
        confidenceCapIfNotReady: z.ZodDefault<z.ZodNumber>;
        skipIfUsageStale: z.ZodDefault<z.ZodBoolean>;
        usageStalenessHours: z.ZodDefault<z.ZodNumber>;
        skipIfCRMStale: z.ZodDefault<z.ZodBoolean>;
        crmStalenessHours: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        skipIfContractNotReady: boolean;
        confidenceCapIfNotReady: number;
        skipIfUsageStale: boolean;
        usageStalenessHours: number;
        skipIfCRMStale: boolean;
        crmStalenessHours: number;
    }, {
        skipIfContractNotReady?: boolean | undefined;
        confidenceCapIfNotReady?: number | undefined;
        skipIfUsageStale?: boolean | undefined;
        usageStalenessHours?: number | undefined;
        skipIfCRMStale?: boolean | undefined;
        crmStalenessHours?: number | undefined;
    }>>;
    autoRenewal: z.ZodDefault<z.ZodObject<{
        detectImplicitRenewal: z.ZodDefault<z.ZodBoolean>;
        renewalGraceDays: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        detectImplicitRenewal: boolean;
        renewalGraceDays: number;
    }, {
        detectImplicitRenewal?: boolean | undefined;
        renewalGraceDays?: number | undefined;
    }>>;
    enabledRules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    disabledRules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    aiEnrichment: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        maxIssuesPerRun: z.ZodDefault<z.ZodNumber>;
        minConfidenceToEnrich: z.ZodDefault<z.ZodNumber>;
        includeRecommendations: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        maxIssuesPerRun: number;
        minConfidenceToEnrich: number;
        includeRecommendations: boolean;
    }, {
        enabled?: boolean | undefined;
        maxIssuesPerRun?: number | undefined;
        minConfidenceToEnrich?: number | undefined;
        includeRecommendations?: boolean | undefined;
    }>>;
    aiAnomalyDetection: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        minConfidenceToReport: z.ZodDefault<z.ZodNumber>;
        maxAnomaliesPerRun: z.ZodDefault<z.ZodNumber>;
        categories: z.ZodDefault<z.ZodArray<z.ZodEnum<["semantic", "pattern", "anomaly", "contextual"]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        minConfidenceToReport: number;
        maxAnomaliesPerRun: number;
        categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
    }, {
        enabled?: boolean | undefined;
        minConfidenceToReport?: number | undefined;
        maxAnomaliesPerRun?: number | undefined;
        categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
    }>>;
    llmCostControls: z.ZodOptional<z.ZodObject<{
        maxCostPerRunUsd: z.ZodDefault<z.ZodNumber>;
        preferredModel: z.ZodDefault<z.ZodEnum<["gpt-4o", "gpt-4o-mini"]>>;
        enableCaching: z.ZodDefault<z.ZodBoolean>;
        budgetAlertThresholdUsd: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxCostPerRunUsd: number;
        preferredModel: "gpt-4o" | "gpt-4o-mini";
        enableCaching: boolean;
        budgetAlertThresholdUsd?: number | undefined;
    }, {
        maxCostPerRunUsd?: number | undefined;
        preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
        enableCaching?: boolean | undefined;
        budgetAlertThresholdUsd?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    credits: {
        netWithInvoices: boolean;
        treatAsSeparateRevenue: boolean;
    };
    fx: {
        rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
        rateDate: "invoice_date" | "period_end" | "snapshot_date";
        tolerancePct: number;
        baseCurrency: string;
    };
    proration: {
        method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
        midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
        rampScheduleRecognition: "straight_line" | "as_invoiced";
    };
    taxFees: {
        excludeFromComparison: boolean;
        taxLineItemCodes: string[];
        feeLineItemCodes: string[];
    };
    zeroValue: {
        treatAsValid: boolean;
        skipBillingRules: boolean;
    };
    thresholds: {
        amountVariancePct: number;
        amountVarianceAbs: number;
        timingVarianceDays: number;
        highImpactThreshold: number;
        criticalImpactThreshold: number;
    };
    gating: {
        skipIfContractNotReady: boolean;
        confidenceCapIfNotReady: number;
        skipIfUsageStale: boolean;
        usageStalenessHours: number;
        skipIfCRMStale: boolean;
        crmStalenessHours: number;
    };
    autoRenewal: {
        detectImplicitRenewal: boolean;
        renewalGraceDays: number;
    };
    enabledRules?: string[] | undefined;
    disabledRules?: string[] | undefined;
    aiEnrichment?: {
        enabled: boolean;
        maxIssuesPerRun: number;
        minConfidenceToEnrich: number;
        includeRecommendations: boolean;
    } | undefined;
    aiAnomalyDetection?: {
        enabled: boolean;
        minConfidenceToReport: number;
        maxAnomaliesPerRun: number;
        categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
    } | undefined;
    llmCostControls?: {
        maxCostPerRunUsd: number;
        preferredModel: "gpt-4o" | "gpt-4o-mini";
        enableCaching: boolean;
        budgetAlertThresholdUsd?: number | undefined;
    } | undefined;
}, {
    credits?: {
        netWithInvoices?: boolean | undefined;
        treatAsSeparateRevenue?: boolean | undefined;
    } | undefined;
    fx?: {
        rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
        rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
        tolerancePct?: number | undefined;
        baseCurrency?: string | undefined;
    } | undefined;
    proration?: {
        method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
        midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
        rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
    } | undefined;
    taxFees?: {
        excludeFromComparison?: boolean | undefined;
        taxLineItemCodes?: string[] | undefined;
        feeLineItemCodes?: string[] | undefined;
    } | undefined;
    zeroValue?: {
        treatAsValid?: boolean | undefined;
        skipBillingRules?: boolean | undefined;
    } | undefined;
    thresholds?: {
        amountVariancePct?: number | undefined;
        amountVarianceAbs?: number | undefined;
        timingVarianceDays?: number | undefined;
        highImpactThreshold?: number | undefined;
        criticalImpactThreshold?: number | undefined;
    } | undefined;
    gating?: {
        skipIfContractNotReady?: boolean | undefined;
        confidenceCapIfNotReady?: number | undefined;
        skipIfUsageStale?: boolean | undefined;
        usageStalenessHours?: number | undefined;
        skipIfCRMStale?: boolean | undefined;
        crmStalenessHours?: number | undefined;
    } | undefined;
    autoRenewal?: {
        detectImplicitRenewal?: boolean | undefined;
        renewalGraceDays?: number | undefined;
    } | undefined;
    enabledRules?: string[] | undefined;
    disabledRules?: string[] | undefined;
    aiEnrichment?: {
        enabled?: boolean | undefined;
        maxIssuesPerRun?: number | undefined;
        minConfidenceToEnrich?: number | undefined;
        includeRecommendations?: boolean | undefined;
    } | undefined;
    aiAnomalyDetection?: {
        enabled?: boolean | undefined;
        minConfidenceToReport?: number | undefined;
        maxAnomaliesPerRun?: number | undefined;
        categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
    } | undefined;
    llmCostControls?: {
        maxCostPerRunUsd?: number | undefined;
        preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
        enableCaching?: boolean | undefined;
        budgetAlertThresholdUsd?: number | undefined;
    } | undefined;
}>;
export type DetectionConfig = z.infer<typeof DetectionConfigSchema>;
export declare const DetectionRunSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    rulesetVersion: z.ZodString;
    status: z.ZodEnum<["pending", "running", "completed", "failed", "cancelled"]>;
    config: z.ZodOptional<z.ZodObject<{
        fx: z.ZodDefault<z.ZodObject<{
            rateSource: z.ZodDefault<z.ZodEnum<["ecb", "snapshot_rate", "contract_rate", "manual"]>>;
            rateDate: z.ZodDefault<z.ZodEnum<["invoice_date", "period_end", "snapshot_date"]>>;
            tolerancePct: z.ZodDefault<z.ZodNumber>;
            baseCurrency: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
            rateDate: "invoice_date" | "period_end" | "snapshot_date";
            tolerancePct: number;
            baseCurrency: string;
        }, {
            rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
            rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
            tolerancePct?: number | undefined;
            baseCurrency?: string | undefined;
        }>>;
        proration: z.ZodDefault<z.ZodObject<{
            method: z.ZodDefault<z.ZodEnum<["daily_exact", "daily_30", "monthly_proportional", "none"]>>;
            midPeriodAmendmentHandling: z.ZodDefault<z.ZodEnum<["prorate", "full_period", "skip"]>>;
            rampScheduleRecognition: z.ZodDefault<z.ZodEnum<["as_invoiced", "straight_line"]>>;
        }, "strip", z.ZodTypeAny, {
            method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
            midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
            rampScheduleRecognition: "straight_line" | "as_invoiced";
        }, {
            method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
            midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
            rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
        }>>;
        taxFees: z.ZodDefault<z.ZodObject<{
            excludeFromComparison: z.ZodDefault<z.ZodBoolean>;
            taxLineItemCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            feeLineItemCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            excludeFromComparison: boolean;
            taxLineItemCodes: string[];
            feeLineItemCodes: string[];
        }, {
            excludeFromComparison?: boolean | undefined;
            taxLineItemCodes?: string[] | undefined;
            feeLineItemCodes?: string[] | undefined;
        }>>;
        credits: z.ZodDefault<z.ZodObject<{
            netWithInvoices: z.ZodDefault<z.ZodBoolean>;
            treatAsSeparateRevenue: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            netWithInvoices: boolean;
            treatAsSeparateRevenue: boolean;
        }, {
            netWithInvoices?: boolean | undefined;
            treatAsSeparateRevenue?: boolean | undefined;
        }>>;
        zeroValue: z.ZodDefault<z.ZodObject<{
            treatAsValid: z.ZodDefault<z.ZodBoolean>;
            skipBillingRules: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            treatAsValid: boolean;
            skipBillingRules: boolean;
        }, {
            treatAsValid?: boolean | undefined;
            skipBillingRules?: boolean | undefined;
        }>>;
        thresholds: z.ZodDefault<z.ZodObject<{
            amountVariancePct: z.ZodDefault<z.ZodNumber>;
            amountVarianceAbs: z.ZodDefault<z.ZodNumber>;
            timingVarianceDays: z.ZodDefault<z.ZodNumber>;
            highImpactThreshold: z.ZodDefault<z.ZodNumber>;
            criticalImpactThreshold: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            amountVariancePct: number;
            amountVarianceAbs: number;
            timingVarianceDays: number;
            highImpactThreshold: number;
            criticalImpactThreshold: number;
        }, {
            amountVariancePct?: number | undefined;
            amountVarianceAbs?: number | undefined;
            timingVarianceDays?: number | undefined;
            highImpactThreshold?: number | undefined;
            criticalImpactThreshold?: number | undefined;
        }>>;
        gating: z.ZodDefault<z.ZodObject<{
            skipIfContractNotReady: z.ZodDefault<z.ZodBoolean>;
            confidenceCapIfNotReady: z.ZodDefault<z.ZodNumber>;
            skipIfUsageStale: z.ZodDefault<z.ZodBoolean>;
            usageStalenessHours: z.ZodDefault<z.ZodNumber>;
            skipIfCRMStale: z.ZodDefault<z.ZodBoolean>;
            crmStalenessHours: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            skipIfContractNotReady: boolean;
            confidenceCapIfNotReady: number;
            skipIfUsageStale: boolean;
            usageStalenessHours: number;
            skipIfCRMStale: boolean;
            crmStalenessHours: number;
        }, {
            skipIfContractNotReady?: boolean | undefined;
            confidenceCapIfNotReady?: number | undefined;
            skipIfUsageStale?: boolean | undefined;
            usageStalenessHours?: number | undefined;
            skipIfCRMStale?: boolean | undefined;
            crmStalenessHours?: number | undefined;
        }>>;
        autoRenewal: z.ZodDefault<z.ZodObject<{
            detectImplicitRenewal: z.ZodDefault<z.ZodBoolean>;
            renewalGraceDays: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            detectImplicitRenewal: boolean;
            renewalGraceDays: number;
        }, {
            detectImplicitRenewal?: boolean | undefined;
            renewalGraceDays?: number | undefined;
        }>>;
        enabledRules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        disabledRules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        aiEnrichment: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            maxIssuesPerRun: z.ZodDefault<z.ZodNumber>;
            minConfidenceToEnrich: z.ZodDefault<z.ZodNumber>;
            includeRecommendations: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            maxIssuesPerRun: number;
            minConfidenceToEnrich: number;
            includeRecommendations: boolean;
        }, {
            enabled?: boolean | undefined;
            maxIssuesPerRun?: number | undefined;
            minConfidenceToEnrich?: number | undefined;
            includeRecommendations?: boolean | undefined;
        }>>;
        aiAnomalyDetection: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            minConfidenceToReport: z.ZodDefault<z.ZodNumber>;
            maxAnomaliesPerRun: z.ZodDefault<z.ZodNumber>;
            categories: z.ZodDefault<z.ZodArray<z.ZodEnum<["semantic", "pattern", "anomaly", "contextual"]>, "many">>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            minConfidenceToReport: number;
            maxAnomaliesPerRun: number;
            categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
        }, {
            enabled?: boolean | undefined;
            minConfidenceToReport?: number | undefined;
            maxAnomaliesPerRun?: number | undefined;
            categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
        }>>;
        llmCostControls: z.ZodOptional<z.ZodObject<{
            maxCostPerRunUsd: z.ZodDefault<z.ZodNumber>;
            preferredModel: z.ZodDefault<z.ZodEnum<["gpt-4o", "gpt-4o-mini"]>>;
            enableCaching: z.ZodDefault<z.ZodBoolean>;
            budgetAlertThresholdUsd: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            maxCostPerRunUsd: number;
            preferredModel: "gpt-4o" | "gpt-4o-mini";
            enableCaching: boolean;
            budgetAlertThresholdUsd?: number | undefined;
        }, {
            maxCostPerRunUsd?: number | undefined;
            preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
            enableCaching?: boolean | undefined;
            budgetAlertThresholdUsd?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        credits: {
            netWithInvoices: boolean;
            treatAsSeparateRevenue: boolean;
        };
        fx: {
            rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
            rateDate: "invoice_date" | "period_end" | "snapshot_date";
            tolerancePct: number;
            baseCurrency: string;
        };
        proration: {
            method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
            midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
            rampScheduleRecognition: "straight_line" | "as_invoiced";
        };
        taxFees: {
            excludeFromComparison: boolean;
            taxLineItemCodes: string[];
            feeLineItemCodes: string[];
        };
        zeroValue: {
            treatAsValid: boolean;
            skipBillingRules: boolean;
        };
        thresholds: {
            amountVariancePct: number;
            amountVarianceAbs: number;
            timingVarianceDays: number;
            highImpactThreshold: number;
            criticalImpactThreshold: number;
        };
        gating: {
            skipIfContractNotReady: boolean;
            confidenceCapIfNotReady: number;
            skipIfUsageStale: boolean;
            usageStalenessHours: number;
            skipIfCRMStale: boolean;
            crmStalenessHours: number;
        };
        autoRenewal: {
            detectImplicitRenewal: boolean;
            renewalGraceDays: number;
        };
        enabledRules?: string[] | undefined;
        disabledRules?: string[] | undefined;
        aiEnrichment?: {
            enabled: boolean;
            maxIssuesPerRun: number;
            minConfidenceToEnrich: number;
            includeRecommendations: boolean;
        } | undefined;
        aiAnomalyDetection?: {
            enabled: boolean;
            minConfidenceToReport: number;
            maxAnomaliesPerRun: number;
            categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
        } | undefined;
        llmCostControls?: {
            maxCostPerRunUsd: number;
            preferredModel: "gpt-4o" | "gpt-4o-mini";
            enableCaching: boolean;
            budgetAlertThresholdUsd?: number | undefined;
        } | undefined;
    }, {
        credits?: {
            netWithInvoices?: boolean | undefined;
            treatAsSeparateRevenue?: boolean | undefined;
        } | undefined;
        fx?: {
            rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
            rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
            tolerancePct?: number | undefined;
            baseCurrency?: string | undefined;
        } | undefined;
        proration?: {
            method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
            midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
            rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
        } | undefined;
        taxFees?: {
            excludeFromComparison?: boolean | undefined;
            taxLineItemCodes?: string[] | undefined;
            feeLineItemCodes?: string[] | undefined;
        } | undefined;
        zeroValue?: {
            treatAsValid?: boolean | undefined;
            skipBillingRules?: boolean | undefined;
        } | undefined;
        thresholds?: {
            amountVariancePct?: number | undefined;
            amountVarianceAbs?: number | undefined;
            timingVarianceDays?: number | undefined;
            highImpactThreshold?: number | undefined;
            criticalImpactThreshold?: number | undefined;
        } | undefined;
        gating?: {
            skipIfContractNotReady?: boolean | undefined;
            confidenceCapIfNotReady?: number | undefined;
            skipIfUsageStale?: boolean | undefined;
            usageStalenessHours?: number | undefined;
            skipIfCRMStale?: boolean | undefined;
            crmStalenessHours?: number | undefined;
        } | undefined;
        autoRenewal?: {
            detectImplicitRenewal?: boolean | undefined;
            renewalGraceDays?: number | undefined;
        } | undefined;
        enabledRules?: string[] | undefined;
        disabledRules?: string[] | undefined;
        aiEnrichment?: {
            enabled?: boolean | undefined;
            maxIssuesPerRun?: number | undefined;
            minConfidenceToEnrich?: number | undefined;
            includeRecommendations?: boolean | undefined;
        } | undefined;
        aiAnomalyDetection?: {
            enabled?: boolean | undefined;
            minConfidenceToReport?: number | undefined;
            maxAnomaliesPerRun?: number | undefined;
            categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
        } | undefined;
        llmCostControls?: {
            maxCostPerRunUsd?: number | undefined;
            preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
            enableCaching?: boolean | undefined;
            budgetAlertThresholdUsd?: number | undefined;
        } | undefined;
    }>>;
    stats: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    issuesTotal: z.ZodDefault<z.ZodNumber>;
    issuesBySeverity: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    issuesByCategory: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    errorCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    errorMessage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    startedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    finishedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "running" | "completed" | "failed" | "cancelled";
    id: string;
    snapshotId: string;
    tenantId: string;
    createdAt: Date;
    rulesetVersion: string;
    issuesTotal: number;
    stats?: Record<string, unknown> | undefined;
    config?: {
        credits: {
            netWithInvoices: boolean;
            treatAsSeparateRevenue: boolean;
        };
        fx: {
            rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
            rateDate: "invoice_date" | "period_end" | "snapshot_date";
            tolerancePct: number;
            baseCurrency: string;
        };
        proration: {
            method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
            midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
            rampScheduleRecognition: "straight_line" | "as_invoiced";
        };
        taxFees: {
            excludeFromComparison: boolean;
            taxLineItemCodes: string[];
            feeLineItemCodes: string[];
        };
        zeroValue: {
            treatAsValid: boolean;
            skipBillingRules: boolean;
        };
        thresholds: {
            amountVariancePct: number;
            amountVarianceAbs: number;
            timingVarianceDays: number;
            highImpactThreshold: number;
            criticalImpactThreshold: number;
        };
        gating: {
            skipIfContractNotReady: boolean;
            confidenceCapIfNotReady: number;
            skipIfUsageStale: boolean;
            usageStalenessHours: number;
            skipIfCRMStale: boolean;
            crmStalenessHours: number;
        };
        autoRenewal: {
            detectImplicitRenewal: boolean;
            renewalGraceDays: number;
        };
        enabledRules?: string[] | undefined;
        disabledRules?: string[] | undefined;
        aiEnrichment?: {
            enabled: boolean;
            maxIssuesPerRun: number;
            minConfidenceToEnrich: number;
            includeRecommendations: boolean;
        } | undefined;
        aiAnomalyDetection?: {
            enabled: boolean;
            minConfidenceToReport: number;
            maxAnomaliesPerRun: number;
            categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
        } | undefined;
        llmCostControls?: {
            maxCostPerRunUsd: number;
            preferredModel: "gpt-4o" | "gpt-4o-mini";
            enableCaching: boolean;
            budgetAlertThresholdUsd?: number | undefined;
        } | undefined;
    } | undefined;
    issuesBySeverity?: Record<string, number> | undefined;
    issuesByCategory?: Record<string, number> | undefined;
    errorCode?: string | null | undefined;
    errorMessage?: string | null | undefined;
    startedAt?: Date | null | undefined;
    finishedAt?: Date | null | undefined;
}, {
    status: "pending" | "running" | "completed" | "failed" | "cancelled";
    id: string;
    snapshotId: string;
    tenantId: string;
    createdAt: Date;
    rulesetVersion: string;
    stats?: Record<string, unknown> | undefined;
    config?: {
        credits?: {
            netWithInvoices?: boolean | undefined;
            treatAsSeparateRevenue?: boolean | undefined;
        } | undefined;
        fx?: {
            rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
            rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
            tolerancePct?: number | undefined;
            baseCurrency?: string | undefined;
        } | undefined;
        proration?: {
            method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
            midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
            rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
        } | undefined;
        taxFees?: {
            excludeFromComparison?: boolean | undefined;
            taxLineItemCodes?: string[] | undefined;
            feeLineItemCodes?: string[] | undefined;
        } | undefined;
        zeroValue?: {
            treatAsValid?: boolean | undefined;
            skipBillingRules?: boolean | undefined;
        } | undefined;
        thresholds?: {
            amountVariancePct?: number | undefined;
            amountVarianceAbs?: number | undefined;
            timingVarianceDays?: number | undefined;
            highImpactThreshold?: number | undefined;
            criticalImpactThreshold?: number | undefined;
        } | undefined;
        gating?: {
            skipIfContractNotReady?: boolean | undefined;
            confidenceCapIfNotReady?: number | undefined;
            skipIfUsageStale?: boolean | undefined;
            usageStalenessHours?: number | undefined;
            skipIfCRMStale?: boolean | undefined;
            crmStalenessHours?: number | undefined;
        } | undefined;
        autoRenewal?: {
            detectImplicitRenewal?: boolean | undefined;
            renewalGraceDays?: number | undefined;
        } | undefined;
        enabledRules?: string[] | undefined;
        disabledRules?: string[] | undefined;
        aiEnrichment?: {
            enabled?: boolean | undefined;
            maxIssuesPerRun?: number | undefined;
            minConfidenceToEnrich?: number | undefined;
            includeRecommendations?: boolean | undefined;
        } | undefined;
        aiAnomalyDetection?: {
            enabled?: boolean | undefined;
            minConfidenceToReport?: number | undefined;
            maxAnomaliesPerRun?: number | undefined;
            categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
        } | undefined;
        llmCostControls?: {
            maxCostPerRunUsd?: number | undefined;
            preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
            enableCaching?: boolean | undefined;
            budgetAlertThresholdUsd?: number | undefined;
        } | undefined;
    } | undefined;
    issuesTotal?: number | undefined;
    issuesBySeverity?: Record<string, number> | undefined;
    issuesByCategory?: Record<string, number> | undefined;
    errorCode?: string | null | undefined;
    errorMessage?: string | null | undefined;
    startedAt?: Date | null | undefined;
    finishedAt?: Date | null | undefined;
}>;
export type DetectionRun = z.infer<typeof DetectionRunSchema>;
export declare const CreateDetectionRunSchema: z.ZodObject<{
    snapshotId: z.ZodString;
    rulesetVersion: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    config: z.ZodOptional<z.ZodObject<{
        fx: z.ZodDefault<z.ZodObject<{
            rateSource: z.ZodDefault<z.ZodEnum<["ecb", "snapshot_rate", "contract_rate", "manual"]>>;
            rateDate: z.ZodDefault<z.ZodEnum<["invoice_date", "period_end", "snapshot_date"]>>;
            tolerancePct: z.ZodDefault<z.ZodNumber>;
            baseCurrency: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
            rateDate: "invoice_date" | "period_end" | "snapshot_date";
            tolerancePct: number;
            baseCurrency: string;
        }, {
            rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
            rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
            tolerancePct?: number | undefined;
            baseCurrency?: string | undefined;
        }>>;
        proration: z.ZodDefault<z.ZodObject<{
            method: z.ZodDefault<z.ZodEnum<["daily_exact", "daily_30", "monthly_proportional", "none"]>>;
            midPeriodAmendmentHandling: z.ZodDefault<z.ZodEnum<["prorate", "full_period", "skip"]>>;
            rampScheduleRecognition: z.ZodDefault<z.ZodEnum<["as_invoiced", "straight_line"]>>;
        }, "strip", z.ZodTypeAny, {
            method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
            midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
            rampScheduleRecognition: "straight_line" | "as_invoiced";
        }, {
            method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
            midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
            rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
        }>>;
        taxFees: z.ZodDefault<z.ZodObject<{
            excludeFromComparison: z.ZodDefault<z.ZodBoolean>;
            taxLineItemCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            feeLineItemCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            excludeFromComparison: boolean;
            taxLineItemCodes: string[];
            feeLineItemCodes: string[];
        }, {
            excludeFromComparison?: boolean | undefined;
            taxLineItemCodes?: string[] | undefined;
            feeLineItemCodes?: string[] | undefined;
        }>>;
        credits: z.ZodDefault<z.ZodObject<{
            netWithInvoices: z.ZodDefault<z.ZodBoolean>;
            treatAsSeparateRevenue: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            netWithInvoices: boolean;
            treatAsSeparateRevenue: boolean;
        }, {
            netWithInvoices?: boolean | undefined;
            treatAsSeparateRevenue?: boolean | undefined;
        }>>;
        zeroValue: z.ZodDefault<z.ZodObject<{
            treatAsValid: z.ZodDefault<z.ZodBoolean>;
            skipBillingRules: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            treatAsValid: boolean;
            skipBillingRules: boolean;
        }, {
            treatAsValid?: boolean | undefined;
            skipBillingRules?: boolean | undefined;
        }>>;
        thresholds: z.ZodDefault<z.ZodObject<{
            amountVariancePct: z.ZodDefault<z.ZodNumber>;
            amountVarianceAbs: z.ZodDefault<z.ZodNumber>;
            timingVarianceDays: z.ZodDefault<z.ZodNumber>;
            highImpactThreshold: z.ZodDefault<z.ZodNumber>;
            criticalImpactThreshold: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            amountVariancePct: number;
            amountVarianceAbs: number;
            timingVarianceDays: number;
            highImpactThreshold: number;
            criticalImpactThreshold: number;
        }, {
            amountVariancePct?: number | undefined;
            amountVarianceAbs?: number | undefined;
            timingVarianceDays?: number | undefined;
            highImpactThreshold?: number | undefined;
            criticalImpactThreshold?: number | undefined;
        }>>;
        gating: z.ZodDefault<z.ZodObject<{
            skipIfContractNotReady: z.ZodDefault<z.ZodBoolean>;
            confidenceCapIfNotReady: z.ZodDefault<z.ZodNumber>;
            skipIfUsageStale: z.ZodDefault<z.ZodBoolean>;
            usageStalenessHours: z.ZodDefault<z.ZodNumber>;
            skipIfCRMStale: z.ZodDefault<z.ZodBoolean>;
            crmStalenessHours: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            skipIfContractNotReady: boolean;
            confidenceCapIfNotReady: number;
            skipIfUsageStale: boolean;
            usageStalenessHours: number;
            skipIfCRMStale: boolean;
            crmStalenessHours: number;
        }, {
            skipIfContractNotReady?: boolean | undefined;
            confidenceCapIfNotReady?: number | undefined;
            skipIfUsageStale?: boolean | undefined;
            usageStalenessHours?: number | undefined;
            skipIfCRMStale?: boolean | undefined;
            crmStalenessHours?: number | undefined;
        }>>;
        autoRenewal: z.ZodDefault<z.ZodObject<{
            detectImplicitRenewal: z.ZodDefault<z.ZodBoolean>;
            renewalGraceDays: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            detectImplicitRenewal: boolean;
            renewalGraceDays: number;
        }, {
            detectImplicitRenewal?: boolean | undefined;
            renewalGraceDays?: number | undefined;
        }>>;
        enabledRules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        disabledRules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        aiEnrichment: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            maxIssuesPerRun: z.ZodDefault<z.ZodNumber>;
            minConfidenceToEnrich: z.ZodDefault<z.ZodNumber>;
            includeRecommendations: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            maxIssuesPerRun: number;
            minConfidenceToEnrich: number;
            includeRecommendations: boolean;
        }, {
            enabled?: boolean | undefined;
            maxIssuesPerRun?: number | undefined;
            minConfidenceToEnrich?: number | undefined;
            includeRecommendations?: boolean | undefined;
        }>>;
        aiAnomalyDetection: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            minConfidenceToReport: z.ZodDefault<z.ZodNumber>;
            maxAnomaliesPerRun: z.ZodDefault<z.ZodNumber>;
            categories: z.ZodDefault<z.ZodArray<z.ZodEnum<["semantic", "pattern", "anomaly", "contextual"]>, "many">>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            minConfidenceToReport: number;
            maxAnomaliesPerRun: number;
            categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
        }, {
            enabled?: boolean | undefined;
            minConfidenceToReport?: number | undefined;
            maxAnomaliesPerRun?: number | undefined;
            categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
        }>>;
        llmCostControls: z.ZodOptional<z.ZodObject<{
            maxCostPerRunUsd: z.ZodDefault<z.ZodNumber>;
            preferredModel: z.ZodDefault<z.ZodEnum<["gpt-4o", "gpt-4o-mini"]>>;
            enableCaching: z.ZodDefault<z.ZodBoolean>;
            budgetAlertThresholdUsd: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            maxCostPerRunUsd: number;
            preferredModel: "gpt-4o" | "gpt-4o-mini";
            enableCaching: boolean;
            budgetAlertThresholdUsd?: number | undefined;
        }, {
            maxCostPerRunUsd?: number | undefined;
            preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
            enableCaching?: boolean | undefined;
            budgetAlertThresholdUsd?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        credits: {
            netWithInvoices: boolean;
            treatAsSeparateRevenue: boolean;
        };
        fx: {
            rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
            rateDate: "invoice_date" | "period_end" | "snapshot_date";
            tolerancePct: number;
            baseCurrency: string;
        };
        proration: {
            method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
            midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
            rampScheduleRecognition: "straight_line" | "as_invoiced";
        };
        taxFees: {
            excludeFromComparison: boolean;
            taxLineItemCodes: string[];
            feeLineItemCodes: string[];
        };
        zeroValue: {
            treatAsValid: boolean;
            skipBillingRules: boolean;
        };
        thresholds: {
            amountVariancePct: number;
            amountVarianceAbs: number;
            timingVarianceDays: number;
            highImpactThreshold: number;
            criticalImpactThreshold: number;
        };
        gating: {
            skipIfContractNotReady: boolean;
            confidenceCapIfNotReady: number;
            skipIfUsageStale: boolean;
            usageStalenessHours: number;
            skipIfCRMStale: boolean;
            crmStalenessHours: number;
        };
        autoRenewal: {
            detectImplicitRenewal: boolean;
            renewalGraceDays: number;
        };
        enabledRules?: string[] | undefined;
        disabledRules?: string[] | undefined;
        aiEnrichment?: {
            enabled: boolean;
            maxIssuesPerRun: number;
            minConfidenceToEnrich: number;
            includeRecommendations: boolean;
        } | undefined;
        aiAnomalyDetection?: {
            enabled: boolean;
            minConfidenceToReport: number;
            maxAnomaliesPerRun: number;
            categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
        } | undefined;
        llmCostControls?: {
            maxCostPerRunUsd: number;
            preferredModel: "gpt-4o" | "gpt-4o-mini";
            enableCaching: boolean;
            budgetAlertThresholdUsd?: number | undefined;
        } | undefined;
    }, {
        credits?: {
            netWithInvoices?: boolean | undefined;
            treatAsSeparateRevenue?: boolean | undefined;
        } | undefined;
        fx?: {
            rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
            rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
            tolerancePct?: number | undefined;
            baseCurrency?: string | undefined;
        } | undefined;
        proration?: {
            method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
            midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
            rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
        } | undefined;
        taxFees?: {
            excludeFromComparison?: boolean | undefined;
            taxLineItemCodes?: string[] | undefined;
            feeLineItemCodes?: string[] | undefined;
        } | undefined;
        zeroValue?: {
            treatAsValid?: boolean | undefined;
            skipBillingRules?: boolean | undefined;
        } | undefined;
        thresholds?: {
            amountVariancePct?: number | undefined;
            amountVarianceAbs?: number | undefined;
            timingVarianceDays?: number | undefined;
            highImpactThreshold?: number | undefined;
            criticalImpactThreshold?: number | undefined;
        } | undefined;
        gating?: {
            skipIfContractNotReady?: boolean | undefined;
            confidenceCapIfNotReady?: number | undefined;
            skipIfUsageStale?: boolean | undefined;
            usageStalenessHours?: number | undefined;
            skipIfCRMStale?: boolean | undefined;
            crmStalenessHours?: number | undefined;
        } | undefined;
        autoRenewal?: {
            detectImplicitRenewal?: boolean | undefined;
            renewalGraceDays?: number | undefined;
        } | undefined;
        enabledRules?: string[] | undefined;
        disabledRules?: string[] | undefined;
        aiEnrichment?: {
            enabled?: boolean | undefined;
            maxIssuesPerRun?: number | undefined;
            minConfidenceToEnrich?: number | undefined;
            includeRecommendations?: boolean | undefined;
        } | undefined;
        aiAnomalyDetection?: {
            enabled?: boolean | undefined;
            minConfidenceToReport?: number | undefined;
            maxAnomaliesPerRun?: number | undefined;
            categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
        } | undefined;
        llmCostControls?: {
            maxCostPerRunUsd?: number | undefined;
            preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
            enableCaching?: boolean | undefined;
            budgetAlertThresholdUsd?: number | undefined;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    snapshotId: string;
    rulesetVersion: string;
    config?: {
        credits: {
            netWithInvoices: boolean;
            treatAsSeparateRevenue: boolean;
        };
        fx: {
            rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
            rateDate: "invoice_date" | "period_end" | "snapshot_date";
            tolerancePct: number;
            baseCurrency: string;
        };
        proration: {
            method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
            midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
            rampScheduleRecognition: "straight_line" | "as_invoiced";
        };
        taxFees: {
            excludeFromComparison: boolean;
            taxLineItemCodes: string[];
            feeLineItemCodes: string[];
        };
        zeroValue: {
            treatAsValid: boolean;
            skipBillingRules: boolean;
        };
        thresholds: {
            amountVariancePct: number;
            amountVarianceAbs: number;
            timingVarianceDays: number;
            highImpactThreshold: number;
            criticalImpactThreshold: number;
        };
        gating: {
            skipIfContractNotReady: boolean;
            confidenceCapIfNotReady: number;
            skipIfUsageStale: boolean;
            usageStalenessHours: number;
            skipIfCRMStale: boolean;
            crmStalenessHours: number;
        };
        autoRenewal: {
            detectImplicitRenewal: boolean;
            renewalGraceDays: number;
        };
        enabledRules?: string[] | undefined;
        disabledRules?: string[] | undefined;
        aiEnrichment?: {
            enabled: boolean;
            maxIssuesPerRun: number;
            minConfidenceToEnrich: number;
            includeRecommendations: boolean;
        } | undefined;
        aiAnomalyDetection?: {
            enabled: boolean;
            minConfidenceToReport: number;
            maxAnomaliesPerRun: number;
            categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
        } | undefined;
        llmCostControls?: {
            maxCostPerRunUsd: number;
            preferredModel: "gpt-4o" | "gpt-4o-mini";
            enableCaching: boolean;
            budgetAlertThresholdUsd?: number | undefined;
        } | undefined;
    } | undefined;
}, {
    snapshotId: string;
    config?: {
        credits?: {
            netWithInvoices?: boolean | undefined;
            treatAsSeparateRevenue?: boolean | undefined;
        } | undefined;
        fx?: {
            rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
            rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
            tolerancePct?: number | undefined;
            baseCurrency?: string | undefined;
        } | undefined;
        proration?: {
            method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
            midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
            rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
        } | undefined;
        taxFees?: {
            excludeFromComparison?: boolean | undefined;
            taxLineItemCodes?: string[] | undefined;
            feeLineItemCodes?: string[] | undefined;
        } | undefined;
        zeroValue?: {
            treatAsValid?: boolean | undefined;
            skipBillingRules?: boolean | undefined;
        } | undefined;
        thresholds?: {
            amountVariancePct?: number | undefined;
            amountVarianceAbs?: number | undefined;
            timingVarianceDays?: number | undefined;
            highImpactThreshold?: number | undefined;
            criticalImpactThreshold?: number | undefined;
        } | undefined;
        gating?: {
            skipIfContractNotReady?: boolean | undefined;
            confidenceCapIfNotReady?: number | undefined;
            skipIfUsageStale?: boolean | undefined;
            usageStalenessHours?: number | undefined;
            skipIfCRMStale?: boolean | undefined;
            crmStalenessHours?: number | undefined;
        } | undefined;
        autoRenewal?: {
            detectImplicitRenewal?: boolean | undefined;
            renewalGraceDays?: number | undefined;
        } | undefined;
        enabledRules?: string[] | undefined;
        disabledRules?: string[] | undefined;
        aiEnrichment?: {
            enabled?: boolean | undefined;
            maxIssuesPerRun?: number | undefined;
            minConfidenceToEnrich?: number | undefined;
            includeRecommendations?: boolean | undefined;
        } | undefined;
        aiAnomalyDetection?: {
            enabled?: boolean | undefined;
            minConfidenceToReport?: number | undefined;
            maxAnomaliesPerRun?: number | undefined;
            categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
        } | undefined;
        llmCostControls?: {
            maxCostPerRunUsd?: number | undefined;
            preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
            enableCaching?: boolean | undefined;
            budgetAlertThresholdUsd?: number | undefined;
        } | undefined;
    } | undefined;
    rulesetVersion?: string | undefined;
}>;
export type CreateDetectionRun = z.infer<typeof CreateDetectionRunSchema>;
export declare const IssueSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    runId: z.ZodString;
    ruleId: z.ZodString;
    ruleVersion: z.ZodString;
    issueKey: z.ZodString;
    category: z.ZodEnum<["data_quality", "billing", "discount", "revrec", "credits", "usage", "lifecycle", "multi_entity", "cross_snapshot", "tax_fees", "fx_currency"]>;
    status: z.ZodEnum<["open", "resolved", "dismissed", "acknowledged"]>;
    severity: z.ZodEnum<["info", "low", "medium", "high", "critical"]>;
    confidence: z.ZodNumber;
    impactAmount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    currency: z.ZodDefault<z.ZodString>;
    expected: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    actual: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    dimensions: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    contractId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    invoiceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    customerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dataQualityFlags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    suppressedByRule: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    ruleMetadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    expected: Record<string, unknown>;
    status: "resolved" | "open" | "dismissed" | "acknowledged";
    id: string;
    snapshotId: string;
    runId: string;
    tenantId: string;
    currency: string;
    confidence: number;
    createdAt: Date;
    ruleId: string;
    ruleVersion: string;
    issueKey: string;
    category: "discount" | "usage" | "data_quality" | "billing" | "revrec" | "credits" | "lifecycle" | "multi_entity" | "cross_snapshot" | "tax_fees" | "fx_currency";
    severity: "info" | "low" | "medium" | "high" | "critical";
    actual: Record<string, unknown>;
    dimensions: Record<string, unknown>;
    updatedAt: Date;
    contractId?: string | null | undefined;
    impactAmount?: number | null | undefined;
    invoiceId?: string | null | undefined;
    customerId?: string | null | undefined;
    dataQualityFlags?: string[] | undefined;
    suppressedByRule?: string | null | undefined;
    ruleMetadata?: Record<string, unknown> | undefined;
}, {
    expected: Record<string, unknown>;
    status: "resolved" | "open" | "dismissed" | "acknowledged";
    id: string;
    snapshotId: string;
    runId: string;
    tenantId: string;
    confidence: number;
    createdAt: Date;
    ruleId: string;
    ruleVersion: string;
    issueKey: string;
    category: "discount" | "usage" | "data_quality" | "billing" | "revrec" | "credits" | "lifecycle" | "multi_entity" | "cross_snapshot" | "tax_fees" | "fx_currency";
    severity: "info" | "low" | "medium" | "high" | "critical";
    actual: Record<string, unknown>;
    dimensions: Record<string, unknown>;
    updatedAt: Date;
    currency?: string | undefined;
    contractId?: string | null | undefined;
    impactAmount?: number | null | undefined;
    invoiceId?: string | null | undefined;
    customerId?: string | null | undefined;
    dataQualityFlags?: string[] | undefined;
    suppressedByRule?: string | null | undefined;
    ruleMetadata?: Record<string, unknown> | undefined;
}>;
export type Issue = z.infer<typeof IssueSchema>;
export declare const IssueListQuerySchema: z.ZodObject<{
    snapshotId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["open", "resolved", "dismissed", "acknowledged"]>>;
    severity: z.ZodOptional<z.ZodEnum<["info", "low", "medium", "high", "critical"]>>;
    category: z.ZodOptional<z.ZodEnum<["data_quality", "billing", "discount", "revrec", "credits", "usage", "lifecycle", "multi_entity", "cross_snapshot", "tax_fees", "fx_currency"]>>;
    ruleId: z.ZodOptional<z.ZodString>;
    contractId: z.ZodOptional<z.ZodString>;
    customerId: z.ZodOptional<z.ZodString>;
    invoiceId: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodEnum<["createdAt", "severity", "impactAmount", "status"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    sortBy: "status" | "createdAt" | "severity" | "impactAmount";
    sortOrder: "asc" | "desc";
    status?: "resolved" | "open" | "dismissed" | "acknowledged" | undefined;
    snapshotId?: string | undefined;
    contractId?: string | undefined;
    ruleId?: string | undefined;
    category?: "discount" | "usage" | "data_quality" | "billing" | "revrec" | "credits" | "lifecycle" | "multi_entity" | "cross_snapshot" | "tax_fees" | "fx_currency" | undefined;
    severity?: "info" | "low" | "medium" | "high" | "critical" | undefined;
    invoiceId?: string | undefined;
    customerId?: string | undefined;
    search?: string | undefined;
}, {
    status?: "resolved" | "open" | "dismissed" | "acknowledged" | undefined;
    snapshotId?: string | undefined;
    contractId?: string | undefined;
    ruleId?: string | undefined;
    category?: "discount" | "usage" | "data_quality" | "billing" | "revrec" | "credits" | "lifecycle" | "multi_entity" | "cross_snapshot" | "tax_fees" | "fx_currency" | undefined;
    severity?: "info" | "low" | "medium" | "high" | "critical" | undefined;
    invoiceId?: string | undefined;
    customerId?: string | undefined;
    search?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    sortBy?: "status" | "createdAt" | "severity" | "impactAmount" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export type IssueListQuery = z.infer<typeof IssueListQuerySchema>;
export declare const UpdateIssueStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["open", "resolved", "dismissed", "acknowledged"]>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "resolved" | "open" | "dismissed" | "acknowledged";
    reason?: string | undefined;
}, {
    status: "resolved" | "open" | "dismissed" | "acknowledged";
    reason?: string | undefined;
}>;
export type UpdateIssueStatus = z.infer<typeof UpdateIssueStatusSchema>;
export declare const BulkUpdateIssueStatusSchema: z.ZodObject<{
    issueIds: z.ZodArray<z.ZodString, "many">;
    status: z.ZodEnum<["open", "resolved", "dismissed", "acknowledged"]>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "resolved" | "open" | "dismissed" | "acknowledged";
    issueIds: string[];
    reason?: string | undefined;
}, {
    status: "resolved" | "open" | "dismissed" | "acknowledged";
    issueIds: string[];
    reason?: string | undefined;
}>;
export type BulkUpdateIssueStatus = z.infer<typeof BulkUpdateIssueStatusSchema>;
export declare const IssueStatusHistorySchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    issueId: z.ZodString;
    fromStatus: z.ZodEnum<["open", "resolved", "dismissed", "acknowledged"]>;
    toStatus: z.ZodEnum<["open", "resolved", "dismissed", "acknowledged"]>;
    actorUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    createdAt: Date;
    issueId: string;
    fromStatus: "resolved" | "open" | "dismissed" | "acknowledged";
    toStatus: "resolved" | "open" | "dismissed" | "acknowledged";
    reason?: string | null | undefined;
    metadata?: Record<string, unknown> | undefined;
    actorUserId?: string | null | undefined;
}, {
    id: string;
    tenantId: string;
    createdAt: Date;
    issueId: string;
    fromStatus: "resolved" | "open" | "dismissed" | "acknowledged";
    toStatus: "resolved" | "open" | "dismissed" | "acknowledged";
    reason?: string | null | undefined;
    metadata?: Record<string, unknown> | undefined;
    actorUserId?: string | null | undefined;
}>;
export type IssueStatusHistory = z.infer<typeof IssueStatusHistorySchema>;
export declare const IssueSourceSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    issueId: z.ZodString;
    sourceType: z.ZodEnum<["contract", "invoice", "invoice_line", "payment", "usage_event", "schedule", "obligation", "customer", "product", "contract_term"]>;
    sourceId: z.ZodString;
    sourceSystem: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    fieldName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    fieldValue: z.ZodOptional<z.ZodUnknown>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    createdAt: Date;
    issueId: string;
    sourceType: "customer" | "invoice" | "contract" | "payment" | "product" | "schedule" | "invoice_line" | "usage_event" | "obligation" | "contract_term";
    sourceId: string;
    sourceSystem?: string | null | undefined;
    fieldName?: string | null | undefined;
    fieldValue?: unknown;
}, {
    id: string;
    tenantId: string;
    createdAt: Date;
    issueId: string;
    sourceType: "customer" | "invoice" | "contract" | "payment" | "product" | "schedule" | "invoice_line" | "usage_event" | "obligation" | "contract_term";
    sourceId: string;
    sourceSystem?: string | null | undefined;
    fieldName?: string | null | undefined;
    fieldValue?: unknown;
}>;
export type IssueSource = z.infer<typeof IssueSourceSchema>;
export declare const IssueSummarySchema: z.ZodObject<{
    totalCount: z.ZodNumber;
    byStatus: z.ZodRecord<z.ZodString, z.ZodNumber>;
    bySeverity: z.ZodRecord<z.ZodString, z.ZodNumber>;
    byCategory: z.ZodRecord<z.ZodString, z.ZodNumber>;
    totalImpact: z.ZodNumber;
    avgConfidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    totalCount: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    totalImpact: number;
    avgConfidence: number;
}, {
    totalCount: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    totalImpact: number;
    avgConfidence: number;
}>;
export type IssueSummary = z.infer<typeof IssueSummarySchema>;
export declare const FxRateSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    sourceCurrency: z.ZodString;
    targetCurrency: z.ZodString;
    rate: z.ZodNumber;
    rateDate: z.ZodDate;
    rateSource: z.ZodEnum<["ecb", "snapshot_rate", "contract_rate", "manual"]>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    createdAt: Date;
    rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
    rateDate: Date;
    sourceCurrency: string;
    targetCurrency: string;
    rate: number;
}, {
    id: string;
    tenantId: string;
    createdAt: Date;
    rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
    rateDate: Date;
    sourceCurrency: string;
    targetCurrency: string;
    rate: number;
}>;
export type FxRate = z.infer<typeof FxRateSchema>;
export declare const DetectRunJobPayloadSchema: z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, import("./ids.js").TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"detect.run">;
    snapshotId: z.ZodString;
    rulesetVersion: z.ZodOptional<z.ZodString>;
    config: z.ZodOptional<z.ZodObject<{
        fx: z.ZodDefault<z.ZodObject<{
            rateSource: z.ZodDefault<z.ZodEnum<["ecb", "snapshot_rate", "contract_rate", "manual"]>>;
            rateDate: z.ZodDefault<z.ZodEnum<["invoice_date", "period_end", "snapshot_date"]>>;
            tolerancePct: z.ZodDefault<z.ZodNumber>;
            baseCurrency: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
            rateDate: "invoice_date" | "period_end" | "snapshot_date";
            tolerancePct: number;
            baseCurrency: string;
        }, {
            rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
            rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
            tolerancePct?: number | undefined;
            baseCurrency?: string | undefined;
        }>>;
        proration: z.ZodDefault<z.ZodObject<{
            method: z.ZodDefault<z.ZodEnum<["daily_exact", "daily_30", "monthly_proportional", "none"]>>;
            midPeriodAmendmentHandling: z.ZodDefault<z.ZodEnum<["prorate", "full_period", "skip"]>>;
            rampScheduleRecognition: z.ZodDefault<z.ZodEnum<["as_invoiced", "straight_line"]>>;
        }, "strip", z.ZodTypeAny, {
            method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
            midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
            rampScheduleRecognition: "straight_line" | "as_invoiced";
        }, {
            method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
            midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
            rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
        }>>;
        taxFees: z.ZodDefault<z.ZodObject<{
            excludeFromComparison: z.ZodDefault<z.ZodBoolean>;
            taxLineItemCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            feeLineItemCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            excludeFromComparison: boolean;
            taxLineItemCodes: string[];
            feeLineItemCodes: string[];
        }, {
            excludeFromComparison?: boolean | undefined;
            taxLineItemCodes?: string[] | undefined;
            feeLineItemCodes?: string[] | undefined;
        }>>;
        credits: z.ZodDefault<z.ZodObject<{
            netWithInvoices: z.ZodDefault<z.ZodBoolean>;
            treatAsSeparateRevenue: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            netWithInvoices: boolean;
            treatAsSeparateRevenue: boolean;
        }, {
            netWithInvoices?: boolean | undefined;
            treatAsSeparateRevenue?: boolean | undefined;
        }>>;
        zeroValue: z.ZodDefault<z.ZodObject<{
            treatAsValid: z.ZodDefault<z.ZodBoolean>;
            skipBillingRules: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            treatAsValid: boolean;
            skipBillingRules: boolean;
        }, {
            treatAsValid?: boolean | undefined;
            skipBillingRules?: boolean | undefined;
        }>>;
        thresholds: z.ZodDefault<z.ZodObject<{
            amountVariancePct: z.ZodDefault<z.ZodNumber>;
            amountVarianceAbs: z.ZodDefault<z.ZodNumber>;
            timingVarianceDays: z.ZodDefault<z.ZodNumber>;
            highImpactThreshold: z.ZodDefault<z.ZodNumber>;
            criticalImpactThreshold: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            amountVariancePct: number;
            amountVarianceAbs: number;
            timingVarianceDays: number;
            highImpactThreshold: number;
            criticalImpactThreshold: number;
        }, {
            amountVariancePct?: number | undefined;
            amountVarianceAbs?: number | undefined;
            timingVarianceDays?: number | undefined;
            highImpactThreshold?: number | undefined;
            criticalImpactThreshold?: number | undefined;
        }>>;
        gating: z.ZodDefault<z.ZodObject<{
            skipIfContractNotReady: z.ZodDefault<z.ZodBoolean>;
            confidenceCapIfNotReady: z.ZodDefault<z.ZodNumber>;
            skipIfUsageStale: z.ZodDefault<z.ZodBoolean>;
            usageStalenessHours: z.ZodDefault<z.ZodNumber>;
            skipIfCRMStale: z.ZodDefault<z.ZodBoolean>;
            crmStalenessHours: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            skipIfContractNotReady: boolean;
            confidenceCapIfNotReady: number;
            skipIfUsageStale: boolean;
            usageStalenessHours: number;
            skipIfCRMStale: boolean;
            crmStalenessHours: number;
        }, {
            skipIfContractNotReady?: boolean | undefined;
            confidenceCapIfNotReady?: number | undefined;
            skipIfUsageStale?: boolean | undefined;
            usageStalenessHours?: number | undefined;
            skipIfCRMStale?: boolean | undefined;
            crmStalenessHours?: number | undefined;
        }>>;
        autoRenewal: z.ZodDefault<z.ZodObject<{
            detectImplicitRenewal: z.ZodDefault<z.ZodBoolean>;
            renewalGraceDays: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            detectImplicitRenewal: boolean;
            renewalGraceDays: number;
        }, {
            detectImplicitRenewal?: boolean | undefined;
            renewalGraceDays?: number | undefined;
        }>>;
        enabledRules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        disabledRules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        aiEnrichment: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            maxIssuesPerRun: z.ZodDefault<z.ZodNumber>;
            minConfidenceToEnrich: z.ZodDefault<z.ZodNumber>;
            includeRecommendations: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            maxIssuesPerRun: number;
            minConfidenceToEnrich: number;
            includeRecommendations: boolean;
        }, {
            enabled?: boolean | undefined;
            maxIssuesPerRun?: number | undefined;
            minConfidenceToEnrich?: number | undefined;
            includeRecommendations?: boolean | undefined;
        }>>;
        aiAnomalyDetection: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            minConfidenceToReport: z.ZodDefault<z.ZodNumber>;
            maxAnomaliesPerRun: z.ZodDefault<z.ZodNumber>;
            categories: z.ZodDefault<z.ZodArray<z.ZodEnum<["semantic", "pattern", "anomaly", "contextual"]>, "many">>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            minConfidenceToReport: number;
            maxAnomaliesPerRun: number;
            categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
        }, {
            enabled?: boolean | undefined;
            minConfidenceToReport?: number | undefined;
            maxAnomaliesPerRun?: number | undefined;
            categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
        }>>;
        llmCostControls: z.ZodOptional<z.ZodObject<{
            maxCostPerRunUsd: z.ZodDefault<z.ZodNumber>;
            preferredModel: z.ZodDefault<z.ZodEnum<["gpt-4o", "gpt-4o-mini"]>>;
            enableCaching: z.ZodDefault<z.ZodBoolean>;
            budgetAlertThresholdUsd: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            maxCostPerRunUsd: number;
            preferredModel: "gpt-4o" | "gpt-4o-mini";
            enableCaching: boolean;
            budgetAlertThresholdUsd?: number | undefined;
        }, {
            maxCostPerRunUsd?: number | undefined;
            preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
            enableCaching?: boolean | undefined;
            budgetAlertThresholdUsd?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        credits: {
            netWithInvoices: boolean;
            treatAsSeparateRevenue: boolean;
        };
        fx: {
            rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
            rateDate: "invoice_date" | "period_end" | "snapshot_date";
            tolerancePct: number;
            baseCurrency: string;
        };
        proration: {
            method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
            midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
            rampScheduleRecognition: "straight_line" | "as_invoiced";
        };
        taxFees: {
            excludeFromComparison: boolean;
            taxLineItemCodes: string[];
            feeLineItemCodes: string[];
        };
        zeroValue: {
            treatAsValid: boolean;
            skipBillingRules: boolean;
        };
        thresholds: {
            amountVariancePct: number;
            amountVarianceAbs: number;
            timingVarianceDays: number;
            highImpactThreshold: number;
            criticalImpactThreshold: number;
        };
        gating: {
            skipIfContractNotReady: boolean;
            confidenceCapIfNotReady: number;
            skipIfUsageStale: boolean;
            usageStalenessHours: number;
            skipIfCRMStale: boolean;
            crmStalenessHours: number;
        };
        autoRenewal: {
            detectImplicitRenewal: boolean;
            renewalGraceDays: number;
        };
        enabledRules?: string[] | undefined;
        disabledRules?: string[] | undefined;
        aiEnrichment?: {
            enabled: boolean;
            maxIssuesPerRun: number;
            minConfidenceToEnrich: number;
            includeRecommendations: boolean;
        } | undefined;
        aiAnomalyDetection?: {
            enabled: boolean;
            minConfidenceToReport: number;
            maxAnomaliesPerRun: number;
            categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
        } | undefined;
        llmCostControls?: {
            maxCostPerRunUsd: number;
            preferredModel: "gpt-4o" | "gpt-4o-mini";
            enableCaching: boolean;
            budgetAlertThresholdUsd?: number | undefined;
        } | undefined;
    }, {
        credits?: {
            netWithInvoices?: boolean | undefined;
            treatAsSeparateRevenue?: boolean | undefined;
        } | undefined;
        fx?: {
            rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
            rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
            tolerancePct?: number | undefined;
            baseCurrency?: string | undefined;
        } | undefined;
        proration?: {
            method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
            midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
            rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
        } | undefined;
        taxFees?: {
            excludeFromComparison?: boolean | undefined;
            taxLineItemCodes?: string[] | undefined;
            feeLineItemCodes?: string[] | undefined;
        } | undefined;
        zeroValue?: {
            treatAsValid?: boolean | undefined;
            skipBillingRules?: boolean | undefined;
        } | undefined;
        thresholds?: {
            amountVariancePct?: number | undefined;
            amountVarianceAbs?: number | undefined;
            timingVarianceDays?: number | undefined;
            highImpactThreshold?: number | undefined;
            criticalImpactThreshold?: number | undefined;
        } | undefined;
        gating?: {
            skipIfContractNotReady?: boolean | undefined;
            confidenceCapIfNotReady?: number | undefined;
            skipIfUsageStale?: boolean | undefined;
            usageStalenessHours?: number | undefined;
            skipIfCRMStale?: boolean | undefined;
            crmStalenessHours?: number | undefined;
        } | undefined;
        autoRenewal?: {
            detectImplicitRenewal?: boolean | undefined;
            renewalGraceDays?: number | undefined;
        } | undefined;
        enabledRules?: string[] | undefined;
        disabledRules?: string[] | undefined;
        aiEnrichment?: {
            enabled?: boolean | undefined;
            maxIssuesPerRun?: number | undefined;
            minConfidenceToEnrich?: number | undefined;
            includeRecommendations?: boolean | undefined;
        } | undefined;
        aiAnomalyDetection?: {
            enabled?: boolean | undefined;
            minConfidenceToReport?: number | undefined;
            maxAnomaliesPerRun?: number | undefined;
            categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
        } | undefined;
        llmCostControls?: {
            maxCostPerRunUsd?: number | undefined;
            preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
            enableCaching?: boolean | undefined;
            budgetAlertThresholdUsd?: number | undefined;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "detect.run";
    snapshotId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    config?: {
        credits: {
            netWithInvoices: boolean;
            treatAsSeparateRevenue: boolean;
        };
        fx: {
            rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
            rateDate: "invoice_date" | "period_end" | "snapshot_date";
            tolerancePct: number;
            baseCurrency: string;
        };
        proration: {
            method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
            midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
            rampScheduleRecognition: "straight_line" | "as_invoiced";
        };
        taxFees: {
            excludeFromComparison: boolean;
            taxLineItemCodes: string[];
            feeLineItemCodes: string[];
        };
        zeroValue: {
            treatAsValid: boolean;
            skipBillingRules: boolean;
        };
        thresholds: {
            amountVariancePct: number;
            amountVarianceAbs: number;
            timingVarianceDays: number;
            highImpactThreshold: number;
            criticalImpactThreshold: number;
        };
        gating: {
            skipIfContractNotReady: boolean;
            confidenceCapIfNotReady: number;
            skipIfUsageStale: boolean;
            usageStalenessHours: number;
            skipIfCRMStale: boolean;
            crmStalenessHours: number;
        };
        autoRenewal: {
            detectImplicitRenewal: boolean;
            renewalGraceDays: number;
        };
        enabledRules?: string[] | undefined;
        disabledRules?: string[] | undefined;
        aiEnrichment?: {
            enabled: boolean;
            maxIssuesPerRun: number;
            minConfidenceToEnrich: number;
            includeRecommendations: boolean;
        } | undefined;
        aiAnomalyDetection?: {
            enabled: boolean;
            minConfidenceToReport: number;
            maxAnomaliesPerRun: number;
            categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
        } | undefined;
        llmCostControls?: {
            maxCostPerRunUsd: number;
            preferredModel: "gpt-4o" | "gpt-4o-mini";
            enableCaching: boolean;
            budgetAlertThresholdUsd?: number | undefined;
        } | undefined;
    } | undefined;
    rulesetVersion?: string | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    type: "detect.run";
    snapshotId: string;
    tenantId: string;
    config?: {
        credits?: {
            netWithInvoices?: boolean | undefined;
            treatAsSeparateRevenue?: boolean | undefined;
        } | undefined;
        fx?: {
            rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
            rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
            tolerancePct?: number | undefined;
            baseCurrency?: string | undefined;
        } | undefined;
        proration?: {
            method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
            midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
            rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
        } | undefined;
        taxFees?: {
            excludeFromComparison?: boolean | undefined;
            taxLineItemCodes?: string[] | undefined;
            feeLineItemCodes?: string[] | undefined;
        } | undefined;
        zeroValue?: {
            treatAsValid?: boolean | undefined;
            skipBillingRules?: boolean | undefined;
        } | undefined;
        thresholds?: {
            amountVariancePct?: number | undefined;
            amountVarianceAbs?: number | undefined;
            timingVarianceDays?: number | undefined;
            highImpactThreshold?: number | undefined;
            criticalImpactThreshold?: number | undefined;
        } | undefined;
        gating?: {
            skipIfContractNotReady?: boolean | undefined;
            confidenceCapIfNotReady?: number | undefined;
            skipIfUsageStale?: boolean | undefined;
            usageStalenessHours?: number | undefined;
            skipIfCRMStale?: boolean | undefined;
            crmStalenessHours?: number | undefined;
        } | undefined;
        autoRenewal?: {
            detectImplicitRenewal?: boolean | undefined;
            renewalGraceDays?: number | undefined;
        } | undefined;
        enabledRules?: string[] | undefined;
        disabledRules?: string[] | undefined;
        aiEnrichment?: {
            enabled?: boolean | undefined;
            maxIssuesPerRun?: number | undefined;
            minConfidenceToEnrich?: number | undefined;
            includeRecommendations?: boolean | undefined;
        } | undefined;
        aiAnomalyDetection?: {
            enabled?: boolean | undefined;
            minConfidenceToReport?: number | undefined;
            maxAnomaliesPerRun?: number | undefined;
            categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
        } | undefined;
        llmCostControls?: {
            maxCostPerRunUsd?: number | undefined;
            preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
            enableCaching?: boolean | undefined;
            budgetAlertThresholdUsd?: number | undefined;
        } | undefined;
    } | undefined;
    rulesetVersion?: string | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}>;
export type DetectRunJobPayload = z.infer<typeof DetectRunJobPayloadSchema>;
export declare const DetectReplayJobPayloadSchema: z.ZodObject<{
    tenantId: z.ZodEffects<z.ZodString, import("./ids.js").TenantId, string>;
    requestId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"detect.replay">;
    runId: z.ZodString;
    rulesetVersion: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "detect.replay";
    runId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    rulesetVersion?: string | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    type: "detect.replay";
    runId: string;
    tenantId: string;
    rulesetVersion?: string | undefined;
    requestId?: string | undefined;
    idempotencyKey?: string | undefined;
}>;
export type DetectReplayJobPayload = z.infer<typeof DetectReplayJobPayloadSchema>;
export declare const RuleTierSchema: z.ZodEnum<["data_quality", "billing", "discount", "revrec", "credits", "usage", "lifecycle", "multi_entity", "cross_snapshot", "tax_fees", "fx_currency"]>;
export type RuleTier = z.infer<typeof RuleTierSchema>;
export declare const DataRequirementSchema: z.ZodEnum<["contracts", "invoices", "invoice_lines", "payments", "usage_events", "schedules", "obligations", "customers", "products", "contract_terms", "fx_rates", "prior_snapshot", "prior_issues"]>;
export type DataRequirement = z.infer<typeof DataRequirementSchema>;
export declare const RuleDefinitionSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    category: z.ZodEnum<["data_quality", "billing", "discount", "revrec", "credits", "usage", "lifecycle", "multi_entity", "cross_snapshot", "tax_fees", "fx_currency"]>;
    tier: z.ZodEnum<["data_quality", "billing", "discount", "revrec", "credits", "usage", "lifecycle", "multi_entity", "cross_snapshot", "tax_fees", "fx_currency"]>;
    severity: z.ZodEnum<["info", "low", "medium", "high", "critical"]>;
    dependsOn: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    suppressedBy: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    requiresData: z.ZodArray<z.ZodEnum<["contracts", "invoices", "invoice_lines", "payments", "usage_events", "schedules", "obligations", "customers", "products", "contract_terms", "fx_rates", "prior_snapshot", "prior_issues"]>, "many">;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    category: "discount" | "usage" | "data_quality" | "billing" | "revrec" | "credits" | "lifecycle" | "multi_entity" | "cross_snapshot" | "tax_fees" | "fx_currency";
    severity: "info" | "low" | "medium" | "high" | "critical";
    version: string;
    tier: "discount" | "usage" | "data_quality" | "billing" | "revrec" | "credits" | "lifecycle" | "multi_entity" | "cross_snapshot" | "tax_fees" | "fx_currency";
    requiresData: ("contracts" | "invoices" | "invoice_lines" | "payments" | "usage_events" | "schedules" | "obligations" | "customers" | "products" | "contract_terms" | "fx_rates" | "prior_snapshot" | "prior_issues")[];
    dependsOn?: string[] | undefined;
    suppressedBy?: string[] | undefined;
}, {
    id: string;
    name: string;
    description: string;
    category: "discount" | "usage" | "data_quality" | "billing" | "revrec" | "credits" | "lifecycle" | "multi_entity" | "cross_snapshot" | "tax_fees" | "fx_currency";
    severity: "info" | "low" | "medium" | "high" | "critical";
    version: string;
    tier: "discount" | "usage" | "data_quality" | "billing" | "revrec" | "credits" | "lifecycle" | "multi_entity" | "cross_snapshot" | "tax_fees" | "fx_currency";
    requiresData: ("contracts" | "invoices" | "invoice_lines" | "payments" | "usage_events" | "schedules" | "obligations" | "customers" | "products" | "contract_terms" | "fx_rates" | "prior_snapshot" | "prior_issues")[];
    enabled?: boolean | undefined;
    dependsOn?: string[] | undefined;
    suppressedBy?: string[] | undefined;
}>;
export type RuleDefinition = z.infer<typeof RuleDefinitionSchema>;
export declare const IssueListResponseSchema: z.ZodObject<{
    issues: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tenantId: z.ZodString;
        snapshotId: z.ZodString;
        runId: z.ZodString;
        ruleId: z.ZodString;
        ruleVersion: z.ZodString;
        issueKey: z.ZodString;
        category: z.ZodEnum<["data_quality", "billing", "discount", "revrec", "credits", "usage", "lifecycle", "multi_entity", "cross_snapshot", "tax_fees", "fx_currency"]>;
        status: z.ZodEnum<["open", "resolved", "dismissed", "acknowledged"]>;
        severity: z.ZodEnum<["info", "low", "medium", "high", "critical"]>;
        confidence: z.ZodNumber;
        impactAmount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        currency: z.ZodDefault<z.ZodString>;
        expected: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        actual: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        dimensions: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        contractId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        invoiceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        customerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        dataQualityFlags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        suppressedByRule: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        ruleMetadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        expected: Record<string, unknown>;
        status: "resolved" | "open" | "dismissed" | "acknowledged";
        id: string;
        snapshotId: string;
        runId: string;
        tenantId: string;
        currency: string;
        confidence: number;
        createdAt: Date;
        ruleId: string;
        ruleVersion: string;
        issueKey: string;
        category: "discount" | "usage" | "data_quality" | "billing" | "revrec" | "credits" | "lifecycle" | "multi_entity" | "cross_snapshot" | "tax_fees" | "fx_currency";
        severity: "info" | "low" | "medium" | "high" | "critical";
        actual: Record<string, unknown>;
        dimensions: Record<string, unknown>;
        updatedAt: Date;
        contractId?: string | null | undefined;
        impactAmount?: number | null | undefined;
        invoiceId?: string | null | undefined;
        customerId?: string | null | undefined;
        dataQualityFlags?: string[] | undefined;
        suppressedByRule?: string | null | undefined;
        ruleMetadata?: Record<string, unknown> | undefined;
    }, {
        expected: Record<string, unknown>;
        status: "resolved" | "open" | "dismissed" | "acknowledged";
        id: string;
        snapshotId: string;
        runId: string;
        tenantId: string;
        confidence: number;
        createdAt: Date;
        ruleId: string;
        ruleVersion: string;
        issueKey: string;
        category: "discount" | "usage" | "data_quality" | "billing" | "revrec" | "credits" | "lifecycle" | "multi_entity" | "cross_snapshot" | "tax_fees" | "fx_currency";
        severity: "info" | "low" | "medium" | "high" | "critical";
        actual: Record<string, unknown>;
        dimensions: Record<string, unknown>;
        updatedAt: Date;
        currency?: string | undefined;
        contractId?: string | null | undefined;
        impactAmount?: number | null | undefined;
        invoiceId?: string | null | undefined;
        customerId?: string | null | undefined;
        dataQualityFlags?: string[] | undefined;
        suppressedByRule?: string | null | undefined;
        ruleMetadata?: Record<string, unknown> | undefined;
    }>, "many">;
    total: z.ZodNumber;
    page: z.ZodNumber;
    pageSize: z.ZodNumber;
    totalPages: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    issues: {
        expected: Record<string, unknown>;
        status: "resolved" | "open" | "dismissed" | "acknowledged";
        id: string;
        snapshotId: string;
        runId: string;
        tenantId: string;
        currency: string;
        confidence: number;
        createdAt: Date;
        ruleId: string;
        ruleVersion: string;
        issueKey: string;
        category: "discount" | "usage" | "data_quality" | "billing" | "revrec" | "credits" | "lifecycle" | "multi_entity" | "cross_snapshot" | "tax_fees" | "fx_currency";
        severity: "info" | "low" | "medium" | "high" | "critical";
        actual: Record<string, unknown>;
        dimensions: Record<string, unknown>;
        updatedAt: Date;
        contractId?: string | null | undefined;
        impactAmount?: number | null | undefined;
        invoiceId?: string | null | undefined;
        customerId?: string | null | undefined;
        dataQualityFlags?: string[] | undefined;
        suppressedByRule?: string | null | undefined;
        ruleMetadata?: Record<string, unknown> | undefined;
    }[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}, {
    issues: {
        expected: Record<string, unknown>;
        status: "resolved" | "open" | "dismissed" | "acknowledged";
        id: string;
        snapshotId: string;
        runId: string;
        tenantId: string;
        confidence: number;
        createdAt: Date;
        ruleId: string;
        ruleVersion: string;
        issueKey: string;
        category: "discount" | "usage" | "data_quality" | "billing" | "revrec" | "credits" | "lifecycle" | "multi_entity" | "cross_snapshot" | "tax_fees" | "fx_currency";
        severity: "info" | "low" | "medium" | "high" | "critical";
        actual: Record<string, unknown>;
        dimensions: Record<string, unknown>;
        updatedAt: Date;
        currency?: string | undefined;
        contractId?: string | null | undefined;
        impactAmount?: number | null | undefined;
        invoiceId?: string | null | undefined;
        customerId?: string | null | undefined;
        dataQualityFlags?: string[] | undefined;
        suppressedByRule?: string | null | undefined;
        ruleMetadata?: Record<string, unknown> | undefined;
    }[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}>;
export type IssueListResponse = z.infer<typeof IssueListResponseSchema>;
export declare const DetectionRunListResponseSchema: z.ZodObject<{
    runs: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tenantId: z.ZodString;
        snapshotId: z.ZodString;
        rulesetVersion: z.ZodString;
        status: z.ZodEnum<["pending", "running", "completed", "failed", "cancelled"]>;
        config: z.ZodOptional<z.ZodObject<{
            fx: z.ZodDefault<z.ZodObject<{
                rateSource: z.ZodDefault<z.ZodEnum<["ecb", "snapshot_rate", "contract_rate", "manual"]>>;
                rateDate: z.ZodDefault<z.ZodEnum<["invoice_date", "period_end", "snapshot_date"]>>;
                tolerancePct: z.ZodDefault<z.ZodNumber>;
                baseCurrency: z.ZodDefault<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
                rateDate: "invoice_date" | "period_end" | "snapshot_date";
                tolerancePct: number;
                baseCurrency: string;
            }, {
                rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
                rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
                tolerancePct?: number | undefined;
                baseCurrency?: string | undefined;
            }>>;
            proration: z.ZodDefault<z.ZodObject<{
                method: z.ZodDefault<z.ZodEnum<["daily_exact", "daily_30", "monthly_proportional", "none"]>>;
                midPeriodAmendmentHandling: z.ZodDefault<z.ZodEnum<["prorate", "full_period", "skip"]>>;
                rampScheduleRecognition: z.ZodDefault<z.ZodEnum<["as_invoiced", "straight_line"]>>;
            }, "strip", z.ZodTypeAny, {
                method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
                midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
                rampScheduleRecognition: "straight_line" | "as_invoiced";
            }, {
                method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
                midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
                rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
            }>>;
            taxFees: z.ZodDefault<z.ZodObject<{
                excludeFromComparison: z.ZodDefault<z.ZodBoolean>;
                taxLineItemCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                feeLineItemCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                excludeFromComparison: boolean;
                taxLineItemCodes: string[];
                feeLineItemCodes: string[];
            }, {
                excludeFromComparison?: boolean | undefined;
                taxLineItemCodes?: string[] | undefined;
                feeLineItemCodes?: string[] | undefined;
            }>>;
            credits: z.ZodDefault<z.ZodObject<{
                netWithInvoices: z.ZodDefault<z.ZodBoolean>;
                treatAsSeparateRevenue: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                netWithInvoices: boolean;
                treatAsSeparateRevenue: boolean;
            }, {
                netWithInvoices?: boolean | undefined;
                treatAsSeparateRevenue?: boolean | undefined;
            }>>;
            zeroValue: z.ZodDefault<z.ZodObject<{
                treatAsValid: z.ZodDefault<z.ZodBoolean>;
                skipBillingRules: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                treatAsValid: boolean;
                skipBillingRules: boolean;
            }, {
                treatAsValid?: boolean | undefined;
                skipBillingRules?: boolean | undefined;
            }>>;
            thresholds: z.ZodDefault<z.ZodObject<{
                amountVariancePct: z.ZodDefault<z.ZodNumber>;
                amountVarianceAbs: z.ZodDefault<z.ZodNumber>;
                timingVarianceDays: z.ZodDefault<z.ZodNumber>;
                highImpactThreshold: z.ZodDefault<z.ZodNumber>;
                criticalImpactThreshold: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                amountVariancePct: number;
                amountVarianceAbs: number;
                timingVarianceDays: number;
                highImpactThreshold: number;
                criticalImpactThreshold: number;
            }, {
                amountVariancePct?: number | undefined;
                amountVarianceAbs?: number | undefined;
                timingVarianceDays?: number | undefined;
                highImpactThreshold?: number | undefined;
                criticalImpactThreshold?: number | undefined;
            }>>;
            gating: z.ZodDefault<z.ZodObject<{
                skipIfContractNotReady: z.ZodDefault<z.ZodBoolean>;
                confidenceCapIfNotReady: z.ZodDefault<z.ZodNumber>;
                skipIfUsageStale: z.ZodDefault<z.ZodBoolean>;
                usageStalenessHours: z.ZodDefault<z.ZodNumber>;
                skipIfCRMStale: z.ZodDefault<z.ZodBoolean>;
                crmStalenessHours: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                skipIfContractNotReady: boolean;
                confidenceCapIfNotReady: number;
                skipIfUsageStale: boolean;
                usageStalenessHours: number;
                skipIfCRMStale: boolean;
                crmStalenessHours: number;
            }, {
                skipIfContractNotReady?: boolean | undefined;
                confidenceCapIfNotReady?: number | undefined;
                skipIfUsageStale?: boolean | undefined;
                usageStalenessHours?: number | undefined;
                skipIfCRMStale?: boolean | undefined;
                crmStalenessHours?: number | undefined;
            }>>;
            autoRenewal: z.ZodDefault<z.ZodObject<{
                detectImplicitRenewal: z.ZodDefault<z.ZodBoolean>;
                renewalGraceDays: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                detectImplicitRenewal: boolean;
                renewalGraceDays: number;
            }, {
                detectImplicitRenewal?: boolean | undefined;
                renewalGraceDays?: number | undefined;
            }>>;
            enabledRules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            disabledRules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            aiEnrichment: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                maxIssuesPerRun: z.ZodDefault<z.ZodNumber>;
                minConfidenceToEnrich: z.ZodDefault<z.ZodNumber>;
                includeRecommendations: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                enabled: boolean;
                maxIssuesPerRun: number;
                minConfidenceToEnrich: number;
                includeRecommendations: boolean;
            }, {
                enabled?: boolean | undefined;
                maxIssuesPerRun?: number | undefined;
                minConfidenceToEnrich?: number | undefined;
                includeRecommendations?: boolean | undefined;
            }>>;
            aiAnomalyDetection: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                minConfidenceToReport: z.ZodDefault<z.ZodNumber>;
                maxAnomaliesPerRun: z.ZodDefault<z.ZodNumber>;
                categories: z.ZodDefault<z.ZodArray<z.ZodEnum<["semantic", "pattern", "anomaly", "contextual"]>, "many">>;
            }, "strip", z.ZodTypeAny, {
                enabled: boolean;
                minConfidenceToReport: number;
                maxAnomaliesPerRun: number;
                categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
            }, {
                enabled?: boolean | undefined;
                minConfidenceToReport?: number | undefined;
                maxAnomaliesPerRun?: number | undefined;
                categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
            }>>;
            llmCostControls: z.ZodOptional<z.ZodObject<{
                maxCostPerRunUsd: z.ZodDefault<z.ZodNumber>;
                preferredModel: z.ZodDefault<z.ZodEnum<["gpt-4o", "gpt-4o-mini"]>>;
                enableCaching: z.ZodDefault<z.ZodBoolean>;
                budgetAlertThresholdUsd: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                maxCostPerRunUsd: number;
                preferredModel: "gpt-4o" | "gpt-4o-mini";
                enableCaching: boolean;
                budgetAlertThresholdUsd?: number | undefined;
            }, {
                maxCostPerRunUsd?: number | undefined;
                preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
                enableCaching?: boolean | undefined;
                budgetAlertThresholdUsd?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            credits: {
                netWithInvoices: boolean;
                treatAsSeparateRevenue: boolean;
            };
            fx: {
                rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
                rateDate: "invoice_date" | "period_end" | "snapshot_date";
                tolerancePct: number;
                baseCurrency: string;
            };
            proration: {
                method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
                midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
                rampScheduleRecognition: "straight_line" | "as_invoiced";
            };
            taxFees: {
                excludeFromComparison: boolean;
                taxLineItemCodes: string[];
                feeLineItemCodes: string[];
            };
            zeroValue: {
                treatAsValid: boolean;
                skipBillingRules: boolean;
            };
            thresholds: {
                amountVariancePct: number;
                amountVarianceAbs: number;
                timingVarianceDays: number;
                highImpactThreshold: number;
                criticalImpactThreshold: number;
            };
            gating: {
                skipIfContractNotReady: boolean;
                confidenceCapIfNotReady: number;
                skipIfUsageStale: boolean;
                usageStalenessHours: number;
                skipIfCRMStale: boolean;
                crmStalenessHours: number;
            };
            autoRenewal: {
                detectImplicitRenewal: boolean;
                renewalGraceDays: number;
            };
            enabledRules?: string[] | undefined;
            disabledRules?: string[] | undefined;
            aiEnrichment?: {
                enabled: boolean;
                maxIssuesPerRun: number;
                minConfidenceToEnrich: number;
                includeRecommendations: boolean;
            } | undefined;
            aiAnomalyDetection?: {
                enabled: boolean;
                minConfidenceToReport: number;
                maxAnomaliesPerRun: number;
                categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
            } | undefined;
            llmCostControls?: {
                maxCostPerRunUsd: number;
                preferredModel: "gpt-4o" | "gpt-4o-mini";
                enableCaching: boolean;
                budgetAlertThresholdUsd?: number | undefined;
            } | undefined;
        }, {
            credits?: {
                netWithInvoices?: boolean | undefined;
                treatAsSeparateRevenue?: boolean | undefined;
            } | undefined;
            fx?: {
                rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
                rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
                tolerancePct?: number | undefined;
                baseCurrency?: string | undefined;
            } | undefined;
            proration?: {
                method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
                midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
                rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
            } | undefined;
            taxFees?: {
                excludeFromComparison?: boolean | undefined;
                taxLineItemCodes?: string[] | undefined;
                feeLineItemCodes?: string[] | undefined;
            } | undefined;
            zeroValue?: {
                treatAsValid?: boolean | undefined;
                skipBillingRules?: boolean | undefined;
            } | undefined;
            thresholds?: {
                amountVariancePct?: number | undefined;
                amountVarianceAbs?: number | undefined;
                timingVarianceDays?: number | undefined;
                highImpactThreshold?: number | undefined;
                criticalImpactThreshold?: number | undefined;
            } | undefined;
            gating?: {
                skipIfContractNotReady?: boolean | undefined;
                confidenceCapIfNotReady?: number | undefined;
                skipIfUsageStale?: boolean | undefined;
                usageStalenessHours?: number | undefined;
                skipIfCRMStale?: boolean | undefined;
                crmStalenessHours?: number | undefined;
            } | undefined;
            autoRenewal?: {
                detectImplicitRenewal?: boolean | undefined;
                renewalGraceDays?: number | undefined;
            } | undefined;
            enabledRules?: string[] | undefined;
            disabledRules?: string[] | undefined;
            aiEnrichment?: {
                enabled?: boolean | undefined;
                maxIssuesPerRun?: number | undefined;
                minConfidenceToEnrich?: number | undefined;
                includeRecommendations?: boolean | undefined;
            } | undefined;
            aiAnomalyDetection?: {
                enabled?: boolean | undefined;
                minConfidenceToReport?: number | undefined;
                maxAnomaliesPerRun?: number | undefined;
                categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
            } | undefined;
            llmCostControls?: {
                maxCostPerRunUsd?: number | undefined;
                preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
                enableCaching?: boolean | undefined;
                budgetAlertThresholdUsd?: number | undefined;
            } | undefined;
        }>>;
        stats: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        issuesTotal: z.ZodDefault<z.ZodNumber>;
        issuesBySeverity: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        issuesByCategory: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        errorCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        errorMessage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        startedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
        finishedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
        createdAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        status: "pending" | "running" | "completed" | "failed" | "cancelled";
        id: string;
        snapshotId: string;
        tenantId: string;
        createdAt: Date;
        rulesetVersion: string;
        issuesTotal: number;
        stats?: Record<string, unknown> | undefined;
        config?: {
            credits: {
                netWithInvoices: boolean;
                treatAsSeparateRevenue: boolean;
            };
            fx: {
                rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
                rateDate: "invoice_date" | "period_end" | "snapshot_date";
                tolerancePct: number;
                baseCurrency: string;
            };
            proration: {
                method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
                midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
                rampScheduleRecognition: "straight_line" | "as_invoiced";
            };
            taxFees: {
                excludeFromComparison: boolean;
                taxLineItemCodes: string[];
                feeLineItemCodes: string[];
            };
            zeroValue: {
                treatAsValid: boolean;
                skipBillingRules: boolean;
            };
            thresholds: {
                amountVariancePct: number;
                amountVarianceAbs: number;
                timingVarianceDays: number;
                highImpactThreshold: number;
                criticalImpactThreshold: number;
            };
            gating: {
                skipIfContractNotReady: boolean;
                confidenceCapIfNotReady: number;
                skipIfUsageStale: boolean;
                usageStalenessHours: number;
                skipIfCRMStale: boolean;
                crmStalenessHours: number;
            };
            autoRenewal: {
                detectImplicitRenewal: boolean;
                renewalGraceDays: number;
            };
            enabledRules?: string[] | undefined;
            disabledRules?: string[] | undefined;
            aiEnrichment?: {
                enabled: boolean;
                maxIssuesPerRun: number;
                minConfidenceToEnrich: number;
                includeRecommendations: boolean;
            } | undefined;
            aiAnomalyDetection?: {
                enabled: boolean;
                minConfidenceToReport: number;
                maxAnomaliesPerRun: number;
                categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
            } | undefined;
            llmCostControls?: {
                maxCostPerRunUsd: number;
                preferredModel: "gpt-4o" | "gpt-4o-mini";
                enableCaching: boolean;
                budgetAlertThresholdUsd?: number | undefined;
            } | undefined;
        } | undefined;
        issuesBySeverity?: Record<string, number> | undefined;
        issuesByCategory?: Record<string, number> | undefined;
        errorCode?: string | null | undefined;
        errorMessage?: string | null | undefined;
        startedAt?: Date | null | undefined;
        finishedAt?: Date | null | undefined;
    }, {
        status: "pending" | "running" | "completed" | "failed" | "cancelled";
        id: string;
        snapshotId: string;
        tenantId: string;
        createdAt: Date;
        rulesetVersion: string;
        stats?: Record<string, unknown> | undefined;
        config?: {
            credits?: {
                netWithInvoices?: boolean | undefined;
                treatAsSeparateRevenue?: boolean | undefined;
            } | undefined;
            fx?: {
                rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
                rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
                tolerancePct?: number | undefined;
                baseCurrency?: string | undefined;
            } | undefined;
            proration?: {
                method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
                midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
                rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
            } | undefined;
            taxFees?: {
                excludeFromComparison?: boolean | undefined;
                taxLineItemCodes?: string[] | undefined;
                feeLineItemCodes?: string[] | undefined;
            } | undefined;
            zeroValue?: {
                treatAsValid?: boolean | undefined;
                skipBillingRules?: boolean | undefined;
            } | undefined;
            thresholds?: {
                amountVariancePct?: number | undefined;
                amountVarianceAbs?: number | undefined;
                timingVarianceDays?: number | undefined;
                highImpactThreshold?: number | undefined;
                criticalImpactThreshold?: number | undefined;
            } | undefined;
            gating?: {
                skipIfContractNotReady?: boolean | undefined;
                confidenceCapIfNotReady?: number | undefined;
                skipIfUsageStale?: boolean | undefined;
                usageStalenessHours?: number | undefined;
                skipIfCRMStale?: boolean | undefined;
                crmStalenessHours?: number | undefined;
            } | undefined;
            autoRenewal?: {
                detectImplicitRenewal?: boolean | undefined;
                renewalGraceDays?: number | undefined;
            } | undefined;
            enabledRules?: string[] | undefined;
            disabledRules?: string[] | undefined;
            aiEnrichment?: {
                enabled?: boolean | undefined;
                maxIssuesPerRun?: number | undefined;
                minConfidenceToEnrich?: number | undefined;
                includeRecommendations?: boolean | undefined;
            } | undefined;
            aiAnomalyDetection?: {
                enabled?: boolean | undefined;
                minConfidenceToReport?: number | undefined;
                maxAnomaliesPerRun?: number | undefined;
                categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
            } | undefined;
            llmCostControls?: {
                maxCostPerRunUsd?: number | undefined;
                preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
                enableCaching?: boolean | undefined;
                budgetAlertThresholdUsd?: number | undefined;
            } | undefined;
        } | undefined;
        issuesTotal?: number | undefined;
        issuesBySeverity?: Record<string, number> | undefined;
        issuesByCategory?: Record<string, number> | undefined;
        errorCode?: string | null | undefined;
        errorMessage?: string | null | undefined;
        startedAt?: Date | null | undefined;
        finishedAt?: Date | null | undefined;
    }>, "many">;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    total: number;
    runs: {
        status: "pending" | "running" | "completed" | "failed" | "cancelled";
        id: string;
        snapshotId: string;
        tenantId: string;
        createdAt: Date;
        rulesetVersion: string;
        issuesTotal: number;
        stats?: Record<string, unknown> | undefined;
        config?: {
            credits: {
                netWithInvoices: boolean;
                treatAsSeparateRevenue: boolean;
            };
            fx: {
                rateSource: "ecb" | "snapshot_rate" | "contract_rate" | "manual";
                rateDate: "invoice_date" | "period_end" | "snapshot_date";
                tolerancePct: number;
                baseCurrency: string;
            };
            proration: {
                method: "none" | "daily_exact" | "daily_30" | "monthly_proportional";
                midPeriodAmendmentHandling: "prorate" | "full_period" | "skip";
                rampScheduleRecognition: "straight_line" | "as_invoiced";
            };
            taxFees: {
                excludeFromComparison: boolean;
                taxLineItemCodes: string[];
                feeLineItemCodes: string[];
            };
            zeroValue: {
                treatAsValid: boolean;
                skipBillingRules: boolean;
            };
            thresholds: {
                amountVariancePct: number;
                amountVarianceAbs: number;
                timingVarianceDays: number;
                highImpactThreshold: number;
                criticalImpactThreshold: number;
            };
            gating: {
                skipIfContractNotReady: boolean;
                confidenceCapIfNotReady: number;
                skipIfUsageStale: boolean;
                usageStalenessHours: number;
                skipIfCRMStale: boolean;
                crmStalenessHours: number;
            };
            autoRenewal: {
                detectImplicitRenewal: boolean;
                renewalGraceDays: number;
            };
            enabledRules?: string[] | undefined;
            disabledRules?: string[] | undefined;
            aiEnrichment?: {
                enabled: boolean;
                maxIssuesPerRun: number;
                minConfidenceToEnrich: number;
                includeRecommendations: boolean;
            } | undefined;
            aiAnomalyDetection?: {
                enabled: boolean;
                minConfidenceToReport: number;
                maxAnomaliesPerRun: number;
                categories: ("pattern" | "semantic" | "anomaly" | "contextual")[];
            } | undefined;
            llmCostControls?: {
                maxCostPerRunUsd: number;
                preferredModel: "gpt-4o" | "gpt-4o-mini";
                enableCaching: boolean;
                budgetAlertThresholdUsd?: number | undefined;
            } | undefined;
        } | undefined;
        issuesBySeverity?: Record<string, number> | undefined;
        issuesByCategory?: Record<string, number> | undefined;
        errorCode?: string | null | undefined;
        errorMessage?: string | null | undefined;
        startedAt?: Date | null | undefined;
        finishedAt?: Date | null | undefined;
    }[];
}, {
    total: number;
    runs: {
        status: "pending" | "running" | "completed" | "failed" | "cancelled";
        id: string;
        snapshotId: string;
        tenantId: string;
        createdAt: Date;
        rulesetVersion: string;
        stats?: Record<string, unknown> | undefined;
        config?: {
            credits?: {
                netWithInvoices?: boolean | undefined;
                treatAsSeparateRevenue?: boolean | undefined;
            } | undefined;
            fx?: {
                rateSource?: "ecb" | "snapshot_rate" | "contract_rate" | "manual" | undefined;
                rateDate?: "invoice_date" | "period_end" | "snapshot_date" | undefined;
                tolerancePct?: number | undefined;
                baseCurrency?: string | undefined;
            } | undefined;
            proration?: {
                method?: "none" | "daily_exact" | "daily_30" | "monthly_proportional" | undefined;
                midPeriodAmendmentHandling?: "prorate" | "full_period" | "skip" | undefined;
                rampScheduleRecognition?: "straight_line" | "as_invoiced" | undefined;
            } | undefined;
            taxFees?: {
                excludeFromComparison?: boolean | undefined;
                taxLineItemCodes?: string[] | undefined;
                feeLineItemCodes?: string[] | undefined;
            } | undefined;
            zeroValue?: {
                treatAsValid?: boolean | undefined;
                skipBillingRules?: boolean | undefined;
            } | undefined;
            thresholds?: {
                amountVariancePct?: number | undefined;
                amountVarianceAbs?: number | undefined;
                timingVarianceDays?: number | undefined;
                highImpactThreshold?: number | undefined;
                criticalImpactThreshold?: number | undefined;
            } | undefined;
            gating?: {
                skipIfContractNotReady?: boolean | undefined;
                confidenceCapIfNotReady?: number | undefined;
                skipIfUsageStale?: boolean | undefined;
                usageStalenessHours?: number | undefined;
                skipIfCRMStale?: boolean | undefined;
                crmStalenessHours?: number | undefined;
            } | undefined;
            autoRenewal?: {
                detectImplicitRenewal?: boolean | undefined;
                renewalGraceDays?: number | undefined;
            } | undefined;
            enabledRules?: string[] | undefined;
            disabledRules?: string[] | undefined;
            aiEnrichment?: {
                enabled?: boolean | undefined;
                maxIssuesPerRun?: number | undefined;
                minConfidenceToEnrich?: number | undefined;
                includeRecommendations?: boolean | undefined;
            } | undefined;
            aiAnomalyDetection?: {
                enabled?: boolean | undefined;
                minConfidenceToReport?: number | undefined;
                maxAnomaliesPerRun?: number | undefined;
                categories?: ("pattern" | "semantic" | "anomaly" | "contextual")[] | undefined;
            } | undefined;
            llmCostControls?: {
                maxCostPerRunUsd?: number | undefined;
                preferredModel?: "gpt-4o" | "gpt-4o-mini" | undefined;
                enableCaching?: boolean | undefined;
                budgetAlertThresholdUsd?: number | undefined;
            } | undefined;
        } | undefined;
        issuesTotal?: number | undefined;
        issuesBySeverity?: Record<string, number> | undefined;
        issuesByCategory?: Record<string, number> | undefined;
        errorCode?: string | null | undefined;
        errorMessage?: string | null | undefined;
        startedAt?: Date | null | undefined;
        finishedAt?: Date | null | undefined;
    }[];
}>;
export type DetectionRunListResponse = z.infer<typeof DetectionRunListResponseSchema>;
export declare function generateEvidenceId(): string;
export declare function generateEvidenceSourceId(): string;
export declare function generateEvidenceCalcId(): string;
export declare function generateEvidenceClauseId(): string;
export declare function generateEvidenceAuditId(): string;
export declare function generateEvidenceRunId(): string;
export declare const EvidenceTypeSchema: z.ZodEnum<["full", "summary", "calculation", "clause", "source"]>;
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;
export declare const EvidenceSourceTypeSchema: z.ZodEnum<["contract", "invoice", "invoice_line", "payment", "usage_event", "schedule", "obligation", "customer", "product", "contract_term", "contract_version", "contract_document"]>;
export type EvidenceSourceType = z.infer<typeof EvidenceSourceTypeSchema>;
export declare const CalculationTypeSchema: z.ZodEnum<["expected_amount", "actual_amount", "variance", "proration", "discount", "fx_conversion", "revenue_allocation", "custom"]>;
export type CalculationType = z.infer<typeof CalculationTypeSchema>;
export declare const EvidenceActionSchema: z.ZodEnum<["generated", "regenerated", "failed", "expired", "archived"]>;
export type EvidenceAction = z.infer<typeof EvidenceActionSchema>;
export declare const EvidenceTriggerTypeSchema: z.ZodEnum<["auto", "manual", "scheduled", "detection_run"]>;
export type EvidenceTriggerType = z.infer<typeof EvidenceTriggerTypeSchema>;
export declare const CompletenessCategory: z.ZodEnum<["source_coverage", "contract_ready", "calculation_reproducible", "clause_linked"]>;
export type CompletenessCategory = z.infer<typeof CompletenessCategory>;
export declare const IssueEvidenceSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    issueId: z.ZodString;
    evidenceVersion: z.ZodNumber;
    evidenceType: z.ZodEnum<["full", "summary", "calculation", "clause", "source"]>;
    title: z.ZodString;
    summary: z.ZodString;
    dataJson: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    completenessScore: z.ZodNumber;
    completenessBreakdown: z.ZodRecord<z.ZodString, z.ZodNumber>;
    s3Key: z.ZodNullable<z.ZodString>;
    ruleId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    ruleVersion: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    snapshotId: string;
    tenantId: string;
    s3Key: string | null;
    createdAt: Date;
    issueId: string;
    summary: string;
    evidenceVersion: number;
    evidenceType: "full" | "summary" | "calculation" | "clause" | "source";
    title: string;
    dataJson: Record<string, unknown>;
    completenessScore: number;
    completenessBreakdown: Record<string, number>;
    ruleId?: string | null | undefined;
    ruleVersion?: string | null | undefined;
}, {
    id: string;
    snapshotId: string;
    tenantId: string;
    s3Key: string | null;
    createdAt: Date;
    issueId: string;
    summary: string;
    evidenceVersion: number;
    evidenceType: "full" | "summary" | "calculation" | "clause" | "source";
    title: string;
    dataJson: Record<string, unknown>;
    completenessScore: number;
    completenessBreakdown: Record<string, number>;
    ruleId?: string | null | undefined;
    ruleVersion?: string | null | undefined;
}>;
export type IssueEvidence = z.infer<typeof IssueEvidenceSchema>;
export declare const IssueEvidenceSourceSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    evidenceId: z.ZodString;
    issueId: z.ZodString;
    sourceType: z.ZodEnum<["contract", "invoice", "invoice_line", "payment", "usage_event", "schedule", "obligation", "customer", "product", "contract_term", "contract_version", "contract_document"]>;
    sourceId: z.ZodString;
    sourceSystem: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sourceExternalId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    fieldName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    fieldValueJson: z.ZodOptional<z.ZodUnknown>;
    s3Key: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    snapshotValueJson: z.ZodOptional<z.ZodUnknown>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    createdAt: Date;
    issueId: string;
    sourceType: "customer" | "invoice" | "contract" | "payment" | "product" | "schedule" | "invoice_line" | "usage_event" | "obligation" | "contract_term" | "contract_version" | "contract_document";
    sourceId: string;
    evidenceId: string;
    s3Key?: string | null | undefined;
    sourceSystem?: string | null | undefined;
    fieldName?: string | null | undefined;
    sourceExternalId?: string | null | undefined;
    fieldValueJson?: unknown;
    snapshotValueJson?: unknown;
}, {
    id: string;
    tenantId: string;
    createdAt: Date;
    issueId: string;
    sourceType: "customer" | "invoice" | "contract" | "payment" | "product" | "schedule" | "invoice_line" | "usage_event" | "obligation" | "contract_term" | "contract_version" | "contract_document";
    sourceId: string;
    evidenceId: string;
    s3Key?: string | null | undefined;
    sourceSystem?: string | null | undefined;
    fieldName?: string | null | undefined;
    sourceExternalId?: string | null | undefined;
    fieldValueJson?: unknown;
    snapshotValueJson?: unknown;
}>;
export type IssueEvidenceSource = z.infer<typeof IssueEvidenceSourceSchema>;
export declare const IssueEvidenceCalculationSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    evidenceId: z.ZodString;
    issueId: z.ZodString;
    calcName: z.ZodString;
    calcType: z.ZodEnum<["expected_amount", "actual_amount", "variance", "proration", "discount", "fx_conversion", "revenue_allocation", "custom"]>;
    formula: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    inputsJson: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    outputsJson: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    ruleId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    ruleVersion: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sequenceNumber: z.ZodNumber;
    isReproducible: z.ZodBoolean;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    sequenceNumber: number;
    createdAt: Date;
    issueId: string;
    evidenceId: string;
    calcName: string;
    calcType: "custom" | "discount" | "variance" | "proration" | "expected_amount" | "actual_amount" | "fx_conversion" | "revenue_allocation";
    inputsJson: Record<string, unknown>;
    outputsJson: Record<string, unknown>;
    isReproducible: boolean;
    notes?: string | null | undefined;
    ruleId?: string | null | undefined;
    ruleVersion?: string | null | undefined;
    formula?: string | null | undefined;
}, {
    id: string;
    tenantId: string;
    sequenceNumber: number;
    createdAt: Date;
    issueId: string;
    evidenceId: string;
    calcName: string;
    calcType: "custom" | "discount" | "variance" | "proration" | "expected_amount" | "actual_amount" | "fx_conversion" | "revenue_allocation";
    inputsJson: Record<string, unknown>;
    outputsJson: Record<string, unknown>;
    isReproducible: boolean;
    notes?: string | null | undefined;
    ruleId?: string | null | undefined;
    ruleVersion?: string | null | undefined;
    formula?: string | null | undefined;
}>;
export type IssueEvidenceCalculation = z.infer<typeof IssueEvidenceCalculationSchema>;
export declare const IssueEvidenceClauseSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    evidenceId: z.ZodString;
    issueId: z.ZodString;
    clauseId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    contractId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    contractVersionId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    documentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clauseType: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clauseLabel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    excerpt: z.ZodString;
    fullTextS3Key: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    startOffset: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    endOffset: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    pageNumber: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    relevanceScore: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    createdAt: Date;
    issueId: string;
    evidenceId: string;
    excerpt: string;
    startOffset?: number | null | undefined;
    endOffset?: number | null | undefined;
    pageNumber?: number | null | undefined;
    documentId?: string | null | undefined;
    contractId?: string | null | undefined;
    contractVersionId?: string | null | undefined;
    clauseId?: string | null | undefined;
    clauseType?: string | null | undefined;
    clauseLabel?: string | null | undefined;
    fullTextS3Key?: string | null | undefined;
    relevanceScore?: number | null | undefined;
}, {
    id: string;
    tenantId: string;
    createdAt: Date;
    issueId: string;
    evidenceId: string;
    excerpt: string;
    startOffset?: number | null | undefined;
    endOffset?: number | null | undefined;
    pageNumber?: number | null | undefined;
    documentId?: string | null | undefined;
    contractId?: string | null | undefined;
    contractVersionId?: string | null | undefined;
    clauseId?: string | null | undefined;
    clauseType?: string | null | undefined;
    clauseLabel?: string | null | undefined;
    fullTextS3Key?: string | null | undefined;
    relevanceScore?: number | null | undefined;
}>;
export type IssueEvidenceClause = z.infer<typeof IssueEvidenceClauseSchema>;
export declare const IssueEvidenceAuditSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    issueId: z.ZodString;
    evidenceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    evidenceVersion: z.ZodNumber;
    action: z.ZodEnum<["generated", "regenerated", "failed", "expired", "archived"]>;
    status: z.ZodEnum<["pending", "processing", "completed", "failed"]>;
    triggerType: z.ZodEnum<["auto", "manual", "scheduled", "detection_run"]>;
    actorUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    previousVersion: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    completenessScore: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    processingTimeMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    errorCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    errorMessage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    metadataJson: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    generatedAt: z.ZodDate;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "completed" | "failed" | "processing";
    id: string;
    tenantId: string;
    createdAt: Date;
    issueId: string;
    evidenceVersion: number;
    action: "failed" | "generated" | "regenerated" | "expired" | "archived";
    triggerType: "scheduled" | "manual" | "auto" | "detection_run";
    generatedAt: Date;
    errorCode?: string | null | undefined;
    errorMessage?: string | null | undefined;
    actorUserId?: string | null | undefined;
    completenessScore?: number | null | undefined;
    evidenceId?: string | null | undefined;
    previousVersion?: number | null | undefined;
    processingTimeMs?: number | null | undefined;
    metadataJson?: Record<string, unknown> | undefined;
}, {
    status: "pending" | "completed" | "failed" | "processing";
    id: string;
    tenantId: string;
    createdAt: Date;
    issueId: string;
    evidenceVersion: number;
    action: "failed" | "generated" | "regenerated" | "expired" | "archived";
    triggerType: "scheduled" | "manual" | "auto" | "detection_run";
    generatedAt: Date;
    errorCode?: string | null | undefined;
    errorMessage?: string | null | undefined;
    actorUserId?: string | null | undefined;
    completenessScore?: number | null | undefined;
    evidenceId?: string | null | undefined;
    previousVersion?: number | null | undefined;
    processingTimeMs?: number | null | undefined;
    metadataJson?: Record<string, unknown> | undefined;
}>;
export type IssueEvidenceAudit = z.infer<typeof IssueEvidenceAuditSchema>;
export declare const EvidenceGenerationRunSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    snapshotId: z.ZodString;
    detectionRunId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodEnum<["pending", "running", "completed", "failed", "cancelled"]>;
    totalIssues: z.ZodNumber;
    processedIssues: z.ZodNumber;
    failedIssues: z.ZodNumber;
    skippedIssues: z.ZodNumber;
    avgCompletenessScore: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    statsJson: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    errorCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    errorMessage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    startedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    finishedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "running" | "completed" | "failed" | "cancelled";
    id: string;
    snapshotId: string;
    tenantId: string;
    createdAt: Date;
    totalIssues: number;
    processedIssues: number;
    failedIssues: number;
    skippedIssues: number;
    errorCode?: string | null | undefined;
    errorMessage?: string | null | undefined;
    startedAt?: Date | null | undefined;
    finishedAt?: Date | null | undefined;
    detectionRunId?: string | null | undefined;
    avgCompletenessScore?: number | null | undefined;
    statsJson?: Record<string, unknown> | undefined;
}, {
    status: "pending" | "running" | "completed" | "failed" | "cancelled";
    id: string;
    snapshotId: string;
    tenantId: string;
    createdAt: Date;
    totalIssues: number;
    processedIssues: number;
    failedIssues: number;
    skippedIssues: number;
    errorCode?: string | null | undefined;
    errorMessage?: string | null | undefined;
    startedAt?: Date | null | undefined;
    finishedAt?: Date | null | undefined;
    detectionRunId?: string | null | undefined;
    avgCompletenessScore?: number | null | undefined;
    statsJson?: Record<string, unknown> | undefined;
}>;
export type EvidenceGenerationRun = z.infer<typeof EvidenceGenerationRunSchema>;
export declare const CalculationStepSchema: z.ZodObject<{
    name: z.ZodString;
    formula: z.ZodString;
    inputs: z.ZodRecord<z.ZodString, z.ZodNumber>;
    output: z.ZodNumber;
    ruleId: z.ZodString;
    ruleVersion: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    ruleId: string;
    ruleVersion: string;
    formula: string;
    inputs: Record<string, number>;
    output: number;
}, {
    name: string;
    ruleId: string;
    ruleVersion: string;
    formula: string;
    inputs: Record<string, number>;
    output: number;
}>;
export type CalculationStep = z.infer<typeof CalculationStepSchema>;
export declare const EvidencePackSchema: z.ZodObject<{
    summary: z.ZodString;
    expected: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    actual: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    variance: z.ZodObject<{
        amount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        percentage: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        direction: z.ZodOptional<z.ZodEnum<["over", "under", "none"]>>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description?: string | undefined;
        percentage?: number | null | undefined;
        amount?: number | null | undefined;
        direction?: "none" | "over" | "under" | undefined;
    }, {
        description?: string | undefined;
        percentage?: number | null | undefined;
        amount?: number | null | undefined;
        direction?: "none" | "over" | "under" | undefined;
    }>;
    calculations: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        formula: z.ZodString;
        inputs: z.ZodRecord<z.ZodString, z.ZodNumber>;
        output: z.ZodNumber;
        ruleId: z.ZodString;
        ruleVersion: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        ruleId: string;
        ruleVersion: string;
        formula: string;
        inputs: Record<string, number>;
        output: number;
    }, {
        name: string;
        ruleId: string;
        ruleVersion: string;
        formula: string;
        inputs: Record<string, number>;
        output: number;
    }>, "many">;
    contractClauses: z.ZodArray<z.ZodObject<{
        clauseId: z.ZodOptional<z.ZodString>;
        type: z.ZodString;
        label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        excerpt: z.ZodString;
        startOffset: z.ZodOptional<z.ZodNumber>;
        endOffset: z.ZodOptional<z.ZodNumber>;
        pageNumber: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        excerpt: string;
        label?: string | null | undefined;
        startOffset?: number | undefined;
        endOffset?: number | undefined;
        pageNumber?: number | undefined;
        clauseId?: string | undefined;
    }, {
        type: string;
        excerpt: string;
        label?: string | null | undefined;
        startOffset?: number | undefined;
        endOffset?: number | undefined;
        pageNumber?: number | undefined;
        clauseId?: string | undefined;
    }>, "many">;
    sourceRecords: z.ZodArray<z.ZodObject<{
        sourceType: z.ZodEnum<["contract", "invoice", "invoice_line", "payment", "usage_event", "schedule", "obligation", "customer", "product", "contract_term", "contract_version", "contract_document"]>;
        sourceId: z.ZodString;
        sourceSystem: z.ZodOptional<z.ZodString>;
        externalId: z.ZodOptional<z.ZodString>;
        fieldName: z.ZodOptional<z.ZodString>;
        fieldValue: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        sourceType: "customer" | "invoice" | "contract" | "payment" | "product" | "schedule" | "invoice_line" | "usage_event" | "obligation" | "contract_term" | "contract_version" | "contract_document";
        sourceId: string;
        sourceSystem?: string | undefined;
        fieldName?: string | undefined;
        fieldValue?: unknown;
        externalId?: string | undefined;
    }, {
        sourceType: "customer" | "invoice" | "contract" | "payment" | "product" | "schedule" | "invoice_line" | "usage_event" | "obligation" | "contract_term" | "contract_version" | "contract_document";
        sourceId: string;
        sourceSystem?: string | undefined;
        fieldName?: string | undefined;
        fieldValue?: unknown;
        externalId?: string | undefined;
    }>, "many">;
    snapshotMetadata: z.ZodObject<{
        snapshotId: z.ZodString;
        snapshotDate: z.ZodString;
        rulesetVersion: z.ZodString;
        ruleId: z.ZodString;
        ruleVersion: z.ZodString;
        detectionRunId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        snapshotId: string;
        rulesetVersion: string;
        ruleId: string;
        ruleVersion: string;
        snapshotDate: string;
        detectionRunId?: string | undefined;
    }, {
        snapshotId: string;
        rulesetVersion: string;
        ruleId: string;
        ruleVersion: string;
        snapshotDate: string;
        detectionRunId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    expected: Record<string, unknown>;
    variance: {
        description?: string | undefined;
        percentage?: number | null | undefined;
        amount?: number | null | undefined;
        direction?: "none" | "over" | "under" | undefined;
    };
    actual: Record<string, unknown>;
    summary: string;
    calculations: {
        name: string;
        ruleId: string;
        ruleVersion: string;
        formula: string;
        inputs: Record<string, number>;
        output: number;
    }[];
    contractClauses: {
        type: string;
        excerpt: string;
        label?: string | null | undefined;
        startOffset?: number | undefined;
        endOffset?: number | undefined;
        pageNumber?: number | undefined;
        clauseId?: string | undefined;
    }[];
    sourceRecords: {
        sourceType: "customer" | "invoice" | "contract" | "payment" | "product" | "schedule" | "invoice_line" | "usage_event" | "obligation" | "contract_term" | "contract_version" | "contract_document";
        sourceId: string;
        sourceSystem?: string | undefined;
        fieldName?: string | undefined;
        fieldValue?: unknown;
        externalId?: string | undefined;
    }[];
    snapshotMetadata: {
        snapshotId: string;
        rulesetVersion: string;
        ruleId: string;
        ruleVersion: string;
        snapshotDate: string;
        detectionRunId?: string | undefined;
    };
}, {
    expected: Record<string, unknown>;
    variance: {
        description?: string | undefined;
        percentage?: number | null | undefined;
        amount?: number | null | undefined;
        direction?: "none" | "over" | "under" | undefined;
    };
    actual: Record<string, unknown>;
    summary: string;
    calculations: {
        name: string;
        ruleId: string;
        ruleVersion: string;
        formula: string;
        inputs: Record<string, number>;
        output: number;
    }[];
    contractClauses: {
        type: string;
        excerpt: string;
        label?: string | null | undefined;
        startOffset?: number | undefined;
        endOffset?: number | undefined;
        pageNumber?: number | undefined;
        clauseId?: string | undefined;
    }[];
    sourceRecords: {
        sourceType: "customer" | "invoice" | "contract" | "payment" | "product" | "schedule" | "invoice_line" | "usage_event" | "obligation" | "contract_term" | "contract_version" | "contract_document";
        sourceId: string;
        sourceSystem?: string | undefined;
        fieldName?: string | undefined;
        fieldValue?: unknown;
        externalId?: string | undefined;
    }[];
    snapshotMetadata: {
        snapshotId: string;
        rulesetVersion: string;
        ruleId: string;
        ruleVersion: string;
        snapshotDate: string;
        detectionRunId?: string | undefined;
    };
}>;
export type EvidencePack = z.infer<typeof EvidencePackSchema>;
export declare const GetEvidenceQuerySchema: z.ZodObject<{
    includeCalculations: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    includeClauses: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    includeSources: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    includeAudit: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    includeCalculations: boolean;
    includeClauses: boolean;
    includeSources: boolean;
    includeAudit: boolean;
}, {
    includeCalculations?: boolean | undefined;
    includeClauses?: boolean | undefined;
    includeSources?: boolean | undefined;
    includeAudit?: boolean | undefined;
}>;
export type GetEvidenceQuery = z.infer<typeof GetEvidenceQuerySchema>;
export declare const RegenerateEvidenceRequestSchema: z.ZodObject<{
    force: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    force: boolean;
    reason?: string | undefined;
}, {
    reason?: string | undefined;
    force?: boolean | undefined;
}>;
export type RegenerateEvidenceRequest = z.infer<typeof RegenerateEvidenceRequestSchema>;
export declare const EvidenceResponseSchema: z.ZodObject<{
    evidence: z.ZodObject<{
        id: z.ZodString;
        tenantId: z.ZodString;
        snapshotId: z.ZodString;
        issueId: z.ZodString;
        evidenceVersion: z.ZodNumber;
        evidenceType: z.ZodEnum<["full", "summary", "calculation", "clause", "source"]>;
        title: z.ZodString;
        summary: z.ZodString;
        dataJson: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        completenessScore: z.ZodNumber;
        completenessBreakdown: z.ZodRecord<z.ZodString, z.ZodNumber>;
        s3Key: z.ZodNullable<z.ZodString>;
        ruleId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        ruleVersion: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        snapshotId: string;
        tenantId: string;
        s3Key: string | null;
        createdAt: Date;
        issueId: string;
        summary: string;
        evidenceVersion: number;
        evidenceType: "full" | "summary" | "calculation" | "clause" | "source";
        title: string;
        dataJson: Record<string, unknown>;
        completenessScore: number;
        completenessBreakdown: Record<string, number>;
        ruleId?: string | null | undefined;
        ruleVersion?: string | null | undefined;
    }, {
        id: string;
        snapshotId: string;
        tenantId: string;
        s3Key: string | null;
        createdAt: Date;
        issueId: string;
        summary: string;
        evidenceVersion: number;
        evidenceType: "full" | "summary" | "calculation" | "clause" | "source";
        title: string;
        dataJson: Record<string, unknown>;
        completenessScore: number;
        completenessBreakdown: Record<string, number>;
        ruleId?: string | null | undefined;
        ruleVersion?: string | null | undefined;
    }>;
    sources: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tenantId: z.ZodString;
        evidenceId: z.ZodString;
        issueId: z.ZodString;
        sourceType: z.ZodEnum<["contract", "invoice", "invoice_line", "payment", "usage_event", "schedule", "obligation", "customer", "product", "contract_term", "contract_version", "contract_document"]>;
        sourceId: z.ZodString;
        sourceSystem: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sourceExternalId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        fieldName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        fieldValueJson: z.ZodOptional<z.ZodUnknown>;
        s3Key: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        snapshotValueJson: z.ZodOptional<z.ZodUnknown>;
        createdAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        tenantId: string;
        createdAt: Date;
        issueId: string;
        sourceType: "customer" | "invoice" | "contract" | "payment" | "product" | "schedule" | "invoice_line" | "usage_event" | "obligation" | "contract_term" | "contract_version" | "contract_document";
        sourceId: string;
        evidenceId: string;
        s3Key?: string | null | undefined;
        sourceSystem?: string | null | undefined;
        fieldName?: string | null | undefined;
        sourceExternalId?: string | null | undefined;
        fieldValueJson?: unknown;
        snapshotValueJson?: unknown;
    }, {
        id: string;
        tenantId: string;
        createdAt: Date;
        issueId: string;
        sourceType: "customer" | "invoice" | "contract" | "payment" | "product" | "schedule" | "invoice_line" | "usage_event" | "obligation" | "contract_term" | "contract_version" | "contract_document";
        sourceId: string;
        evidenceId: string;
        s3Key?: string | null | undefined;
        sourceSystem?: string | null | undefined;
        fieldName?: string | null | undefined;
        sourceExternalId?: string | null | undefined;
        fieldValueJson?: unknown;
        snapshotValueJson?: unknown;
    }>, "many">;
    calculations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tenantId: z.ZodString;
        evidenceId: z.ZodString;
        issueId: z.ZodString;
        calcName: z.ZodString;
        calcType: z.ZodEnum<["expected_amount", "actual_amount", "variance", "proration", "discount", "fx_conversion", "revenue_allocation", "custom"]>;
        formula: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        inputsJson: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        outputsJson: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        ruleId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        ruleVersion: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sequenceNumber: z.ZodNumber;
        isReproducible: z.ZodBoolean;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        tenantId: string;
        sequenceNumber: number;
        createdAt: Date;
        issueId: string;
        evidenceId: string;
        calcName: string;
        calcType: "custom" | "discount" | "variance" | "proration" | "expected_amount" | "actual_amount" | "fx_conversion" | "revenue_allocation";
        inputsJson: Record<string, unknown>;
        outputsJson: Record<string, unknown>;
        isReproducible: boolean;
        notes?: string | null | undefined;
        ruleId?: string | null | undefined;
        ruleVersion?: string | null | undefined;
        formula?: string | null | undefined;
    }, {
        id: string;
        tenantId: string;
        sequenceNumber: number;
        createdAt: Date;
        issueId: string;
        evidenceId: string;
        calcName: string;
        calcType: "custom" | "discount" | "variance" | "proration" | "expected_amount" | "actual_amount" | "fx_conversion" | "revenue_allocation";
        inputsJson: Record<string, unknown>;
        outputsJson: Record<string, unknown>;
        isReproducible: boolean;
        notes?: string | null | undefined;
        ruleId?: string | null | undefined;
        ruleVersion?: string | null | undefined;
        formula?: string | null | undefined;
    }>, "many">;
    clauses: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tenantId: z.ZodString;
        evidenceId: z.ZodString;
        issueId: z.ZodString;
        clauseId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        contractId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        contractVersionId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        documentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        clauseType: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        clauseLabel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        excerpt: z.ZodString;
        fullTextS3Key: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        startOffset: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        endOffset: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        pageNumber: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        relevanceScore: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        createdAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        tenantId: string;
        createdAt: Date;
        issueId: string;
        evidenceId: string;
        excerpt: string;
        startOffset?: number | null | undefined;
        endOffset?: number | null | undefined;
        pageNumber?: number | null | undefined;
        documentId?: string | null | undefined;
        contractId?: string | null | undefined;
        contractVersionId?: string | null | undefined;
        clauseId?: string | null | undefined;
        clauseType?: string | null | undefined;
        clauseLabel?: string | null | undefined;
        fullTextS3Key?: string | null | undefined;
        relevanceScore?: number | null | undefined;
    }, {
        id: string;
        tenantId: string;
        createdAt: Date;
        issueId: string;
        evidenceId: string;
        excerpt: string;
        startOffset?: number | null | undefined;
        endOffset?: number | null | undefined;
        pageNumber?: number | null | undefined;
        documentId?: string | null | undefined;
        contractId?: string | null | undefined;
        contractVersionId?: string | null | undefined;
        clauseId?: string | null | undefined;
        clauseType?: string | null | undefined;
        clauseLabel?: string | null | undefined;
        fullTextS3Key?: string | null | undefined;
        relevanceScore?: number | null | undefined;
    }>, "many">;
    audit: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tenantId: z.ZodString;
        issueId: z.ZodString;
        evidenceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        evidenceVersion: z.ZodNumber;
        action: z.ZodEnum<["generated", "regenerated", "failed", "expired", "archived"]>;
        status: z.ZodEnum<["pending", "processing", "completed", "failed"]>;
        triggerType: z.ZodEnum<["auto", "manual", "scheduled", "detection_run"]>;
        actorUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        previousVersion: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        completenessScore: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        processingTimeMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        errorCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        errorMessage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        metadataJson: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        generatedAt: z.ZodDate;
        createdAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        status: "pending" | "completed" | "failed" | "processing";
        id: string;
        tenantId: string;
        createdAt: Date;
        issueId: string;
        evidenceVersion: number;
        action: "failed" | "generated" | "regenerated" | "expired" | "archived";
        triggerType: "scheduled" | "manual" | "auto" | "detection_run";
        generatedAt: Date;
        errorCode?: string | null | undefined;
        errorMessage?: string | null | undefined;
        actorUserId?: string | null | undefined;
        completenessScore?: number | null | undefined;
        evidenceId?: string | null | undefined;
        previousVersion?: number | null | undefined;
        processingTimeMs?: number | null | undefined;
        metadataJson?: Record<string, unknown> | undefined;
    }, {
        status: "pending" | "completed" | "failed" | "processing";
        id: string;
        tenantId: string;
        createdAt: Date;
        issueId: string;
        evidenceVersion: number;
        action: "failed" | "generated" | "regenerated" | "expired" | "archived";
        triggerType: "scheduled" | "manual" | "auto" | "detection_run";
        generatedAt: Date;
        errorCode?: string | null | undefined;
        errorMessage?: string | null | undefined;
        actorUserId?: string | null | undefined;
        completenessScore?: number | null | undefined;
        evidenceId?: string | null | undefined;
        previousVersion?: number | null | undefined;
        processingTimeMs?: number | null | undefined;
        metadataJson?: Record<string, unknown> | undefined;
    }>, "many">;
    downloadUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    audit: {
        status: "pending" | "completed" | "failed" | "processing";
        id: string;
        tenantId: string;
        createdAt: Date;
        issueId: string;
        evidenceVersion: number;
        action: "failed" | "generated" | "regenerated" | "expired" | "archived";
        triggerType: "scheduled" | "manual" | "auto" | "detection_run";
        generatedAt: Date;
        errorCode?: string | null | undefined;
        errorMessage?: string | null | undefined;
        actorUserId?: string | null | undefined;
        completenessScore?: number | null | undefined;
        evidenceId?: string | null | undefined;
        previousVersion?: number | null | undefined;
        processingTimeMs?: number | null | undefined;
        metadataJson?: Record<string, unknown> | undefined;
    }[];
    calculations: {
        id: string;
        tenantId: string;
        sequenceNumber: number;
        createdAt: Date;
        issueId: string;
        evidenceId: string;
        calcName: string;
        calcType: "custom" | "discount" | "variance" | "proration" | "expected_amount" | "actual_amount" | "fx_conversion" | "revenue_allocation";
        inputsJson: Record<string, unknown>;
        outputsJson: Record<string, unknown>;
        isReproducible: boolean;
        notes?: string | null | undefined;
        ruleId?: string | null | undefined;
        ruleVersion?: string | null | undefined;
        formula?: string | null | undefined;
    }[];
    evidence: {
        id: string;
        snapshotId: string;
        tenantId: string;
        s3Key: string | null;
        createdAt: Date;
        issueId: string;
        summary: string;
        evidenceVersion: number;
        evidenceType: "full" | "summary" | "calculation" | "clause" | "source";
        title: string;
        dataJson: Record<string, unknown>;
        completenessScore: number;
        completenessBreakdown: Record<string, number>;
        ruleId?: string | null | undefined;
        ruleVersion?: string | null | undefined;
    };
    sources: {
        id: string;
        tenantId: string;
        createdAt: Date;
        issueId: string;
        sourceType: "customer" | "invoice" | "contract" | "payment" | "product" | "schedule" | "invoice_line" | "usage_event" | "obligation" | "contract_term" | "contract_version" | "contract_document";
        sourceId: string;
        evidenceId: string;
        s3Key?: string | null | undefined;
        sourceSystem?: string | null | undefined;
        fieldName?: string | null | undefined;
        sourceExternalId?: string | null | undefined;
        fieldValueJson?: unknown;
        snapshotValueJson?: unknown;
    }[];
    clauses: {
        id: string;
        tenantId: string;
        createdAt: Date;
        issueId: string;
        evidenceId: string;
        excerpt: string;
        startOffset?: number | null | undefined;
        endOffset?: number | null | undefined;
        pageNumber?: number | null | undefined;
        documentId?: string | null | undefined;
        contractId?: string | null | undefined;
        contractVersionId?: string | null | undefined;
        clauseId?: string | null | undefined;
        clauseType?: string | null | undefined;
        clauseLabel?: string | null | undefined;
        fullTextS3Key?: string | null | undefined;
        relevanceScore?: number | null | undefined;
    }[];
    downloadUrl?: string | null | undefined;
}, {
    audit: {
        status: "pending" | "completed" | "failed" | "processing";
        id: string;
        tenantId: string;
        createdAt: Date;
        issueId: string;
        evidenceVersion: number;
        action: "failed" | "generated" | "regenerated" | "expired" | "archived";
        triggerType: "scheduled" | "manual" | "auto" | "detection_run";
        generatedAt: Date;
        errorCode?: string | null | undefined;
        errorMessage?: string | null | undefined;
        actorUserId?: string | null | undefined;
        completenessScore?: number | null | undefined;
        evidenceId?: string | null | undefined;
        previousVersion?: number | null | undefined;
        processingTimeMs?: number | null | undefined;
        metadataJson?: Record<string, unknown> | undefined;
    }[];
    calculations: {
        id: string;
        tenantId: string;
        sequenceNumber: number;
        createdAt: Date;
        issueId: string;
        evidenceId: string;
        calcName: string;
        calcType: "custom" | "discount" | "variance" | "proration" | "expected_amount" | "actual_amount" | "fx_conversion" | "revenue_allocation";
        inputsJson: Record<string, unknown>;
        outputsJson: Record<string, unknown>;
        isReproducible: boolean;
        notes?: string | null | undefined;
        ruleId?: string | null | undefined;
        ruleVersion?: string | null | undefined;
        formula?: string | null | undefined;
    }[];
    evidence: {
        id: string;
        snapshotId: string;
        tenantId: string;
        s3Key: string | null;
        createdAt: Date;
        issueId: string;
        summary: string;
        evidenceVersion: number;
        evidenceType: "full" | "summary" | "calculation" | "clause" | "source";
        title: string;
        dataJson: Record<string, unknown>;
        completenessScore: number;
        completenessBreakdown: Record<string, number>;
        ruleId?: string | null | undefined;
        ruleVersion?: string | null | undefined;
    };
    sources: {
        id: string;
        tenantId: string;
        createdAt: Date;
        issueId: string;
        sourceType: "customer" | "invoice" | "contract" | "payment" | "product" | "schedule" | "invoice_line" | "usage_event" | "obligation" | "contract_term" | "contract_version" | "contract_document";
        sourceId: string;
        evidenceId: string;
        s3Key?: string | null | undefined;
        sourceSystem?: string | null | undefined;
        fieldName?: string | null | undefined;
        sourceExternalId?: string | null | undefined;
        fieldValueJson?: unknown;
        snapshotValueJson?: unknown;
    }[];
    clauses: {
        id: string;
        tenantId: string;
        createdAt: Date;
        issueId: string;
        evidenceId: string;
        excerpt: string;
        startOffset?: number | null | undefined;
        endOffset?: number | null | undefined;
        pageNumber?: number | null | undefined;
        documentId?: string | null | undefined;
        contractId?: string | null | undefined;
        contractVersionId?: string | null | undefined;
        clauseId?: string | null | undefined;
        clauseType?: string | null | undefined;
        clauseLabel?: string | null | undefined;
        fullTextS3Key?: string | null | undefined;
        relevanceScore?: number | null | undefined;
    }[];
    downloadUrl?: string | null | undefined;
}>;
export type EvidenceResponse = z.infer<typeof EvidenceResponseSchema>;
export declare const EvidenceSummaryResponseSchema: z.ZodObject<{
    issueId: z.ZodString;
    evidenceVersion: z.ZodNumber;
    title: z.ZodString;
    summary: z.ZodString;
    completenessScore: z.ZodNumber;
    completenessBreakdown: z.ZodRecord<z.ZodString, z.ZodNumber>;
    hasS3Artifact: z.ZodBoolean;
    sourcesCount: z.ZodNumber;
    calculationsCount: z.ZodNumber;
    clausesCount: z.ZodNumber;
    generatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    issueId: string;
    summary: string;
    evidenceVersion: number;
    title: string;
    completenessScore: number;
    completenessBreakdown: Record<string, number>;
    generatedAt: Date;
    hasS3Artifact: boolean;
    sourcesCount: number;
    calculationsCount: number;
    clausesCount: number;
}, {
    issueId: string;
    summary: string;
    evidenceVersion: number;
    title: string;
    completenessScore: number;
    completenessBreakdown: Record<string, number>;
    generatedAt: Date;
    hasS3Artifact: boolean;
    sourcesCount: number;
    calculationsCount: number;
    clausesCount: number;
}>;
export type EvidenceSummaryResponse = z.infer<typeof EvidenceSummaryResponseSchema>;
export declare const EvidenceGenerateJobPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"evidence.generate">;
    tenantId: z.ZodEffects<z.ZodString, import("./ids.js").TenantId, string>;
    snapshotId: z.ZodString;
    detectionRunId: z.ZodOptional<z.ZodString>;
    issueIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    force: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    requestId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "evidence.generate";
    snapshotId: string;
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    force: boolean;
    issueIds?: string[] | undefined;
    requestId?: string | undefined;
    detectionRunId?: string | undefined;
}, {
    type: "evidence.generate";
    snapshotId: string;
    tenantId: string;
    issueIds?: string[] | undefined;
    requestId?: string | undefined;
    detectionRunId?: string | undefined;
    force?: boolean | undefined;
}>;
export type EvidenceGenerateJobPayload = z.infer<typeof EvidenceGenerateJobPayloadSchema>;
export declare const EvidenceRegenerateJobPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"evidence.regenerate">;
    tenantId: z.ZodEffects<z.ZodString, import("./ids.js").TenantId, string>;
    issueId: z.ZodString;
    force: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    actorUserId: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
    requestId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "evidence.regenerate";
    tenantId: string & {
        readonly __nominal: "TenantId";
    };
    issueId: string;
    force: boolean;
    reason?: string | undefined;
    actorUserId?: string | undefined;
    requestId?: string | undefined;
}, {
    type: "evidence.regenerate";
    tenantId: string;
    issueId: string;
    reason?: string | undefined;
    actorUserId?: string | undefined;
    requestId?: string | undefined;
    force?: boolean | undefined;
}>;
export type EvidenceRegenerateJobPayload = z.infer<typeof EvidenceRegenerateJobPayloadSchema>;
//# sourceMappingURL=detection.d.ts.map