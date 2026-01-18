import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  FileText, Download, Clock, CheckCircle, Loader2, XCircle, 
  FileSpreadsheet, AlertTriangle, RefreshCw, Trash2, ExternalLink
} from 'lucide-react';
import { 
  listExports, createExport, getExportDownloadUrl, regenerateExport, deleteExport,
  listSnapshots,
  type Export
} from '@/lib/api/endpoints';

const EXPORT_TYPES = [
  { value: 'issues_csv', label: 'Issues Report', format: 'CSV', icon: FileSpreadsheet, description: 'All detected issues with severity and impact' },
  { value: 'revrec_csv', label: 'Revenue Recognition', format: 'CSV', icon: FileSpreadsheet, description: 'Revenue schedules and recognition events' },
  { value: 'contracts_csv', label: 'Contracts Data', format: 'CSV', icon: FileSpreadsheet, description: 'Contract details with readiness scores' },
  { value: 'audit_bundle_pdf', label: 'Audit Bundle', format: 'PDF', icon: FileText, description: 'Full audit report with evidence summaries' },
  { value: 'executive_summary_pdf', label: 'Executive Summary', format: 'PDF', icon: FileText, description: 'High-level metrics dashboard' },
  { value: 'contracts_pdf', label: 'Contracts Report', format: 'PDF', icon: FileText, description: 'Contract readiness details' },
] as const;

export function ExportsPage() {
  const queryClient = useQueryClient();
  const [selectedSnapshot, setSelectedSnapshot] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: snapshotsData } = useQuery({
    queryKey: ['snapshots'],
    queryFn: async () => {
      const res = await listSnapshots({ status: 'complete', limit: 50 });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const { data: exportsData, isLoading } = useQuery({
    queryKey: ['exports', selectedSnapshot],
    queryFn: async () => {
      const res = await listExports({ 
        snapshotId: selectedSnapshot || undefined,
        limit: 50 
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { snapshotId: string; exportType: string }) => {
      const res = await createExport(data);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports'] });
      setShowCreateModal(false);
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (exportId: string) => {
      const res = await getExportDownloadUrl(exportId);
      if (!res.ok) throw new Error(res.error);
      window.open(res.data.downloadUrl, '_blank');
      return res.data;
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async (exportId: string) => {
      const res = await regenerateExport(exportId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exports'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (exportId: string) => {
      const res = await deleteExport(exportId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exports'] }),
  });

  const exports = exportsData?.exports ?? [];
  const snapshots = snapshotsData?.snapshots ?? [];

  const getStatusDisplay = (status: Export['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-xs text-green-500">
            <CheckCircle size={12} /> Completed
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
      case 'cancelled':
        return (
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <AlertTriangle size={12} /> Cancelled
          </span>
        );
      default:
        return <span className="text-xs text-zinc-500">{status}</span>;
    }
  };

  const getExportTypeLabel = (type: string) => {
    return EXPORT_TYPES.find(t => t.value === type)?.label ?? type;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-white tracking-tight">Exports & Reports</h1>
          <p className="text-zinc-500 mt-2">
            Generate immutable snapshots and evidence bundles.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={snapshots.length === 0}
          className="px-4 py-2 bg-[#ff6500] text-white font-medium rounded hover:bg-[#ff7a1a] transition-colors disabled:opacity-50"
        >
          New Export
        </button>
      </div>

      {/* Snapshot Filter */}
      <div className="flex gap-4 items-center">
        <label className="text-sm text-zinc-400">Filter by Snapshot:</label>
        <select
          value={selectedSnapshot}
          onChange={(e) => setSelectedSnapshot(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff6500]"
        >
          <option value="">All Snapshots</option>
          {snapshots.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id} ({new Date(s.startedAt).toLocaleDateString()})
            </option>
          ))}
        </select>
      </div>

      {/* Exports List */}
      <div>
        <h3 className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-4">
          Recent Exports
        </h3>

        {isLoading && <div className="text-zinc-500">Loading...</div>}

        {exports.length === 0 && !isLoading && (
          <div className="p-6 bg-zinc-900/20 border border-zinc-800 rounded-lg text-center text-zinc-500">
            No exports yet. Create your first export above.
          </div>
        )}

        {exports.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border border-zinc-800 rounded-lg overflow-hidden"
          >
            {exports.map((exp, idx) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-4 border-b border-zinc-800 last:border-0 bg-black hover:bg-zinc-900/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded ${exp.format === 'pdf' ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                    {exp.format === 'pdf' ? <FileText size={16} /> : <FileSpreadsheet size={16} />}
                  </div>
                  <div>
                    <div className="text-sm text-zinc-200 font-medium">
                      {getExportTypeLabel(exp.exportType)}
                    </div>
                    <div className="text-xs text-zinc-600">
                      {new Date(exp.createdAt).toLocaleString()} · {exp.format.toUpperCase()}
                    </div>
                    {exp.errorMessage && (
                      <div className="text-xs text-red-400 mt-1">{exp.errorMessage}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {getStatusDisplay(exp.status)}
                  <div className="flex items-center gap-2">
                    {exp.status === 'completed' && (
                      <button
                        onClick={() => downloadMutation.mutate(exp.id)}
                        disabled={downloadMutation.isPending}
                        className="p-2 text-zinc-500 hover:text-white transition-colors"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                    )}
                    {(exp.status === 'completed' || exp.status === 'failed') && (
                      <button
                        onClick={() => regenerateMutation.mutate(exp.id)}
                        disabled={regenerateMutation.isPending}
                        className="p-2 text-zinc-500 hover:text-white transition-colors"
                        title="Regenerate"
                      >
                        <RefreshCw size={16} />
                      </button>
                    )}
                    {exp.status !== 'processing' && (
                      <button
                        onClick={() => deleteMutation.mutate(exp.id)}
                        disabled={deleteMutation.isPending}
                        className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Create Export Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <h2 className="text-xl font-medium text-white mb-4">Create Export</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Snapshot</label>
                <select
                  id="snapshot-select"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ff6500]"
                  defaultValue={selectedSnapshot || snapshots[0]?.id}
                >
                  {snapshots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} ({new Date(s.startedAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Export Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {EXPORT_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => {
                          const snapshotId = (document.getElementById('snapshot-select') as HTMLSelectElement)?.value;
                          if (snapshotId) {
                            createMutation.mutate({ snapshotId, exportType: type.value });
                          }
                        }}
                        disabled={createMutation.isPending}
                        className="flex items-start gap-3 p-3 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-[#ff6500] transition-colors text-left disabled:opacity-50"
                      >
                        <Icon size={20} className="text-[#ff6500] flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-white">{type.label}</div>
                          <div className="text-xs text-zinc-500">{type.format}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
