import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Sparkles, ArrowUpCircle, XCircle, 
  FileText, ExternalLink, Clock, User 
} from 'lucide-react';
import * as api from '@/lib/api/endpoints';
import type { AIDiscovery, IssueSeverity } from '@/lib/api/endpoints';
import { 
  ConfidenceBar, 
  CategoryBadge, 
  SeverityBadge, 
  ReviewStatusBadge,
  PromoteModal,
  DismissModal 
} from './components';

export function AIDiscoveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [discovery, setDiscovery] = useState<AIDiscovery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showDismissModal, setShowDismissModal] = useState(false);

  useEffect(() => {
    if (id) loadDiscovery();
  }, [id]);

  async function loadDiscovery() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAIDiscovery(id);
      if (!res.ok) throw new Error(res.error);
      setDiscovery(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load discovery');
    } finally {
      setLoading(false);
    }
  }

  async function handlePromote(data: { severity?: IssueSeverity; notes?: string }) {
    if (!id) return;
    const res = await api.promoteAIDiscovery(id, data);
    if (!res.ok) throw new Error(res.error);
    setShowPromoteModal(false);
    // Navigate to the new issue
    navigate(`/issues/${res.data.issueId}`);
  }

  async function handleDismiss(notes?: string) {
    if (!id) return;
    const res = await api.dismissAIDiscovery(id, notes);
    if (!res.ok) throw new Error(res.error);
    setShowDismissModal(false);
    loadDiscovery();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff6500]" />
      </div>
    );
  }

  if (error || !discovery) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/ai/discoveries')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white"
        >
          <ArrowLeft size={20} />
          Back to Discoveries
        </button>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
          {error || 'Discovery not found'}
        </div>
      </div>
    );
  }

  const evidence = discovery.evidence || {};
  const contractIds = (evidence.contractIds as string[]) || [];
  const invoiceIds = (evidence.invoiceIds as string[]) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
        <button
          onClick={() => navigate('/ai/discoveries')}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-zinc-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="text-[#ff6500]" size={24} />
            <CategoryBadge category={discovery.category} />
            <SeverityBadge severity={discovery.severity} />
            <ReviewStatusBadge status={discovery.reviewStatus} />
          </div>
          <h1 className="text-xl font-semibold text-white">{discovery.title}</h1>
        </div>

        {discovery.reviewStatus === 'pending' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPromoteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
            >
              <ArrowUpCircle size={18} />
              Promote to Issue
            </button>
            <button
              onClick={() => setShowDismissModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
            >
              <XCircle size={18} />
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Promoted Banner */}
      {discovery.promotedToIssueId && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/10 border border-green-500/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ArrowUpCircle className="text-green-500" size={20} />
              <span className="text-green-400">
                This discovery was promoted to an issue
              </span>
            </div>
            <Link
              to={`/issues/${discovery.promotedToIssueId}`}
              className="flex items-center gap-1 text-green-400 hover:text-green-300"
            >
              View Issue <ExternalLink size={14} />
            </Link>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
          >
            <h2 className="text-lg font-medium text-white mb-4">Description</h2>
            <p className="text-zinc-300 whitespace-pre-wrap">{discovery.description}</p>
          </motion.div>

          {/* Evidence */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
          >
            <h2 className="text-lg font-medium text-white mb-4">Evidence</h2>
            
            {contractIds.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm text-zinc-500 mb-2">Related Contracts</h3>
                <div className="flex flex-wrap gap-2">
                  {contractIds.map((contractId) => (
                    <Link
                      key={contractId}
                      to={`/data/contracts/${contractId}`}
                      className="flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded text-sm text-zinc-300 hover:text-white hover:bg-zinc-700"
                    >
                      <FileText size={14} />
                      {contractId}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {invoiceIds.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm text-zinc-500 mb-2">Related Invoices</h3>
                <div className="flex flex-wrap gap-2">
                  {invoiceIds.map((invoiceId) => (
                    <span
                      key={invoiceId}
                      className="px-2 py-1 bg-zinc-800 rounded text-sm text-zinc-300 font-mono"
                    >
                      {invoiceId}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(evidence).filter(k => !['contractIds', 'invoiceIds'].includes(k)).length > 0 && (
              <div>
                <h3 className="text-sm text-zinc-500 mb-2">Additional Evidence</h3>
                <pre className="bg-zinc-800 rounded-lg p-4 text-sm text-zinc-300 overflow-x-auto">
                  {JSON.stringify(
                    Object.fromEntries(
                      Object.entries(evidence).filter(([k]) => !['contractIds', 'invoiceIds'].includes(k))
                    ),
                    null,
                    2
                  )}
                </pre>
              </div>
            )}

            {Object.keys(evidence).length === 0 && (
              <p className="text-zinc-500 text-sm">No evidence data available</p>
            )}
          </motion.div>

          {/* AI Reasoning */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
          >
            <h2 className="text-lg font-medium text-white mb-4">AI Reasoning</h2>
            <div className="bg-zinc-800/50 rounded-lg p-4 border-l-4 border-[#ff6500]">
              <p className="text-zinc-300 whitespace-pre-wrap">{discovery.reasoning}</p>
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Confidence */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
          >
            <h2 className="text-sm text-zinc-500 mb-3">Confidence Score</h2>
            <ConfidenceBar confidence={discovery.confidence} size="lg" />
          </motion.div>

          {/* Metadata */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4"
          >
            <h2 className="text-sm text-zinc-500">Details</h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock size={14} className="text-zinc-500" />
                <span className="text-zinc-500">Created:</span>
                <span className="text-zinc-300">
                  {new Date(discovery.createdAt).toLocaleDateString()}
                </span>
              </div>

              {discovery.reviewedAt && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={14} className="text-zinc-500" />
                    <span className="text-zinc-500">Reviewed:</span>
                    <span className="text-zinc-300">
                      {new Date(discovery.reviewedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {discovery.reviewedBy && (
                    <div className="flex items-center gap-2 text-sm">
                      <User size={14} className="text-zinc-500" />
                      <span className="text-zinc-500">By:</span>
                      <span className="text-zinc-300">{discovery.reviewedBy}</span>
                    </div>
                  )}
                </>
              )}

              {discovery.reviewNotes && (
                <div className="pt-2 border-t border-zinc-800">
                  <span className="text-xs text-zinc-500">Review Notes:</span>
                  <p className="text-sm text-zinc-300 mt-1">{discovery.reviewNotes}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* IDs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-3"
          >
            <h2 className="text-sm text-zinc-500">References</h2>
            <div className="space-y-2 text-xs font-mono">
              <div>
                <span className="text-zinc-500">ID: </span>
                <span className="text-zinc-400">{discovery.id}</span>
              </div>
              <div>
                <span className="text-zinc-500">Snapshot: </span>
                <span className="text-zinc-400">{discovery.snapshotId}</span>
              </div>
              <div>
                <span className="text-zinc-500">Run: </span>
                <span className="text-zinc-400">{discovery.runId}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      {showPromoteModal && discovery && (
        <PromoteModal
          isOpen={true}
          onClose={() => setShowPromoteModal(false)}
          onConfirm={handlePromote}
          title={discovery.title}
          currentSeverity={discovery.severity}
        />
      )}
      {showDismissModal && discovery && (
        <DismissModal
          isOpen={true}
          onClose={() => setShowDismissModal(false)}
          onConfirm={handleDismiss}
          title={discovery.title}
          itemType="discovery"
        />
      )}
    </div>
  );
}
