import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { listJobs, type Job } from '@/lib/api/endpoints';

export function JobsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const res = await listJobs();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    refetchInterval: 5000,
  });

  const jobs = data?.jobs ?? [];

  const getStatusIcon = (status: Job['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'processing':
        return <Loader2 size={16} className="text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock size={16} className="text-yellow-500" />;
      case 'failed':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <Clock size={16} className="text-zinc-500" />;
    }
  };

  const getTypeBadge = (type: Job['type']) => {
    const colors: Record<string, string> = {
      sync: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      detect: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      simulate: 'bg-green-500/10 text-green-400 border-green-500/30',
      export: 'bg-[#ff6500]/10 text-[#ff6500] border-[#ff6500]/30',
    };
    return (
      <span
        className={`px-2 py-0.5 rounded border text-xs font-mono uppercase ${
          colors[type] || 'bg-zinc-800 text-zinc-400 border-zinc-700'
        }`}
      >
        {type}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light text-white tracking-tight">Background Jobs</h1>
        <p className="text-zinc-500 mt-2">
          Monitor sync, detection, simulation, and export jobs.
        </p>
      </div>

      {isLoading && <div className="text-zinc-500">Loading jobs...</div>}
      {error && <div className="text-red-400">Error loading jobs</div>}

      {jobs.length === 0 && !isLoading && (
        <div className="p-6 bg-zinc-900/20 border border-zinc-800 rounded-lg text-center text-zinc-500">
          No jobs found.
        </div>
      )}

      {jobs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-zinc-800 rounded-lg overflow-hidden"
        >
          <table className="w-full">
            <thead className="bg-zinc-900/50 border-b border-zinc-800">
              <tr>
                <th className="text-left text-xs font-mono text-zinc-500 uppercase p-4">
                  ID
                </th>
                <th className="text-left text-xs font-mono text-zinc-500 uppercase p-4">
                  Type
                </th>
                <th className="text-left text-xs font-mono text-zinc-500 uppercase p-4">
                  Status
                </th>
                <th className="text-left text-xs font-mono text-zinc-500 uppercase p-4">
                  Created
                </th>
                <th className="text-left text-xs font-mono text-zinc-500 uppercase p-4">
                  Completed
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, idx) => (
                <motion.tr
                  key={job.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="border-b border-zinc-900 last:border-0 hover:bg-zinc-900/30 transition-colors"
                >
                  <td className="p-4">
                    <span className="font-mono text-xs text-zinc-400">{job.id}</span>
                  </td>
                  <td className="p-4">{getTypeBadge(job.type)}</td>
                  <td className="p-4">
                    <span className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <span className="text-sm text-zinc-300">{job.status}</span>
                    </span>
                  </td>
                  <td className="p-4 text-sm text-zinc-500">
                    {new Date(job.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 text-sm text-zinc-500">
                    {job.completedAt ? new Date(job.completedAt).toLocaleString() : '-'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
