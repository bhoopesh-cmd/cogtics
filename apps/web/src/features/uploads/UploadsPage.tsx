import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Trash2,
  Eye,
  RotateCcw,
  Plus,
  Check,
  Minus,
} from 'lucide-react';
import { listUploads, deleteUpload, reprocessUpload } from '@/lib/api/endpoints';
import { UploadWizardModal } from './UploadWizardModal';

type UploadType = 'csv' | 'pdf' | 'all';

export function UploadsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<UploadType>('all');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedIndex = useRef<number | null>(null);

  // Fetch uploads
  const { data: uploadsData, isLoading, refetch } = useQuery({
    queryKey: ['uploads', typeFilter],
    queryFn: async () => {
      const res = await listUploads({ type: typeFilter === 'all' ? undefined : typeFilter });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (uploadId: string) => {
      const res = await deleteUpload(uploadId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
    },
  });

  // Reprocess mutation
  const reprocessMutation = useMutation({
    mutationFn: async (uploadId: string) => {
      const res = await reprocessUpload(uploadId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (uploadIds: string[]) => {
      const results = await Promise.allSettled(
        uploadIds.map(async (id) => {
          const res = await deleteUpload(id);
          if (!res.ok) throw new Error(res.error);
          return res.data;
        })
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        throw new Error(`Failed to delete ${failed} of ${uploadIds.length} uploads`);
      }
      return results;
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
    },
  });

  const uploads = uploadsData?.uploads ?? [];
  const total = uploadsData?.total ?? 0;

  // Selection handlers
  const handleRowClick = useCallback(
    (uploadId: string, index: number, event: React.MouseEvent) => {
      // Don't interfere with action button clicks
      if ((event.target as HTMLElement).closest('button')) return;

      setSelectedIds((prev) => {
        const next = new Set(prev);

        if (event.shiftKey && lastClickedIndex.current !== null) {
          // Shift+click: range selection
          const start = Math.min(lastClickedIndex.current, index);
          const end = Math.max(lastClickedIndex.current, index);
          for (let i = start; i <= end; i++) {
            next.add(uploads[i].id);
          }
        } else if (event.ctrlKey || event.metaKey) {
          // Ctrl/Cmd+click: toggle individual
          if (next.has(uploadId)) {
            next.delete(uploadId);
          } else {
            next.add(uploadId);
          }
        } else {
          // Regular click: single select (clear others)
          next.clear();
          next.add(uploadId);
        }

        lastClickedIndex.current = index;
        return next;
      });
    },
    [uploads]
  );

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === uploads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(uploads.map((u) => u.id)));
    }
  }, [uploads, selectedIds.size]);

  const handleBulkDelete = useCallback(() => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (confirm(`Delete ${count} selected upload${count > 1 ? 's' : ''}?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedIds));
    }
  }, [selectedIds, bulkDeleteMutation]);

  const isAllSelected = uploads.length > 0 && selectedIds.size === uploads.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < uploads.length;

  // Clear selection when filter changes
  useEffect(() => {
    setSelectedIds(new Set());
    lastClickedIndex.current = null;
  }, [typeFilter]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set());
      }
      // Ctrl/Cmd+A to select all (when not in an input)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setSelectedIds(new Set(uploads.map((u) => u.id)));
        }
      }
      // Delete key to delete selected
      if (e.key === 'Delete' && selectedIds.size > 0) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          handleBulkDelete();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, uploads, handleBulkDelete]);

  // Stats
  const stats = {
    total: total,
    processing: uploads.filter(u => u.status === 'processing' || u.status === 'uploading').length,
    completed: uploads.filter(u => u.status === 'completed').length,
    failed: uploads.filter(u => u.status === 'failed').length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'failed':
        return <XCircle size={16} className="text-red-400" />;
      case 'processing':
      case 'uploading':
        return <Loader2 size={16} className="text-blue-400 animate-spin" />;
      default:
        return <AlertTriangle size={16} className="text-yellow-400" />;
    }
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'processing':
      case 'uploading':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Upload size={24} className="text-accent" />
            <h1 className="text-3xl font-light text-white tracking-tight">Manual Uploads</h1>
          </div>
          <p className="text-zinc-500">Upload CSV files or PDF contracts for data ingestion.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Bulk delete button - shows when items selected */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-3"
              >
                <div className="flex flex-col items-end">
                  <span className="text-sm text-zinc-400">
                    {selectedIds.size} selected
                  </span>
                  <span className="text-xs text-zinc-600">
                    Shift+click range • Ctrl+click toggle • Esc clear
                  </span>
                </div>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  {bulkDeleteMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-2 text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Clear
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
          >
            <Plus size={16} />
            New Upload
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Uploads" value={stats.total} />
        <StatCard label="Processing" value={stats.processing} variant="blue" />
        <StatCard label="Completed" value={stats.completed} variant="green" />
        <StatCard label="Failed" value={stats.failed} variant="red" />
      </div>

      {/* Type Filter */}
      <div className="flex gap-2">
        {(['all', 'csv', 'pdf'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-4 py-2 rounded-lg border transition-all ${
              typeFilter === type
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'
            }`}
          >
            {type === 'all' ? 'All' : type === 'csv' ? 'CSV Files' : 'PDF Contracts'}
          </button>
        ))}
      </div>

      {/* Uploads Table */}
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="text-accent animate-spin" />
          </div>
        ) : uploads.length === 0 ? (
          <div className="text-center py-12">
            <Upload size={48} className="mx-auto mb-4 text-zinc-600" />
            <h3 className="text-lg font-medium text-white mb-2">No uploads yet</h3>
            <p className="text-zinc-500 mb-4">Upload your first CSV or PDF file to get started.</p>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
            >
              <Plus size={16} />
              New Upload
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-zinc-500 text-sm border-b border-zinc-800">
                <th className="pb-3 font-medium w-10">
                  <button
                    onClick={handleSelectAll}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                      isAllSelected
                        ? 'bg-accent border-accent text-white'
                        : isSomeSelected
                        ? 'bg-accent/20 border-accent text-accent'
                        : 'border-zinc-600 hover:border-zinc-500'
                    }`}
                  >
                    {isAllSelected ? (
                      <Check size={12} />
                    ) : isSomeSelected ? (
                      <Minus size={12} />
                    ) : null}
                  </button>
                </th>
                <th className="pb-3 font-medium">File</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Rows</th>
                <th className="pb-3 font-medium">Errors</th>
                <th className="pb-3 font-medium">Created</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {uploads.map((upload, index) => {
                  const isSelected = selectedIds.has(upload.id);
                  return (
                    <motion.tr
                      key={upload.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={(e) => handleRowClick(upload.id, index, e)}
                      className={`border-b border-zinc-800/50 transition-colors cursor-pointer select-none ${
                        isSelected
                          ? 'bg-accent/10 hover:bg-accent/15'
                          : 'hover:bg-zinc-800/30'
                      }`}
                    >
                      <td className="py-4 pl-1">
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-accent border-accent text-white'
                              : 'border-zinc-600'
                          }`}
                        >
                          {isSelected && <Check size={12} />}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          {upload.type === 'csv' ? (
                            <FileSpreadsheet size={20} className="text-green-400" />
                          ) : (
                            <FileText size={20} className="text-red-400" />
                          )}
                          <span className="text-white font-medium">{upload.displayName}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-zinc-400 uppercase text-sm">{upload.type}</span>
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${getStatusBadgeClasses(upload.status)}`}>
                          {getStatusIcon(upload.status)}
                          {upload.status}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="text-zinc-400">
                          {upload.validRows ?? 0} / {upload.totalRows ?? 0}
                        </span>
                      </td>
                      <td className="py-4">
                        {upload.errorCount > 0 ? (
                          <span className="text-red-400">{upload.errorCount}</span>
                        ) : (
                          <span className="text-zinc-600">0</span>
                        )}
                      </td>
                      <td className="py-4">
                        <span className="text-zinc-500 text-sm">
                          {new Date(upload.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/uploads/${upload.id}`);
                            }}
                            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-all"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          {upload.status === 'failed' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                reprocessMutation.mutate(upload.id);
                              }}
                              disabled={reprocessMutation.isPending}
                              className="p-2 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all disabled:opacity-50"
                              title="Reprocess"
                            >
                              <RotateCcw size={16} />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Delete this upload?')) {
                                deleteMutation.mutate(upload.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Wizard Modal */}
      <UploadWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={() => {
          setIsWizardOpen(false);
          queryClient.invalidateQueries({ queryKey: ['uploads'] });
        }}
      />
    </motion.div>
  );
}

// Stat Card Component
function StatCard({ label, value, variant }: { label: string; value: number; variant?: 'blue' | 'green' | 'red' }) {
  const getBgColor = () => {
    switch (variant) {
      case 'blue':
        return 'border-blue-500/20 bg-blue-500/5';
      case 'green':
        return 'border-green-500/20 bg-green-500/5';
      case 'red':
        return 'border-red-500/20 bg-red-500/5';
      default:
        return 'border-zinc-800 bg-zinc-900/50';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'blue':
        return 'text-blue-400';
      case 'green':
        return 'text-green-400';
      case 'red':
        return 'text-red-400';
      default:
        return 'text-white';
    }
  };

  return (
    <div className={`p-4 rounded-xl border ${getBgColor()}`}>
      <p className="text-zinc-500 text-sm mb-1">{label}</p>
      <p className={`text-2xl font-light ${getTextColor()}`}>{value}</p>
    </div>
  );
}

export default UploadsPage;
