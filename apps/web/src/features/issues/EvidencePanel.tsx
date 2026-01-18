/**
 * Evidence Panel Component (Phase 8)
 * Displays evidence pack for an issue with completeness scoring,
 * calculations, contract clauses, and source records.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getIssueEvidence,
  regenerateIssueEvidence,
  type EvidenceResponse,
  type IssueEvidenceCalculation,
  type IssueEvidenceClause,
  type IssueEvidenceSource,
} from '@/lib/api/endpoints';
import { cn } from '@/lib/utils';

interface EvidencePanelProps {
  issueId: string;
  isAdmin?: boolean;
  className?: string;
}

export function EvidencePanel({ issueId, isAdmin = false, className }: EvidencePanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    calculations: false,
    clauses: false,
    sources: false,
  });

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['issue-evidence', issueId],
    queryFn: async () => {
      const res = await getIssueEvidence(issueId, {
        includeCalculations: true,
        includeClauses: true,
        includeSources: true,
        includeAudit: true,
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    retry: false,
  });

  const regenerateMutation = useMutation({
    mutationFn: async (options: { force?: boolean; reason?: string }) => {
      const res = await regenerateIssueEvidence(issueId, options);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-evidence', issueId] });
    },
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (isLoading) {
    return (
      <div className={cn('bg-zinc-900/30 border border-zinc-800 rounded-lg p-6', className)}>
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-zinc-400">Loading evidence...</span>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={cn('bg-zinc-900/30 border border-zinc-800 rounded-lg p-6', className)}>
        <div className="text-center py-8">
          <div className="text-zinc-500 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-zinc-400 mb-4">No evidence generated for this issue yet.</p>
          {isAdmin && (
            <button
              onClick={() => regenerateMutation.mutate({ force: true })}
              disabled={regenerateMutation.isPending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {regenerateMutation.isPending ? 'Generating...' : 'Generate Evidence'}
            </button>
          )}
        </div>
      </div>
    );
  }

  const { evidence, sources, calculations, clauses } = data;
  const completenessLabel = getCompletenessLabel(evidence.completenessScore);

  return (
    <div className={cn('bg-zinc-900/30 border border-zinc-800 rounded-lg overflow-hidden', className)}>
      {/* Header with Completeness Badge */}
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium text-white">Evidence Pack</h3>
          <CompletenessScore score={evidence.completenessScore} label={completenessLabel} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            v{evidence.evidenceVersion} • {new Date(evidence.createdAt).toLocaleDateString()}
          </span>
          {isAdmin && (
            <button
              onClick={() => regenerateMutation.mutate({ force: true })}
              disabled={regenerateMutation.isPending}
              className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors disabled:opacity-50"
            >
              {regenerateMutation.isPending ? 'Regenerating...' : 'Regenerate'}
            </button>
          )}
        </div>
      </div>

      {/* Summary Section */}
      <div className="border-b border-zinc-800">
        <button
          onClick={() => toggleSection('summary')}
          className="w-full px-6 py-3 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors"
        >
          <span className="text-white font-medium">Summary</span>
          <ChevronIcon expanded={expandedSections.summary} />
        </button>
        {expandedSections.summary && (
          <div className="px-6 pb-4">
            <h4 className="text-base font-medium text-white mb-2">{evidence.title}</h4>
            <p className="text-sm text-zinc-400 leading-relaxed">{evidence.summary}</p>
            
            {/* Completeness Breakdown */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(evidence.completenessBreakdown).map(([key, value]) => (
                <div key={key} className="bg-zinc-800/50 rounded-lg p-3">
                  <div className="text-xs text-zinc-500 mb-1">{formatBreakdownKey(key)}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          value >= 0.9 ? 'bg-emerald-500' : value >= 0.7 ? 'bg-amber-500' : 'bg-rose-500'
                        )}
                        style={{ width: `${(value as number) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400">{Math.round((value as number) * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Variance Info */}
            {evidence.dataJson?.variance && (
              <div className="mt-4 bg-zinc-800/50 rounded-lg p-4">
                <div className="text-sm font-medium text-white mb-2">Variance Analysis</div>
                <VarianceDisplay variance={evidence.dataJson.variance as any} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Calculations Section */}
      {calculations.length > 0 && (
        <div className="border-b border-zinc-800">
          <button
            onClick={() => toggleSection('calculations')}
            className="w-full px-6 py-3 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors"
          >
            <span className="text-white font-medium">Calculations ({calculations.length})</span>
            <ChevronIcon expanded={expandedSections.calculations} />
          </button>
          {expandedSections.calculations && (
            <div className="px-6 pb-4 space-y-3">
              {calculations.map((calc, index) => (
                <CalculationStep key={calc.id} calc={calc} index={index} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contract Clauses Section */}
      {clauses.length > 0 && (
        <div className="border-b border-zinc-800">
          <button
            onClick={() => toggleSection('clauses')}
            className="w-full px-6 py-3 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors"
          >
            <span className="text-white font-medium">Contract Clauses ({clauses.length})</span>
            <ChevronIcon expanded={expandedSections.clauses} />
          </button>
          {expandedSections.clauses && (
            <div className="px-6 pb-4 space-y-3">
              {clauses.map((clause) => (
                <ClauseExcerpt key={clause.id} clause={clause} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Source Records Section */}
      {sources.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('sources')}
            className="w-full px-6 py-3 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors"
          >
            <span className="text-white font-medium">Source Records ({sources.length})</span>
            <ChevronIcon expanded={expandedSections.sources} />
          </button>
          {expandedSections.sources && (
            <div className="px-6 pb-4">
              <div className="bg-zinc-800/50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-zinc-500 border-b border-zinc-700">
                      <th className="px-4 py-2 font-medium">Type</th>
                      <th className="px-4 py-2 font-medium">ID</th>
                      <th className="px-4 py-2 font-medium">Field</th>
                      <th className="px-4 py-2 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sources.map((source) => (
                      <SourceRow key={source.id} source={source} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Sub-components

function CompletenessScore({ score, label }: { score: number; label: string }) {
  const colorClass = score >= 0.9
    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    : score >= 0.7
    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    : 'bg-rose-500/20 text-rose-400 border-rose-500/30';

  return (
    <div className={cn('px-2.5 py-1 rounded-full text-xs font-medium border', colorClass)}>
      {Math.round(score * 100)}% {label}
    </div>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={cn('w-5 h-5 text-zinc-400 transition-transform', expanded && 'rotate-180')}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function VarianceDisplay({ variance }: { variance: { amount: number | null; percentage: number | null; direction: string; description: string } }) {
  const directionColor = variance.direction === 'over'
    ? 'text-rose-400'
    : variance.direction === 'under'
    ? 'text-amber-400'
    : 'text-zinc-400';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div>
        <div className="text-xs text-zinc-500 mb-1">Amount</div>
        <div className={cn('text-sm font-medium', directionColor)}>
          {variance.amount !== null ? `${variance.amount >= 0 ? '+' : ''}${variance.amount.toFixed(2)}` : 'N/A'}
        </div>
      </div>
      <div>
        <div className="text-xs text-zinc-500 mb-1">Percentage</div>
        <div className={cn('text-sm font-medium', directionColor)}>
          {variance.percentage !== null ? `${variance.percentage >= 0 ? '+' : ''}${variance.percentage.toFixed(1)}%` : 'N/A'}
        </div>
      </div>
      <div>
        <div className="text-xs text-zinc-500 mb-1">Direction</div>
        <div className={cn('text-sm font-medium capitalize', directionColor)}>{variance.direction}</div>
      </div>
      <div className="col-span-2 md:col-span-1">
        <div className="text-xs text-zinc-500 mb-1">Description</div>
        <div className="text-sm text-zinc-300">{variance.description}</div>
      </div>
    </div>
  );
}

function CalculationStep({ calc, index }: { calc: IssueEvidenceCalculation; index: number }) {
  return (
    <div className="bg-zinc-800/50 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-zinc-700 text-zinc-300 text-xs flex items-center justify-center font-medium">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-white">{formatCalcName(calc.calcName)}</span>
        </div>
        <span className={cn(
          'px-2 py-0.5 rounded text-xs font-medium',
          calc.isReproducible ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
        )}>
          {calc.isReproducible ? 'Reproducible' : 'Non-reproducible'}
        </span>
      </div>
      
      {calc.formula && (
        <div className="mb-3">
          <code className="text-xs bg-zinc-900 text-emerald-400 px-2 py-1 rounded font-mono">
            {calc.formula}
          </code>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs text-zinc-500 mb-1">Inputs</div>
          <div className="bg-zinc-900 rounded p-2">
            {Object.entries(calc.inputsJson).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-zinc-400">{key}:</span>
                <span className="text-zinc-200 font-mono">{formatValue(value)}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-1">Outputs</div>
          <div className="bg-zinc-900 rounded p-2">
            {Object.entries(calc.outputsJson).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-zinc-400">{key}:</span>
                <span className="text-emerald-400 font-mono font-medium">{formatValue(value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClauseExcerpt({ clause }: { clause: IssueEvidenceClause }) {
  return (
    <div className="bg-zinc-800/50 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {clause.clauseLabel && (
            <span className="text-sm font-medium text-white">{clause.clauseLabel}</span>
          )}
          <span className="text-xs text-zinc-500 capitalize">{clause.clauseType}</span>
        </div>
        {clause.relevanceScore && (
          <span className={cn(
            'px-2 py-0.5 rounded text-xs font-medium',
            clause.relevanceScore >= 0.8 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
          )}>
            {Math.round(clause.relevanceScore * 100)}% relevant
          </span>
        )}
      </div>
      <blockquote className="text-sm text-zinc-300 border-l-2 border-zinc-600 pl-4 py-1 italic">
        {clause.excerpt.length > 500 ? `${clause.excerpt.slice(0, 500)}...` : clause.excerpt}
      </blockquote>
      {(clause.pageNumber || clause.startOffset !== null) && (
        <div className="mt-2 text-xs text-zinc-500">
          {clause.pageNumber && <span>Page {clause.pageNumber}</span>}
          {clause.pageNumber && clause.startOffset !== null && <span> • </span>}
          {clause.startOffset !== null && <span>Chars {clause.startOffset}-{clause.endOffset}</span>}
        </div>
      )}
    </div>
  );
}

function SourceRow({ source }: { source: IssueEvidenceSource }) {
  return (
    <tr className="border-b border-zinc-800 last:border-0">
      <td className="px-4 py-2">
        <span className="px-2 py-0.5 rounded bg-zinc-700 text-zinc-300 text-xs capitalize">
          {source.sourceType.replace('_', ' ')}
        </span>
      </td>
      <td className="px-4 py-2 text-zinc-300 font-mono text-xs">{source.sourceId}</td>
      <td className="px-4 py-2 text-zinc-400">{source.fieldName || '-'}</td>
      <td className="px-4 py-2 text-zinc-300 font-mono text-xs max-w-[200px] truncate">
        {source.fieldValueJson ? JSON.stringify(source.fieldValueJson) : '-'}
      </td>
    </tr>
  );
}

// Helper functions

function getCompletenessLabel(score: number): string {
  if (score >= 0.9) return 'Complete';
  if (score >= 0.7) return 'Partial';
  return 'Incomplete';
}

function formatBreakdownKey(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatCalcName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatValue(value: unknown): string {
  if (typeof value === 'number') {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (value === null || value === undefined) {
    return 'N/A';
  }
  return String(value);
}

export default EvidencePanel;
