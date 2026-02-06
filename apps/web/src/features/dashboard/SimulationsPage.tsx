import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
  Lightbulb,
  Sliders,
  Eye,
  Check,
  X,
} from 'lucide-react';
import {
  listSimulations,
  listRecommendations,
  getRecommendationSummary,
  createSimulationFromRecommendation,
  acceptRecommendation,
  dismissRecommendation,
  type Simulation,
  type SimulationListQuery,
  type AIRecommendation,
  type RecommendationSummary,
} from '@/lib/api/endpoints';
import { CreateSimulationModal } from '@/features/simulations/CreateSimulationModal';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <FileText size={14} className="text-zinc-400" />,
  pending: <Clock size={14} className="text-amber-400" />,
  running: <Loader2 size={14} className="text-blue-400 animate-spin" />,
  completed: <CheckCircle size={14} className="text-emerald-400" />,
  failed: <XCircle size={14} className="text-red-400" />,
  cancelled: <AlertTriangle size={14} className="text-zinc-400" />,
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  running: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  cancelled: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

type ViewTab = 'simulations' | 'recommendations';

export function SimulationsPage() {
  const navigate = useNavigate();
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // View tab
  const [viewTab, setViewTab] = useState<ViewTab>('simulations');
  
  // Recommendations state
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [recSummary, setRecSummary] = useState<RecommendationSummary | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (viewTab === 'simulations') {
      loadSimulations();
    } else {
      loadRecommendations();
    }
  }, [statusFilter, viewTab]);

  const loadSimulations = async () => {
    setLoading(true);
    setError(null);

    try {
      const query: SimulationListQuery = { limit: 50 };
      if (statusFilter) {
        query.status = statusFilter;
      }
      const res = await listSimulations(query);
      if (!res.ok) {
        throw new Error(res.error || 'Failed to load simulations');
      }
      setSimulations(res.data.simulations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load simulations');
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    setRecLoading(true);
    setError(null);
    try {
      const [recsRes, summaryRes] = await Promise.all([
        listRecommendations({ limit: 50 }),
        getRecommendationSummary(),
      ]);
      if (!recsRes.ok) throw new Error(recsRes.error);
      if (!summaryRes.ok) throw new Error(summaryRes.error);
      
      setRecommendations(recsRes.data.recommendations);
      setRecSummary(summaryRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setRecLoading(false);
    }
  };

  const handleCreateSimFromRec = async (rec: AIRecommendation) => {
    setActionLoading(rec.id);
    try {
      const res = await createSimulationFromRecommendation(rec.id);
      if (!res.ok) throw new Error(res.error);
      navigate(`/simulations/${res.data.simulationId}`);
    } catch (err) {
      console.error('Failed to create simulation:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptRec = async (rec: AIRecommendation) => {
    setActionLoading(rec.id);
    try {
      const res = await acceptRecommendation(rec.id);
      if (!res.ok) throw new Error(res.error);
      loadRecommendations();
    } catch (err) {
      console.error('Failed to accept:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismissRec = async (rec: AIRecommendation) => {
    setActionLoading(rec.id);
    try {
      const res = await dismissRecommendation(rec.id);
      if (!res.ok) throw new Error(res.error);
      loadRecommendations();
    } catch (err) {
      console.error('Failed to dismiss:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreated = (simulationId: string) => {
    navigate(`/simulations/${simulationId}`);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-white tracking-tight">Simulations</h1>
          <p className="text-zinc-500 mt-2">
            Test revenue strategies on snapshots without mutating source data.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => viewTab === 'simulations' ? loadSimulations() : loadRecommendations()}
            className="p-2 text-zinc-400 hover:text-white border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
          >
            <RefreshCw size={18} />
          </button>
          {viewTab === 'simulations' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#ff6500] text-black font-medium rounded hover:bg-[#ff8533] transition-colors"
            >
              <Plus size={16} /> New Scenario
            </button>
          )}
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewTab('simulations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
            viewTab === 'simulations'
              ? 'bg-[#ff6500] text-black font-medium'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
          }`}
        >
          <Sliders size={16} />
          Simulations
        </button>
        <button
          onClick={() => setViewTab('recommendations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
            viewTab === 'recommendations'
              ? 'bg-purple-600 text-white font-medium'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
          }`}
        >
          <Lightbulb size={16} />
          AI Recommendations
          {recSummary && (recSummary.byStatus?.pending || 0) > 0 && (
            <span className="px-1.5 py-0.5 bg-purple-500/30 rounded text-xs">
              {recSummary.byStatus?.pending || 0}
            </span>
          )}
        </button>
      </div>

      {/* Filters - only for simulations */}
      {viewTab === 'simulations' && (
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              statusFilter === ''
                ? 'bg-[#ff6500] text-black'
                : 'text-zinc-400 hover:text-white border border-zinc-700'
            }`}
          >
            All
          </button>
          {['draft', 'completed', 'running', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                statusFilter === status
                  ? 'bg-[#ff6500] text-black'
                  : 'text-zinc-400 hover:text-white border border-zinc-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Simulations View */}
      {viewTab === 'simulations' && (loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-[#ff6500]" />
        </div>
      ) : simulations.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800/50 mb-4">
            <Play size={24} className="text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Simulations Yet</h3>
          <p className="text-zinc-500 mb-6">
            Create your first simulation to test revenue scenarios.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff6500] text-black font-medium rounded hover:bg-[#ff8533] transition-colors"
          >
            <Plus size={16} /> Create Simulation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {simulations.map((sim, idx) => (
            <motion.div
              key={sim.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => navigate(`/simulations/${sim.id}`)}
              className="bg-zinc-900/20 border border-zinc-800 p-6 rounded-xl hover:border-zinc-600 transition-colors group relative overflow-hidden cursor-pointer"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Play size={16} className="text-[#ff6500]" />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-mono rounded border ${STATUS_COLORS[sim.status]}`}
                >
                  {STATUS_ICONS[sim.status]}
                  {sim.status}
                </span>
                {sim.overridesCount !== undefined && sim.overridesCount > 0 && (
                  <span className="text-[10px] uppercase font-mono bg-zinc-900 border border-zinc-700 px-2 py-1 rounded text-zinc-400">
                    {sim.overridesCount} override{sim.overridesCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <h3 className="text-lg font-medium text-white mb-2 truncate">{sim.name}</h3>
              <p className="text-sm text-zinc-500 mb-6 min-h-[40px] line-clamp-2">
                {sim.description || 'No description provided'}
              </p>

              <div className="flex items-end justify-between border-t border-zinc-800/50 pt-4">
                <div>
                  <div className="text-xs text-zinc-600 uppercase tracking-wider mb-1">
                    Created
                  </div>
                  <div className="text-sm text-zinc-400">{formatDate(sim.createdAt)}</div>
                </div>
                {sim.latestRun && sim.status === 'completed' && (
                  <div className="text-right">
                    <div className="text-xs text-zinc-600 uppercase tracking-wider mb-1">
                      Impact
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      {Math.random() > 0.5 ? (
                        <>
                          <TrendingUp size={14} className="text-emerald-400" />
                          <span className="text-emerald-400">+$12K</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown size={14} className="text-red-400" />
                          <span className="text-red-400">-$8K</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Create New Placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: simulations.length * 0.05 }}
            onClick={() => setShowCreateModal(true)}
            className="border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center p-6 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer min-h-[240px]"
          >
            <Plus size={32} className="mb-4 opacity-50" />
            <span className="text-sm font-medium">Build Custom Logic</span>
          </motion.div>
        </div>
      ))}

      {/* Recommendations View */}
      {viewTab === 'recommendations' && (recLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-purple-500" />
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 mb-4">
            <Lightbulb size={24} className="text-purple-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No AI Recommendations</h3>
          <p className="text-zinc-500 mb-6">
            AI hasn't generated any recommendations yet. Run detection to analyze your data.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          {recSummary && (
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
                <div className="text-2xl font-light text-white">{recSummary.total}</div>
                <div className="text-xs text-zinc-500 uppercase">Total</div>
              </div>
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp size={20} className="text-green-400" />
                  <div className="text-xl font-light text-green-400">
                    {formatCurrency(Math.abs(recSummary.totalEstimatedImpact || 0))}
                  </div>
                </div>
                <div className="text-xs text-zinc-500 uppercase">Est. Impact</div>
              </div>
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="text-2xl font-light text-yellow-400">
                  {recSummary.byStatus?.pending || 0}
                </div>
                <div className="text-xs text-zinc-500 uppercase">Pending</div>
              </div>
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="text-2xl font-light text-purple-400">
                  {recSummary.byStatus?.simulated || 0}
                </div>
                <div className="text-xs text-zinc-500 uppercase">Simulated</div>
              </div>
            </div>
          )}

          {/* Recommendations List */}
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`bg-zinc-900/20 border rounded-lg p-5 transition-all ${
                  rec.status === 'dismissed'
                    ? 'border-zinc-900 opacity-60'
                    : 'border-zinc-800 hover:border-purple-600/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded bg-purple-500/10 text-purple-400 mt-1">
                      <Lightbulb size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-medium ${
                          rec.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                          rec.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                          rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-500/20 text-zinc-400'
                        }`}>
                          {rec.priority}
                        </span>
                        <span className={`text-[10px] uppercase border px-1.5 rounded ${
                          rec.status === 'pending' ? 'text-yellow-500 border-yellow-500' :
                          rec.status === 'accepted' ? 'text-blue-500 border-blue-500' :
                          rec.status === 'simulated' ? 'text-purple-500 border-purple-500' :
                          rec.status === 'applied' ? 'text-green-500 border-green-500' : 'text-zinc-500 border-zinc-600'
                        }`}>
                          {rec.status}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {rec.issueIds.length} issue{rec.issueIds.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <h3 className="text-white font-medium mb-1">{rec.title}</h3>
                      <p className="text-zinc-400 text-sm line-clamp-2 max-w-2xl">{rec.description}</p>
                      <div className="flex items-center gap-4 mt-3">
                        {rec.estimatedImpact?.revenueChange !== undefined && (
                          <div className="flex items-center gap-1 text-sm">
                            <TrendingUp size={14} className="text-green-400" />
                            <span className="text-green-400">
                              {rec.estimatedImpact.revenueChange > 0 ? '+' : ''}
                              {formatCurrency(rec.estimatedImpact.revenueChange)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-zinc-500">
                          <span>Effort:</span>
                          <span className={
                            rec.effort === 'low' ? 'text-green-400' :
                            rec.effort === 'medium' ? 'text-yellow-400' : 'text-red-400'
                          }>{rec.effort}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {rec.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCreateSimFromRec(rec)}
                          disabled={actionLoading === rec.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-sm text-white transition-colors disabled:opacity-50"
                          title="Create Simulation"
                        >
                          <Play size={14} />
                          Simulate
                        </button>
                        <button
                          onClick={() => handleAcceptRec(rec)}
                          disabled={actionLoading === rec.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white transition-colors disabled:opacity-50"
                          title="Accept"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => handleDismissRec(rec)}
                          disabled={actionLoading === rec.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-sm text-white transition-colors disabled:opacity-50"
                          title="Dismiss"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    {rec.simulationId && (
                      <button
                        onClick={() => navigate(`/simulations/${rec.simulationId}`)}
                        className="flex items-center gap-1 text-purple-400 text-sm hover:underline"
                      >
                        View Simulation
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      <CreateSimulationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
