/**
 * Anomaly Detection LLM - AI-Powered Pattern Detection (Tier 3)
 *
 * Production-ready LLM client for anomaly detection with:
 * - Rate limit handling
 * - Cost tracking
 * - Token limit validation
 * - Concurrent request limiting
 */
import type { RuleIssue, RuleContext, AIDiscoveredIssue } from '@cogtics/rules';
import { ProductionLLMClient, type BaseLLMConfig } from './base-client.js';
export interface AnomalyDetectionLLMConfig extends Partial<BaseLLMConfig> {
    /** Default detection configuration */
    detectionConfig?: Partial<AnomalyDetectionConfig>;
}
export interface AnomalyDetectionConfig {
    /** Minimum confidence to report anomalies (default: 0.6, generous) */
    minConfidenceToReport: number;
    /** Maximum anomalies to report per run (default: 100, very generous) */
    maxAnomaliesPerRun: number;
    /** Enabled detection categories */
    categories: Array<'semantic' | 'pattern' | 'anomaly' | 'contextual'>;
}
export interface AnomalyDetectionStats {
    totalAnomalies: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    durationMs: number;
    tokensUsed: number;
    costUsd: number;
    cacheHits: number;
}
export declare class AnomalyDetectionLLM extends ProductionLLMClient {
    private defaultConfig;
    private stats;
    constructor(config?: AnomalyDetectionLLMConfig);
    private initStats;
    /**
     * Detect anomalies in the data that rules might miss
     */
    detectAnomalies(context: RuleContext, existingIssues: RuleIssue[], config?: Partial<AnomalyDetectionConfig>): Promise<AIDiscoveredIssue[]>;
    /**
     * Detect semantic anomalies (pricing mismatches, unusual discounts)
     */
    private detectSemanticAnomalies;
    /**
     * Detect cross-contract patterns (inconsistent pricing across customers)
     */
    private detectCrossContractPatterns;
    /**
     * Detect unusual patterns (statistical outliers, timing issues)
     */
    private detectUnusualPatterns;
    /**
     * Convert API responses to AIDiscoveredIssue format
     */
    private convertToAIDiscoveredIssues;
    /**
     * Get detection statistics
     */
    getStats(): AnomalyDetectionStats;
}
/**
 * Create an AnomalyDetectionLLM instance from environment variables
 */
export declare function createAnomalyDetectionLLM(config?: AnomalyDetectionLLMConfig): AnomalyDetectionLLM | null;
//# sourceMappingURL=anomaly-detection.d.ts.map