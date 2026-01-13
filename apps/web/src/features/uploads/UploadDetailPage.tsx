import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getUploadDetail, getUploadErrors, reprocessUpload, deleteUpload } from '@/lib/api/endpoints';
import DecorativeDots from '@/components/ui/DecorativeDots';

export function UploadDetailPage() {
  const { uploadId } = useParams<{ uploadId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorsPage, setErrorsPage] = useState(0);
  const errorsLimit = 20;

  // Fetch upload details
  const { data: upload, isLoading } = useQuery({
    queryKey: ['upload', uploadId],
    queryFn: async () => {
      if (!uploadId) throw new Error('No upload ID');
      const res = await getUploadDetail(uploadId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!uploadId,
    refetchInterval: (data) => {
      // Poll while processing
      if (data?.status === 'processing' || data?.status === 'uploading') {
        return 3000;
      }
      return false;
    },
  });

  // Fetch errors
  const { data: errorsData } = useQuery({
    queryKey: ['uploadErrors', uploadId, errorsPage],
    queryFn: async () => {
      if (!uploadId) throw new Error('No upload ID');
      const res = await getUploadErrors(uploadId, {
        limit: errorsLimit,
        offset: errorsPage * errorsLimit,
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!uploadId && (upload?.errorCount ?? 0) > 0,
  });

  // Reprocess mutation
  const reprocessMutation = useMutation({
    mutationFn: async () => {
      if (!uploadId) throw new Error('No upload ID');
      const res = await reprocessUpload(uploadId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upload', uploadId] });
      queryClient.invalidateQueries({ queryKey: ['uploadErrors', uploadId] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!uploadId) throw new Error('No upload ID');
      const res = await deleteUpload(uploadId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      navigate('/uploads');
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} className="text-green-400" />;
      case 'failed':
        return <XCircle size={20} className="text-red-400" />;
      case 'processing':
      case 'uploading':
        return <Loader2 size={20} className="text-blue-400 animate-spin" />;
      default:
        return <AlertTriangle size={20} className="text-yellow-400" />;
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="text-accent animate-spin" />
      </div>
    );
  }

  if (!upload) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-white mb-2">Upload not found</h2>
        <Link to="/uploads" className="text-accent hover:underline">
          Back to uploads
        </Link>
      </div>
    );
  }

  const errors = errorsData?.errors ?? [];
  const totalErrors = errorsData?.total ?? 0;
  const totalPages = Math.ceil(totalErrors / errorsLimit);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Link
            to="/uploads"
            className="inline-flex items-center gap-1 text-zinc-500 hover:text-white mb-3 text-sm transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Uploads
          </Link>

          <div className="flex items-center gap-3 mb-2">
            {upload.type === 'csv' ? (
              <FileSpreadsheet size={24} className="text-green-400" />
            ) : (
              <FileText size={24} className="text-red-400" />
            )}
            <h1 className="text-3xl font-light text-white tracking-tight">{upload.displayName}</h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${getStatusBadgeClasses(upload.status)}`}>
              {getStatusIcon(upload.status)}
              {upload.status}
            </span>
          </div>
          <p className="text-zinc-500">
            {upload.type.toUpperCase()} • {upload.entityType ?? 'Unknown entity'} • Created {new Date(upload.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {upload.status === 'failed' && (
            <button
              onClick={() => reprocessMutation.mutate()}
              disabled={reprocessMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors disabled:opacity-50"
            >
              {reprocessMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RotateCcw size={16} />
              )}
              Reprocess
            </button>
          )}
          <button
            onClick={() => {
              if (confirm('Delete this upload?')) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {deleteMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            Delete
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Rows" value={upload.totalRows ?? 0} />
        <StatCard label="Valid Rows" value={upload.validRows ?? 0} variant="green" />
        <StatCard label="Errors" value={upload.errorCount} variant="red" />
        <StatCard label="Parse Runs" value={upload.parseRuns?.length ?? 0} />
      </div>

      {/* Error Message */}
      {upload.errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <XCircle size={20} className="text-red-400 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">{upload.errorCode ?? 'Error'}</p>
              <p className="text-red-300/80 text-sm mt-1">{upload.errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Files */}
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 relative overflow-hidden">
        <DecorativeDots position="topRight" />
        <h2 className="text-lg font-medium text-white mb-4">Files</h2>
        
        <table className="w-full">
          <thead>
            <tr className="text-left text-zinc-500 text-sm border-b border-zinc-800">
              <th className="pb-3 font-medium">File Name</th>
              <th className="pb-3 font-medium">Content Type</th>
              <th className="pb-3 font-medium">Size</th>
            </tr>
          </thead>
          <tbody>
            {upload.files?.map((file: any) => (
              <tr key={file.id} className="border-b border-zinc-800/50">
                <td className="py-3 text-white">{file.fileName}</td>
                <td className="py-3 text-zinc-400">{file.contentType}</td>
                <td className="py-3 text-zinc-400">{formatBytes(file.sizeBytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Parse Runs */}
      {upload.parseRuns && upload.parseRuns.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 relative overflow-hidden">
          <DecorativeDots position="topRight" />
          <h2 className="text-lg font-medium text-white mb-4">Parse History</h2>
          
          <table className="w-full">
            <thead>
              <tr className="text-left text-zinc-500 text-sm border-b border-zinc-800">
                <th className="pb-3 font-medium">Run #</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Stats</th>
                <th className="pb-3 font-medium">Started</th>
                <th className="pb-3 font-medium">Finished</th>
              </tr>
            </thead>
            <tbody>
              {upload.parseRuns.map((run: any) => (
                <tr key={run.id} className="border-b border-zinc-800/50">
                  <td className="py-3 text-white">#{run.runNumber}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${getStatusBadgeClasses(run.status)}`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="py-3 text-zinc-400 text-sm">
                    {run.stats?.valid_rows ?? 0} valid / {run.stats?.error_rows ?? 0} errors
                  </td>
                  <td className="py-3 text-zinc-500 text-sm">
                    {run.startedAt ? new Date(run.startedAt).toLocaleString() : '-'}
                  </td>
                  <td className="py-3 text-zinc-500 text-sm">
                    {run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Errors Table */}
      {totalErrors > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 relative overflow-hidden">
          <DecorativeDots position="topRight" />
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-white">Parse Errors ({totalErrors})</h2>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setErrorsPage(p => Math.max(0, p - 1))}
                  disabled={errorsPage === 0}
                  className="p-2 rounded-lg text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-zinc-400 text-sm">
                  Page {errorsPage + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setErrorsPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={errorsPage >= totalPages - 1}
                  className="p-2 rounded-lg text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
          
          <table className="w-full">
            <thead>
              <tr className="text-left text-zinc-500 text-sm border-b border-zinc-800">
                <th className="pb-3 font-medium">Row</th>
                <th className="pb-3 font-medium">Field</th>
                <th className="pb-3 font-medium">Error Type</th>
                <th className="pb-3 font-medium">Message</th>
                <th className="pb-3 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((error: any) => (
                <tr key={error.id} className="border-b border-zinc-800/50">
                  <td className="py-3 text-white">{error.rowNumber}</td>
                  <td className="py-3 text-zinc-400">{error.field ?? '-'}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-400 border border-red-500/20">
                      {error.errorType}
                    </span>
                  </td>
                  <td className="py-3 text-zinc-300 text-sm">{error.errorMessage}</td>
                  <td className="py-3 text-zinc-500 text-sm max-w-[200px] truncate" title={error.rawValue}>
                    {error.rawValue ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

// Stat Card Component
function StatCard({ label, value, variant }: { label: string; value: number; variant?: 'green' | 'red' }) {
  const getBgColor = () => {
    switch (variant) {
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default UploadDetailPage;
