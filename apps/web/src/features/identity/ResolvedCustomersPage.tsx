import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Users,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Database,
  CheckCircle,
  Link2,
  Mail,
  Building2,
} from 'lucide-react';
import {
  listResolvedCustomers,
  getResolvedIdentity,
} from '@/lib/api/endpoints';
import DecorativeDots from '@/components/ui/DecorativeDots';

export function ResolvedCustomersPage() {
  const [expandedIdentityId, setExpandedIdentityId] = useState<string | null>(null);

  // Fetch resolved identities
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['resolvedCustomers'],
    queryFn: async () => {
      const res = await listResolvedCustomers();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const identities = data?.identities ?? [];

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
            <Users size={24} className="text-accent" />
            <h1 className="text-3xl font-light text-white tracking-tight">Resolved Customers</h1>
          </div>
          <p className="text-zinc-500">Unified customer identities from merged records.</p>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-full hover:text-accent transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-accent" />
            <div>
              <div className="text-2xl font-light text-white">{data?.total ?? 0}</div>
              <div className="text-xs text-zinc-500">Total Identities</div>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Link2 size={20} className="text-green-500" />
            <div>
              <div className="text-2xl font-light text-white">
                {identities.filter(i => i.method === 'auto').length}
              </div>
              <div className="text-xs text-zinc-500">Auto-Merged</div>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-blue-500" />
            <div>
              <div className="text-2xl font-light text-white">
                {identities.filter(i => i.method === 'manual').length}
              </div>
              <div className="text-xs text-zinc-500">Manually Confirmed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Identities List */}
      <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4">
          <DecorativeDots variant="horizontal" className="opacity-20" />
        </div>

        <div className="p-4 border-b border-zinc-900 bg-zinc-900/30">
          <h3 className="text-sm font-medium text-zinc-400">Unified Customer Identities</h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={20} className="animate-spin text-zinc-500" />
          </div>
        ) : identities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Database size={32} className="mb-3 opacity-50" />
            <p>No resolved identities yet.</p>
            <p className="text-sm mt-1">Run identity resolution to match customers across systems.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-900">
            {identities.map((identity, idx) => (
              <IdentityRow
                key={identity.id}
                identity={identity}
                index={idx}
                isExpanded={expandedIdentityId === identity.id}
                onToggle={() => setExpandedIdentityId(
                  expandedIdentityId === identity.id ? null : identity.id
                )}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function IdentityRow({
  identity,
  index,
  isExpanded,
  onToggle,
}: {
  identity: any;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <div
        onClick={onToggle}
        className={`p-4 cursor-pointer transition-all hover:bg-zinc-900/30 ${
          isExpanded ? 'bg-zinc-900/40' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar/Icon */}
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Building2 size={18} className="text-accent" />
            </div>

            {/* Primary Info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white font-medium">
                  {identity.primaryName ?? 'Unknown'}
                </span>
                <MethodBadge method={identity.method} />
              </div>
              {identity.primaryEmail && (
                <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                  <Mail size={10} /> {identity.primaryEmail}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Member Count */}
            <div className="text-right">
              <div className="text-sm font-mono text-white">{identity.memberCount}</div>
              <div className="text-xs text-zinc-500">members</div>
            </div>

            {/* Source Systems */}
            <div className="flex gap-1">
              {identity.sourceSystems?.map((system: string) => (
                <SourceBadge key={system} system={system} />
              ))}
            </div>

            {/* Confidence */}
            <div className="text-right">
              <div className={`text-sm font-mono ${
                identity.confidence >= 90 ? 'text-green-500' : 
                identity.confidence >= 80 ? 'text-accent' : 'text-blue-500'
              }`}>
                {identity.confidence}%
              </div>
              <div className="text-xs text-zinc-500">confidence</div>
            </div>

            {/* Expand Icon */}
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight size={16} className="text-zinc-500" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Expanded Members */}
      <AnimatePresence>
        {isExpanded && (
          <ExpandedMembers identityId={identity.id} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ExpandedMembers({ identityId }: { identityId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['resolvedIdentity', identityId],
    queryFn: async () => {
      const res = await getResolvedIdentity(identityId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border-t border-zinc-800 bg-zinc-900/20"
    >
      {isLoading ? (
        <div className="p-4 flex items-center justify-center">
          <RefreshCw size={16} className="animate-spin text-zinc-500" />
        </div>
      ) : (
        <div className="p-4">
          <div className="text-xs text-zinc-600 uppercase font-mono mb-3">Member Records</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data?.members?.map((member: any) => (
              <div
                key={member.id}
                className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">{member.name}</span>
                      {member.role === 'primary' && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-accent/20 text-accent rounded uppercase">
                          Primary
                        </span>
                      )}
                    </div>
                    {member.email && (
                      <div className="text-xs text-zinc-400 mt-0.5">{member.email}</div>
                    )}
                    <div className="text-xs text-zinc-600 mt-1">
                      <span className="font-mono">{member.externalId}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <SourceBadge system={member.sourceSystem} />
                    <Link
                      to={`/data/customers/${member.customerId}`}
                      className="text-xs text-accent hover:underline flex items-center gap-1 mt-2 justify-end"
                    >
                      View <ExternalLink size={10} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    auto: { bg: 'bg-green-500/10', text: 'text-green-500' },
    manual: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
    override: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  };

  const { bg, text } = config[method] ?? config.auto;

  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded ${bg} ${text} uppercase`}>
      {method}
    </span>
  );
}

function SourceBadge({ system }: { system: string }) {
  return (
    <span className="text-[9px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded uppercase">
      {system}
    </span>
  );
}

export default ResolvedCustomersPage;
