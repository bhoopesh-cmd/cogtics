import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Lightbulb, Filter, ChevronRight, Play, Check, X, 
  RefreshCw, Eye, TrendingUp 
} from 'lucide-react';
import * as api from '@/lib/api/endpoints';
import type { 
  AIRecommendation, 
  RecommendationSummary, 
  RecommendationPriority, 
  RecommendationStatus
} from '@/lib/api/endpoints';
import { 
  PriorityBadge, 
  EffortIndicator, 
  ImpactDisplay, 
  ReviewStatusBadge,
  DismissModal 
} from './components';

const PRIORITY_OPTIONS: RecommendationPriority[] = ['critical', 'high', 'medium', 'low'];
const STATUS_OPTIONS: RecommendationStatus[] = ['pending', 'accepted', 'simulated', 'applied', 'dismissed'];

export function RecommendationsPage() {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [summary, setSummary] = useState<RecommendationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<RecommendationPriority | ''>('');
  const [statusFilter, setStatusFilter] = useState<RecommendationStatus | ''>('pending');
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [dismissModal, setDismissModal] = useState<AIRecommendation | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [page, priorityFilter, statusFilter]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [recsRes, summaryRes] = await Promise.all([
        api.listRecommendations({
          priority: priorityFilter || undefined,
          status: statusFilter || undefined,
          limit: pageSize,
          offset: page * pageSize,
        }),
        api.getRecommendationSummary(),
      ]);

      if (!recsRes.ok) throw new Error(recsRes.error);
      if (!summaryRes.ok) throw new Error(summaryRes.error);

      setRecommendations(recsRes.data.recommendations);
      setTotal(recsRes.data.total);
      setSummary(summaryRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSimulation(rec: AIRecommendation) {
    setActionLoading(rec.id);
    try {
      const res = await api.createSimulationFromRecommendation(rec.id);
      if (!res.ok) throw new Error(res.error);
      navigate(`/simulations/${res.data.simulationId}`);
    } catch (err) {
      console.error('Failed to create simulation:', err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAccept(rec: AIRecommendation) {
    setActionLoading(rec.id);
    try {
      const res = await api.acceptRecommendation(rec.id);
      if (!res.ok) throw new Error(res.error);
      loadData();
    } catch (err) {
      console.error('Failed to accept:', err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDismiss(notes?: string) {
    if (!dismissModal) return;
    const res = await api.dismissRecommendation(dismissModal.id, notes);
    if (!res.ok) throw new Error(res.error);
    setDismissModal(null);
    loadData();
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Lightbulb className="text-[#ff6500]" size={28} />
          <div>
            <h1 className="text-2xl font-light text-white">AI Recommendations</h1>
            <p className="text-sm text-zinc-500">
              Suggested fixes and optimizations from AI analysis
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
            <div className="text-sm text-zinc-500">Total Recommendations</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-green-500/10 border border-green-500/20 rounded-xl p-4"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="text-green-400" size={24} />
              <div className="text-2xl font-light text-green-400">
                {formatCurrency(Math.abs(summary.totalEstimatedImpact || 0))}
              </div>
            </div>
            <div className="text-sm text-zinc-500">Estimated Impact</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
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
            transition={{ delay: 0.3 }}
            className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4"
          >
            <div className="text-3xl font-light text-purple-400">
              {summary.byStatus?.simulated || 0}
            </div>
            <div className="text-sm text-zinc-500">Simulated</div>
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
              onChange={(e) => { setStatusFilter(e.target.value as RecommendationStatus | ''); setPage(0); }}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value as RecommendationPriority | ''); setPage(0); }}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
            >
              <option value="">All Priority</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </motion.div>
        )}

        <div className="ml-auto text-sm text-zinc-500">
          {total} {total === 1 ? 'recommendation' : 'recommendations'}
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
      {!loading && recommendations.length === 0 && (
        <div className="text-center py-12">
          <Lightbulb className="mx-auto mb-4 text-zinc-600" size={48} />
          <h3 className="text-lg text-zinc-400 mb-2">No recommendations found</h3>
          <p className="text-sm text-zinc-600">
            AI hasn't generated any recommendations matching your filters.
          </p>
        </div>
      )}

      {/* Recommendations List */}
      {!loading && recommendations.length > 0 && (
        <div className="space-y-3">
          {recommendations.map((rec, idx) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <PriorityBadge priority={rec.priority} />
                    <ReviewStatusBadge status={rec.status} />
                  </div>
                  <h3 className="text-white font-medium mb-1">{rec.title}</h3>
                  <p className="text-sm text-zinc-500 line-clamp-2 mb-3">{rec.description}</p>
                  <div className="flex items-center gap-6">
                    <ImpactDisplay impact={rec.estimatedImpact} size="sm" />
                    <EffortIndicator effort={rec.effort} />
                    <span className="text-xs text-zinc-500">
                      {rec.issueIds.length} related issue{rec.issueIds.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/ai/recommendations/${rec.id}`)}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye size={18} className="text-zinc-400" />
                  </button>
                  {rec.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleCreateSimulation(rec)}
                        disabled={actionLoading === rec.id}
                        className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Create Simulation"
                      >
                        <Play size={18} className="text-purple-500" />
                      </button>
                      <button
                        onClick={() => handleAccept(rec)}
                        disabled={actionLoading === rec.id}
                        className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Accept"
                      >
                        <Check size={18} className="text-blue-500" />
                      </button>
                      <button
                        onClick={() => setDismissModal(rec)}
                        className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                        title="Dismiss"
                      >
                        <X size={18} className="text-zinc-500" />
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
      {dismissModal && (
        <DismissModal
          isOpen={true}
          onClose={() => setDismissModal(null)}
          onConfirm={handleDismiss}
          title={dismissModal.title}
          itemType="recommendation"
        />
      )}
    </div>
  );
}
