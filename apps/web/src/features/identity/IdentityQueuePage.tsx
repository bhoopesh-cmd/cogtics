import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
  Users,
  AlertTriangle,
  Play,
  X,
  Globe,
  Building2,
  Mail,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import {
  listIdentityQueue,
  getIdentitySummary,
  submitIdentityDecision,
  triggerIdentityResolution,
  getIdentityTask,
} from '@/lib/api/endpoints';
import DecorativeDots from '@/components/ui/DecorativeDots';

export function IdentityQueuePage() {
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Fetch summary
  const { data: summary } = useQuery({
    queryKey: ['identitySummary'],
    queryFn: async () => {
      const res = await getIdentitySummary();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    refetchInterval: 10000,
  });

  // Fetch queue
  const { data: queueData, isLoading, refetch } = useQuery({
    queryKey: ['identityQueue'],
    queryFn: async () => {
      const res = await listIdentityQueue();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  // Trigger resolution mutation
  const triggerMutation = useMutation({
    mutationFn: async () => {
      const res = await triggerIdentityResolution();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identitySummary'] });
      queryClient.invalidateQueries({ queryKey: ['identityQueue'] });
    },
  });

  // Decision mutation
  const decisionMutation = useMutation({
    mutationFn: async ({ taskId, decision }: { taskId: string; decision: 'confirm' | 'reject' }) => {
      const res = await submitIdentityDecision(taskId, decision);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identityQueue'] });
      queryClient.invalidateQueries({ queryKey: ['identitySummary'] });
      setSelectedTaskId(null);
    },
  });

  const tasks = queueData?.tasks ?? [];

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
            <Link2 size={24} className="text-accent" />
            <h1 className="text-3xl font-light text-white tracking-tight">Identity Resolution</h1>
          </div>
          <p className="text-zinc-500">Review and resolve potential customer matches.</p>
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
            disabled={triggerMutation.isPending || summary?.runStatus === 'running'}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-black font-medium rounded-lg hover:bg-[#ff8533] transition-colors disabled:opacity-50"
          >
            {triggerMutation.isPending ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Play size={16} />
            )}
            Run Resolution
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Pending Review"
          value={summary?.queue?.pending ?? 0}
          icon={AlertTriangle}
          color="text-accent"
        />
        <StatCard
          label="Confirmed"
          value={summary?.queue?.resolved ?? 0}
          icon={CheckCircle}
          color="text-green-500"
        />
        <StatCard
          label="Auto-Merged"
          value={summary?.stats?.auto_merged ?? 0}
          icon={Link2}
          color="text-blue-500"
        />
        <StatCard
          label="Total Identities"
          value={summary?.stats?.identities_created ?? 0}
          icon={Users}
          color="text-zinc-400"
        />
      </div>

      {/* Run Status */}
      {summary?.runStatus === 'running' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-accent/5 border border-accent/20 rounded-lg flex items-center gap-3"
        >
          <RefreshCw size={18} className="animate-spin text-accent" />
          <span className="text-accent">Identity resolution in progress...</span>
        </motion.div>
      )}

      {/* Queue Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task List */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-900 bg-zinc-900/30">
              <h3 className="text-sm font-medium text-zinc-400">Review Queue</h3>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw size={20} className="animate-spin text-zinc-500" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <CheckCircle size={32} className="mb-3 opacity-50" />
                <p>No pending reviews.</p>
                <p className="text-sm mt-1">All identity matches have been resolved.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-900">
                {tasks.map((task, idx) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    index={idx}
                    isSelected={selectedTaskId === task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    onConfirm={() => decisionMutation.mutate({ taskId: task.id, decision: 'confirm' })}
                    onReject={() => decisionMutation.mutate({ taskId: task.id, decision: 'reject' })}
                    isPending={decisionMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedTaskId ? (
              <TaskDetailPanel
                taskId={selectedTaskId}
                onClose={() => setSelectedTaskId(null)}
                onConfirm={() => decisionMutation.mutate({ taskId: selectedTaskId, decision: 'confirm' })}
                onReject={() => decisionMutation.mutate({ taskId: selectedTaskId, decision: 'reject' })}
                isPending={decisionMutation.isPending}
              />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-zinc-900/10 border border-zinc-900 rounded-xl p-8 flex flex-col items-center justify-center text-zinc-500 h-96"
              >
                <Users size={32} className="mb-3 opacity-50" />
                <p className="text-sm">Select a task to view details</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Components
// ============================================

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <Icon size={20} className={color} />
        <div>
          <div className="text-2xl font-light text-white">{value.toLocaleString()}</div>
          <div className="text-xs text-zinc-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  index,
  isSelected,
  onClick,
  onConfirm,
  onReject,
  isPending,
}: {
  task: any;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onConfirm: () => void;
  onReject: () => void;
  isPending: boolean;
}) {
  const scoreColor = task.score >= 90 ? 'text-green-500' : task.score >= 80 ? 'text-accent' : 'text-blue-500';

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
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4">
            {/* Customer A */}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white font-medium truncate">
                {task.customerA?.name ?? 'Unknown'}
              </div>
              <div className="text-xs text-zinc-500 truncate">
                {task.customerA?.email ?? task.customerA?.externalId}
              </div>
            </div>

            {/* Match Indicator */}
            <div className="flex flex-col items-center px-3">
              <Link2 size={16} className="text-zinc-500" />
              <span className={`text-xs font-mono ${scoreColor}`}>{task.score}%</span>
            </div>

            {/* Customer B */}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white font-medium truncate">
                {task.customerB?.name ?? 'Unknown'}
              </div>
              <div className="text-xs text-zinc-500 truncate">
                {task.customerB?.email ?? task.customerB?.externalId}
              </div>
            </div>
          </div>

          {/* Feature Badges */}
          <div className="flex gap-2 mt-2">
            {task.features?.domain_match && (
              <FeatureBadge icon={Globe} label="Domain" />
            )}
            {(task.features?.name_similarity ?? 0) > 0.8 && (
              <FeatureBadge icon={Building2} label="Name" />
            )}
            {task.features?.tax_id_match && (
              <FeatureBadge icon={Tag} label="Tax ID" />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={(e) => { e.stopPropagation(); onConfirm(); }}
            disabled={isPending}
            className="p-2 text-green-500 hover:bg-green-500/10 rounded transition-colors disabled:opacity-50"
            title="Confirm Match"
          >
            <CheckCircle size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReject(); }}
            disabled={isPending}
            className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
            title="Reject Match"
          >
            <XCircle size={18} />
          </button>
          <ChevronRight size={14} className="text-zinc-600" />
        </div>
      </div>
    </motion.div>
  );
}

function FeatureBadge({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] rounded">
      <Icon size={10} />
      {label}
    </span>
  );
}

function TaskDetailPanel({
  taskId,
  onClose,
  onConfirm,
  onReject,
  isPending,
}: {
  taskId: string;
  onClose: () => void;
  onConfirm: () => void;
  onReject: () => void;
  isPending: boolean;
}) {
  const { data: task, isLoading } = useQuery({
    queryKey: ['identityTask', taskId],
    queryFn: async () => {
      const res = await getIdentityTask(taskId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  if (isLoading || !task) {
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
        <h3 className="text-sm font-medium text-white">Match Details</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div className="p-4 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
        {/* Score */}
        <div className="text-center py-4">
          <div className="text-4xl font-light text-white">{task.score}%</div>
          <div className="text-sm text-zinc-500 mt-1">Match Confidence</div>
        </div>

        {/* Customer Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <CustomerCard customer={task.customerA} label="Customer A" />
          <CustomerCard customer={task.customerB} label="Customer B" />
        </div>

        {/* Features */}
        <div>
          <label className="text-[10px] uppercase text-zinc-600 font-mono mb-2 block">Match Features</label>
          <div className="space-y-2">
            <FeatureRow
              label="Name Similarity"
              value={`${Math.round((task.features?.name_similarity ?? 0) * 100)}%`}
              match={(task.features?.name_similarity ?? 0) > 0.7}
            />
            <FeatureRow
              label="Domain Match"
              value={task.features?.domain_match ? 'Yes' : 'No'}
              match={task.features?.domain_match ?? false}
            />
            <FeatureRow
              label="Tax ID Match"
              value={task.features?.tax_id_match ? 'Yes' : 'No'}
              match={task.features?.tax_id_match ?? false}
            />
            <FeatureRow
              label="Address Match"
              value={task.features?.address_match ? 'Yes' : 'No'}
              match={task.features?.address_match ?? false}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-zinc-800">
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2 bg-green-500/10 text-green-500 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50"
          >
            Confirm Match
          </button>
          <button
            onClick={onReject}
            disabled={isPending}
            className="flex-1 py-2 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function CustomerCard({ customer, label }: { customer: any; label: string }) {
  if (!customer) return null;

  return (
    <div className="bg-zinc-900/50 rounded-lg p-3">
      <div className="text-[10px] uppercase text-zinc-600 font-mono mb-2">{label}</div>
      <div className="text-sm text-white font-medium truncate">{customer.name}</div>
      {customer.email && (
        <div className="text-xs text-zinc-400 truncate flex items-center gap-1 mt-1">
          <Mail size={10} /> {customer.email}
        </div>
      )}
      <div className="text-xs text-zinc-500 mt-2">
        <span className="text-zinc-600">Source:</span> {customer.sourceSystem}
      </div>
    </div>
  );
}

function FeatureRow({ label, value, match }: { label: string; value: string; match: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-zinc-400">{label}</span>
      <span className={`text-xs font-mono ${match ? 'text-green-500' : 'text-zinc-500'}`}>
        {value}
      </span>
    </div>
  );
}

export default IdentityQueuePage;
