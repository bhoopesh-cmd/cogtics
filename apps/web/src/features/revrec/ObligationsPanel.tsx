/**
 * Obligations Panel
 * 
 * Displays list of revenue obligations.
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Package, Clock, Users, Wrench, Headphones, type LucideIcon } from 'lucide-react';
import {
  listRevRecObligations,
  getRevRecObligation,
  type RevRecObligation,
  type RevRecObligationDetail,
} from '@/lib/api/endpoints';

interface ObligationsPanelProps {
  snapshotId?: string;
}

const OBLIGATION_ICONS: Record<string, LucideIcon> = {
  subscription: Package,
  usage: Clock,
  one_time: Clock,
  professional_services: Wrench,
  support: Headphones,
};

export function ObligationsPanel({ snapshotId }: ObligationsPanelProps) {
  const [obligations, setObligations] = useState<RevRecObligation[]>([]);
  const [selectedObligation, setSelectedObligation] = useState<RevRecObligationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadObligations();
  }, [snapshotId]);

  async function loadObligations() {
    setLoading(true);
    try {
      const res = await listRevRecObligations({ snapshotId, limit: 50 });
      if (!res.ok) throw new Error(res.error);
      setObligations(res.data.obligations || []);
    } catch (err) {
      console.error('Failed to load obligations:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectObligation(id: string) {
    setDetailLoading(true);
    try {
      const res = await getRevRecObligation(id);
      if (!res.ok) throw new Error(res.error);
      setSelectedObligation(res.data);
    } catch (err) {
      console.error('Failed to load obligation detail:', err);
    } finally {
      setDetailLoading(false);
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-400';
      case 'completed': return 'bg-blue-500/10 text-blue-400';
      case 'cancelled': return 'bg-red-500/10 text-red-400';
      case 'amended': return 'bg-yellow-500/10 text-yellow-400';
      default: return 'bg-zinc-500/10 text-zinc-400';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-zinc-900/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (obligations.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        No obligations found. Run rev-rec computation to identify performance obligations.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Obligations List */}
      <div className="space-y-2">
        {obligations.map((obligation, idx) => {
          const Icon = OBLIGATION_ICONS[obligation.obligationType] || Package;
          return (
            <motion.div
              key={obligation.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              onClick={() => handleSelectObligation(obligation.id)}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedObligation?.id === obligation.id
                  ? 'border-[#ff6500] bg-[#ff6500]/5'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-800 rounded-lg">
                    <Icon size={16} className="text-zinc-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {obligation.contractName ?? obligation.contractId}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {obligation.customerName ?? 'Unknown Customer'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-mono text-sm">
                    {formatCurrency(obligation.transactionPrice)}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(obligation.status)}`}>
                    {obligation.status}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                <span className="capitalize">{obligation.obligationType.replace('_', ' ')}</span>
                <div className="flex items-center gap-1">
                  {obligation.serviceStartDate && obligation.serviceEndDate && (
                    <span>
                      {new Date(obligation.serviceStartDate).toLocaleDateString()} - {new Date(obligation.serviceEndDate).toLocaleDateString()}
                    </span>
                  )}
                  <ChevronRight size={14} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Obligation Detail */}
      <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-900/30">
        {detailLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-zinc-800 rounded w-1/2" />
            <div className="h-4 bg-zinc-800 rounded w-1/3" />
            <div className="h-32 bg-zinc-800 rounded" />
          </div>
        ) : selectedObligation ? (
          <ObligationDetail obligation={selectedObligation} />
        ) : (
          <div className="text-center text-zinc-500 py-12">
            Select an obligation to view details
          </div>
        )}
      </div>
    </div>
  );
}

function ObligationDetail({ obligation }: { obligation: RevRecObligationDetail }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white">
          {obligation.contractName ?? 'Obligation Details'}
        </h3>
        <p className="text-sm text-zinc-500">{obligation.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-zinc-500">Transaction Price</div>
          <div className="text-white font-mono">
            {formatCurrency(obligation.transactionPrice)}
          </div>
        </div>
        <div>
          <div className="text-zinc-500">Allocated Amount</div>
          <div className="text-white font-mono">
            {obligation.allocatedAmount ? formatCurrency(obligation.allocatedAmount) : '-'}
          </div>
        </div>
        <div>
          <div className="text-zinc-500">Allocation %</div>
          <div className="text-white font-mono">
            {obligation.allocationPct ? `${obligation.allocationPct.toFixed(2)}%` : '-'}
          </div>
        </div>
        <div>
          <div className="text-zinc-500">Method</div>
          <div className="text-white capitalize">
            {obligation.allocationBasis ?? '-'}
          </div>
        </div>
      </div>

      {/* Schedules */}
      {obligation.schedules.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-zinc-400 mb-2">
            Schedules ({obligation.schedules.length})
          </h4>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {obligation.schedules.map((schedule, idx) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-2 bg-zinc-800/50 rounded text-xs"
              >
                <div className="text-zinc-400">
                  {new Date(schedule.periodStart).toLocaleDateString()} - {new Date(schedule.periodEnd).toLocaleDateString()}
                </div>
                <div className="flex gap-3">
                  <span className="text-zinc-400">
                    {formatCurrency(schedule.scheduledAmount)}
                  </span>
                  <span className="text-green-400">
                    {formatCurrency(schedule.recognizedAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events */}
      {obligation.events.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-zinc-400 mb-2">
            Events ({obligation.events.length})
          </h4>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {obligation.events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-2 bg-zinc-800/50 rounded text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">
                    {new Date(event.eventDate).toLocaleDateString()}
                  </span>
                  <span className="capitalize text-zinc-400">{event.eventType}</span>
                </div>
                <span className="text-green-400 font-mono">
                  +{formatCurrency(event.recognizedAmount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
