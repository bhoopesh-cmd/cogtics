import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FileText,
  ArrowLeft,
  User,
  Receipt,
  Calendar,
  DollarSign,
  Clock,
  RefreshCcw,
  Tag,
  ExternalLink,
  RefreshCw,
  History,
  FileSearch,
} from 'lucide-react';
import { getContractDetail } from '@/lib/api/endpoints';
import DecorativeDots from '@/components/ui/DecorativeDots';

export function ContractDetailPage() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();

  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: async () => {
      if (!contractId) throw new Error('Contract ID required');
      const res = await getContractDetail(contractId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!contractId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
        {error ? String(error) : 'Contract not found'}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:text-accent transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-accent/10 rounded-xl">
              <FileText size={24} className="text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-white">
                {contract.name || `Contract ${contract.externalId.substring(0, 12)}`}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <StatusBadge status={contract.status} />
                <span className="text-xs text-zinc-500 font-mono">{contract.externalId}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contract Intelligence Button */}
        <Link
          to={`/contracts/${contractId}/intelligence`}
          className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent border border-accent/30 rounded-lg hover:bg-accent/20 transition-colors"
        >
          <FileSearch size={16} />
          <span className="text-sm font-medium">Intelligence</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contract Info Card */}
        <div className="lg:col-span-1 space-y-6">
          {/* Main Info */}
          <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4">
              <DecorativeDots variant="horizontal" className="opacity-20" />
            </div>

            <div className="p-4 border-b border-zinc-900 bg-zinc-900/30">
              <h3 className="text-sm font-medium text-zinc-400">Contract Details</h3>
            </div>

            <div className="p-4 space-y-4">
              {contract.arr && (
                <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg text-center">
                  <div className="text-2xl font-light text-white">
                    ${contract.arr.toLocaleString()}
                  </div>
                  <div className="text-xs text-accent uppercase mt-1">Annual Recurring Revenue</div>
                </div>
              )}

              <InfoRow icon={Tag} label="Status" value={contract.status} />
              <InfoRow icon={Calendar} label="Start Date" value={contract.startDate || 'N/A'} />
              <InfoRow icon={Calendar} label="End Date" value={contract.endDate || 'Ongoing'} />
              <InfoRow icon={RefreshCcw} label="Billing" value={contract.billingFrequency || 'N/A'} />
              <InfoRow icon={DollarSign} label="Currency" value={contract.currency} />
              <InfoRow icon={Clock} label="Auto Renew" value={contract.autoRenew ? 'Yes' : 'No'} />
              <InfoRow icon={ExternalLink} label="Source" value={contract.sourceSystem} />
            </div>
          </div>

          {/* Customer Card */}
          {contract.customer && (
            <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-900 bg-zinc-900/30 flex items-center gap-2">
                <User size={16} className="text-accent" />
                <h3 className="text-sm font-medium text-zinc-400">Customer</h3>
              </div>

              <Link
                to={`/data/customers/${contract.customer.id}`}
                className="block p-4 hover:bg-zinc-900/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-800 rounded-full">
                    <User size={16} className="text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">
                      {contract.customer.name}
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                      {contract.customer.email}
                    </div>
                  </div>
                  <StatusBadge status={contract.customer.status} />
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Versions & Invoices */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contract Versions */}
          {contract.versions && contract.versions.length > 0 && (
            <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-900 bg-zinc-900/30 flex items-center gap-2">
                <History size={16} className="text-accent" />
                <h3 className="text-sm font-medium text-zinc-400">Version History</h3>
                <span className="ml-auto text-xs text-zinc-500">{contract.versions.length}</span>
              </div>

              <div className="divide-y divide-zinc-900">
                {contract.versions.map((version, idx) => (
                  <div key={version.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono ${
                          idx === 0 ? 'bg-accent/20 text-accent' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          v{version.version}
                        </div>
                        <div>
                          <div className="text-sm text-white">
                            Version {version.version}
                            {idx === 0 && (
                              <span className="ml-2 text-[10px] uppercase px-1.5 py-0.5 rounded bg-accent/20 text-accent">
                                Current
                              </span>
                            )}
                          </div>
                          {version.effectiveDate && (
                            <div className="text-xs text-zinc-500 mt-0.5">
                              Effective: {version.effectiveDate}
                            </div>
                          )}
                        </div>
                      </div>
                      {version.source && (
                        <span className="text-xs text-zinc-500">{version.source}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Invoices */}
          <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-900 bg-zinc-900/30 flex items-center gap-2">
              <Receipt size={16} className="text-accent" />
              <h3 className="text-sm font-medium text-zinc-400">Related Invoices</h3>
              <span className="ml-auto text-xs text-zinc-500">{contract.invoices?.length ?? 0}</span>
            </div>

            {contract.invoices && contract.invoices.length > 0 ? (
              <div className="divide-y divide-zinc-900">
                {contract.invoices.map((invoice) => (
                  <div key={invoice.id} className="p-4 hover:bg-zinc-900/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white font-mono">
                          {invoice.invoiceNumber || invoice.externalId.substring(0, 12)}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {invoice.invoiceDate}
                          {invoice.dueDate && ` • Due: ${invoice.dueDate}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={invoice.status} />
                        <div className="text-sm font-mono text-white mt-1">
                          ${invoice.total.toLocaleString()}
                        </div>
                        {invoice.amountDue && invoice.amountDue > 0 && (
                          <div className="text-xs text-accent mt-0.5">
                            Due: ${invoice.amountDue.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No invoices found for this contract" />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ size: number; className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={14} className="text-zinc-500" />
      <span className="text-xs text-zinc-500">{label}:</span>
      <span className="text-sm text-white capitalize">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'border-green-900 text-green-500 bg-green-900/10',
    inactive: 'border-zinc-700 text-zinc-500 bg-zinc-800/50',
    churned: 'border-red-900 text-red-500 bg-red-900/10',
    prospect: 'border-blue-900 text-blue-500 bg-blue-900/10',
    draft: 'border-zinc-700 text-zinc-500 bg-zinc-800/50',
    expired: 'border-amber-900 text-amber-500 bg-amber-900/10',
    cancelled: 'border-red-900 text-red-500 bg-red-900/10',
    renewed: 'border-green-900 text-green-500 bg-green-900/10',
    open: 'border-blue-900 text-blue-500 bg-blue-900/10',
    paid: 'border-green-900 text-green-500 bg-green-900/10',
    void: 'border-zinc-700 text-zinc-500 bg-zinc-800/50',
    past_due: 'border-accent/50 text-accent bg-accent/10',
  };

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wide ${colors[status] || colors.inactive}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-8 text-center text-zinc-500 text-sm">
      {message}
    </div>
  );
}

export default ContractDetailPage;
