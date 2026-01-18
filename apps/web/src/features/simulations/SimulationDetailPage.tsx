import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  getSimulation,
  getSimulationOverrides,
  getSimulationRuns,
  getSimulationRunResults,
  getSimulationRunDeltas,
  runSimulation,
  addSimulationOverride,
  deleteSimulationOverride,
  type Simulation,
  type SimulationOverride,
  type SimulationRun,
  type SimulationResult,
  type SimulationDelta,
} from '@/lib/api/endpoints';
import { OverrideBuilder } from './OverrideBuilder';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <FileText size={16} className="text-zinc-400" />,
  pending: <Clock size={16} className="text-amber-400" />,
  running: <Loader2 size={16} className="text-blue-400 animate-spin" />,
  completed: <CheckCircle size={16} className="text-emerald-400" />,
  failed: <XCircle size={16} className="text-red-400" />,
  cancelled: <AlertTriangle size={16} className="text-zinc-400" />,
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  running: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  cancelled: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export function SimulationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [overrides, setOverrides] = useState<SimulationOverride[]>([]);
  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<SimulationRun | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [deltas, setDeltas] = useState<SimulationDelta[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overrides' | 'results' | 'deltas'>('overrides');

  useEffect(() => {
    if (id) {
      loadSimulation();
    }
  }, [id]);

  useEffect(() => {
    if (selectedRun) {
      loadRunResults(selectedRun.id);
    }
  }, [selectedRun]);

  const loadSimulation = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);

    try {
      const [simRes, overridesRes, runsRes] = await Promise.all([
        getSimulation(id),
        getSimulationOverrides(id),
        getSimulationRuns(id),
      ]);
      
      if (!simRes.ok) throw new Error(simRes.error);
      if (!overridesRes.ok) throw new Error(overridesRes.error);
      if (!runsRes.ok) throw new Error(runsRes.error);
      
      setSimulation(simRes.data);
      setOverrides(overridesRes.data.overrides || []);
      setRuns(runsRes.data.runs || []);
      
      // Auto-select latest completed run
      const latestCompleted = (runsRes.data.runs || []).find(r => r.status === 'completed');
      if (latestCompleted) {
        setSelectedRun(latestCompleted);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load simulation');
    } finally {
      setLoading(false);
    }
  };

  const loadRunResults = async (runId: string) => {
    if (!id) return;
    
    try {
      const [resultRes, deltasRes] = await Promise.all([
        getSimulationRunResults(id, runId),
        getSimulationRunDeltas(id, runId, { limit: 100 }),
      ]);
      
      if (!resultRes.ok) throw new Error(resultRes.error);
      if (!deltasRes.ok) throw new Error(deltasRes.error);
      
      setResult(resultRes.data);
      setDeltas(deltasRes.data.deltas || []);
    } catch (err) {
      console.error('Failed to load results:', err);
    }
  };

  const handleRun = async () => {
    if (!id) return;
    
    setRunning(true);
    setError(null);

    try {
      const res = await runSimulation(id, { recomputeRevRec: true });
      if (!res.ok) throw new Error(res.error);
      // Reload to get updated status
      setTimeout(() => loadSimulation(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start simulation');
    } finally {
      setRunning(false);
    }
  };

  const handleAddOverride = async (override: Omit<SimulationOverride, 'id' | 'createdAt' | 'isValid' | 'validationMessage'>) => {
    if (!id) return;
    
    const addRes = await addSimulationOverride(id, {
      overrideType: override.overrideType,
      targetType: override.targetType,
      targetId: override.targetId,
      fieldPath: override.fieldPath || undefined,
      overrideValue: override.overrideValue,
      sequenceNumber: override.sequenceNumber,
    });
    if (!addRes.ok) throw new Error(addRes.error);
    
    // Reload overrides
    const res = await getSimulationOverrides(id);
    if (!res.ok) throw new Error(res.error);
    setOverrides(res.data.overrides || []);
  };

  const handleRemoveOverride = async (overrideId: string) => {
    if (!id) return;
    
    const res = await deleteSimulationOverride(id, overrideId);
    if (!res.ok) throw new Error(res.error);
    setOverrides(overrides.filter(o => o.id !== overrideId));
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPct = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-[#ff6500]" />
      </div>
    );
  }

  if (!simulation) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Simulation not found</p>
        <button
          onClick={() => navigate('/simulations')}
          className="mt-4 text-[#ff6500] hover:underline"
        >
          Back to Simulations
        </button>
      </div>
    );
  }

  const isDraft = simulation.status === 'draft';
  const canRun = isDraft && overrides.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/simulations')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Simulations
          </button>
          <h1 className="text-3xl font-light text-white tracking-tight">
            {simulation.name}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded border ${STATUS_COLORS[simulation.status]}`}>
              {STATUS_ICONS[simulation.status]}
              {simulation.status.charAt(0).toUpperCase() + simulation.status.slice(1)}
            </span>
            <span className="text-sm text-zinc-500">
              {overrides.length} override{overrides.length !== 1 ? 's' : ''}
            </span>
            <span className="text-sm text-zinc-500">
              {runs.length} run{runs.length !== 1 ? 's' : ''}
            </span>
          </div>
          {simulation.description && (
            <p className="text-zinc-500 mt-3 max-w-2xl">{simulation.description}</p>
          )}
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={loadSimulation}
            className="p-2 text-zinc-400 hover:text-white border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={handleRun}
            disabled={!canRun || running}
            className="flex items-center gap-2 px-4 py-2 bg-[#ff6500] text-black font-medium rounded-lg hover:bg-[#ff8533] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play size={16} />
                Run Simulation
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Results Summary */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
              <BarChart3 size={14} />
              Revenue Delta
            </div>
            <div className={`text-2xl font-light ${(result.totalRevenueDelta || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(result.totalRevenueDelta)}
            </div>
            <div className="text-sm text-zinc-500 mt-1">
              {formatPct(result.totalRevenueDeltaPct)}
            </div>
          </div>
          
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
              {(result.totalRevenueDelta || 0) >= 0 ? (
                <TrendingUp size={14} className="text-emerald-400" />
              ) : (
                <TrendingDown size={14} className="text-red-400" />
              )}
              Contracts Affected
            </div>
            <div className="text-2xl font-light text-white">
              {result.contractsAffected}
            </div>
          </div>
          
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
            <div className="text-zinc-400 text-sm mb-2">Overrides Applied</div>
            <div className="text-2xl font-light text-white">
              {result.overridesApplied}
              <span className="text-sm text-zinc-500 ml-2">
                / {result.overridesApplied + result.overridesSkipped}
              </span>
            </div>
          </div>
          
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
            <div className="text-zinc-400 text-sm mb-2">Obligations Affected</div>
            <div className="text-2xl font-light text-white">
              {result.obligationsAffected}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('overrides')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'overrides'
              ? 'text-[#ff6500] border-b-2 border-[#ff6500]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Overrides ({overrides.length})
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'results'
              ? 'text-[#ff6500] border-b-2 border-[#ff6500]'
              : 'text-zinc-400 hover:text-white'
          }`}
          disabled={!result}
        >
          Results
        </button>
        <button
          onClick={() => setActiveTab('deltas')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'deltas'
              ? 'text-[#ff6500] border-b-2 border-[#ff6500]'
              : 'text-zinc-400 hover:text-white'
          }`}
          disabled={deltas.length === 0}
        >
          Deltas ({deltas.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overrides' && (
          <OverrideBuilder
            overrides={overrides}
            onAddOverride={handleAddOverride}
            onRemoveOverride={handleRemoveOverride}
            disabled={!isDraft}
          />
        )}

        {activeTab === 'results' && result && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                <h3 className="text-sm font-medium text-zinc-400 mb-4">Baseline</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Total Revenue</dt>
                    <dd className="text-white">{formatCurrency(result.totalRevenueBaseline)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Recognized</dt>
                    <dd className="text-white">{formatCurrency(result.totalRecognizedBaseline)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Deferred</dt>
                    <dd className="text-white">{formatCurrency(result.totalDeferredBaseline)}</dd>
                  </div>
                </dl>
              </div>
              
              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                <h3 className="text-sm font-medium text-zinc-400 mb-4">Simulated</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Total Revenue</dt>
                    <dd className="text-white">{formatCurrency(result.totalRevenueSimulated)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Recognized</dt>
                    <dd className="text-white">{formatCurrency(result.totalRecognizedSimulated)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Deferred</dt>
                    <dd className="text-white">{formatCurrency(result.totalDeferredSimulated)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {result.warnings && (result.warnings as unknown[]).length > 0 && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <h3 className="text-sm font-medium text-amber-400 mb-2">Warnings</h3>
                <ul className="space-y-1 text-sm text-amber-300">
                  {(result.warnings as Array<{ message: string }>).map((w, i) => (
                    <li key={i}>{w.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'deltas' && deltas.length > 0 && (
          <div className="space-y-3">
            {deltas.map((delta) => (
              <motion.div
                key={delta.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono bg-zinc-800 px-2 py-1 rounded text-zinc-400">
                    {delta.deltaType.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`text-lg font-medium ${delta.deltaAmount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(delta.deltaAmount)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  {delta.targetType && delta.targetId && (
                    <span>
                      {delta.targetType}: {delta.targetId.substring(0, 12)}...
                    </span>
                  )}
                  {delta.periodStart && delta.periodEnd && (
                    <span>
                      {new Date(delta.periodStart).toLocaleDateString()} - {new Date(delta.periodEnd).toLocaleDateString()}
                    </span>
                  )}
                  {delta.deltaPct !== null && (
                    <span className={delta.deltaPct >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {formatPct(delta.deltaPct)}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Run History */}
      {runs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-medium text-white mb-4">Run History</h2>
          <div className="space-y-2">
            {runs.map((run) => (
              <div
                key={run.id}
                onClick={() => setSelectedRun(run)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedRun?.id === run.id
                    ? 'bg-[#ff6500]/10 border border-[#ff6500]/30'
                    : 'bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-zinc-500">#{run.runNumber}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ${STATUS_COLORS[run.status]}`}>
                    {STATUS_ICONS[run.status]}
                    {run.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  {run.processingTimeMs && (
                    <span>{(run.processingTimeMs / 1000).toFixed(1)}s</span>
                  )}
                  {run.startedAt && (
                    <span>{new Date(run.startedAt).toLocaleString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
