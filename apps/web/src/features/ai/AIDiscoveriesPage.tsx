import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, Search, Filter, ChevronRight, 
  ArrowUpCircle, XCircle, Eye, RefreshCw 
} from 'lucide-react';
import * as api from '@/lib/api/endpoints';
import type { 
  AIDiscovery, 
  AIDiscoverySummary, 
  AIDiscoveryCategory, 
  AIDiscoveryReviewStatus,
  IssueSeverity 
} from '@/lib/api/endpoints';
import { 
  ConfidenceBar, 
  CategoryBadge, 
  SeverityBadge, 
  ReviewStatusBadge,
  PromoteModal,
  DismissModal 
} from './components';

const CATEGORY_OPTIONS: AIDiscoveryCategory[] = ['semantic', 'pattern', 'anomaly', 'contextual'];
const STATUS_OPTIONS: AIDiscoveryReviewStatus[] = ['pending', 'confirmed', 'dismissed'];
const SEVERITY_OPTIONS: IssueSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];

export function AIDiscoveriesPage() {
  const navigate = useNavigate();
  const [discoveries, setDiscoveries] = useState<AIDiscovery[]>([]);
  const [summary, setSummary] = useState<AIDiscoverySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<AIDiscoveryCategory | ''>('');
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | ''>('');
  const [statusFilter, setStatusFilter] = useState<AIDiscoveryReviewStatus | ''>('pending');
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [promoteModal, setPromoteModal] = useState<AIDiscovery | null>(null);
  const [dismissModal, setDismissModal] = useState<AIDiscovery | null>(null);

  useEffect(() => {
    loadData();
  }, [page, categoryFilter, severityFilter, statusFilter]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [discoveriesRes, summaryRes] = await Promise.all([
        api.listAIDiscoveries({
          category: categoryFilter || undefined,
          severity: severityFilter || undefined,
          reviewStatus: statusFilter || undefined,
          limit: pageSize,
          offset: page * pageSize,
        }),
        api.getAIDiscoverySummary(),
      ]);

      if (!discoveriesRes.ok) throw new Error(discoveriesRes.error);
      if (!summaryRes.ok) throw new Error(summaryRes.error);

      setDiscoveries(discoveriesRes.data.discoveries);
      setTotal(discoveriesRes.data.total);
      setSummary(summaryRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load discoveries');
    } finally {
      setLoading(false);
    }
  }

  async function handlePromote(data: { severity?: IssueSeverity; notes?: string }) {
    if (!promoteModal) return;
    const res = await api.promoteAIDiscovery(promoteModal.id, data);
    if (!res.ok) throw new Error(res.error);
    setPromoteModal(null);
    loadData();
  }

  async function handleDismiss(notes?: string) {
    if (!dismissModal) return;
    const res = await api.dismissAIDiscovery(dismissModal.id, notes);
    if (!res.ok) throw new Error(res.error);
    setDismissModal(null);
    loadData();
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="text-[#ff6500]" size={28} />
          <div>
            <h1 className="text-2xl font-light text-white">AI Discoveries</h1>
            <p className="text-sm text-zinc-500">
              Issues found by AI anomaly detection
            </p>
          </div>
        </div>
        <button
          onClick={() => loadData()}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw size={20} className="text-zinc-400" />
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"
          >
            <div className="text-3xl font-light text-white">{summary.total}</div>
            <div className="text-sm text-zinc-500">Total Discoveries</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4"
          >
            <div className="text-3xl font-light text-yellow-400">
              {summary.byStatus?.pending || 0}
            </div>
            <div className="text-sm text-zinc-500">Pending Review</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-green-500/10 border border-green-500/20 rounded-xl p-4"
          >
            <div className="text-3xl font-light text-green-400">
              {summary.byStatus?.confirmed || 0}
            </div>
            <div className="text-sm text-zinc-500">Confirmed</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-zinc-500/10 border border-zinc-500/20 rounded-xl p-4"
          >
            <div className="text-3xl font-light text-zinc-400">
              {summary.byStatus?.dismissed || 0}
            </div>
            <div className="text-sm text-zinc-500">Dismissed</div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            showFilters ? 'bg-[#ff6500] text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <Filter size={16} />
          Filters
        </button>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as AIDiscoveryReviewStatus | ''); setPage(0); }}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value as AIDiscoveryCategory | ''); setPage(0); }}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
            >
              <option value="">All Categories</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>

            <select
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value as IssueSeverity | ''); setPage(0); }}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
            >
              <option value="">All Severity</option>
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </motion.div>
        )}

        <div className="ml-auto text-sm text-zinc-500">
          {total} {total === 1 ? 'discovery' : 'discoveries'}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff6500]" />
        </div>
      )}

      {/* Empty State */}
      {!loading && discoveries.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="mx-auto mb-4 text-zinc-600" size={48} />
          <h3 className="text-lg text-zinc-400 mb-2">No discoveries found</h3>
          <p className="text-sm text-zinc-600">
            AI anomaly detection hasn't found any issues matching your filters.
          </p>
        </div>
      )}

      {/* Discoveries List */}
      {!loading && discoveries.length > 0 && (
        <div className="space-y-3">
          {discoveries.map((discovery, idx) => (
            <motion.div
              key={discovery.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <CategoryBadge category={discovery.category} />
                    <SeverityBadge severity={discovery.severity} />
                    <ReviewStatusBadge status={discovery.reviewStatus} />
                  </div>
                  <h3 className="text-white font-medium mb-1 truncate">{discovery.title}</h3>
                  <p className="text-sm text-zinc-500 line-clamp-2">{discovery.description}</p>
                  <div className="mt-3 w-48">
                    <ConfidenceBar confidence={discovery.confidence} size="sm" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/ai/discoveries/${discovery.id}`)}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye size={18} className="text-zinc-400" />
                  </button>
                  {discovery.reviewStatus === 'pending' && (
                    <>
                      <button
                        onClick={() => setPromoteModal(discovery)}
                        className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                        title="Promote to Issue"
                      >
                        <ArrowUpCircle size={18} className="text-green-500" />
                      </button>
                      <button
                        onClick={() => setDismissModal(discovery)}
                        className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                        title="Dismiss"
                      >
                        <XCircle size={18} className="text-zinc-500" />
                      </button>
                    </>
                  )}
                  <ChevronRight size={18} className="text-zinc-600" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-2 text-sm bg-zinc-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-500">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-2 text-sm bg-zinc-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Modals */}
      {promoteModal && (
        <PromoteModal
          isOpen={true}
          onClose={() => setPromoteModal(null)}
          onConfirm={handlePromote}
          title={promoteModal.title}
          currentSeverity={promoteModal.severity}
        />
      )}
      {dismissModal && (
        <DismissModal
          isOpen={true}
          onClose={() => setDismissModal(null)}
          onConfirm={handleDismiss}
          title={dismissModal.title}
          itemType="discovery"
        />
      )}
    </div>
  );
}
