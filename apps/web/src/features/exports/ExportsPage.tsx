import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FileText, Download, Clock, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { listJobs, enqueueJob, type Job } from '@/lib/api/endpoints';
import { useAuth } from '@/lib/auth/useAuth';

export function ExportsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', 'export'],
    queryFn: async () => {
      const res = await listJobs({ type: 'export' });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    refetchInterval: 5000,
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await enqueueJob({
        type: 'export',
        tenantId: user?.tenantId ?? '',
        format: 'pdf',
        reportType: 'audit',
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs', 'export'] }),
  });

  const jobs = data?.jobs ?? [];

  const getStatusDisplay = (status: Job['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-xs text-green-500">
            <CheckCircle size={12} /> Verified
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center gap-1 text-xs text-blue-500">
            <Loader2 size={12} className="animate-spin" /> Processing
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-xs text-yellow-500">
            <Clock size={12} /> Pending
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-xs text-red-500">
            <XCircle size={12} /> Failed
          </span>
        );
      default:
        return <span className="text-xs text-zinc-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-white tracking-tight">Exports & Audit</h1>
          <p className="text-zinc-500 mt-2">
            Generate immutable snapshots and evidence bundles.
          </p>
        </div>
      </div>

      {/* Generate Bundle CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/20 border border-zinc-800 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="p-4 bg-[#ff6500]/10 rounded-full text-[#ff6500]">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">Full Audit Bundle</h3>
            <p className="text-sm text-zinc-500">
              Includes raw logs, decision traces, and finalized RevRec schedules.
            </p>
          </div>
        </div>
        <button
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
          className="px-6 py-3 bg-white text-black font-medium rounded hover:bg-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {exportMutation.isPending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
          Generate Bundle
        </button>
      </motion.div>

      {/* Recent Exports */}
      <div>
        <h3 className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-4">
          Recent Snapshots
        </h3>

        {isLoading && <div className="text-zinc-500">Loading...</div>}

        {jobs.length === 0 && !isLoading && (
          <div className="p-6 bg-zinc-900/20 border border-zinc-800 rounded-lg text-center text-zinc-500">
            No exports yet. Generate your first bundle above.
          </div>
        )}

        {jobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border border-zinc-800 rounded-lg overflow-hidden"
          >
            {jobs.map((job, idx) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-4 border-b border-zinc-800 last:border-0 bg-black hover:bg-zinc-900/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-zinc-900 rounded text-zinc-500">
                    <Clock size={16} />
                  </div>
                  <div>
                    <div className="text-sm text-zinc-200">Audit Export</div>
                    <div className="text-xs text-zinc-600">
                      {new Date(job.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {getStatusDisplay(job.status)}
                  {job.status === 'completed' && (
                    <button className="text-zinc-500 hover:text-white transition-colors">
                      <Download size={16} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
