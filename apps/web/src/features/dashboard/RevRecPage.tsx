import React from 'react';
import { motion } from 'framer-motion';
import { Lock, AlertCircle } from 'lucide-react';

interface RevRecRow {
  period: string;
  contract: string;
  amount: number;
  recognized: number;
  deferred: number;
  status: 'Locked' | 'Open' | 'Issue';
}

const revRecData: RevRecRow[] = [
  {
    period: 'Jan 2024',
    contract: 'Acme Corp',
    amount: 12500,
    recognized: 12500,
    deferred: 0,
    status: 'Locked',
  },
  {
    period: 'Feb 2024',
    contract: 'Acme Corp',
    amount: 12500,
    recognized: 12500,
    deferred: 0,
    status: 'Locked',
  },
  {
    period: 'Mar 2024',
    contract: 'Acme Corp',
    amount: 12500,
    recognized: 0,
    deferred: 12500,
    status: 'Open',
  },
  {
    period: 'Mar 2024',
    contract: 'Globex Inc',
    amount: 10000,
    recognized: 2500,
    deferred: 7500,
    status: 'Issue',
  },
];

export function RevRecPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-light text-white tracking-tight">Revenue Recognition</h1>
          <p className="text-zinc-500 mt-2">
            ASC 606 compliant schedules synced with billing events.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-400">
            Current Period: <span className="text-white">March 2024</span>
          </span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-zinc-800 rounded-lg overflow-hidden"
      >
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-900/50 text-zinc-500 font-medium border-b border-zinc-800">
            <tr>
              <th className="px-6 py-4">Period</th>
              <th className="px-6 py-4">Customer / Contract</th>
              <th className="px-6 py-4 text-right">Total Amount</th>
              <th className="px-6 py-4 text-right">Recognized</th>
              <th className="px-6 py-4 text-right">Deferred</th>
              <th className="px-6 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {revRecData.map((row, idx) => (
              <motion.tr
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="hover:bg-zinc-900/20 transition-colors group"
              >
                <td className="px-6 py-4 font-mono text-zinc-400">{row.period}</td>
                <td className="px-6 py-4 text-white">{row.contract}</td>
                <td className="px-6 py-4 text-right font-mono text-zinc-400">
                  ${row.amount.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right font-mono text-zinc-300">
                  ${row.recognized.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right font-mono text-zinc-300">
                  ${row.deferred.toLocaleString()}
                </td>
                <td className="px-6 py-4 flex justify-center">
                  {row.status === 'Locked' && <Lock size={14} className="text-zinc-600" />}
                  {row.status === 'Issue' && <AlertCircle size={14} className="text-[#ff6500]" />}
                  {row.status === 'Open' && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-4 bg-[#ff6500]/5 border border-[#ff6500]/20 rounded-lg flex gap-3 items-start"
      >
        <AlertCircle size={18} className="text-[#ff6500] mt-0.5" />
        <div>
          <h4 className="text-[#ff6500] text-sm font-medium">
            Anomaly Detected in March 2024
          </h4>
          <p className="text-zinc-400 text-sm mt-1">
            Globex Inc recognition paused due to missing service delivery proof in Jira.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
