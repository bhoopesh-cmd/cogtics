import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  FileSearch,
  List,
  Tag,
  Shield,
  RotateCcw,
} from 'lucide-react';
import {
  getContractDocument,
  getContractClauses,
  getContractTerms,
  getContractReadiness,
  reprocessContract,
} from '@/lib/api/endpoints';
import { ClausesPanel } from './ClausesPanel';
import { TermsPanel } from './TermsPanel';
import { ReadinessPanel } from './ReadinessPanel';
import DecorativeDots from '@/components/ui/DecorativeDots';

type TabId = 'document' | 'clauses' | 'terms' | 'readiness';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'document', label: 'Document', icon: <FileText size={16} /> },
  { id: 'clauses', label: 'Clauses', icon: <List size={16} /> },
  { id: 'terms', label: 'Terms', icon: <Tag size={16} /> },
  { id: 'readiness', label: 'Readiness', icon: <Shield size={16} /> },
];

export function ContractIntelligencePage() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('terms');

  // Fetch document info
  const { data: document, isLoading: docLoading } = useQuery({
    queryKey: ['contract-document', contractId],
    queryFn: async () => {
      if (!contractId) throw new Error('Contract ID required');
      const res = await getContractDocument(contractId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!contractId,
  });

  // Fetch readiness info
  const { data: readiness, isLoading: readinessLoading } = useQuery({
    queryKey: ['contract-readiness', contractId],
    queryFn: async () => {
      if (!contractId) throw new Error('Contract ID required');
      const res = await getContractReadiness(contractId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!contractId,
  });

  // Reprocess mutation
  const reprocessMutation = useMutation({
    mutationFn: async (forceReextract: boolean) => {
      if (!contractId) throw new Error('Contract ID required');
      const res = await reprocessContract(contractId, forceReextract);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-document', contractId] });
      queryClient.invalidateQueries({ queryKey: ['contract-terms', contractId] });
      queryClient.invalidateQueries({ queryKey: ['contract-readiness', contractId] });
    },
  });

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle size={18} className="text-green-400" />;
      case 'needs_review':
        return <AlertTriangle size={18} className="text-yellow-400" />;
      default:
        return <XCircle size={18} className="text-zinc-500" />;
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'needs_review':
        return 'Needs Review';
      default:
        return 'Incomplete';
    }
  };

  if (docLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:text-accent transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-accent/10 rounded-xl">
              <FileSearch size={24} className="text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-white">
                Contract Intelligence
              </h1>
              <div className="flex items-center gap-3 mt-1">
                {document?.fileName && (
                  <span className="text-sm text-zinc-400">{document.fileName}</span>
                )}
                <span className="text-xs text-zinc-500 font-mono">
                  {contractId?.substring(0, 12)}...
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Readiness Badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg">
          {getStatusIcon(readiness?.status)}
          <span className="text-sm font-medium">{getStatusLabel(readiness?.status)}</span>
          {readiness?.confidenceScore !== undefined && (
            <span className="text-xs text-zinc-500">
              ({Math.round(readiness.confidenceScore)}%)
            </span>
          )}
        </div>

        {/* Reprocess Button */}
        <button
          onClick={() => reprocessMutation.mutate(false)}
          disabled={reprocessMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:text-accent transition-colors disabled:opacity-50"
        >
          <RotateCcw size={16} className={reprocessMutation.isPending ? 'animate-spin' : ''} />
          <span className="text-sm">Reprocess</span>
        </button>
      </div>

      {/* Document Info Card */}
      {document && (
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg relative overflow-hidden">
          <DecorativeDots position="top-right" />
          <div className="grid grid-cols-4 gap-6">
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Status</div>
              <div className="text-sm font-medium capitalize">{document.status}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Pages</div>
              <div className="text-sm font-medium">{document.pageCount ?? '-'}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Text Length</div>
              <div className="text-sm font-medium">
                {document.extractedTextLength?.toLocaleString() ?? '-'} chars
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Extracted</div>
              <div className="text-sm font-medium">
                {document.extractedAt
                  ? new Date(document.extractedAt).toLocaleDateString()
                  : 'Pending'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-accent border-accent'
                  : 'text-zinc-400 border-transparent hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'document' && (
            <DocumentPanel document={document} />
          )}
          {activeTab === 'clauses' && contractId && (
            <ClausesPanel contractId={contractId} />
          )}
          {activeTab === 'terms' && contractId && (
            <TermsPanel contractId={contractId} />
          )}
          {activeTab === 'readiness' && contractId && (
            <ReadinessPanel contractId={contractId} />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

interface DocumentPanelProps {
  document: any;
}

function DocumentPanel({ document }: DocumentPanelProps) {
  if (!document) {
    return (
      <div className="p-8 text-center text-zinc-500">
        No document information available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
        <h3 className="text-lg font-medium mb-4">Document Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-zinc-500 mb-1">File Name</div>
            <div className="text-sm">{document.fileName}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">Version</div>
            <div className="text-sm">v{document.version}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">Uploaded</div>
            <div className="text-sm">
              {new Date(document.uploadedAt).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">Extraction Status</div>
            <div className="text-sm capitalize">{document.status}</div>
          </div>
        </div>
        {document.errorMessage && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {document.errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}
