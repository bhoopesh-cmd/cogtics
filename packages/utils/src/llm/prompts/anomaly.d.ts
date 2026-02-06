/**
 * Anomaly Detection LLM Prompts
 *
 * Prompts for AI-powered anomaly detection including semantic analysis,
 * cross-contract patterns, and unusual pattern detection.
 */
import type { RuleIssue, ContractWithTerms, InvoiceWithLines } from '@cogtics/rules';
/** Prompt version for audit logging and replay */
export declare const ANOMALY_PROMPT_VERSION = "1.0.0";
export declare const ANOMALY_SYSTEM_PROMPTS: {
    semanticAnomaly: string;
    crossContractPattern: string;
    unusualPattern: string;
};
/**
 * Generate semantic anomaly detection prompt
 */
export declare function semanticAnomalyPrompt(contracts: ContractWithTerms[], invoices: InvoiceWithLines[], existingIssues: RuleIssue[]): string;
/**
 * Generate cross-contract pattern detection prompt
 */
export declare function crossContractPatternPrompt(contracts: ContractWithTerms[], groupingContext: {
    byCustomer?: Map<string, ContractWithTerms[]>;
    byProduct?: Map<string, ContractWithTerms[]>;
}): string;
/**
 * Generate unusual pattern detection prompt
 */
export declare function unusualPatternPrompt(data: {
    contracts: ContractWithTerms[];
    invoices: InvoiceWithLines[];
}, existingIssues: RuleIssue[]): string;
export interface AnomalyDetectionResponse {
    anomalies?: AIDiscoveredIssueResponse[];
    patterns?: AIDiscoveredIssueResponse[];
}
export interface AIDiscoveredIssueResponse {
    category: 'semantic' | 'pattern' | 'anomaly' | 'contextual';
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    title: string;
    description: string;
    evidence: {
        contractIds: string[];
        invoiceIds: string[];
        relevantFields: Record<string, unknown>;
    };
    reasoning: string;
}
//# sourceMappingURL=anomaly.d.ts.map