/**
 * Precedence Rules Engine
 *
 * Deterministic resolution of conflicting contract terms using
 * explicit precedence rules. Always logs decisions for audit.
 */
// ============================================
// Override Detection Patterns
// ============================================
const OVERRIDE_PATTERNS = [
    {
        type: 'notwithstanding',
        patterns: [
            /notwithstanding\s+(?:anything\s+)?(?:(?:to\s+the\s+)?contrary\s+)?(?:in|contained\s+in)\s+(?:section|clause|article|paragraph)\s*\d*/gi,
            /notwithstanding\s+(?:the\s+)?(?:foregoing|above|provisions?\s+of)/gi,
            /notwithstanding\s+any(?:thing)?\s+(?:else\s+)?(?:herein|in\s+this\s+agreement)/gi,
        ],
    },
    {
        type: 'except_as',
        patterns: [
            /except\s+as\s+(?:expressly\s+)?(?:set\s+forth|stated|provided|otherwise\s+provided)\s+(?:in|herein)/gi,
            /except\s+(?:as\s+)?otherwise\s+(?:specifically\s+)?(?:agreed|provided)/gi,
            /unless\s+(?:expressly\s+)?(?:stated|provided|agreed)\s+otherwise/gi,
        ],
    },
    {
        type: 'prevails_over',
        patterns: [
            /(?:shall\s+)?prevail(?:s)?\s+over/gi,
            /(?:shall\s+)?take(?:s)?\s+precedence\s+over/gi,
            /(?:shall\s+)?supersede(?:s)?\s+(?:and\s+replace\s+)?(?:all\s+)?(?:prior|previous)/gi,
        ],
    },
    {
        type: 'controls',
        patterns: [
            /(?:this\s+)?(?:order\s+form|amendment|addendum)\s+(?:shall\s+)?control(?:s)?/gi,
            /(?:the\s+)?terms?\s+(?:of|in)\s+(?:this\s+)?(?:order\s+form|amendment)\s+(?:shall\s+)?(?:control|govern)/gi,
            /in\s+(?:the\s+)?(?:case|event)\s+of\s+(?:a\s+)?conflict[,\s]+(?:this|the)\s+(?:order\s+form|amendment)\s+(?:shall\s+)?control/gi,
        ],
    },
    {
        type: 'supersedes',
        patterns: [
            /supersede(?:s)?\s+(?:and\s+replace(?:s)?\s+)?(?:all\s+)?(?:prior|previous|earlier)/gi,
            /(?:this\s+)?(?:agreement|amendment)\s+supersede(?:s)?/gi,
            /(?:hereby\s+)?(?:amend(?:s|ed)?|modif(?:y|ies|ied))\s+and\s+supersede(?:s)?/gi,
        ],
    },
    {
        type: 'in_event_of_conflict',
        patterns: [
            /in\s+(?:the\s+)?event\s+of\s+(?:a\s+|any\s+)?conflict/gi,
            /(?:if|where|should)\s+(?:there\s+is\s+)?(?:a\s+|any\s+)?conflict\s+(?:between|among)/gi,
            /to\s+the\s+extent\s+(?:of\s+any\s+)?(?:conflict|inconsistency)/gi,
        ],
    },
    {
        type: 'explicit_precedence',
        patterns: [
            /order\s+of\s+precedence/gi,
            /(?:the\s+)?following\s+order\s+(?:of\s+)?(?:priority|precedence)/gi,
            /(?:documents?\s+)?(?:shall\s+)?(?:be\s+)?(?:interpreted|construed)\s+in\s+(?:the\s+)?following\s+order/gi,
        ],
    },
];
// ============================================
// Document Type Precedence
// ============================================
const DOCUMENT_TYPE_PRIORITY = {
    'amendment': 1, // Highest precedence
    'order_form': 2,
    'addendum': 3,
    'msa': 4,
    'sow': 5,
    'exhibit': 6,
    'schedule': 7,
    'renewal': 8,
    'termination': 9,
    'other': 10, // Lowest precedence
};
const PRECEDENCE_RULES = [
    {
        name: 'explicit_override',
        priority: 1,
        description: 'Explicit override language (Notwithstanding, Except as, Prevails)',
        evaluate: (a, b) => {
            if (a.hasOverrideLanguage && !b.hasOverrideLanguage)
                return 1;
            if (!a.hasOverrideLanguage && b.hasOverrideLanguage)
                return -1;
            return 0;
        },
    },
    {
        name: 'effective_date',
        priority: 2,
        description: 'Most recent effective date wins',
        evaluate: (a, b) => {
            if (!a.effectiveDate && !b.effectiveDate)
                return 0;
            if (!a.effectiveDate)
                return -1;
            if (!b.effectiveDate)
                return 1;
            if (a.effectiveDate > b.effectiveDate)
                return 1;
            if (a.effectiveDate < b.effectiveDate)
                return -1;
            return 0;
        },
    },
    {
        name: 'document_hierarchy',
        priority: 3,
        description: 'Amendment > Order Form > MSA > SOW',
        evaluate: (a, b) => {
            const priorityA = DOCUMENT_TYPE_PRIORITY[a.documentType] ?? 10;
            const priorityB = DOCUMENT_TYPE_PRIORITY[b.documentType] ?? 10;
            if (priorityA < priorityB)
                return 1; // Lower number = higher priority
            if (priorityA > priorityB)
                return -1;
            return 0;
        },
    },
    {
        name: 'specificity',
        priority: 4,
        description: 'Product-specific terms override general terms',
        evaluate: (a, b) => {
            // Exhibits and schedules are typically more specific
            const specificTypes = ['exhibit', 'schedule', 'order_form'];
            const aSpecific = specificTypes.includes(a.documentType);
            const bSpecific = specificTypes.includes(b.documentType);
            if (aSpecific && !bSpecific)
                return 1;
            if (!aSpecific && bSpecific)
                return -1;
            return 0;
        },
    },
    {
        name: 'clause_order',
        priority: 5,
        description: 'Later clause in same document wins',
        evaluate: (a, b) => {
            if (a.documentId !== b.documentId)
                return 0;
            if (a.clauseOffset > b.clauseOffset)
                return 1;
            if (a.clauseOffset < b.clauseOffset)
                return -1;
            return 0;
        },
    },
    {
        name: 'confidence',
        priority: 6,
        description: 'Higher extraction confidence wins (tiebreaker)',
        evaluate: (a, b) => {
            if (a.term.confidence > b.term.confidence + 0.1)
                return 1;
            if (b.term.confidence > a.term.confidence + 0.1)
                return -1;
            return 0;
        },
    },
];
// ============================================
// Main Functions
// ============================================
/**
 * Detect override language in text
 */
export function detectOverrides(text) {
    const detections = [];
    for (const { type, patterns } of OVERRIDE_PATTERNS) {
        for (const pattern of patterns) {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(text)) !== null) {
                // Extract target section if present
                const targetMatch = match[0].match(/(?:section|clause|article)\s*(\d+(?:\.\d+)*)/i);
                detections.push({
                    type,
                    matchedText: match[0],
                    targetSection: targetMatch?.[1],
                    startOffset: match.index,
                    endOffset: match.index + match[0].length,
                    confidence: 0.85,
                });
            }
        }
    }
    // Deduplicate overlapping detections
    return deduplicateDetections(detections);
}
/**
 * Resolve precedence between conflicting terms
 */
/**
 * Detect circular override relationships between documents
 * Returns true if a cycle is detected (A overrides B which overrides A)
 */
export function detectOverrideCycle(terms) {
    // Build an override graph
    const overrideGraph = new Map();
    for (const term of terms) {
        if (!overrideGraph.has(term.documentId)) {
            overrideGraph.set(term.documentId, new Set());
        }
        // If this document has override language, it claims to override other docs
        if (term.hasOverrideLanguage) {
            // Look for documents this overrides (typically same term type from different docs)
            for (const otherTerm of terms) {
                if (otherTerm.documentId !== term.documentId) {
                    overrideGraph.get(term.documentId).add(otherTerm.documentId);
                }
            }
        }
    }
    // DFS to detect cycles
    const visited = new Set();
    const recursionStack = new Set();
    const cyclePath = [];
    function hasCycleFrom(node) {
        visited.add(node);
        recursionStack.add(node);
        cyclePath.push(node);
        const neighbors = overrideGraph.get(node) || new Set();
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                if (hasCycleFrom(neighbor))
                    return true;
            }
            else if (recursionStack.has(neighbor)) {
                // Cycle found - trim cyclePath to just the cycle
                const cycleStart = cyclePath.indexOf(neighbor);
                cyclePath.splice(0, cycleStart);
                return true;
            }
        }
        recursionStack.delete(node);
        cyclePath.pop();
        return false;
    }
    for (const docId of overrideGraph.keys()) {
        if (!visited.has(docId)) {
            if (hasCycleFrom(docId)) {
                return {
                    hasCycle: true,
                    cycleDocuments: [...cyclePath],
                    message: `Circular override detected: ${cyclePath.join(' → ')} → ${cyclePath[0]}`,
                };
            }
        }
    }
    return { hasCycle: false };
}
export function resolvePrecedence(terms) {
    if (terms.length === 0) {
        throw new Error('Cannot resolve precedence with no terms');
    }
    if (terms.length === 1) {
        return {
            winningTermIndex: 0,
            winningTerm: terms[0],
            losingTerms: [],
            appliedRules: [],
            confidence: 1.0,
            requiresReview: false,
            auditLog: `Single term, no conflict to resolve: ${terms[0].term.termType}`,
        };
    }
    // Check for circular override relationships
    const cycleCheck = detectOverrideCycle(terms);
    if (cycleCheck.hasCycle) {
        // When there's a cycle, require human review and don't trust override language
        return {
            winningTermIndex: 0,
            winningTerm: terms[0],
            losingTerms: terms.slice(1),
            appliedRules: [{
                    name: 'cycle_detection',
                    priority: 0,
                    result: 'inconclusive',
                    evidence: cycleCheck.message,
                }],
            confidence: 0.3,
            requiresReview: true,
            auditLog: `CYCLE DETECTED: ${cycleCheck.message}. Requires human review to resolve ambiguous precedence.`,
        };
    }
    const appliedRules = [];
    let currentWinners = [...terms];
    let confidence = 1.0;
    // Apply rules in priority order
    for (const rule of PRECEDENCE_RULES) {
        if (currentWinners.length <= 1)
            break;
        const scores = new Map();
        // Compare each pair
        for (let i = 0; i < currentWinners.length; i++) {
            scores.set(i, 0);
            for (let j = 0; j < currentWinners.length; j++) {
                if (i !== j) {
                    const result = rule.evaluate(currentWinners[i], currentWinners[j]);
                    scores.set(i, (scores.get(i) || 0) + result);
                }
            }
        }
        // Find the highest scorer(s)
        const maxScore = Math.max(...scores.values());
        const winners = currentWinners.filter((_, i) => scores.get(i) === maxScore);
        if (winners.length < currentWinners.length) {
            appliedRules.push({
                name: rule.name,
                priority: rule.priority,
                result: winners.length === 1 ? 'decisive' : 'tiebreaker',
                evidence: `Reduced candidates from ${currentWinners.length} to ${winners.length}`,
            });
            currentWinners = winners;
        }
        else {
            appliedRules.push({
                name: rule.name,
                priority: rule.priority,
                result: 'inconclusive',
            });
        }
    }
    // If still tied, mark for review
    const requiresReview = currentWinners.length > 1;
    if (requiresReview) {
        confidence = 0.5;
    }
    const winnerIndex = terms.indexOf(currentWinners[0]);
    const losingTerms = terms.filter((_, i) => i !== winnerIndex);
    // Build audit log
    const auditLog = buildAuditLog(terms, winnerIndex, appliedRules, requiresReview);
    return {
        winningTermIndex: winnerIndex,
        winningTerm: currentWinners[0],
        losingTerms,
        appliedRules,
        confidence,
        requiresReview,
        auditLog,
    };
}
/**
 * Check if a term has override language that affects another term
 */
export function hasOverrideFor(overrideDetections, termOffset, windowSize = 500) {
    // Look for override language within window before the term
    for (const detection of overrideDetections) {
        if (detection.endOffset > termOffset - windowSize &&
            detection.endOffset < termOffset) {
            return detection;
        }
    }
    return null;
}
/**
 * Get precedence order for a document type
 */
export function getDocumentPrecedence(docType) {
    return DOCUMENT_TYPE_PRIORITY[docType] ?? 10;
}
/**
 * Compare two document types for precedence
 */
export function compareDocumentTypes(a, b) {
    const priorityA = DOCUMENT_TYPE_PRIORITY[a] ?? 10;
    const priorityB = DOCUMENT_TYPE_PRIORITY[b] ?? 10;
    if (priorityA < priorityB)
        return 1; // a has higher precedence
    if (priorityA > priorityB)
        return -1; // b has higher precedence
    return 0;
}
// ============================================
// Helper Functions
// ============================================
function deduplicateDetections(detections) {
    const sorted = [...detections].sort((a, b) => a.startOffset - b.startOffset);
    const result = [];
    for (const detection of sorted) {
        const overlapping = result.find(d => d.startOffset <= detection.endOffset && d.endOffset >= detection.startOffset);
        if (!overlapping) {
            result.push(detection);
        }
        else if (detection.matchedText.length > overlapping.matchedText.length) {
            // Keep the longer match
            const index = result.indexOf(overlapping);
            result[index] = detection;
        }
    }
    return result;
}
function buildAuditLog(terms, winnerIndex, appliedRules, requiresReview) {
    const lines = [
        `=== Precedence Resolution for ${terms[0].term.termType} ===`,
        `Candidates: ${terms.length}`,
        '',
        '--- Terms ---',
    ];
    terms.forEach((t, i) => {
        lines.push(`${i === winnerIndex ? '✓' : '✗'} Term ${i + 1}:`, `  Document: ${t.documentId} (${t.documentType})`, `  Effective: ${t.effectiveDate?.toISOString() || 'N/A'}`, `  Override language: ${t.hasOverrideLanguage ? 'Yes' : 'No'}`, `  Page: ${t.pageNumber ?? 'N/A'}, Offset: ${t.clauseOffset}`, `  Value: ${JSON.stringify(t.term.value)}`, `  Text: "${t.term.matchedText.substring(0, 100)}..."`, '');
    });
    lines.push('--- Applied Rules ---');
    for (const rule of appliedRules) {
        lines.push(`${rule.priority}. ${rule.name}: ${rule.result}${rule.evidence ? ` (${rule.evidence})` : ''}`);
    }
    lines.push('');
    lines.push(`--- Decision ---`);
    lines.push(`Winner: Term ${winnerIndex + 1}`);
    lines.push(`Requires Review: ${requiresReview ? 'Yes' : 'No'}`);
    return lines.join('\n');
}
/**
 * Export precedence rules for transparency
 */
export function getPrecedenceRules() {
    return PRECEDENCE_RULES.map(r => ({
        name: r.name,
        priority: r.priority,
        description: r.description,
    }));
}
/**
 * Export document type priorities for transparency
 */
export function getDocumentTypePriorities() {
    return { ...DOCUMENT_TYPE_PRIORITY };
}
//# sourceMappingURL=precedence.js.map