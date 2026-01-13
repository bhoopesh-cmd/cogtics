import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Link2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Search,
  Trash2,
  Plus,
  Key,
  X,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import {
  listConnections,
  startOAuth,
  connectStripeWithApiKey,
  discoverSchema,
  triggerSync,
  healthCheck,
  deleteConnection,
  getActiveIngestion,
  type Connection,
} from '@/lib/api/endpoints';

const PROVIDERS = [
  { 
    id: 'stripe', 
    name: 'Stripe', 
    description: 'Payment and subscription data',
    supportsApiKey: true, // Stripe supports direct API key connection
  },
  { 
    id: 'salesforce', 
    name: 'Salesforce', 
    description: 'CRM and opportunity data',
    supportsApiKey: false, // Salesforce requires OAuth
  },
  { 
    id: 'hubspot', 
    name: 'HubSpot', 
    description: 'CRM and marketing data',
    supportsApiKey: false, // HubSpot requires OAuth
  },
  { 
    id: 'quickbooks', 
    name: 'QuickBooks', 
    description: 'Accounting and invoices',
    supportsApiKey: false, // QuickBooks requires OAuth
  },
  { 
    id: 'docusign', 
    name: 'DocuSign', 
    description: 'Contract signatures',
    supportsApiKey: false, // DocuSign requires OAuth
  },
];

export function ConnectionsPage() {
  const queryClient = useQueryClient();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [syncingConnections, setSyncingConnections] = useState<Set<string>>(new Set());
  const [lastSyncResult, setLastSyncResult] = useState<{ connectionId: string; snapshotId?: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      const res = await listConnections();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  // Poll for active ingestion to show sync status
  const { data: activeIngestion } = useQuery({
    queryKey: ['activeIngestion'],
    queryFn: async () => {
      const res = await getActiveIngestion();
      if (!res.ok) return null;
      return res.data;
    },
    refetchInterval: syncingConnections.size > 0 ? 3000 : false,
  });

  // Update syncing state when active ingestion changes
  useEffect(() => {
    if (activeIngestion?.activeSnapshots?.length === 0 && syncingConnections.size > 0) {
      // Sync completed, refresh connections
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      setSyncingConnections(new Set());
    }
  }, [activeIngestion, syncingConnections.size, queryClient]);

  const connectOAuthMutation = useMutation({
    mutationFn: async (provider: string) => {
      const res = await startOAuth(provider);
      if (!res.ok) throw new Error(res.error);
      // Redirect to OAuth provider
      window.location.href = res.data.authUrl;
    },
  });

  const connectApiKeyMutation = useMutation({
    mutationFn: async ({ apiKey, displayName }: { apiKey: string; displayName?: string }) => {
      const res = await connectStripeWithApiKey(apiKey, displayName);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      setShowApiKeyModal(false);
      setApiKey('');
      setDisplayName('');
      setSelectedProvider(null);
    },
  });

  const handleConnect = (provider: typeof PROVIDERS[0]) => {
    if (provider.supportsApiKey) {
      // Show modal for API key entry
      setSelectedProvider(provider.id);
      setShowApiKeyModal(true);
    } else {
      // Use OAuth flow
      connectOAuthMutation.mutate(provider.id);
    }
  };

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    connectApiKeyMutation.mutate({ apiKey: apiKey.trim(), displayName: displayName.trim() || undefined });
  };

  const discoverMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const res = await discoverSchema(connectionId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections'] }),
  });

  const syncMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const res = await triggerSync(connectionId, { runType: 'incremental' });
      if (!res.ok) throw new Error(res.error);
      return { ...res.data, connectionId };
    },
    onMutate: (connectionId) => {
      setSyncingConnections((prev) => new Set(prev).add(connectionId));
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['activeIngestion'] });
      setLastSyncResult({ connectionId: data.connectionId, snapshotId: data.runId });
    },
    onError: (_, connectionId) => {
      setSyncingConnections((prev) => {
        const next = new Set(prev);
        next.delete(connectionId);
        return next;
      });
    },
  });

  const healthMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const res = await healthCheck(connectionId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const res = await deleteConnection(connectionId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections'] }),
  });

  const connections = data?.connections ?? [];

  const getStatusIcon = (status: Connection['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'error':
        return <AlertTriangle size={16} className="text-accent" />;
      case 'pending':
        return <RefreshCw size={16} className="text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle size={16} className="text-zinc-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-3xl font-light text-white tracking-tight">Integrations</h1>
        <p className="text-zinc-500 mt-2">
          Connect your revenue systems to enable automated reconciliation.
        </p>
      </div>

      {/* Add New Connection */}
      <section>
        <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-4">
          Available Connectors
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROVIDERS.map((provider) => {
            const isConnected = connections.some(
              (c) => c.provider === provider.id && c.status === 'connected'
            );
            return (
              <div
                key={provider.id}
                className="p-4 border border-zinc-800 bg-zinc-900/20 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded flex items-center justify-center font-bold text-xs bg-zinc-800 text-zinc-400">
                    {provider.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-200">{provider.name}</div>
                    <div className="text-xs text-zinc-500">{provider.description}</div>
                  </div>
                </div>
                {isConnected ? (
                  <span className="text-xs text-green-500 flex items-center gap-1">
                    <CheckCircle size={14} /> Connected
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    {provider.supportsApiKey && (
                      <button
                        onClick={() => handleConnect(provider)}
                        disabled={connectApiKeyMutation.isPending}
                        className="flex items-center gap-2 px-3 py-1.5 bg-accent text-black text-sm font-medium rounded hover:bg-accent/90 transition-colors disabled:opacity-50"
                      >
                        <Key size={14} /> API Key
                      </button>
                    )}
                    <button
                      onClick={() => connectOAuthMutation.mutate(provider.id)}
                      disabled={connectOAuthMutation.isPending}
                      className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-colors disabled:opacity-50 ${
                        provider.supportsApiKey 
                          ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' 
                          : 'bg-accent text-black hover:bg-accent/90'
                      }`}
                    >
                      <Plus size={14} /> OAuth
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Active Connections */}
      <section>
        <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-4">
          Active Connections
        </h2>

        {isLoading && <div className="text-zinc-500">Loading connections...</div>}
        {error && <div className="text-red-400">Error: {String(error)}</div>}

        {connections.length === 0 && !isLoading && (
          <div className="p-6 bg-zinc-900/20 border border-zinc-800 rounded-lg text-center text-zinc-500">
            No connections yet. Connect a provider above to get started.
          </div>
        )}

        <div className="space-y-3">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="p-4 border border-zinc-800 bg-zinc-900/20 rounded-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(conn.status)}
                  <div>
                    <div className="text-sm font-medium text-white">
                      {conn.displayName || conn.provider}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {conn.provider} • Last sync:{' '}
                      {conn.lastSyncAt
                        ? new Date(conn.lastSyncAt).toLocaleString()
                        : 'Never'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => discoverMutation.mutate(conn.id)}
                    disabled={discoverMutation.isPending}
                    className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                    title="Discover Schema"
                  >
                    <Search size={16} />
                  </button>
                  <button
                    onClick={() => syncMutation.mutate(conn.id)}
                    disabled={syncMutation.isPending || syncingConnections.has(conn.id)}
                    className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors disabled:opacity-50"
                    title={syncingConnections.has(conn.id) ? 'Syncing...' : 'Sync Now'}
                  >
                    {syncingConnections.has(conn.id) ? (
                      <Loader2 size={16} className="animate-spin text-accent" />
                    ) : (
                      <Play size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => healthMutation.mutate(conn.id)}
                    disabled={healthMutation.isPending}
                    className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                    title="Health Check"
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this connection?')) {
                        deleteMutation.mutate(conn.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {conn.lastErrorMessage && (
                <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                  {conn.lastErrorMessage}
                </div>
              )}
              
              {/* Sync progress indicator */}
              {syncingConnections.has(conn.id) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 p-3 bg-accent/5 border border-accent/20 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-accent" />
                      <span className="text-sm text-accent">Sync in progress...</span>
                    </div>
                    <Link 
                      to="/snapshots"
                      className="text-xs text-accent hover:underline flex items-center gap-1"
                    >
                      View progress <ExternalLink size={12} />
                    </Link>
                  </div>
                  <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-accent"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 30, ease: 'linear' }}
                    />
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </div>

        {/* Sync completion toast */}
        <AnimatePresence>
          {lastSyncResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 right-6 p-4 bg-zinc-900 border border-accent/30 rounded-lg shadow-lg max-w-sm"
            >
              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="text-green-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">Sync triggered successfully</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    The ingestion pipeline is now processing your data.
                  </p>
                  <Link
                    to="/snapshots"
                    className="mt-2 text-xs text-accent hover:underline inline-flex items-center gap-1"
                  >
                    View in Snapshots <ExternalLink size={12} />
                  </Link>
                </div>
                <button
                  onClick={() => setLastSyncResult(null)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* API Key Modal */}
      <AnimatePresence>
        {showApiKeyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowApiKeyModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">
                  Connect {selectedProvider === 'stripe' ? 'Stripe' : selectedProvider} with API Key
                </h3>
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleApiKeySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    API Secret Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={selectedProvider === 'stripe' ? 'sk_test_...' : 'Enter API key'}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-accent transition-colors"
                    required
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    {selectedProvider === 'stripe' && (
                      <>Find your API keys at{' '}
                        <a 
                          href="https://dashboard.stripe.com/apikeys" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          Stripe Dashboard → Developers → API Keys
                        </a>
                      </>
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Display Name (optional)
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g., Production Stripe"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                {connectApiKeyMutation.isError && (
                  <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
                    {connectApiKeyMutation.error instanceof Error 
                      ? connectApiKeyMutation.error.message 
                      : 'Failed to connect'}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowApiKeyModal(false)}
                    className="flex-1 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!apiKey.trim() || connectApiKeyMutation.isPending}
                    className="flex-1 px-4 py-2 bg-accent text-black font-medium rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                  >
                    {connectApiKeyMutation.isPending ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

