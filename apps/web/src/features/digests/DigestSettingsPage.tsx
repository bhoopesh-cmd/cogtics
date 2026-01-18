import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Mail, Plus, Trash2, CheckCircle, XCircle, Clock, 
  Play, Loader2, ChevronDown, ChevronUp, Settings, Send
} from 'lucide-react';
import {
  listDigestSubscriptions,
  createDigestSubscription,
  updateDigestSubscription,
  deleteDigestSubscription,
  getDigestRuns,
  triggerDigest,
  type DigestSubscription,
  type DigestRun,
} from '@/lib/api/endpoints';

export function DigestSettingsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: digestsData, isLoading } = useQuery({
    queryKey: ['digests'],
    queryFn: async () => {
      const res = await listDigestSubscriptions({ limit: 50 });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    refetchInterval: 10000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; cadence: 'daily' | 'weekly' | 'monthly'; recipients: string[] }) => {
      const res = await createDigestSubscription(data);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digests'] });
      setShowCreateModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { isActive?: boolean } }) => {
      const res = await updateDigestSubscription(id, data);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['digests'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteDigestSubscription(id);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['digests'] }),
  });

  const triggerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await triggerDigest(id);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digests'] });
      queryClient.invalidateQueries({ queryKey: ['digest-runs'] });
    },
  });

  const subscriptions = digestsData?.subscriptions ?? [];

  const getCadenceLabel = (cadence: string) => {
    switch (cadence) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return cadence;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-white tracking-tight">Email Digests</h1>
          <p className="text-zinc-500 mt-2">
            Configure scheduled email summaries for your team.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#ff6500] text-white font-medium rounded hover:bg-[#ff7a1a] transition-colors"
        >
          <Plus size={16} /> New Subscription
        </button>
      </div>

      {/* Subscriptions List */}
      <div>
        <h3 className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-4">
          Active Subscriptions
        </h3>

        {isLoading && <div className="text-zinc-500">Loading...</div>}

        {subscriptions.length === 0 && !isLoading && (
          <div className="p-6 bg-zinc-900/20 border border-zinc-800 rounded-lg text-center text-zinc-500">
            No digest subscriptions yet. Create one to get started.
          </div>
        )}

        {subscriptions.length > 0 && (
          <div className="space-y-3">
            {subscriptions.map((sub, idx) => (
              <SubscriptionCard
                key={sub.id}
                subscription={sub}
                isExpanded={expandedId === sub.id}
                onToggle={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                onToggleActive={(isActive) => updateMutation.mutate({ id: sub.id, data: { isActive } })}
                onDelete={() => deleteMutation.mutate(sub.id)}
                onTrigger={() => triggerMutation.mutate(sub.id)}
                isUpdating={updateMutation.isPending}
                isDeleting={deleteMutation.isPending}
                isTriggering={triggerMutation.isPending}
                idx={idx}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateSubscriptionModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(data) => createMutation.mutate(data)}
          isCreating={createMutation.isPending}
        />
      )}
    </div>
  );
}

function SubscriptionCard({
  subscription,
  isExpanded,
  onToggle,
  onToggleActive,
  onDelete,
  onTrigger,
  isUpdating,
  isDeleting,
  isTriggering,
  idx,
}: {
  subscription: DigestSubscription;
  isExpanded: boolean;
  onToggle: () => void;
  onToggleActive: (isActive: boolean) => void;
  onDelete: () => void;
  onTrigger: () => void;
  isUpdating: boolean;
  isDeleting: boolean;
  isTriggering: boolean;
  idx: number;
}) {
  const { data: runsData } = useQuery({
    queryKey: ['digest-runs', subscription.id],
    queryFn: async () => {
      const res = await getDigestRuns(subscription.id, { limit: 5 });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: isExpanded,
  });

  const runs = runsData?.runs ?? [];

  const getStatusIcon = (status: DigestRun['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={12} className="text-green-500" />;
      case 'running':
        return <Loader2 size={12} className="text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock size={12} className="text-yellow-500" />;
      case 'failed':
        return <XCircle size={12} className="text-red-500" />;
      case 'skipped':
        return <Clock size={12} className="text-zinc-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden"
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded ${subscription.isActive ? 'bg-[#ff6500]/20 text-[#ff6500]' : 'bg-zinc-800 text-zinc-500'}`}>
            <Mail size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">{subscription.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${subscription.isActive ? 'bg-green-900/30 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>
                {subscription.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {subscription.cadence.charAt(0).toUpperCase() + subscription.cadence.slice(1)} · {(subscription.recipients as string[]).length} recipients
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTrigger()}
            disabled={isTriggering || !subscription.isActive}
            className="p-2 text-zinc-500 hover:text-[#ff6500] transition-colors disabled:opacity-50"
            title="Send now"
          >
            {isTriggering ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
          <button
            onClick={() => onToggleActive(!subscription.isActive)}
            disabled={isUpdating}
            className={`p-2 transition-colors ${subscription.isActive ? 'text-green-500 hover:text-zinc-500' : 'text-zinc-500 hover:text-green-500'}`}
            title={subscription.isActive ? 'Disable' : 'Enable'}
          >
            {subscription.isActive ? <CheckCircle size={16} /> : <XCircle size={16} />}
          </button>
          <button
            onClick={() => onDelete()}
            disabled={isDeleting}
            className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onToggle}
            className="p-2 text-zinc-500 hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-zinc-800 p-4 bg-black/30">
          <div className="mb-3">
            <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Recipients</h4>
            <div className="flex flex-wrap gap-2">
              {(subscription.recipients as string[]).map((email) => (
                <span key={email} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded">
                  {email}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Recent Runs</h4>
            {runs.length === 0 ? (
              <p className="text-xs text-zinc-600">No runs yet</p>
            ) : (
              <div className="space-y-2">
                {runs.map((run) => (
                  <div key={run.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(run.status)}
                      <span className="text-zinc-400">
                        {new Date(run.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-zinc-500">
                      {run.emailsSent} sent · {run.itemsCount} items
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function CreateSubscriptionModal({
  onClose,
  onCreate,
  isCreating,
}: {
  onClose: () => void;
  onCreate: (data: { name: string; cadence: 'daily' | 'weekly' | 'monthly'; recipients: string[] }) => void;
  isCreating: boolean;
}) {
  const [name, setName] = useState('');
  const [cadence, setCadence] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recipientsText, setRecipientsText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const recipients = recipientsText
      .split(/[,\n]/)
      .map((r) => r.trim())
      .filter((r) => r.includes('@'));
    
    if (name && recipients.length > 0) {
      onCreate({ name, cadence, recipients });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full mx-4"
      >
        <h2 className="text-xl font-medium text-white mb-4">Create Digest Subscription</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekly Issues Summary"
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ff6500]"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Cadence</label>
            <select
              value={cadence}
              onChange={(e) => setCadence(e.target.value as 'daily' | 'weekly' | 'monthly')}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ff6500]"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Recipients (one per line or comma-separated)</label>
            <textarea
              value={recipientsText}
              onChange={(e) => setRecipientsText(e.target.value)}
              placeholder="alice@example.com&#10;bob@example.com"
              rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ff6500] font-mono text-sm"
              required
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !name || !recipientsText}
              className="px-4 py-2 bg-[#ff6500] text-white font-medium rounded hover:bg-[#ff7a1a] transition-colors disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Subscription'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
