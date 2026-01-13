import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  User,
  ArrowLeft,
  FileText,
  Receipt,
  CreditCard,
  Mail,
  Calendar,
  Tag,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { getCustomerDetail, type Customer, type Contract, type Invoice, type Payment } from '@/lib/api/endpoints';
import DecorativeDots from '@/components/ui/DecorativeDots';

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      if (!customerId) throw new Error('Customer ID required');
      const res = await getCustomerDetail(customerId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!customerId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
        {error ? String(error) : 'Customer not found'}
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
              <User size={24} className="text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-white">{customer.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <StatusBadge status={customer.status} />
                <span className="text-xs text-zinc-500 font-mono">{customer.externalId}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info Card */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4">
              <DecorativeDots variant="horizontal" className="opacity-20" />
            </div>

            <div className="p-4 border-b border-zinc-900 bg-zinc-900/30">
              <h3 className="text-sm font-medium text-zinc-400">Customer Information</h3>
            </div>

            <div className="p-4 space-y-4">
              {customer.email && (
                <InfoRow icon={Mail} label="Email" value={customer.email} />
              )}
              <InfoRow icon={Tag} label="Status" value={customer.status} />
              <InfoRow icon={Calendar} label="Created" value={new Date(customer.createdAt).toLocaleDateString()} />
              <InfoRow icon={ExternalLink} label="Source" value={customer.sourceSystem} />

              <div className="pt-4 border-t border-zinc-800">
                <div className="text-[10px] uppercase text-zinc-600 font-mono mb-2">Summary</div>
                <div className="grid grid-cols-2 gap-4">
                  <SummaryCard label="Contracts" value={customer.contracts?.length ?? 0} />
                  <SummaryCard label="Invoices" value={customer.invoices?.length ?? 0} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contracts & Invoices */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contracts */}
          <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-900 bg-zinc-900/30 flex items-center gap-2">
              <FileText size={16} className="text-accent" />
              <h3 className="text-sm font-medium text-zinc-400">Contracts</h3>
              <span className="ml-auto text-xs text-zinc-500">{customer.contracts?.length ?? 0}</span>
            </div>

            {customer.contracts && customer.contracts.length > 0 ? (
              <div className="divide-y divide-zinc-900">
                {customer.contracts.map((contract) => (
                  <Link
                    key={contract.id}
                    to={`/data/contracts/${contract.id}`}
                    className="block p-4 hover:bg-zinc-900/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white font-medium">
                          {contract.name || contract.externalId}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {contract.startDate} - {contract.endDate || 'Ongoing'}
                        </div>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={contract.status} />
                        {contract.arr && (
                          <div className="text-sm font-mono text-white mt-1">
                            ${contract.arr.toLocaleString()} ARR
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState message="No contracts found" />
            )}
          </div>

          {/* Recent Invoices */}
          <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-900 bg-zinc-900/30 flex items-center gap-2">
              <Receipt size={16} className="text-accent" />
              <h3 className="text-sm font-medium text-zinc-400">Recent Invoices</h3>
              <span className="ml-auto text-xs text-zinc-500">{customer.invoices?.length ?? 0}</span>
            </div>

            {customer.invoices && customer.invoices.length > 0 ? (
              <div className="divide-y divide-zinc-900">
                {customer.invoices.map((invoice) => (
                  <div key={invoice.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white font-mono">
                          {invoice.invoiceNumber || invoice.externalId.substring(0, 12)}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">{invoice.invoiceDate}</div>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={invoice.status} />
                        <div className="text-sm font-mono text-white mt-1">
                          ${invoice.total.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No invoices found" />
            )}
          </div>

          {/* Recent Payments */}
          {customer.payments && customer.payments.length > 0 && (
            <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-900 bg-zinc-900/30 flex items-center gap-2">
                <CreditCard size={16} className="text-accent" />
                <h3 className="text-sm font-medium text-zinc-400">Recent Payments</h3>
                <span className="ml-auto text-xs text-zinc-500">{customer.payments.length}</span>
              </div>

              <div className="divide-y divide-zinc-900">
                {customer.payments.map((payment) => (
                  <div key={payment.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white font-mono">
                          {payment.externalId.substring(0, 16)}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">{payment.paymentDate}</div>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={payment.status} />
                        <div className="text-sm font-mono text-white mt-1">
                          ${payment.amount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-zinc-900/50 rounded-lg p-3 text-center">
      <div className="text-xl font-light text-white">{value}</div>
      <div className="text-[10px] uppercase text-zinc-500">{label}</div>
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
    succeeded: 'border-green-900 text-green-500 bg-green-900/10',
    failed: 'border-red-900 text-red-500 bg-red-900/10',
    pending: 'border-blue-900 text-blue-500 bg-blue-900/10',
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

export default CustomerDetailPage;
