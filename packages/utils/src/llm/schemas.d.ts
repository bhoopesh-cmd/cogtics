/**
 * Zod Schemas for LLM Response Validation
 *
 * Runtime validation for all AI-generated responses to ensure
 * type safety and graceful handling of malformed outputs.
 */
import { z } from 'zod';
export declare const SeveritySchema: z.ZodEnum<["info", "low", "medium", "high", "critical"]>;
export declare const PrioritySchema: z.ZodEnum<["critical", "high", "medium", "low"]>;
export declare const UrgencySchema: z.ZodEnum<["immediate", "this_week", "this_month", "monitor"]>;
export declare const ConfidenceSchema: z.ZodNumber;
export declare const IssueEnrichmentSchema: z.ZodObject<{
    issueIndex: z.ZodNumber;
    rootCause: z.ZodString;
    businessImpact: z.ZodString;
    suggestedFix: z.ZodString;
    confidence: z.ZodNumber;
    relatedIssueIndices: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    explanation: z.ZodString;
    priority: z.ZodEnum<["critical", "high", "medium", "low"]>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    confidence: number;
    tags: string[];
    priority: "low" | "medium" | "high" | "critical";
    issueIndex: number;
    rootCause: string;
    businessImpact: string;
    suggestedFix: string;
    relatedIssueIndices: number[];
    explanation: string;
}, {
    confidence: number;
    priority: "low" | "medium" | "high" | "critical";
    issueIndex: number;
    rootCause: string;
    businessImpact: string;
    suggestedFix: string;
    explanation: string;
    tags?: string[] | undefined;
    relatedIssueIndices?: number[] | undefined;
}>;
export declare const IssueEnrichmentResponseSchema: z.ZodObject<{
    enrichments: z.ZodDefault<z.ZodArray<z.ZodObject<{
        issueIndex: z.ZodNumber;
        rootCause: z.ZodString;
        businessImpact: z.ZodString;
        suggestedFix: z.ZodString;
        confidence: z.ZodNumber;
        relatedIssueIndices: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        explanation: z.ZodString;
        priority: z.ZodEnum<["critical", "high", "medium", "low"]>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        tags: string[];
        priority: "low" | "medium" | "high" | "critical";
        issueIndex: number;
        rootCause: string;
        businessImpact: string;
        suggestedFix: string;
        relatedIssueIndices: number[];
        explanation: string;
    }, {
        confidence: number;
        priority: "low" | "medium" | "high" | "critical";
        issueIndex: number;
        rootCause: string;
        businessImpact: string;
        suggestedFix: string;
        explanation: string;
        tags?: string[] | undefined;
        relatedIssueIndices?: number[] | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    enrichments: {
        confidence: number;
        tags: string[];
        priority: "low" | "medium" | "high" | "critical";
        issueIndex: number;
        rootCause: string;
        businessImpact: string;
        suggestedFix: string;
        relatedIssueIndices: number[];
        explanation: string;
    }[];
}, {
    enrichments?: {
        confidence: number;
        priority: "low" | "medium" | "high" | "critical";
        issueIndex: number;
        rootCause: string;
        businessImpact: string;
        suggestedFix: string;
        explanation: string;
        tags?: string[] | undefined;
        relatedIssueIndices?: number[] | undefined;
    }[] | undefined;
}>;
export declare const ExplanationResponseSchema: z.ZodObject<{
    headline: z.ZodString;
    explanation: z.ZodString;
    whyItMatters: z.ZodString;
    recommendation: z.ZodOptional<z.ZodString>;
    urgency: z.ZodEnum<["immediate", "this_week", "this_month", "monitor"]>;
}, "strip", z.ZodTypeAny, {
    explanation: string;
    headline: string;
    whyItMatters: string;
    urgency: "immediate" | "this_week" | "this_month" | "monitor";
    recommendation?: string | undefined;
}, {
    explanation: string;
    headline: string;
    whyItMatters: string;
    urgency: "immediate" | "this_week" | "this_month" | "monitor";
    recommendation?: string | undefined;
}>;
export declare const SystemChangeSchema: z.ZodObject<{
    type: z.ZodEnum<["simulation_override", "contract_update", "invoice_adjustment", "credit_memo"]>;
    description: z.ZodString;
    parameters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: "simulation_override" | "contract_update" | "invoice_adjustment" | "credit_memo";
    description: string;
    parameters: Record<string, unknown>;
}, {
    type: "simulation_override" | "contract_update" | "invoice_adjustment" | "credit_memo";
    description: string;
    parameters?: Record<string, unknown> | undefined;
}>;
export declare const FixSuggestionResponseSchema: z.ZodObject<{
    immediateAction: z.ZodString;
    systemChanges: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["simulation_override", "contract_update", "invoice_adjustment", "credit_memo"]>;
        description: z.ZodString;
        parameters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        type: "simulation_override" | "contract_update" | "invoice_adjustment" | "credit_memo";
        description: string;
        parameters: Record<string, unknown>;
    }, {
        type: "simulation_override" | "contract_update" | "invoice_adjustment" | "credit_memo";
        description: string;
        parameters?: Record<string, unknown> | undefined;
    }>, "many">>;
    processImprovements: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    estimatedImpact: z.ZodOptional<z.ZodObject<{
        revenueChange: z.ZodNumber;
        currency: z.ZodDefault<z.ZodString>;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        confidence: number;
        revenueChange: number;
    }, {
        confidence: number;
        revenueChange: number;
        currency?: string | undefined;
    }>>;
    riskAssessment: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    immediateAction: string;
    systemChanges: {
        type: "simulation_override" | "contract_update" | "invoice_adjustment" | "credit_memo";
        description: string;
        parameters: Record<string, unknown>;
    }[];
    processImprovements: string[];
    estimatedImpact?: {
        currency: string;
        confidence: number;
        revenueChange: number;
    } | undefined;
    riskAssessment?: string | undefined;
}, {
    immediateAction: string;
    systemChanges?: {
        type: "simulation_override" | "contract_update" | "invoice_adjustment" | "credit_memo";
        description: string;
        parameters?: Record<string, unknown> | undefined;
    }[] | undefined;
    processImprovements?: string[] | undefined;
    estimatedImpact?: {
        confidence: number;
        revenueChange: number;
        currency?: string | undefined;
    } | undefined;
    riskAssessment?: string | undefined;
}>;
export declare const AnomalyCategorySchema: z.ZodEnum<["semantic", "pattern", "anomaly", "contextual", "billing", "pricing", "compliance"]>;
export declare const EvidenceSchema: z.ZodObject<{
    contractIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    invoiceIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    relevantFields: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    contractIds: string[];
    invoiceIds: string[];
    relevantFields: Record<string, unknown>;
}, {
    contractIds?: string[] | undefined;
    invoiceIds?: string[] | undefined;
    relevantFields?: Record<string, unknown> | undefined;
}>;
export declare const AIDiscoveredIssueSchema: z.ZodObject<{
    category: z.ZodString;
    severity: z.ZodUnion<[z.ZodEnum<["info", "low", "medium", "high", "critical"]>, z.ZodString]>;
    confidence: z.ZodNumber;
    title: z.ZodString;
    description: z.ZodString;
    evidence: z.ZodOptional<z.ZodObject<{
        contractIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        invoiceIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        relevantFields: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        contractIds: string[];
        invoiceIds: string[];
        relevantFields: Record<string, unknown>;
    }, {
        contractIds?: string[] | undefined;
        invoiceIds?: string[] | undefined;
        relevantFields?: Record<string, unknown> | undefined;
    }>>;
    reasoning: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description: string;
    confidence: number;
    category: string;
    severity: string;
    title: string;
    evidence?: {
        contractIds: string[];
        invoiceIds: string[];
        relevantFields: Record<string, unknown>;
    } | undefined;
    reasoning?: string | undefined;
}, {
    description: string;
    confidence: number;
    category: string;
    severity: string;
    title: string;
    evidence?: {
        contractIds?: string[] | undefined;
        invoiceIds?: string[] | undefined;
        relevantFields?: Record<string, unknown> | undefined;
    } | undefined;
    reasoning?: string | undefined;
}>;
export declare const AnomalyDetectionResponseSchema: z.ZodObject<{
    anomalies: z.ZodOptional<z.ZodArray<z.ZodObject<{
        category: z.ZodString;
        severity: z.ZodUnion<[z.ZodEnum<["info", "low", "medium", "high", "critical"]>, z.ZodString]>;
        confidence: z.ZodNumber;
        title: z.ZodString;
        description: z.ZodString;
        evidence: z.ZodOptional<z.ZodObject<{
            contractIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            invoiceIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            relevantFields: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            contractIds: string[];
            invoiceIds: string[];
            relevantFields: Record<string, unknown>;
        }, {
            contractIds?: string[] | undefined;
            invoiceIds?: string[] | undefined;
            relevantFields?: Record<string, unknown> | undefined;
        }>>;
        reasoning: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        confidence: number;
        category: string;
        severity: string;
        title: string;
        evidence?: {
            contractIds: string[];
            invoiceIds: string[];
            relevantFields: Record<string, unknown>;
        } | undefined;
        reasoning?: string | undefined;
    }, {
        description: string;
        confidence: number;
        category: string;
        severity: string;
        title: string;
        evidence?: {
            contractIds?: string[] | undefined;
            invoiceIds?: string[] | undefined;
            relevantFields?: Record<string, unknown> | undefined;
        } | undefined;
        reasoning?: string | undefined;
    }>, "many">>;
    patterns: z.ZodOptional<z.ZodArray<z.ZodObject<{
        category: z.ZodString;
        severity: z.ZodUnion<[z.ZodEnum<["info", "low", "medium", "high", "critical"]>, z.ZodString]>;
        confidence: z.ZodNumber;
        title: z.ZodString;
        description: z.ZodString;
        evidence: z.ZodOptional<z.ZodObject<{
            contractIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            invoiceIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            relevantFields: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            contractIds: string[];
            invoiceIds: string[];
            relevantFields: Record<string, unknown>;
        }, {
            contractIds?: string[] | undefined;
            invoiceIds?: string[] | undefined;
            relevantFields?: Record<string, unknown> | undefined;
        }>>;
        reasoning: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        confidence: number;
        category: string;
        severity: string;
        title: string;
        evidence?: {
            contractIds: string[];
            invoiceIds: string[];
            relevantFields: Record<string, unknown>;
        } | undefined;
        reasoning?: string | undefined;
    }, {
        description: string;
        confidence: number;
        category: string;
        severity: string;
        title: string;
        evidence?: {
            contractIds?: string[] | undefined;
            invoiceIds?: string[] | undefined;
            relevantFields?: Record<string, unknown> | undefined;
        } | undefined;
        reasoning?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    patterns?: {
        description: string;
        confidence: number;
        category: string;
        severity: string;
        title: string;
        evidence?: {
            contractIds: string[];
            invoiceIds: string[];
            relevantFields: Record<string, unknown>;
        } | undefined;
        reasoning?: string | undefined;
    }[] | undefined;
    anomalies?: {
        description: string;
        confidence: number;
        category: string;
        severity: string;
        title: string;
        evidence?: {
            contractIds: string[];
            invoiceIds: string[];
            relevantFields: Record<string, unknown>;
        } | undefined;
        reasoning?: string | undefined;
    }[] | undefined;
}, {
    patterns?: {
        description: string;
        confidence: number;
        category: string;
        severity: string;
        title: string;
        evidence?: {
            contractIds?: string[] | undefined;
            invoiceIds?: string[] | undefined;
            relevantFields?: Record<string, unknown> | undefined;
        } | undefined;
        reasoning?: string | undefined;
    }[] | undefined;
    anomalies?: {
        description: string;
        confidence: number;
        category: string;
        severity: string;
        title: string;
        evidence?: {
            contractIds?: string[] | undefined;
            invoiceIds?: string[] | undefined;
            relevantFields?: Record<string, unknown> | undefined;
        } | undefined;
        reasoning?: string | undefined;
    }[] | undefined;
}>;
export declare const EstimatedImpactSchema: z.ZodObject<{
    revenueChange: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    confidence: z.ZodNumber;
    timeHorizon: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    confidence: number;
    revenueChange: number;
    timeHorizon?: string | undefined;
}, {
    confidence: number;
    revenueChange: number;
    currency?: string | undefined;
    timeHorizon?: string | undefined;
}>;
export declare const SimulationOverrideSchema: z.ZodObject<{
    type: z.ZodEnum<["contract_term", "price_change", "timing_shift", "discount_change", "billing_adjustment"]>;
    targetId: z.ZodString;
    field: z.ZodString;
    originalValue: z.ZodUnknown;
    newValue: z.ZodUnknown;
    effectiveDate: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
    targetId: string;
    field: string;
    description?: string | undefined;
    originalValue?: unknown;
    effectiveDate?: string | undefined;
    newValue?: unknown;
}, {
    type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
    targetId: string;
    field: string;
    description?: string | undefined;
    originalValue?: unknown;
    effectiveDate?: string | undefined;
    newValue?: unknown;
}>;
export declare const SuggestedSimulationSchema: z.ZodObject<{
    overrides: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["contract_term", "price_change", "timing_shift", "discount_change", "billing_adjustment"]>;
        targetId: z.ZodString;
        field: z.ZodString;
        originalValue: z.ZodUnknown;
        newValue: z.ZodUnknown;
        effectiveDate: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
        targetId: string;
        field: string;
        description?: string | undefined;
        originalValue?: unknown;
        effectiveDate?: string | undefined;
        newValue?: unknown;
    }, {
        type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
        targetId: string;
        field: string;
        description?: string | undefined;
        originalValue?: unknown;
        effectiveDate?: string | undefined;
        newValue?: unknown;
    }>, "many">>;
    description: z.ZodOptional<z.ZodString>;
    effectiveDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    overrides: {
        type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
        targetId: string;
        field: string;
        description?: string | undefined;
        originalValue?: unknown;
        effectiveDate?: string | undefined;
        newValue?: unknown;
    }[];
    description?: string | undefined;
    effectiveDate?: string | undefined;
}, {
    description?: string | undefined;
    overrides?: {
        type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
        targetId: string;
        field: string;
        description?: string | undefined;
        originalValue?: unknown;
        effectiveDate?: string | undefined;
        newValue?: unknown;
    }[] | undefined;
    effectiveDate?: string | undefined;
}>;
export declare const AIRecommendationSchema: z.ZodObject<{
    issueIndices: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    priority: z.ZodEnum<["critical", "high", "medium", "low"]>;
    title: z.ZodString;
    description: z.ZodString;
    estimatedImpact: z.ZodOptional<z.ZodObject<{
        revenueChange: z.ZodNumber;
        currency: z.ZodDefault<z.ZodString>;
        confidence: z.ZodNumber;
        timeHorizon: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        confidence: number;
        revenueChange: number;
        timeHorizon?: string | undefined;
    }, {
        confidence: number;
        revenueChange: number;
        currency?: string | undefined;
        timeHorizon?: string | undefined;
    }>>;
    suggestedSimulation: z.ZodOptional<z.ZodObject<{
        overrides: z.ZodDefault<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["contract_term", "price_change", "timing_shift", "discount_change", "billing_adjustment"]>;
            targetId: z.ZodString;
            field: z.ZodString;
            originalValue: z.ZodUnknown;
            newValue: z.ZodUnknown;
            effectiveDate: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
            targetId: string;
            field: string;
            description?: string | undefined;
            originalValue?: unknown;
            effectiveDate?: string | undefined;
            newValue?: unknown;
        }, {
            type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
            targetId: string;
            field: string;
            description?: string | undefined;
            originalValue?: unknown;
            effectiveDate?: string | undefined;
            newValue?: unknown;
        }>, "many">>;
        description: z.ZodOptional<z.ZodString>;
        effectiveDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        overrides: {
            type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
            targetId: string;
            field: string;
            description?: string | undefined;
            originalValue?: unknown;
            effectiveDate?: string | undefined;
            newValue?: unknown;
        }[];
        description?: string | undefined;
        effectiveDate?: string | undefined;
    }, {
        description?: string | undefined;
        overrides?: {
            type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
            targetId: string;
            field: string;
            description?: string | undefined;
            originalValue?: unknown;
            effectiveDate?: string | undefined;
            newValue?: unknown;
        }[] | undefined;
        effectiveDate?: string | undefined;
    }>>;
    suggestedOverrides: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["contract_term", "price_change", "timing_shift", "discount_change", "billing_adjustment"]>;
        targetId: z.ZodString;
        field: z.ZodString;
        originalValue: z.ZodUnknown;
        newValue: z.ZodUnknown;
        effectiveDate: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
        targetId: string;
        field: string;
        description?: string | undefined;
        originalValue?: unknown;
        effectiveDate?: string | undefined;
        newValue?: unknown;
    }, {
        type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
        targetId: string;
        field: string;
        description?: string | undefined;
        originalValue?: unknown;
        effectiveDate?: string | undefined;
        newValue?: unknown;
    }>, "many">>;
    steps: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    effort: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
    reasoning: z.ZodOptional<z.ZodString>;
    automationPossible: z.ZodDefault<z.ZodBoolean>;
    requiresApproval: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    description: string;
    title: string;
    priority: "low" | "medium" | "high" | "critical";
    issueIndices: number[];
    steps: string[];
    automationPossible: boolean;
    requiresApproval: boolean;
    estimatedImpact?: {
        currency: string;
        confidence: number;
        revenueChange: number;
        timeHorizon?: string | undefined;
    } | undefined;
    reasoning?: string | undefined;
    suggestedSimulation?: {
        overrides: {
            type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
            targetId: string;
            field: string;
            description?: string | undefined;
            originalValue?: unknown;
            effectiveDate?: string | undefined;
            newValue?: unknown;
        }[];
        description?: string | undefined;
        effectiveDate?: string | undefined;
    } | undefined;
    suggestedOverrides?: {
        type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
        targetId: string;
        field: string;
        description?: string | undefined;
        originalValue?: unknown;
        effectiveDate?: string | undefined;
        newValue?: unknown;
    }[] | undefined;
    effort?: "low" | "medium" | "high" | undefined;
}, {
    description: string;
    title: string;
    priority: "low" | "medium" | "high" | "critical";
    estimatedImpact?: {
        confidence: number;
        revenueChange: number;
        currency?: string | undefined;
        timeHorizon?: string | undefined;
    } | undefined;
    reasoning?: string | undefined;
    issueIndices?: number[] | undefined;
    suggestedSimulation?: {
        description?: string | undefined;
        overrides?: {
            type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
            targetId: string;
            field: string;
            description?: string | undefined;
            originalValue?: unknown;
            effectiveDate?: string | undefined;
            newValue?: unknown;
        }[] | undefined;
        effectiveDate?: string | undefined;
    } | undefined;
    suggestedOverrides?: {
        type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
        targetId: string;
        field: string;
        description?: string | undefined;
        originalValue?: unknown;
        effectiveDate?: string | undefined;
        newValue?: unknown;
    }[] | undefined;
    steps?: string[] | undefined;
    effort?: "low" | "medium" | "high" | undefined;
    automationPossible?: boolean | undefined;
    requiresApproval?: boolean | undefined;
}>;
export declare const RecommendationResponseSchema: z.ZodObject<{
    recommendations: z.ZodDefault<z.ZodArray<z.ZodObject<{
        issueIndices: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        priority: z.ZodEnum<["critical", "high", "medium", "low"]>;
        title: z.ZodString;
        description: z.ZodString;
        estimatedImpact: z.ZodOptional<z.ZodObject<{
            revenueChange: z.ZodNumber;
            currency: z.ZodDefault<z.ZodString>;
            confidence: z.ZodNumber;
            timeHorizon: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            currency: string;
            confidence: number;
            revenueChange: number;
            timeHorizon?: string | undefined;
        }, {
            confidence: number;
            revenueChange: number;
            currency?: string | undefined;
            timeHorizon?: string | undefined;
        }>>;
        suggestedSimulation: z.ZodOptional<z.ZodObject<{
            overrides: z.ZodDefault<z.ZodArray<z.ZodObject<{
                type: z.ZodEnum<["contract_term", "price_change", "timing_shift", "discount_change", "billing_adjustment"]>;
                targetId: z.ZodString;
                field: z.ZodString;
                originalValue: z.ZodUnknown;
                newValue: z.ZodUnknown;
                effectiveDate: z.ZodOptional<z.ZodString>;
                description: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
                targetId: string;
                field: string;
                description?: string | undefined;
                originalValue?: unknown;
                effectiveDate?: string | undefined;
                newValue?: unknown;
            }, {
                type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
                targetId: string;
                field: string;
                description?: string | undefined;
                originalValue?: unknown;
                effectiveDate?: string | undefined;
                newValue?: unknown;
            }>, "many">>;
            description: z.ZodOptional<z.ZodString>;
            effectiveDate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            overrides: {
                type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
                targetId: string;
                field: string;
                description?: string | undefined;
                originalValue?: unknown;
                effectiveDate?: string | undefined;
                newValue?: unknown;
            }[];
            description?: string | undefined;
            effectiveDate?: string | undefined;
        }, {
            description?: string | undefined;
            overrides?: {
                type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
                targetId: string;
                field: string;
                description?: string | undefined;
                originalValue?: unknown;
                effectiveDate?: string | undefined;
                newValue?: unknown;
            }[] | undefined;
            effectiveDate?: string | undefined;
        }>>;
        suggestedOverrides: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["contract_term", "price_change", "timing_shift", "discount_change", "billing_adjustment"]>;
            targetId: z.ZodString;
            field: z.ZodString;
            originalValue: z.ZodUnknown;
            newValue: z.ZodUnknown;
            effectiveDate: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
            targetId: string;
            field: string;
            description?: string | undefined;
            originalValue?: unknown;
            effectiveDate?: string | undefined;
            newValue?: unknown;
        }, {
            type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
            targetId: string;
            field: string;
            description?: string | undefined;
            originalValue?: unknown;
            effectiveDate?: string | undefined;
            newValue?: unknown;
        }>, "many">>;
        steps: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        effort: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
        reasoning: z.ZodOptional<z.ZodString>;
        automationPossible: z.ZodDefault<z.ZodBoolean>;
        requiresApproval: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        title: string;
        priority: "low" | "medium" | "high" | "critical";
        issueIndices: number[];
        steps: string[];
        automationPossible: boolean;
        requiresApproval: boolean;
        estimatedImpact?: {
            currency: string;
            confidence: number;
            revenueChange: number;
            timeHorizon?: string | undefined;
        } | undefined;
        reasoning?: string | undefined;
        suggestedSimulation?: {
            overrides: {
                type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
                targetId: string;
                field: string;
                description?: string | undefined;
                originalValue?: unknown;
                effectiveDate?: string | undefined;
                newValue?: unknown;
            }[];
            description?: string | undefined;
            effectiveDate?: string | undefined;
        } | undefined;
        suggestedOverrides?: {
            type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
            targetId: string;
            field: string;
            description?: string | undefined;
            originalValue?: unknown;
            effectiveDate?: string | undefined;
            newValue?: unknown;
        }[] | undefined;
        effort?: "low" | "medium" | "high" | undefined;
    }, {
        description: string;
        title: string;
        priority: "low" | "medium" | "high" | "critical";
        estimatedImpact?: {
            confidence: number;
            revenueChange: number;
            currency?: string | undefined;
            timeHorizon?: string | undefined;
        } | undefined;
        reasoning?: string | undefined;
        issueIndices?: number[] | undefined;
        suggestedSimulation?: {
            description?: string | undefined;
            overrides?: {
                type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
                targetId: string;
                field: string;
                description?: string | undefined;
                originalValue?: unknown;
                effectiveDate?: string | undefined;
                newValue?: unknown;
            }[] | undefined;
            effectiveDate?: string | undefined;
        } | undefined;
        suggestedOverrides?: {
            type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
            targetId: string;
            field: string;
            description?: string | undefined;
            originalValue?: unknown;
            effectiveDate?: string | undefined;
            newValue?: unknown;
        }[] | undefined;
        steps?: string[] | undefined;
        effort?: "low" | "medium" | "high" | undefined;
        automationPossible?: boolean | undefined;
        requiresApproval?: boolean | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    recommendations: {
        description: string;
        title: string;
        priority: "low" | "medium" | "high" | "critical";
        issueIndices: number[];
        steps: string[];
        automationPossible: boolean;
        requiresApproval: boolean;
        estimatedImpact?: {
            currency: string;
            confidence: number;
            revenueChange: number;
            timeHorizon?: string | undefined;
        } | undefined;
        reasoning?: string | undefined;
        suggestedSimulation?: {
            overrides: {
                type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
                targetId: string;
                field: string;
                description?: string | undefined;
                originalValue?: unknown;
                effectiveDate?: string | undefined;
                newValue?: unknown;
            }[];
            description?: string | undefined;
            effectiveDate?: string | undefined;
        } | undefined;
        suggestedOverrides?: {
            type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
            targetId: string;
            field: string;
            description?: string | undefined;
            originalValue?: unknown;
            effectiveDate?: string | undefined;
            newValue?: unknown;
        }[] | undefined;
        effort?: "low" | "medium" | "high" | undefined;
    }[];
}, {
    recommendations?: {
        description: string;
        title: string;
        priority: "low" | "medium" | "high" | "critical";
        estimatedImpact?: {
            confidence: number;
            revenueChange: number;
            currency?: string | undefined;
            timeHorizon?: string | undefined;
        } | undefined;
        reasoning?: string | undefined;
        issueIndices?: number[] | undefined;
        suggestedSimulation?: {
            description?: string | undefined;
            overrides?: {
                type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
                targetId: string;
                field: string;
                description?: string | undefined;
                originalValue?: unknown;
                effectiveDate?: string | undefined;
                newValue?: unknown;
            }[] | undefined;
            effectiveDate?: string | undefined;
        } | undefined;
        suggestedOverrides?: {
            type: "contract_term" | "billing_adjustment" | "timing_shift" | "discount_change" | "price_change";
            targetId: string;
            field: string;
            description?: string | undefined;
            originalValue?: unknown;
            effectiveDate?: string | undefined;
            newValue?: unknown;
        }[] | undefined;
        steps?: string[] | undefined;
        effort?: "low" | "medium" | "high" | undefined;
        automationPossible?: boolean | undefined;
        requiresApproval?: boolean | undefined;
    }[] | undefined;
}>;
export declare const ImpactEstimationResponseSchema: z.ZodObject<{
    directImpact: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodDefault<z.ZodString>;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        confidence: number;
        amount: number;
    }, {
        confidence: number;
        amount: number;
        currency?: string | undefined;
    }>;
    ongoingPrevention: z.ZodOptional<z.ZodObject<{
        annualAmount: z.ZodNumber;
        currency: z.ZodDefault<z.ZodString>;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        confidence: number;
        annualAmount: number;
    }, {
        confidence: number;
        annualAmount: number;
        currency?: string | undefined;
    }>>;
    summary: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    directImpact: {
        currency: string;
        confidence: number;
        amount: number;
    };
    summary?: string | undefined;
    ongoingPrevention?: {
        currency: string;
        confidence: number;
        annualAmount: number;
    } | undefined;
}, {
    directImpact: {
        confidence: number;
        amount: number;
        currency?: string | undefined;
    };
    summary?: string | undefined;
    ongoingPrevention?: {
        confidence: number;
        annualAmount: number;
        currency?: string | undefined;
    } | undefined;
}>;
export declare const LOW_CONFIDENCE_THRESHOLD = 0.7;
/**
 * Compute if a response needs human review based on confidence
 */
export declare function computeNeedsReview(confidence: number | undefined): boolean;
export declare const FieldCategorySchema: z.ZodEnum<["required", "standard", "metadata"]>;
export declare const ColumnMappingSuggestionSchema: z.ZodObject<{
    sourceColumn: z.ZodString;
    targetField: z.ZodString;
    category: z.ZodEnum<["required", "standard", "metadata"]>;
    metadataKey: z.ZodOptional<z.ZodString>;
    confidence: z.ZodNumber;
    reasoning: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sourceColumn: string;
    targetField: string;
    confidence: number;
    category: "required" | "metadata" | "standard";
    reasoning: string;
    metadataKey?: string | undefined;
}, {
    sourceColumn: string;
    targetField: string;
    confidence: number;
    category: "required" | "metadata" | "standard";
    reasoning: string;
    metadataKey?: string | undefined;
}>;
export declare const CSVEntityTypeSchema: z.ZodEnum<["customer", "invoice", "contract", "payment", "product", "subscription", "usage", "credit_memo", "unknown"]>;
export declare const CSVAnalysisResultSchema: z.ZodObject<{
    entityType: z.ZodEnum<["customer", "invoice", "contract", "payment", "product", "subscription", "usage", "credit_memo", "unknown"]>;
    entityTypeConfidence: z.ZodNumber;
    entityTypeReasoning: z.ZodOptional<z.ZodString>;
    columnMappings: z.ZodDefault<z.ZodArray<z.ZodObject<{
        sourceColumn: z.ZodString;
        targetField: z.ZodString;
        category: z.ZodEnum<["required", "standard", "metadata"]>;
        metadataKey: z.ZodOptional<z.ZodString>;
        confidence: z.ZodNumber;
        reasoning: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        sourceColumn: string;
        targetField: string;
        confidence: number;
        category: "required" | "metadata" | "standard";
        reasoning: string;
        metadataKey?: string | undefined;
    }, {
        sourceColumn: string;
        targetField: string;
        confidence: number;
        category: "required" | "metadata" | "standard";
        reasoning: string;
        metadataKey?: string | undefined;
    }>, "many">>;
    requiredMissing: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    suggestions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    warnings: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    entityType: "unknown" | "customer" | "invoice" | "contract" | "payment" | "product" | "subscription" | "usage" | "credit_memo";
    warnings: string[];
    entityTypeConfidence: number;
    columnMappings: {
        sourceColumn: string;
        targetField: string;
        confidence: number;
        category: "required" | "metadata" | "standard";
        reasoning: string;
        metadataKey?: string | undefined;
    }[];
    requiredMissing: string[];
    suggestions: string[];
    entityTypeReasoning?: string | undefined;
}, {
    entityType: "unknown" | "customer" | "invoice" | "contract" | "payment" | "product" | "subscription" | "usage" | "credit_memo";
    entityTypeConfidence: number;
    warnings?: string[] | undefined;
    entityTypeReasoning?: string | undefined;
    columnMappings?: {
        sourceColumn: string;
        targetField: string;
        confidence: number;
        category: "required" | "metadata" | "standard";
        reasoning: string;
        metadataKey?: string | undefined;
    }[] | undefined;
    requiredMissing?: string[] | undefined;
    suggestions?: string[] | undefined;
}>;
export declare const ColumnMappingSchema: z.ZodObject<{
    sourceColumn: z.ZodString;
    targetField: z.ZodString;
    confidence: z.ZodNumber;
    transformation: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sourceColumn: string;
    targetField: string;
    confidence: number;
    transformation?: string | undefined;
}, {
    sourceColumn: string;
    targetField: string;
    confidence: number;
    transformation?: string | undefined;
}>;
export declare const CSVAnalysisResponseSchema: z.ZodObject<{
    entityType: z.ZodString;
    columnMappings: z.ZodDefault<z.ZodArray<z.ZodObject<{
        sourceColumn: z.ZodString;
        targetField: z.ZodString;
        confidence: z.ZodNumber;
        transformation: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sourceColumn: string;
        targetField: string;
        confidence: number;
        transformation?: string | undefined;
    }, {
        sourceColumn: string;
        targetField: string;
        confidence: number;
        transformation?: string | undefined;
    }>, "many">>;
    dateFormat: z.ZodOptional<z.ZodString>;
    currencyCode: z.ZodOptional<z.ZodString>;
    warnings: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    entityType: string;
    warnings: string[];
    columnMappings: {
        sourceColumn: string;
        targetField: string;
        confidence: number;
        transformation?: string | undefined;
    }[];
    dateFormat?: string | undefined;
    currencyCode?: string | undefined;
}, {
    entityType: string;
    dateFormat?: string | undefined;
    warnings?: string[] | undefined;
    columnMappings?: {
        sourceColumn: string;
        targetField: string;
        confidence: number;
        transformation?: string | undefined;
    }[] | undefined;
    currencyCode?: string | undefined;
}>;
export declare const PartyInfoSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodOptional<z.ZodEnum<["company", "individual"]>>;
    address: z.ZodOptional<z.ZodString>;
    jurisdiction: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    type?: "company" | "individual" | undefined;
    address?: string | undefined;
    jurisdiction?: string | undefined;
}, {
    name: string;
    type?: "company" | "individual" | undefined;
    address?: string | undefined;
    jurisdiction?: string | undefined;
}>;
export declare const DocumentTypeSchema: z.ZodEnum<["msa", "order_form", "amendment", "sow", "addendum", "other"]>;
export declare const RawTermSchema: z.ZodObject<{
    type: z.ZodString;
    value: z.ZodUnknown;
    matchedText: z.ZodString;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: string;
    confidence: number;
    matchedText: string;
    value?: unknown;
}, {
    type: string;
    confidence: number;
    matchedText: string;
    value?: unknown;
}>;
export declare const ProductInfoSchema: z.ZodObject<{
    name: z.ZodString;
    quantity: z.ZodOptional<z.ZodNumber>;
    unitPrice: z.ZodOptional<z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amount: number;
    }, {
        currency: string;
        amount: number;
    }>>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | undefined;
    quantity?: number | undefined;
    unitPrice?: {
        currency: string;
        amount: number;
    } | undefined;
}, {
    name: string;
    description?: string | undefined;
    quantity?: number | undefined;
    unitPrice?: {
        currency: string;
        amount: number;
    } | undefined;
}>;
export declare const StructuredContractDataSchema: z.ZodObject<{
    documentType: z.ZodUnion<[z.ZodEnum<["msa", "order_form", "amendment", "sow", "addendum", "other"]>, z.ZodString]>;
    parties: z.ZodDefault<z.ZodObject<{
        customer: z.ZodOptional<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodOptional<z.ZodEnum<["company", "individual"]>>;
            address: z.ZodOptional<z.ZodString>;
            jurisdiction: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            type?: "company" | "individual" | undefined;
            address?: string | undefined;
            jurisdiction?: string | undefined;
        }, {
            name: string;
            type?: "company" | "individual" | undefined;
            address?: string | undefined;
            jurisdiction?: string | undefined;
        }>>;
        vendor: z.ZodOptional<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodOptional<z.ZodEnum<["company", "individual"]>>;
            address: z.ZodOptional<z.ZodString>;
            jurisdiction: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            type?: "company" | "individual" | undefined;
            address?: string | undefined;
            jurisdiction?: string | undefined;
        }, {
            name: string;
            type?: "company" | "individual" | undefined;
            address?: string | undefined;
            jurisdiction?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        customer?: {
            name: string;
            type?: "company" | "individual" | undefined;
            address?: string | undefined;
            jurisdiction?: string | undefined;
        } | undefined;
        vendor?: {
            name: string;
            type?: "company" | "individual" | undefined;
            address?: string | undefined;
            jurisdiction?: string | undefined;
        } | undefined;
    }, {
        customer?: {
            name: string;
            type?: "company" | "individual" | undefined;
            address?: string | undefined;
            jurisdiction?: string | undefined;
        } | undefined;
        vendor?: {
            name: string;
            type?: "company" | "individual" | undefined;
            address?: string | undefined;
            jurisdiction?: string | undefined;
        } | undefined;
    }>>;
    dates: z.ZodDefault<z.ZodObject<{
        effectiveDate: z.ZodOptional<z.ZodString>;
        expirationDate: z.ZodOptional<z.ZodString>;
        signedDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        effectiveDate?: string | undefined;
        expirationDate?: string | undefined;
        signedDate?: string | undefined;
    }, {
        effectiveDate?: string | undefined;
        expirationDate?: string | undefined;
        signedDate?: string | undefined;
    }>>;
    financials: z.ZodDefault<z.ZodObject<{
        contractValue: z.ZodOptional<z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
            period: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            currency: string;
            amount: number;
            period?: string | undefined;
        }, {
            currency: string;
            amount: number;
            period?: string | undefined;
        }>>;
        paymentTerms: z.ZodOptional<z.ZodString>;
        billingCadence: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["monthly", "quarterly", "annually"]>, z.ZodString]>>;
        discount: z.ZodOptional<z.ZodObject<{
            percentage: z.ZodOptional<z.ZodNumber>;
            amount: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            percentage?: number | undefined;
            amount?: number | undefined;
        }, {
            percentage?: number | undefined;
            amount?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        discount?: {
            percentage?: number | undefined;
            amount?: number | undefined;
        } | undefined;
        billingCadence?: string | undefined;
        contractValue?: {
            currency: string;
            amount: number;
            period?: string | undefined;
        } | undefined;
        paymentTerms?: string | undefined;
    }, {
        discount?: {
            percentage?: number | undefined;
            amount?: number | undefined;
        } | undefined;
        billingCadence?: string | undefined;
        contractValue?: {
            currency: string;
            amount: number;
            period?: string | undefined;
        } | undefined;
        paymentTerms?: string | undefined;
    }>>;
    terms: z.ZodDefault<z.ZodObject<{
        termLength: z.ZodOptional<z.ZodString>;
        autoRenew: z.ZodOptional<z.ZodBoolean>;
        noticePeriod: z.ZodOptional<z.ZodString>;
        terminationTerms: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        autoRenew?: boolean | undefined;
        termLength?: string | undefined;
        noticePeriod?: string | undefined;
        terminationTerms?: string | undefined;
    }, {
        autoRenew?: boolean | undefined;
        termLength?: string | undefined;
        noticePeriod?: string | undefined;
        terminationTerms?: string | undefined;
    }>>;
    products: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        quantity: z.ZodOptional<z.ZodNumber>;
        unitPrice: z.ZodOptional<z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            currency: string;
            amount: number;
        }, {
            currency: string;
            amount: number;
        }>>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description?: string | undefined;
        quantity?: number | undefined;
        unitPrice?: {
            currency: string;
            amount: number;
        } | undefined;
    }, {
        name: string;
        description?: string | undefined;
        quantity?: number | undefined;
        unitPrice?: {
            currency: string;
            amount: number;
        } | undefined;
    }>, "many">>;
    rawTerms: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        value: z.ZodUnknown;
        matchedText: z.ZodString;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: string;
        confidence: number;
        matchedText: string;
        value?: unknown;
    }, {
        type: string;
        confidence: number;
        matchedText: string;
        value?: unknown;
    }>, "many">>;
    summary: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    products: {
        name: string;
        description?: string | undefined;
        quantity?: number | undefined;
        unitPrice?: {
            currency: string;
            amount: number;
        } | undefined;
    }[];
    summary: string;
    terms: {
        autoRenew?: boolean | undefined;
        termLength?: string | undefined;
        noticePeriod?: string | undefined;
        terminationTerms?: string | undefined;
    };
    documentType: string;
    parties: {
        customer?: {
            name: string;
            type?: "company" | "individual" | undefined;
            address?: string | undefined;
            jurisdiction?: string | undefined;
        } | undefined;
        vendor?: {
            name: string;
            type?: "company" | "individual" | undefined;
            address?: string | undefined;
            jurisdiction?: string | undefined;
        } | undefined;
    };
    dates: {
        effectiveDate?: string | undefined;
        expirationDate?: string | undefined;
        signedDate?: string | undefined;
    };
    financials: {
        discount?: {
            percentage?: number | undefined;
            amount?: number | undefined;
        } | undefined;
        billingCadence?: string | undefined;
        contractValue?: {
            currency: string;
            amount: number;
            period?: string | undefined;
        } | undefined;
        paymentTerms?: string | undefined;
    };
    rawTerms: {
        type: string;
        confidence: number;
        matchedText: string;
        value?: unknown;
    }[];
}, {
    documentType: string;
    products?: {
        name: string;
        description?: string | undefined;
        quantity?: number | undefined;
        unitPrice?: {
            currency: string;
            amount: number;
        } | undefined;
    }[] | undefined;
    summary?: string | undefined;
    terms?: {
        autoRenew?: boolean | undefined;
        termLength?: string | undefined;
        noticePeriod?: string | undefined;
        terminationTerms?: string | undefined;
    } | undefined;
    parties?: {
        customer?: {
            name: string;
            type?: "company" | "individual" | undefined;
            address?: string | undefined;
            jurisdiction?: string | undefined;
        } | undefined;
        vendor?: {
            name: string;
            type?: "company" | "individual" | undefined;
            address?: string | undefined;
            jurisdiction?: string | undefined;
        } | undefined;
    } | undefined;
    dates?: {
        effectiveDate?: string | undefined;
        expirationDate?: string | undefined;
        signedDate?: string | undefined;
    } | undefined;
    financials?: {
        discount?: {
            percentage?: number | undefined;
            amount?: number | undefined;
        } | undefined;
        billingCadence?: string | undefined;
        contractValue?: {
            currency: string;
            amount: number;
            period?: string | undefined;
        } | undefined;
        paymentTerms?: string | undefined;
    } | undefined;
    rawTerms?: {
        type: string;
        confidence: number;
        matchedText: string;
        value?: unknown;
    }[] | undefined;
}>;
export declare const ExtractedTermSchema: z.ZodObject<{
    type: z.ZodString;
    value: z.ZodUnknown;
    confidence: z.ZodNumber;
    sourceText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: string;
    confidence: number;
    value?: unknown;
    sourceText?: string | undefined;
}, {
    type: string;
    confidence: number;
    value?: unknown;
    sourceText?: string | undefined;
}>;
export declare const LLMExtractionSchema: z.ZodObject<{
    termType: z.ZodString;
    value: z.ZodUnknown;
    confidence: z.ZodNumber;
    matchedText: z.ZodString;
    reasoning: z.ZodString;
    startOffset: z.ZodOptional<z.ZodNumber>;
    endOffset: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    termType: string;
    confidence: number;
    matchedText: string;
    reasoning: string;
    value?: unknown;
    startOffset?: number | undefined;
    endOffset?: number | undefined;
}, {
    termType: string;
    confidence: number;
    matchedText: string;
    reasoning: string;
    value?: unknown;
    startOffset?: number | undefined;
    endOffset?: number | undefined;
}>;
export declare const ExtractTermsResponseSchema: z.ZodObject<{
    extractions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        termType: z.ZodString;
        value: z.ZodUnknown;
        confidence: z.ZodNumber;
        matchedText: z.ZodString;
        reasoning: z.ZodString;
        startOffset: z.ZodOptional<z.ZodNumber>;
        endOffset: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        termType: string;
        confidence: number;
        matchedText: string;
        reasoning: string;
        value?: unknown;
        startOffset?: number | undefined;
        endOffset?: number | undefined;
    }, {
        termType: string;
        confidence: number;
        matchedText: string;
        reasoning: string;
        value?: unknown;
        startOffset?: number | undefined;
        endOffset?: number | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    extractions: {
        termType: string;
        confidence: number;
        matchedText: string;
        reasoning: string;
        value?: unknown;
        startOffset?: number | undefined;
        endOffset?: number | undefined;
    }[];
}, {
    extractions?: {
        termType: string;
        confidence: number;
        matchedText: string;
        reasoning: string;
        value?: unknown;
        startOffset?: number | undefined;
        endOffset?: number | undefined;
    }[] | undefined;
}>;
export declare const ConflictResolutionSchema: z.ZodObject<{
    winningTermIndex: z.ZodNumber;
    reasoning: z.ZodString;
    confidence: z.ZodNumber;
    appliedRules: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    suggestedAction: z.ZodEnum<["accept", "review", "reject"]>;
}, "strip", z.ZodTypeAny, {
    confidence: number;
    winningTermIndex: number;
    appliedRules: string[];
    reasoning: string;
    suggestedAction: "reject" | "review" | "accept";
}, {
    confidence: number;
    winningTermIndex: number;
    reasoning: string;
    suggestedAction: "reject" | "review" | "accept";
    appliedRules?: string[] | undefined;
}>;
export declare const OverrideTypeSchema: z.ZodEnum<["notwithstanding", "except_as", "prevails_over", "controls", "supersedes"]>;
export declare const OverrideDetectionSchema: z.ZodObject<{
    type: z.ZodEnum<["notwithstanding", "except_as", "prevails_over", "controls", "supersedes"]>;
    matchedText: z.ZodString;
    targetSection: z.ZodOptional<z.ZodString>;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "notwithstanding" | "except_as" | "prevails_over" | "controls" | "supersedes";
    confidence: number;
    matchedText: string;
    targetSection?: string | undefined;
}, {
    type: "notwithstanding" | "except_as" | "prevails_over" | "controls" | "supersedes";
    confidence: number;
    matchedText: string;
    targetSection?: string | undefined;
}>;
export declare const DetectOverrideResponseSchema: z.ZodObject<{
    overrides: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["notwithstanding", "except_as", "prevails_over", "controls", "supersedes"]>;
        matchedText: z.ZodString;
        targetSection: z.ZodOptional<z.ZodString>;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "notwithstanding" | "except_as" | "prevails_over" | "controls" | "supersedes";
        confidence: number;
        matchedText: string;
        targetSection?: string | undefined;
    }, {
        type: "notwithstanding" | "except_as" | "prevails_over" | "controls" | "supersedes";
        confidence: number;
        matchedText: string;
        targetSection?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    overrides: {
        type: "notwithstanding" | "except_as" | "prevails_over" | "controls" | "supersedes";
        confidence: number;
        matchedText: string;
        targetSection?: string | undefined;
    }[];
}, {
    overrides?: {
        type: "notwithstanding" | "except_as" | "prevails_over" | "controls" | "supersedes";
        confidence: number;
        matchedText: string;
        targetSection?: string | undefined;
    }[] | undefined;
}>;
export type IssueEnrichment = z.infer<typeof IssueEnrichmentSchema>;
export type IssueEnrichmentResponse = z.infer<typeof IssueEnrichmentResponseSchema>;
export type ExplanationResponse = z.infer<typeof ExplanationResponseSchema>;
export type FixSuggestionResponse = z.infer<typeof FixSuggestionResponseSchema>;
export type AIDiscoveredIssue = z.infer<typeof AIDiscoveredIssueSchema>;
export type AnomalyDetectionResponse = z.infer<typeof AnomalyDetectionResponseSchema>;
export type AIRecommendation = z.infer<typeof AIRecommendationSchema>;
export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>;
export type SimulationOverride = z.infer<typeof SimulationOverrideSchema>;
export type CSVAnalysisResponse = z.infer<typeof CSVAnalysisResponseSchema>;
export type CSVAnalysisResult = z.infer<typeof CSVAnalysisResultSchema>;
export type ColumnMappingSuggestion = z.infer<typeof ColumnMappingSuggestionSchema>;
export type StructuredContractData = z.infer<typeof StructuredContractDataSchema>;
export type PartyInfo = z.infer<typeof PartyInfoSchema>;
export type RawTerm = z.infer<typeof RawTermSchema>;
export type LLMExtraction = z.infer<typeof LLMExtractionSchema>;
export type ConflictResolution = z.infer<typeof ConflictResolutionSchema>;
export type OverrideDetection = z.infer<typeof OverrideDetectionSchema>;
/**
 * Safely parse LLM JSON response with Zod validation
 * Returns parsed data or undefined if validation fails
 */
export declare function safeParseLLMResponse<T>(schema: z.ZodSchema<T>, content: string, fallback?: T): T | undefined;
/**
 * Parse LLM response with validation, throwing on failure
 */
export declare function parseLLMResponse<T>(schema: z.ZodSchema<T>, content: string): T;
/**
 * Validate and coerce LLM response with defaults
 * More lenient - fills in missing fields with defaults where possible
 */
export declare function coerceLLMResponse<T>(schema: z.ZodSchema<T>, content: string): {
    data: T | null;
    errors: z.ZodIssue[];
};
//# sourceMappingURL=schemas.d.ts.map