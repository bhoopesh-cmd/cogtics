/**
 * Revenue Recognition Dashboard Page
 * 
 * Main dashboard for ASC 606 revenue recognition.
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Play,
} from 'lucide-react';
import {
  getRevRecSummary,
  triggerRevRecCompute,
  type RevRecSummary,
} from '@/lib/api/endpoints';
import { ObligationsPanel } from './ObligationsPanel';
import { SchedulesPanel } from './SchedulesPanel';
import { ReconciliationPanel } from './ReconciliationPanel';

type TabType = 'summary' | 'obligations' | 'schedules' | 'reconciliations';

export function RevRecDashboardPage() {
  const [summary, setSummary] = useState<RevRecSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    try {
      const data = await getRevRecSummary();
      setSummary(data);
    } catch (err) {
      setError('Failed to load rev-rec summary');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunCompute() {
    if (!summary?.snapshotId) return;
    
    setComputing(true);
    try {
      await triggerRevRecCompute(summary.snapshotId, { forceRecompute: true });
      // Reload summary after a delay to see results
      setTimeout(loadSummary, 2000);
    } catch (err) {
      console.error('Failed to trigger compute:', err);
    } finally {
      setComputing(false);
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const tabs: Array<{ id: TabType; label: string }> = [
    { id: 'summary', label: 'Summary' },
    { id: 'obligations', label: 'Obligations' },
    { id: 'schedules', label: 'Schedules' },
    { id: 'reconciliations', label: 'Reconciliations' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-white tracking-tight">
            Revenue Recognition
          </h1>
          <p className="text-zinc-500 mt-2">
            ASC 606 compliant revenue recognition and reconciliation.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadSummary}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleRunCompute}
            disabled={computing || !summary?.snapshotId}
            className="flex items-center gap-2 px-4 py-2 bg-[#ff6500] hover:bg-[#ff6500]/80 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Play size={16} className={computing ? 'animate-pulse' : ''} />
            {computing ? 'Computing...' : 'Run Computation'}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-zinc-900/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-lg"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <DollarSign size={18} className="text-blue-400" />
              </div>
              <span className="text-zinc-500 text-sm">Total Transaction Value</span>
            </div>
            <div className="text-2xl font-semibold text-white">
              {formatCurrency(summary.totalTransactionValue)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {summary.totalObligations} obligations
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-lg"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp size={18} className="text-green-400" />
              </div>
              <span className="text-zinc-500 text-sm">Recognized Revenue</span>
            </div>
            <div className="text-2xl font-semibold text-white">
              {formatCurrency(summary.totalRecognized)}
            </div>
            <div className="text-xs text-green-500 mt-1">
              {summary.totalTransactionValue > 0 
                ? `${((summary.totalRecognized / summary.totalTransactionValue) * 100).toFixed(1)}% complete`
                : '0%'}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-lg"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Clock size={18} className="text-orange-400" />
              </div>
              <span className="text-zinc-500 text-sm">Deferred Revenue</span>
            </div>
            <div className="text-2xl font-semibold text-white">
              {formatCurrency(summary.totalDeferred)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              To be recognized
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-lg"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <CheckCircle size={18} className="text-purple-400" />
              </div>
              <span className="text-zinc-500 text-sm">Reconciliation</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-green-400">
                {summary.reconciliationStatus.matched}
              </span>
              <span className="text-zinc-500">matched</span>
              {(summary.reconciliationStatus.timingVariance + 
                summary.reconciliationStatus.amountVariance + 
                summary.reconciliationStatus.unmatched) > 0 && (
                <>
                  <span className="text-zinc-600">|</span>
                  <span className="text-lg font-semibold text-[#ff6500]">
                    {summary.reconciliationStatus.timingVariance + 
                     summary.reconciliationStatus.amountVariance + 
                     summary.reconciliationStatus.unmatched}
                  </span>
                  <span className="text-zinc-500">issues</span>
                </>
              )}
            </div>
          </motion.div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff6500]"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'summary' && summary && (
          <SummaryTab summary={summary} />
        )}
        {activeTab === 'obligations' && (
          <ObligationsPanel snapshotId={summary?.snapshotId} />
        )}
        {activeTab === 'schedules' && (
          <SchedulesPanel snapshotId={summary?.snapshotId} />
        )}
        {activeTab === 'reconciliations' && (
          <ReconciliationPanel snapshotId={summary?.snapshotId} />
        )}
      </div>
    </div>
  );
}

function SummaryTab({ summary }: { summary: RevRecSummary }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Reconciliation Status Breakdown */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4">
          Reconciliation Status
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-green-400" />
            <div>
              <div className="text-xl font-semibold text-white">
                {summary.reconciliationStatus.matched}
              </div>
              <div className="text-sm text-zinc-500">Matched</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-yellow-400" />
            <div>
              <div className="text-xl font-semibold text-white">
                {summary.reconciliationStatus.timingVariance}
              </div>
              <div className="text-sm text-zinc-500">Timing Variance</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-orange-400" />
            <div>
              <div className="text-xl font-semibold text-white">
                {summary.reconciliationStatus.amountVariance}
              </div>
              <div className="text-sm text-zinc-500">Amount Variance</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <XCircle size={20} className="text-red-400" />
            <div>
              <div className="text-xl font-semibold text-white">
                {summary.reconciliationStatus.unmatched}
              </div>
              <div className="text-sm text-zinc-500">Unmatched</div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Progress Bar */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4">
          Recognition Progress
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Recognized</span>
            <span className="text-white font-mono">
              ${summary.totalRecognized.toLocaleString()}
            </span>
          </div>
          <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
              style={{
                width: `${summary.totalTransactionValue > 0 
                  ? (summary.totalRecognized / summary.totalTransactionValue) * 100 
                  : 0}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Deferred</span>
            <span className="text-white font-mono">
              ${summary.totalDeferred.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm">
            Export Schedules
          </button>
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm">
            View Variances
          </button>
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm">
            Generate Report
          </button>
        </div>
      </div>
    </motion.div>
  );
}
