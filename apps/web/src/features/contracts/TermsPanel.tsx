import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { getContractTerms } from '@/lib/api/endpoints';
import { TermOverrideModal } from './TermOverrideModal';

interface TermsPanelProps {
  contractId: string;
}

const TERM_TYPE_LABELS: Record<string, string> = {
  pricing_model: 'Pricing Model',
  billing_cadence: 'Billing Cadence',
  discount: 'Discount',
  renewal_terms: 'Renewal Terms',
  termination_terms: 'Termination Terms',
  usage_caps: 'Usage Caps',
  payment_terms: 'Payment Terms',
  uplift: 'Price Uplift',
  auto_renew: 'Auto Renew',
  notice_period: 'Notice Period',
  contract_value: 'Contract Value',
  start_date: 'Start Date',
  end_date: 'End Date',
  term_length: 'Term Length',
};

export function TermsPanel({ contractId }: TermsPanelProps) {
  const queryClient = useQueryClient();
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());
  const [overrideModal, setOverrideModal] = useState<{ isOpen: boolean; term: any }>({
    isOpen: false,
    term: null,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['contract-terms', contractId],
    queryFn: async () => {
      const res = await getContractTerms(contractId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const toggleExpanded = (termId: string) => {
    setExpandedTerms((prev) => {
      const next = new Set(prev);
      if (next.has(termId)) {
        next.delete(termId);
      } else {
        next.add(termId);
      }
      return next;
    });
  };

  const getConfidenceColor = (confidence: number | null) => {
    if (confidence === null) return 'text-zinc-500';
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceIcon = (confidence: number | null) => {
    if (confidence === null) return <XCircle size={14} className="text-zinc-500" />;
    if (confidence >= 80) return <CheckCircle size={14} className="text-green-400" />;
    if (confidence >= 50) return <AlertTriangle size={14} className="text-yellow-400" />;
    return <XCircle size={14} className="text-red-400" />;
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') {
      // Handle specific value types
      if (value.model) return value.model;
      if (value.cadence) return value.cadence;
      if (value.percentage !== undefined) return `${value.percentage}%`;
      if (value.amount !== undefined) {
        const currency = value.currency || 'USD';
        return `${currency} ${value.amount.toLocaleString()}`;
      }
      if (value.date) return value.date;
      if (value.autoRenew !== undefined) return value.autoRenew ? 'Yes' : 'No';
      if (value.netDays) return `Net ${value.netDays} days`;
      if (value.years) return `${value.years} year${value.years > 1 ? 's' : ''}`;
      if (value.months) return `${value.months} month${value.months > 1 ? 's' : ''}`;
      if (value.days) return `${value.days} day${value.days > 1 ? 's' : ''}`;
      // Fallback to JSON
      return JSON.stringify(value);
    }
    return String(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  const terms = data?.terms ?? [];

  return (
    <>
      <div className="space-y-4">
        {/* Summary */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            {terms.length} terms extracted
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-800 rounded hover:text-accent transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Terms Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50">
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Term Type
                </th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Value
                </th>
                <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Confidence
                </th>
                <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Method
                </th>
                <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {terms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    No terms extracted yet
                  </td>
                </tr>
              ) : (
                terms.map((term: any) => (
                  <TermRow
                    key={term.id}
                    term={term}
                    isExpanded={expandedTerms.has(term.id)}
                    onToggleExpand={() => toggleExpanded(term.id)}
                    onOverride={() => setOverrideModal({ isOpen: true, term })}
                    formatValue={formatValue}
                    getConfidenceColor={getConfidenceColor}
                    getConfidenceIcon={getConfidenceIcon}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Override Modal */}
      <TermOverrideModal
        isOpen={overrideModal.isOpen}
        onClose={() => setOverrideModal({ isOpen: false, term: null })}
        term={overrideModal.term}
        contractId={contractId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['contract-terms', contractId] });
          queryClient.invalidateQueries({ queryKey: ['contract-readiness', contractId] });
        }}
      />
    </>
  );
}

interface TermRowProps {
  term: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOverride: () => void;
  formatValue: (value: any) => string;
  getConfidenceColor: (confidence: number | null) => string;
  getConfidenceIcon: (confidence: number | null) => React.ReactNode;
}

function TermRow({
  term,
  isExpanded,
  onToggleExpand,
  onOverride,
  formatValue,
  getConfidenceColor,
  getConfidenceIcon,
}: TermRowProps) {
  return (
    <>
      <tr className="hover:bg-zinc-800/30 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleExpand}
              className="p-0.5 hover:bg-zinc-700 rounded"
            >
              {isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
            <span className="text-sm font-medium">
              {TERM_TYPE_LABELS[term.termType] || term.termType}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm">
            {term.isOverridden && (
              <span className="text-xs text-accent mr-2">[Overridden]</span>
            )}
            {formatValue(term.value)}
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <div className={`flex items-center justify-center gap-1 ${getConfidenceColor(term.confidence)}`}>
            {getConfidenceIcon(term.confidence)}
            <span className="text-sm">{term.confidence ?? '-'}%</span>
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-xs px-2 py-1 bg-zinc-800 rounded capitalize">
            {term.extractionMethod || 'pattern'}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          {term.isOverridden ? (
            <span className="text-xs px-2 py-1 bg-accent/20 text-accent rounded">
              Overridden
            </span>
          ) : (
            <span className="text-xs px-2 py-1 bg-zinc-800 text-zinc-400 rounded">
              Extracted
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <button
            onClick={onOverride}
            className="p-1.5 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-accent"
            title="Override value"
          >
            <Edit3 size={14} />
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-zinc-950/30">
          <td colSpan={6} className="px-8 py-4">
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-xs text-zinc-500 mb-1">Matched Text</div>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded text-zinc-300 text-xs">
                  {term.matchedText || '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">
                  {term.isOverridden ? 'Original Value' : 'Raw Value'}
                </div>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded text-zinc-300 text-xs font-mono">
                  {JSON.stringify(term.isOverridden ? term.originalValue : term.value, null, 2)}
                </div>
              </div>
              {term.override && (
                <div className="col-span-2">
                  <div className="text-xs text-zinc-500 mb-1">Override Info</div>
                  <div className="p-3 bg-accent/5 border border-accent/30 rounded text-sm">
                    <div>
                      <span className="text-zinc-500">Reason:</span>{' '}
                      {term.override.reason || 'No reason provided'}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      Overridden on {new Date(term.override.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
