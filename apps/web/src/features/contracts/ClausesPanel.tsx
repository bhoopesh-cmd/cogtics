import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  FileText,
  List,
  AlignLeft,
  ListTree,
  RefreshCw,
} from 'lucide-react';
import { getContractClauses } from '@/lib/api/endpoints';

interface ClausesPanelProps {
  contractId: string;
}

type ClauseType = 'heading' | 'section' | 'paragraph' | 'list_item';

const CLAUSE_TYPE_ICONS: Record<ClauseType, React.ReactNode> = {
  heading: <FileText size={14} className="text-accent" />,
  section: <List size={14} className="text-blue-400" />,
  paragraph: <AlignLeft size={14} className="text-zinc-400" />,
  list_item: <ListTree size={14} className="text-green-400" />,
};

const CLAUSE_TYPE_LABELS: Record<ClauseType, string> = {
  heading: 'Heading',
  section: 'Section',
  paragraph: 'Paragraph',
  list_item: 'List Item',
};

export function ClausesPanel({ contractId }: ClausesPanelProps) {
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<ClauseType | 'all'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['contract-clauses', contractId, typeFilter],
    queryFn: async () => {
      const res = await getContractClauses(contractId, typeFilter === 'all' ? undefined : typeFilter);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const toggleExpanded = (clauseId: string) => {
    setExpandedClauses((prev) => {
      const next = new Set(prev);
      if (next.has(clauseId)) {
        next.delete(clauseId);
      } else {
        next.add(clauseId);
      }
      return next;
    });
  };

  const selectedClause = data?.clauses?.find((c: any) => c.id === selectedClauseId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  const clauses = data?.clauses ?? [];

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Clause List */}
      <div className="space-y-4">
        {/* Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Filter:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ClauseType | 'all')}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-sm focus:outline-none focus:border-accent"
          >
            <option value="all">All Types</option>
            <option value="heading">Headings</option>
            <option value="section">Sections</option>
            <option value="paragraph">Paragraphs</option>
            <option value="list_item">List Items</option>
          </select>
          <span className="ml-auto text-xs text-zinc-500">
            {clauses.length} clauses
          </span>
        </div>

        {/* Clauses */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-h-[600px] overflow-y-auto">
          {clauses.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              No clauses extracted yet
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {clauses.map((clause: any) => (
                <ClauseRow
                  key={clause.id}
                  clause={clause}
                  isSelected={selectedClauseId === clause.id}
                  isExpanded={expandedClauses.has(clause.id)}
                  onSelect={() => setSelectedClauseId(clause.id)}
                  onToggleExpand={() => toggleExpanded(clause.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Clause Detail */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        {selectedClause ? (
          <motion.div
            key={selectedClause.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              {CLAUSE_TYPE_ICONS[selectedClause.type as ClauseType]}
              <span className="text-sm font-medium">
                {CLAUSE_TYPE_LABELS[selectedClause.type as ClauseType]}
              </span>
              {selectedClause.label && (
                <span className="text-xs text-zinc-500">({selectedClause.label})</span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-zinc-500 mb-1">Page</div>
                <div>{selectedClause.pageNumber ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">Offset</div>
                <div>{selectedClause.startOffset}-{selectedClause.endOffset}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">Sequence</div>
                <div>#{selectedClause.sequenceNumber}</div>
              </div>
            </div>

            <div>
              <div className="text-xs text-zinc-500 mb-2">Content</div>
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg text-sm leading-relaxed max-h-[400px] overflow-y-auto whitespace-pre-wrap">
                {selectedClause.text}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-500">
            Select a clause to view details
          </div>
        )}
      </div>
    </div>
  );
}

interface ClauseRowProps {
  clause: any;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
}

function ClauseRow({ clause, isSelected, isExpanded, onSelect, onToggleExpand }: ClauseRowProps) {
  const hasLongText = clause.text.length > 100;

  return (
    <div
      className={`p-3 cursor-pointer transition-colors ${
        isSelected ? 'bg-accent/10' : 'hover:bg-zinc-800/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        {hasLongText && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="p-0.5 hover:bg-zinc-700 rounded"
          >
            {isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {CLAUSE_TYPE_ICONS[clause.type as ClauseType]}
            {clause.label && (
              <span className="text-xs font-medium text-accent">{clause.label}</span>
            )}
            {clause.pageNumber && (
              <span className="text-xs text-zinc-500">p.{clause.pageNumber}</span>
            )}
          </div>
          <div className={`text-sm text-zinc-300 ${isExpanded ? '' : 'line-clamp-2'}`}>
            {clause.text}
          </div>
        </div>
      </div>
    </div>
  );
}
