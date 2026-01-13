/**
 * Schedules Panel
 * 
 * Displays revenue recognition schedules.
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, Clock } from 'lucide-react';
import {
  listRevRecSchedules,
  type RevRecSchedule,
} from '@/lib/api/endpoints';

interface SchedulesPanelProps {
  snapshotId?: string;
}

export function SchedulesPanel({ snapshotId }: SchedulesPanelProps) {
  const [schedules, setSchedules] = useState<RevRecSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<'all' | 'current' | 'upcoming'>('all');

  useEffect(() => {
    loadSchedules();
  }, [snapshotId, periodFilter]);

  async function loadSchedules() {
    setLoading(true);
    try {
      const now = new Date();
      let periodStart: string | undefined;
      let periodEnd: string | undefined;

      if (periodFilter === 'current') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        periodStart = monthStart.toISOString().split('T')[0];
        periodEnd = monthEnd.toISOString().split('T')[0];
      } else if (periodFilter === 'upcoming') {
        periodStart = now.toISOString().split('T')[0];
      }

      const data = await listRevRecSchedules({ 
        snapshotId, 
        periodStart,
        periodEnd,
        limit: 100,
      });
      setSchedules(data.schedules);
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoading(false);
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
      case 'recognized': return 'bg-green-500/10 text-green-400';
      case 'partial': return 'bg-yellow-500/10 text-yellow-400';
      case 'pending': return 'bg-blue-500/10 text-blue-400';
      case 'cancelled': return 'bg-red-500/10 text-red-400';
      default: return 'bg-zinc-500/10 text-zinc-400';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'straight_line': return TrendingUp;
      case 'usage_based': return Clock;
      default: return Calendar;
    }
  };

  // Group schedules by month
  const groupedSchedules = schedules.reduce((groups, schedule) => {
    const monthKey = schedule.periodStart.substring(0, 7); // YYYY-MM
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(schedule);
    return groups;
  }, {} as Record<string, RevRecSchedule[]>);

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
      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'All Periods' },
          { id: 'current', label: 'Current Month' },
          { id: 'upcoming', label: 'Upcoming' },
        ].map((filter) => (
          <button
            key={filter.id}
            onClick={() => setPeriodFilter(filter.id as typeof periodFilter)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              periodFilter === filter.id
                ? 'bg-[#ff6500] text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {schedules.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          No schedules found for the selected period.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSchedules).sort().map(([monthKey, monthSchedules]) => (
            <div key={monthKey}>
              <h3 className="text-sm font-medium text-zinc-400 mb-3">
                {new Date(monthKey + '-01').toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long' 
                })}
              </h3>
              <div className="border border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-900/50 border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-zinc-500 font-medium">Period</th>
                      <th className="px-4 py-3 text-left text-zinc-500 font-medium">Method</th>
                      <th className="px-4 py-3 text-right text-zinc-500 font-medium">Scheduled</th>
                      <th className="px-4 py-3 text-right text-zinc-500 font-medium">Recognized</th>
                      <th className="px-4 py-3 text-right text-zinc-500 font-medium">Deferred</th>
                      <th className="px-4 py-3 text-center text-zinc-500 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {monthSchedules.map((schedule, idx) => {
                      const MethodIcon = getMethodIcon(schedule.recognitionMethod);
                      return (
                        <motion.tr
                          key={schedule.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          className="hover:bg-zinc-900/30"
                        >
                          <td className="px-4 py-3 text-white">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-zinc-500" />
                              <span>
                                {new Date(schedule.periodStart).toLocaleDateString()} - {new Date(schedule.periodEnd).toLocaleDateString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-zinc-400">
                              <MethodIcon size={14} />
                              <span className="capitalize">
                                {schedule.recognitionMethod.replace('_', ' ')}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-300">
                            {formatCurrency(schedule.scheduledAmount)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-green-400">
                            {formatCurrency(schedule.recognizedAmount)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-orange-400">
                            {formatCurrency(schedule.deferredAmount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(schedule.status)}`}>
                              {schedule.status}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Month Summary */}
              <div className="mt-2 flex justify-end gap-6 text-sm">
                <div className="text-zinc-400">
                  Total Scheduled:{' '}
                  <span className="font-mono text-white">
                    {formatCurrency(monthSchedules.reduce((sum, s) => sum + s.scheduledAmount, 0))}
                  </span>
                </div>
                <div className="text-zinc-400">
                  Recognized:{' '}
                  <span className="font-mono text-green-400">
                    {formatCurrency(monthSchedules.reduce((sum, s) => sum + s.recognizedAmount, 0))}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
