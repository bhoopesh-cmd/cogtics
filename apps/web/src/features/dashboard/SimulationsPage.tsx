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
} from 'lucide-react';
import {
  listSimulations,
  type Simulation,
  type SimulationListQuery,
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

export function SimulationsPage() {
  const navigate = useNavigate();
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    loadSimulations();
  }, [statusFilter]);

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
            onClick={loadSimulations}
            className="p-2 text-zinc-400 hover:text-white border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#ff6500] text-black font-medium rounded hover:bg-[#ff8533] transition-colors"
          >
            <Plus size={16} /> New Scenario
          </button>
        </div>
      </div>

      {/* Filters */}
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

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {loading ? (
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
      )}

      <CreateSimulationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
