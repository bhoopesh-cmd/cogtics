/**
 * Reconciliation Panel
 * 
 * Displays reconciliation results between schedules and invoices.
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  FileText,
  Play,
} from 'lucide-react';
import {
  listRevRecReconciliations,
  triggerRevRecReconcile,
  type RevRecReconciliation,
} from '@/lib/api/endpoints';

interface ReconciliationPanelProps {
  snapshotId?: string;
}

export function ReconciliationPanel({ snapshotId }: ReconciliationPanelProps) {
  const [reconciliations, setReconciliations] = useState<RevRecReconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadReconciliations();
  }, [snapshotId, statusFilter]);

  async function loadReconciliations() {
    setLoading(true);
    try {
      const res = await listRevRecReconciliations({ 
        snapshotId, 
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 100,
      });
      if (!res.ok) throw new Error(res.error);
      setReconciliations(res.data.reconciliations || []);
    } catch (err) {
      console.error('Failed to load reconciliations:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunReconciliation() {
    if (!snapshotId) return;
    
    setRunning(true);
    try {
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31);
      
      await triggerRevRecReconcile(
        snapshotId,
        yearStart.toISOString().split('T')[0],
        yearEnd.toISOString().split('T')[0]
      );
      
      // Reload after a delay
      setTimeout(loadReconciliations, 2000);
    } catch (err) {
      console.error('Failed to trigger reconciliation:', err);
    } finally {
      setRunning(false);
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'matched': return CheckCircle;
      case 'timing_variance': return Clock;
      case 'amount_variance': return AlertTriangle;
      case 'missing_invoice': return FileText;
      case 'unmatched': return XCircle;
      default: return AlertTriangle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'matched': return 'bg-green-500/10 text-green-400';
      case 'timing_variance': return 'bg-yellow-500/10 text-yellow-400';
      case 'amount_variance': return 'bg-orange-500/10 text-orange-400';
      case 'missing_invoice': return 'bg-red-500/10 text-red-400';
      case 'unmatched': return 'bg-red-500/10 text-red-400';
      default: return 'bg-zinc-500/10 text-zinc-400';
    }
  };

  const statusOptions = [
    { id: 'all', label: 'All' },
    { id: 'matched', label: 'Matched' },
    { id: 'timing_variance', label: 'Timing' },
    { id: 'amount_variance', label: 'Amount' },
    { id: 'missing_invoice', label: 'Missing' },
    { id: 'unmatched', label: 'Unmatched' },
  ];

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-zinc-900/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setStatusFilter(option.id)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                statusFilter === option.id
                  ? 'bg-[#ff6500] text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleRunReconciliation}
          disabled={running || !snapshotId}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors disabled:opacity-50 text-sm"
        >
          <Play size={14} className={running ? 'animate-pulse' : ''} />
          {running ? 'Running...' : 'Run Reconciliation'}
        </button>
      </div>

      {reconciliations.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          No reconciliation results found. Run reconciliation to compare schedules with invoices.
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/50 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left text-zinc-500 font-medium">Contract</th>
                <th className="px-4 py-3 text-left text-zinc-500 font-medium">Period</th>
                <th className="px-4 py-3 text-right text-zinc-500 font-medium">Scheduled</th>
                <th className="px-4 py-3 text-right text-zinc-500 font-medium">Invoiced</th>
                <th className="px-4 py-3 text-right text-zinc-500 font-medium">Variance</th>
                <th className="px-4 py-3 text-center text-zinc-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {reconciliations.map((rec, idx) => {
                const StatusIcon = getStatusIcon(rec.status);
                return (
                  <motion.tr
                    key={rec.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-zinc-900/30"
                  >
                    <td className="px-4 py-3">
                      <div className="text-white">
                        {rec.contractName ?? rec.contractId}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {new Date(rec.periodStart).toLocaleDateString()} - {new Date(rec.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {formatCurrency(rec.scheduledAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {formatCurrency(rec.invoicedAmount)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${
                      rec.varianceAmount === 0 ? 'text-zinc-500' : 
                      rec.varianceAmount > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {rec.varianceAmount >= 0 ? '+' : ''}{formatCurrency(rec.varianceAmount)}
                      {rec.variancePct !== null && (
                        <span className="text-xs text-zinc-500 ml-1">
                          ({rec.variancePct >= 0 ? '+' : ''}{rec.variancePct.toFixed(1)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-full ${getStatusColor(rec.status)}`}>
                          <StatusIcon size={12} />
                          <span className="capitalize">{rec.status.replace('_', ' ')}</span>
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      {reconciliations.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <CheckCircle size={16} />
              <span className="text-sm">Matched</span>
            </div>
            <div className="text-2xl font-semibold text-white">
              {reconciliations.filter(r => r.status === 'matched').length}
            </div>
          </div>
          <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-400 mb-1">
              <Clock size={16} />
              <span className="text-sm">Timing</span>
            </div>
            <div className="text-2xl font-semibold text-white">
              {reconciliations.filter(r => r.status === 'timing_variance').length}
            </div>
          </div>
          <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-orange-400 mb-1">
              <AlertTriangle size={16} />
              <span className="text-sm">Amount</span>
            </div>
            <div className="text-2xl font-semibold text-white">
              {reconciliations.filter(r => r.status === 'amount_variance').length}
            </div>
          </div>
          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <XCircle size={16} />
              <span className="text-sm">Issues</span>
            </div>
            <div className="text-2xl font-semibold text-white">
              {reconciliations.filter(r => 
                r.status === 'missing_invoice' || r.status === 'unmatched'
              ).length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
