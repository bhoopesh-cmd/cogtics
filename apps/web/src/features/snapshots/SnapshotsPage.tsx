import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Play, 
  ChevronRight,
  Database,
  X
} from 'lucide-react';
import { listSnapshots, getSnapshot, triggerSnapshot, type Snapshot, type SyncRun } from '@/lib/api/endpoints';
import DecorativeDots from '@/components/ui/DecorativeDots';
import { IngestionProgress } from './IngestionProgress';

export function SnapshotsPage() {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch snapshots
  const { data: snapshotsData, isLoading, refetch } = useQuery({
    queryKey: ['snapshots', { limit: 20 }],
    queryFn: async () => {
      const res = await listSnapshots({ limit: 20 });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    refetchInterval: 10000, // Poll for updates
  });

  const snapshots = snapshotsData?.snapshots ?? [];

  // Trigger snapshot mutation
  const triggerMutation = useMutation({
    mutationFn: async () => {
      const res = await triggerSnapshot({ runType: 'incremental' });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Camera size={24} className="text-accent" />
            <h1 className="text-3xl font-light text-white tracking-tight">Snapshots</h1>
          </div>
          <p className="text-zinc-500">Immutable data snapshots from ingestion runs.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-full hover:text-accent transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-black font-medium rounded-lg hover:bg-[#ff8533] transition-colors disabled:opacity-50"
          >
            {triggerMutation.isPending ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Play size={16} />
            )}
            Trigger Snapshot
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Snapshots List */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-900 bg-zinc-900/30">
              <h3 className="text-sm font-medium text-zinc-400">Recent Snapshots</h3>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw size={20} className="animate-spin text-zinc-500" />
              </div>
            ) : snapshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <Database size={32} className="mb-3 opacity-50" />
                <p>No snapshots yet.</p>
                <p className="text-sm mt-1">Trigger a snapshot to ingest data from connected systems.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-900">
                {snapshots.map((snapshot, idx) => (
                  <SnapshotRow
                    key={snapshot.id}
                    snapshot={snapshot}
                    index={idx}
                    isSelected={selectedSnapshotId === snapshot.id}
                    onClick={() => setSelectedSnapshotId(snapshot.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedSnapshotId ? (
              <SnapshotDetail 
                snapshotId={selectedSnapshotId} 
                onClose={() => setSelectedSnapshotId(null)}
              />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-zinc-900/10 border border-zinc-900 rounded-xl p-8 flex flex-col items-center justify-center text-zinc-500 h-96"
              >
                <Camera size={32} className="mb-3 opacity-50" />
                <p className="text-sm">Select a snapshot to view details</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function SnapshotRow({ 
  snapshot, 
  index, 
  isSelected, 
  onClick 
}: { 
  snapshot: Snapshot; 
  index: number; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusConfig = {
    pending: { icon: Clock, color: 'text-zinc-500', bg: 'bg-zinc-800' },
    building: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-900/20' },
    validating: { icon: RefreshCw, color: 'text-amber-500', bg: 'bg-amber-900/20' },
    complete: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-900/20' },
    failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-900/20' },
  };

  const config = statusConfig[snapshot.status];
  const Icon = config.icon;
  const isAnimating = snapshot.status === 'building' || snapshot.status === 'validating';

  const recordCount = Object.values(snapshot.recordCounts || {}).reduce((a, b) => a + b, 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={`p-4 cursor-pointer transition-all hover:bg-zinc-900/30 ${
        isSelected ? 'bg-zinc-900/50 border-l-2 border-l-accent' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.bg}`}>
            <Icon size={16} className={`${config.color} ${isAnimating ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-zinc-400">
                {snapshot.id.substring(0, 16)}...
              </span>
              <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${config.bg} ${config.color}`}>
                {snapshot.status}
              </span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Started: {new Date(snapshot.startedAt).toLocaleString()}
            </div>
            {snapshot.completedAt && (
              <div className="text-xs text-zinc-600 mt-0.5">
                Completed: {new Date(snapshot.completedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          {snapshot.status === 'complete' && (
            <div className="text-sm font-mono text-white">{recordCount.toLocaleString()}</div>
          )}
          <div className="text-xs text-zinc-500">records</div>
          <ChevronRight size={14} className="text-zinc-600 mt-2 ml-auto" />
        </div>
      </div>
    </motion.div>
  );
}

function SnapshotDetail({ snapshotId, onClose }: { snapshotId: string; onClose: () => void }) {
  const { data: snapshotData, isLoading } = useQuery({
    queryKey: ['snapshot', snapshotId],
    queryFn: async () => {
      const res = await getSnapshot(snapshotId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    refetchInterval: 5000,
  });

  const snapshot = snapshotData;

  if (isLoading || !snapshot) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-8 flex items-center justify-center h-96"
      >
        <RefreshCw size={20} className="animate-spin text-zinc-500" />
      </motion.div>
    );
  }

  const recordCounts = snapshot.recordCounts || {};
  const qualityResults = snapshot.qualityResults || [];
  const isActive = ['pending', 'building', 'validating'].includes(snapshot.status);

  // Show ingestion progress for active snapshots
  if (isActive) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
      >
        <IngestionProgress 
          snapshotId={snapshotId} 
          onComplete={() => {
            // Refresh data when ingestion completes
          }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-zinc-900/20 border border-zinc-900 rounded-xl overflow-hidden relative"
    >
      <div className="absolute top-0 right-0 p-4">
        <DecorativeDots variant="horizontal" className="opacity-20" />
      </div>

      <div className="p-4 border-b border-zinc-900 bg-zinc-900/30 flex justify-between items-center">
        <h3 className="text-sm font-medium text-white">Snapshot Details</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white lg:hidden">
          <X size={18} />
        </button>
      </div>

      <div className="p-4 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
        {/* ID */}
        <div>
          <label className="text-[10px] uppercase text-zinc-600 font-mono">ID</label>
          <div className="text-sm font-mono text-zinc-300 mt-1">{snapshot.id}</div>
        </div>

        {/* Status */}
        <div>
          <label className="text-[10px] uppercase text-zinc-600 font-mono">Status</label>
          <div className="text-sm text-white mt-1 capitalize">{snapshot.status}</div>
        </div>

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase text-zinc-600 font-mono">Started</label>
            <div className="text-xs text-zinc-400 mt-1">
              {new Date(snapshot.startedAt).toLocaleString()}
            </div>
          </div>
          {snapshot.completedAt && (
            <div>
              <label className="text-[10px] uppercase text-zinc-600 font-mono">Completed</label>
              <div className="text-xs text-zinc-400 mt-1">
                {new Date(snapshot.completedAt).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Record Counts */}
        {Object.keys(recordCounts).length > 0 && (
          <div>
            <label className="text-[10px] uppercase text-zinc-600 font-mono mb-2 block">Record Counts</label>
            <div className="space-y-2">
              {Object.entries(recordCounts).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-xs text-zinc-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="text-xs font-mono text-white">{value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quality Results */}
        {qualityResults.length > 0 && (
          <div>
            <label className="text-[10px] uppercase text-zinc-600 font-mono mb-2 block">Quality Checks</label>
            <div className="space-y-2">
              {qualityResults.map((result, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {result.status === 'passed' && <CheckCircle size={12} className="text-green-500" />}
                  {result.status === 'warning' && <AlertTriangle size={12} className="text-amber-500" />}
                  {result.status === 'failed' && <XCircle size={12} className="text-red-500" />}
                  <span className="text-xs text-zinc-400">{result.checkName.replace(/_/g, ' ')}</span>
                  {result.affectedCount !== undefined && result.affectedCount > 0 && (
                    <span className="text-[10px] text-zinc-600">({result.affectedCount})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sync Runs */}
        {snapshot.syncRuns && snapshot.syncRuns.length > 0 && (
          <div>
            <label className="text-[10px] uppercase text-zinc-600 font-mono mb-2 block">Pipeline Runs</label>
            <div className="space-y-2">
              {snapshot.syncRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between p-2 bg-zinc-900/30 rounded">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      run.status === 'completed' ? 'bg-green-500' :
                      run.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                    }`} />
                    <span className="text-xs text-zinc-400 capitalize">{run.runType}</span>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">{run.recordsProcessed}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

