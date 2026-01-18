/**
 * Evidence Trail
 * 
 * Enhanced evidence storage for contract term extraction.
 * Provides full traceability for audits and explanations.
 */

import type { ExtractedTerm, TermType, ExtractionMethod } from './extraction.js';
import type { PrecedenceDecision, AppliedRule } from './precedence.js';
import type { ValidationIssue } from './validation.js';

// ============================================
// Types
// ============================================

export interface TermEvidence {
  // Source location
  clauseId?: string;
  documentId: string;
  pageNumber: number | null;
  startOffset: number;
  endOffset: number;
  
  // Text evidence
  matchedText: string;
  contextBefore: string;  // Text before the match (for context)
  contextAfter: string;   // Text after the match (for context)
  
  // Extraction details
  extractionMethod: ExtractionMethod;
  extractionRuleName?: string;
  extractionPattern?: string;
  
  // LLM-specific evidence (if applicable)
  llmReasoning?: string;
  llmConfidence?: number;
  llmModel?: string;
  
  // Precedence evidence (if term was from conflict resolution)
  precedenceApplied?: PrecedenceEvidence;
  
  // Validation status
  validationStatus: 'valid' | 'warning' | 'error';
  validationIssues: ValidationIssue[];
}

export interface PrecedenceEvidence {
  conflictId?: string;
  appliedRules: AppliedRule[];
  competingTerms: CompetingTermSummary[];
  auditLog: string;
  resolutionConfidence: number;
}

export interface CompetingTermSummary {
  documentId: string;
  documentType?: string;
  value: unknown;
  confidence: number;
  matchedText: string;
  reason: string;  // Why this term lost
}

export interface EvidenceBuilder {
  withContext(fullText: string, startOffset: number, endOffset: number, contextSize?: number): EvidenceBuilder;
  withLLMReasoning(reasoning: string, model?: string, confidence?: number): EvidenceBuilder;
  withPrecedence(decision: PrecedenceDecision): EvidenceBuilder;
  withValidation(issues: ValidationIssue[]): EvidenceBuilder;
  build(): TermEvidence;
}

// ============================================
// Evidence Builder
// ============================================

export function createEvidenceBuilder(
  term: ExtractedTerm,
  documentId: string,
  pageNumber: number | null = null
): EvidenceBuilder {
  let evidence: Partial<TermEvidence> = {
    documentId,
    pageNumber,
    startOffset: term.startOffset,
    endOffset: term.endOffset,
    matchedText: term.matchedText,
    extractionMethod: term.extractionMethod,
    contextBefore: '',
    contextAfter: '',
    validationStatus: 'valid',
    validationIssues: [],
  };

  return {
    withContext(fullText: string, startOffset: number, endOffset: number, contextSize: number = 100): EvidenceBuilder {
      const contextStart = Math.max(0, startOffset - contextSize);
      const contextEnd = Math.min(fullText.length, endOffset + contextSize);
      
      evidence.contextBefore = fullText.substring(contextStart, startOffset).trim();
      evidence.contextAfter = fullText.substring(endOffset, contextEnd).trim();
      
      return this;
    },

    withLLMReasoning(reasoning: string, model?: string, confidence?: number): EvidenceBuilder {
      evidence.llmReasoning = reasoning;
      evidence.llmModel = model;
      evidence.llmConfidence = confidence;
      return this;
    },

    withPrecedence(decision: PrecedenceDecision): EvidenceBuilder {
      evidence.precedenceApplied = {
        appliedRules: decision.appliedRules,
        competingTerms: decision.losingTerms.map(t => ({
          documentId: t.documentId,
          documentType: t.documentType,
          value: t.term.value,
          confidence: t.term.confidence,
          matchedText: t.term.matchedText,
          reason: `Lost due to: ${decision.appliedRules.filter(r => r.result === 'decisive').map(r => r.name).join(', ')}`,
        })),
        auditLog: decision.auditLog,
        resolutionConfidence: decision.confidence,
      };
      return this;
    },

    withValidation(issues: ValidationIssue[]): EvidenceBuilder {
      evidence.validationIssues = issues;
      
      // Determine overall status
      const hasError = issues.some(i => i.severity === 'error');
      const hasWarning = issues.some(i => i.severity === 'warning');
      
      evidence.validationStatus = hasError ? 'error' : hasWarning ? 'warning' : 'valid';
      
      return this;
    },

    build(): TermEvidence {
      return evidence as TermEvidence;
    },
  };
}

// ============================================
// Evidence Extraction Helpers
// ============================================

/**
 * Extract context around a matched term
 */
export function extractContext(
  fullText: string,
  startOffset: number,
  endOffset: number,
  contextSize: number = 100
): { before: string; after: string } {
  const contextStart = Math.max(0, startOffset - contextSize);
  const contextEnd = Math.min(fullText.length, endOffset + contextSize);
  
  return {
    before: fullText.substring(contextStart, startOffset).trim(),
    after: fullText.substring(endOffset, contextEnd).trim(),
  };
}

/**
 * Build a human-readable evidence summary
 */
export function summarizeEvidence(evidence: TermEvidence): string {
  const lines: string[] = [];
  
  lines.push(`Source: Document ${evidence.documentId}`);
  if (evidence.pageNumber) {
    lines.push(`Page: ${evidence.pageNumber}`);
  }
  
  lines.push(`Extraction method: ${evidence.extractionMethod}`);
  
  lines.push('');
  lines.push('Matched text:');
  lines.push(`"${evidence.matchedText}"`);
  
  if (evidence.contextBefore || evidence.contextAfter) {
    lines.push('');
    lines.push('Context:');
    lines.push(`...${evidence.contextBefore} [MATCHED] ${evidence.contextAfter}...`);
  }
  
  if (evidence.llmReasoning) {
    lines.push('');
    lines.push('LLM Reasoning:');
    lines.push(evidence.llmReasoning);
  }
  
  if (evidence.precedenceApplied) {
    lines.push('');
    lines.push('Precedence Applied:');
    for (const rule of evidence.precedenceApplied.appliedRules) {
      lines.push(`  - ${rule.name}: ${rule.result}`);
    }
    if (evidence.precedenceApplied.competingTerms.length > 0) {
      lines.push(`  Competing terms from: ${evidence.precedenceApplied.competingTerms.map(t => t.documentId).join(', ')}`);
    }
  }
  
  if (evidence.validationIssues.length > 0) {
    lines.push('');
    lines.push('Validation Issues:');
    for (const issue of evidence.validationIssues) {
      lines.push(`  [${issue.severity.toUpperCase()}] ${issue.message}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Convert evidence to a database-storable format
 */
export function evidenceToJson(evidence: TermEvidence): Record<string, unknown> {
  return {
    documentId: evidence.documentId,
    pageNumber: evidence.pageNumber,
    startOffset: evidence.startOffset,
    endOffset: evidence.endOffset,
    matchedText: evidence.matchedText,
    contextBefore: evidence.contextBefore,
    contextAfter: evidence.contextAfter,
    extractionMethod: evidence.extractionMethod,
    llmReasoning: evidence.llmReasoning,
    llmModel: evidence.llmModel,
    llmConfidence: evidence.llmConfidence,
    precedenceApplied: evidence.precedenceApplied ? {
      appliedRules: evidence.precedenceApplied.appliedRules,
      competingTermsCount: evidence.precedenceApplied.competingTerms.length,
      resolutionConfidence: evidence.precedenceApplied.resolutionConfidence,
    } : null,
    validationStatus: evidence.validationStatus,
    validationIssueCount: evidence.validationIssues.length,
  };
}

/**
 * Parse evidence from database JSON
 */
export function evidenceFromJson(json: Record<string, unknown>): Partial<TermEvidence> {
  return {
    documentId: json.documentId as string,
    pageNumber: json.pageNumber as number | null,
    startOffset: json.startOffset as number,
    endOffset: json.endOffset as number,
    matchedText: json.matchedText as string,
    contextBefore: json.contextBefore as string,
    contextAfter: json.contextAfter as string,
    extractionMethod: json.extractionMethod as ExtractionMethod,
    llmReasoning: json.llmReasoning as string | undefined,
    llmModel: json.llmModel as string | undefined,
    llmConfidence: json.llmConfidence as number | undefined,
    validationStatus: json.validationStatus as 'valid' | 'warning' | 'error',
  };
}

// ============================================
// Evidence Formatting
// ============================================

/**
 * Format evidence for display in UI
 */
export function formatEvidenceForDisplay(evidence: TermEvidence): {
  location: string;
  extraction: string;
  validation: string;
  context: string;
} {
  return {
    location: evidence.pageNumber 
      ? `Page ${evidence.pageNumber}, offset ${evidence.startOffset}` 
      : `Offset ${evidence.startOffset}`,
    extraction: evidence.extractionMethod === 'llm'
      ? `LLM extracted${evidence.llmModel ? ` (${evidence.llmModel})` : ''}`
      : `Rule-based extraction`,
    validation: evidence.validationStatus === 'valid'
      ? 'Passed validation'
      : `${evidence.validationIssues.length} validation issue(s)`,
    context: `...${evidence.contextBefore.substring(-50)} [${evidence.matchedText.substring(0, 50)}${evidence.matchedText.length > 50 ? '...' : ''}] ${evidence.contextAfter.substring(0, 50)}...`,
  };
}

/**
 * Get evidence quality score
 */
export function getEvidenceQuality(evidence: TermEvidence): number {
  let score = 0.5; // Base score
  
  // Boost for having context
  if (evidence.contextBefore.length > 20) score += 0.1;
  if (evidence.contextAfter.length > 20) score += 0.1;
  
  // Boost for LLM reasoning
  if (evidence.llmReasoning && evidence.llmReasoning.length > 50) score += 0.1;
  
  // Reduce for validation issues
  if (evidence.validationStatus === 'warning') score -= 0.1;
  if (evidence.validationStatus === 'error') score -= 0.2;
  
  // Boost for precedence resolution
  if (evidence.precedenceApplied) {
    score += evidence.precedenceApplied.resolutionConfidence * 0.1;
  }
  
  return Math.max(0, Math.min(1, score));
}
