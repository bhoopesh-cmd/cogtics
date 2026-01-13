import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Database,
  Filter,
  Upload,
  CheckSquare,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { getIngestionStatus, type IngestionStatus } from '@/lib/api/endpoints';

interface IngestionProgressProps {
  snapshotId: string;
  onComplete?: () => void;
}

const STAGES = [
  { key: 'load', label: 'Load', description: 'Loading raw data from storage', icon: Database },
  { key: 'normalize', label: 'Normalize', description: 'Transforming to canonical format', icon: Filter },
  { key: 'upsert', label: 'Upsert', description: 'Writing to canonical tables', icon: Upload },
  { key: 'finalize', label: 'Finalize', description: 'Running quality checks', icon: CheckSquare },
] as const;

export function IngestionProgress({ snapshotId, onComplete }: IngestionProgressProps) {
  const { data: status, isLoading, error } = useQuery({
    queryKey: ['ingestionStatus', snapshotId],
    queryFn: async () => {
      const res = await getIngestionStatus(snapshotId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.snapshotStatus === 'complete' || data?.snapshotStatus === 'failed') {
        onComplete?.();
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
        Failed to load ingestion status: {String(error)}
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">Ingestion Pipeline</h3>
          <p className="text-sm text-zinc-500 mt-1">
            Snapshot: <span className="font-mono text-xs">{snapshotId.substring(0, 12)}...</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-light text-white">{status.overallProgress}%</span>
          <SnapshotStatusBadge status={status.snapshotStatus} />
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Overall Progress</span>
          <span>{status.overallProgress}%</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${
              status.snapshotStatus === 'failed' ? 'bg-red-500' : 
              status.snapshotStatus === 'complete' ? 'bg-green-500' : 
              'bg-accent'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${status.overallProgress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Stage Timeline */}
      <div className="space-y-3">
        {STAGES.map((stage, index) => {
          const stageData = status.stages.find((s) => s.name === stage.key);
          const StageIcon = stage.icon;
          
          return (
            <motion.div
              key={stage.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-4 p-3 rounded-lg border ${
                stageData?.status === 'running' 
                  ? 'bg-accent/5 border-accent/30' 
                  : stageData?.status === 'completed'
                  ? 'bg-green-500/5 border-green-500/20'
                  : stageData?.status === 'failed'
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-zinc-900/30 border-zinc-800'
              }`}
            >
              {/* Stage Icon */}
              <div className={`p-2 rounded-lg ${
                stageData?.status === 'running' 
                  ? 'bg-accent/20 text-accent' 
                  : stageData?.status === 'completed'
                  ? 'bg-green-500/20 text-green-500'
                  : stageData?.status === 'failed'
                  ? 'bg-red-500/20 text-red-500'
                  : 'bg-zinc-800 text-zinc-500'
              }`}>
                {stageData?.status === 'running' ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : stageData?.status === 'completed' ? (
                  <CheckCircle size={18} />
                ) : stageData?.status === 'failed' ? (
                  <AlertCircle size={18} />
                ) : (
                  <StageIcon size={18} />
                )}
              </div>

              {/* Stage Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{stage.label}</span>
                  {stageData?.status && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${
                      stageData.status === 'running' 
                        ? 'bg-accent/20 text-accent' 
                        : stageData.status === 'completed'
                        ? 'bg-green-500/20 text-green-500'
                        : stageData.status === 'failed'
                        ? 'bg-red-500/20 text-red-500'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {stageData.status}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{stage.description}</p>
                {stageData?.errorMessage && (
                  <p className="text-xs text-red-400 mt-1 truncate">{stageData.errorMessage}</p>
                )}
              </div>

              {/* Stage Stats */}
              <div className="text-right">
                <div className="text-sm font-mono text-white">
                  {stageData?.recordsProcessed?.toLocaleString() ?? '-'}
                </div>
                <div className="text-xs text-zinc-500">records</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Staging Stats */}
      {status.staging.total > 0 && (
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-zinc-800">
          <StagingStat label="Pending" value={status.staging.pending} color="text-blue-400" />
          <StagingStat label="Normalized" value={status.staging.normalized} color="text-accent" />
          <StagingStat label="Failed" value={status.staging.failed} color="text-red-400" />
          <StagingStat label="Skipped" value={status.staging.skipped} color="text-zinc-500" />
        </div>
      )}

      {/* Timing */}
      <div className="flex items-center justify-between text-xs text-zinc-500 pt-4 border-t border-zinc-800">
        <div className="flex items-center gap-1">
          <Clock size={12} />
          <span>Started: {new Date(status.startedAt).toLocaleString()}</span>
        </div>
        {status.completedAt && (
          <span>Completed: {new Date(status.completedAt).toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}

function StagingStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-mono ${color}`}>{value.toLocaleString()}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}

function SnapshotStatusBadge({ status }: { status: IngestionStatus['snapshotStatus'] }) {
  const config = {
    pending: { bg: 'bg-zinc-800', text: 'text-zinc-400', icon: Clock },
    building: { bg: 'bg-accent/20', text: 'text-accent', icon: Loader2 },
    validating: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: CheckSquare },
    complete: { bg: 'bg-green-500/20', text: 'text-green-500', icon: CheckCircle },
    failed: { bg: 'bg-red-500/20', text: 'text-red-500', icon: AlertTriangle },
  };

  const { bg, text, icon: Icon } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon size={12} className={status === 'building' ? 'animate-spin' : ''} />
      {status}
    </span>
  );
}

export default IngestionProgress;
