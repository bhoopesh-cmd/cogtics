import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Database, Users, FileText, Receipt, Search, ChevronDown, RefreshCw, Package, CreditCard, ExternalLink } from 'lucide-react';
import { listSnapshots, listCustomers, listContracts, listInvoices, listProducts, listPayments, type Snapshot, type Customer, type Contract, type Invoice, type Product, type Payment } from '@/lib/api/endpoints';
import DecorativeDots from '@/components/ui/DecorativeDots';

type TabType = 'customers' | 'contracts' | 'invoices' | 'products' | 'payments';

export function DataExplorerPage() {
  const [activeTab, setActiveTab] = useState<TabType>('customers');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSnapshotDropdown, setShowSnapshotDropdown] = useState(false);

  // Fetch snapshots
  const { data: snapshotsData, isLoading: snapshotsLoading } = useQuery({
    queryKey: ['snapshots', { status: 'complete', limit: 10 }],
    queryFn: async () => {
      const res = await listSnapshots({ status: 'complete', limit: 10 });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const snapshots = snapshotsData?.snapshots ?? [];
  const currentSnapshot = selectedSnapshotId 
    ? snapshots.find(s => s.id === selectedSnapshotId) 
    : snapshots[0];

  // Fetch data based on active tab
  const { data: customersData, isLoading: customersLoading, refetch: refetchCustomers } = useQuery({
    queryKey: ['customers', { snapshotId: currentSnapshot?.id, search: searchQuery }],
    queryFn: async () => {
      const res = await listCustomers({ snapshotId: currentSnapshot?.id, limit: 50, search: searchQuery || undefined });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: activeTab === 'customers' && !!currentSnapshot?.id,
  });

  const { data: contractsData, isLoading: contractsLoading, refetch: refetchContracts } = useQuery({
    queryKey: ['contracts', { snapshotId: currentSnapshot?.id, search: searchQuery }],
    queryFn: async () => {
      const res = await listContracts({ snapshotId: currentSnapshot?.id, limit: 50, search: searchQuery || undefined });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: activeTab === 'contracts' && !!currentSnapshot?.id,
  });

  const { data: invoicesData, isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices', { snapshotId: currentSnapshot?.id, search: searchQuery }],
    queryFn: async () => {
      const res = await listInvoices({ snapshotId: currentSnapshot?.id, limit: 50, search: searchQuery || undefined });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: activeTab === 'invoices' && !!currentSnapshot?.id,
  });

  const { data: productsData, isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['products', { snapshotId: currentSnapshot?.id, search: searchQuery }],
    queryFn: async () => {
      const res = await listProducts({ snapshotId: currentSnapshot?.id, limit: 50, search: searchQuery || undefined });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: activeTab === 'products' && !!currentSnapshot?.id,
  });

  const { data: paymentsData, isLoading: paymentsLoading, refetch: refetchPayments } = useQuery({
    queryKey: ['payments', { snapshotId: currentSnapshot?.id }],
    queryFn: async () => {
      const res = await listPayments({ snapshotId: currentSnapshot?.id, limit: 50 });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: activeTab === 'payments' && !!currentSnapshot?.id,
  });

  const handleRefresh = () => {
    if (activeTab === 'customers') refetchCustomers();
    else if (activeTab === 'contracts') refetchContracts();
    else if (activeTab === 'invoices') refetchInvoices();
    else if (activeTab === 'products') refetchProducts();
    else refetchPayments();
  };

  const tabs = [
    { id: 'customers' as const, label: 'Customers', icon: Users, count: customersData?.total ?? 0 },
    { id: 'contracts' as const, label: 'Contracts', icon: FileText, count: contractsData?.total ?? 0 },
    { id: 'invoices' as const, label: 'Invoices', icon: Receipt, count: invoicesData?.total ?? 0 },
    { id: 'products' as const, label: 'Products', icon: Package, count: productsData?.total ?? 0 },
    { id: 'payments' as const, label: 'Payments', icon: CreditCard, count: paymentsData?.total ?? 0 },
  ];

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
            <Database size={24} className="text-accent" />
            <h1 className="text-3xl font-light text-white tracking-tight">Data Explorer</h1>
          </div>
          <p className="text-zinc-500">Browse canonical data from your connected systems.</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Snapshot Selector */}
          <div className="relative">
            <button
              onClick={() => setShowSnapshotDropdown(!showSnapshotDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:border-zinc-700 transition-colors"
            >
              <span className="font-mono text-xs text-zinc-500">Snapshot:</span>
              <span className="text-white">
                {currentSnapshot ? new Date(currentSnapshot.completedAt!).toLocaleDateString() : 'None'}
              </span>
              <ChevronDown size={14} className="text-zinc-500" />
            </button>

            <AnimatePresence>
              {showSnapshotDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden"
                >
                  {snapshots.map((snapshot) => (
                    <button
                      key={snapshot.id}
                      onClick={() => {
                        setSelectedSnapshotId(snapshot.id);
                        setShowSnapshotDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-zinc-800 transition-colors ${
                        snapshot.id === currentSnapshot?.id ? 'bg-zinc-800' : ''
                      }`}
                    >
                      <div className="text-sm text-white">
                        {new Date(snapshot.completedAt!).toLocaleString()}
                      </div>
                      <div className="text-xs text-zinc-500 font-mono mt-1">
                        {snapshot.id.substring(0, 12)}...
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleRefresh}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-full hover:text-accent transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-900 pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-accent/10 text-accent border border-accent/30'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              <span className="ml-2 px-2 py-0.5 bg-zinc-800 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-3 bg-black border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-accent placeholder-zinc-700"
        />
      </div>

      {/* Content */}
      <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4">
          <DecorativeDots variant="horizontal" className="opacity-20" />
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'customers' && (
            <CustomersTable 
              customers={customersData?.customers ?? []} 
              isLoading={customersLoading}
            />
          )}
          {activeTab === 'contracts' && (
            <ContractsTable 
              contracts={contractsData?.contracts ?? []} 
              isLoading={contractsLoading}
            />
          )}
          {activeTab === 'invoices' && (
            <InvoicesTable 
              invoices={invoicesData?.invoices ?? []} 
              isLoading={invoicesLoading}
            />
          )}
          {activeTab === 'products' && (
            <ProductsTable 
              products={productsData?.products ?? []} 
              isLoading={productsLoading}
            />
          )}
          {activeTab === 'payments' && (
            <PaymentsTable 
              payments={paymentsData?.payments ?? []} 
              isLoading={paymentsLoading}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ============================================
// Table Components
// ============================================

function CustomersTable({ customers, isLoading }: { customers: Customer[]; isLoading: boolean }) {
  if (isLoading) return <LoadingState />;
  if (customers.length === 0) return <EmptyState entity="customers" />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/50 border-b border-zinc-800">
          <tr>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Name</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Email</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Status</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Source</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">External ID</th>
            <th className="px-6 py-4 text-right text-zinc-500 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900">
          {customers.map((customer, idx) => (
            <motion.tr
              key={customer.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.02 }}
              className="hover:bg-zinc-900/30 transition-colors group"
            >
              <td className="px-6 py-4 text-white font-medium">{customer.name}</td>
              <td className="px-6 py-4 text-zinc-400">{customer.email || '-'}</td>
              <td className="px-6 py-4">
                <StatusBadge status={customer.status} />
              </td>
              <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{customer.sourceSystem}</td>
              <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{customer.externalId.substring(0, 20)}...</td>
              <td className="px-6 py-4 text-right">
                <Link 
                  to={`/data/customers/${customer.id}`}
                  className="opacity-0 group-hover:opacity-100 text-accent hover:underline text-xs flex items-center gap-1 justify-end transition-opacity"
                >
                  View <ExternalLink size={12} />
                </Link>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

function ContractsTable({ contracts, isLoading }: { contracts: Contract[]; isLoading: boolean }) {
  if (isLoading) return <LoadingState />;
  if (contracts.length === 0) return <EmptyState entity="contracts" />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/50 border-b border-zinc-800">
          <tr>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Name</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Status</th>
            <th className="px-6 py-4 text-right text-zinc-500 font-medium">ARR</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Start Date</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">End Date</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Source</th>
            <th className="px-6 py-4 text-right text-zinc-500 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900">
          {contracts.map((contract, idx) => (
            <motion.tr
              key={contract.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.02 }}
              className="hover:bg-zinc-900/30 transition-colors group"
            >
              <td className="px-6 py-4 text-white font-medium">{contract.name || contract.externalId}</td>
              <td className="px-6 py-4">
                <StatusBadge status={contract.status} />
              </td>
              <td className="px-6 py-4 text-right font-mono text-white">
                {contract.arr ? `$${contract.arr.toLocaleString()}` : '-'}
              </td>
              <td className="px-6 py-4 text-zinc-400">{contract.startDate || '-'}</td>
              <td className="px-6 py-4 text-zinc-400">{contract.endDate || '-'}</td>
              <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{contract.sourceSystem}</td>
              <td className="px-6 py-4 text-right">
                <Link 
                  to={`/data/contracts/${contract.id}`}
                  className="opacity-0 group-hover:opacity-100 text-accent hover:underline text-xs flex items-center gap-1 justify-end transition-opacity"
                >
                  View <ExternalLink size={12} />
                </Link>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

function InvoicesTable({ invoices, isLoading }: { invoices: Invoice[]; isLoading: boolean }) {
  if (isLoading) return <LoadingState />;
  if (invoices.length === 0) return <EmptyState entity="invoices" />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/50 border-b border-zinc-800">
          <tr>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Invoice #</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Date</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Status</th>
            <th className="px-6 py-4 text-right text-zinc-500 font-medium">Total</th>
            <th className="px-6 py-4 text-right text-zinc-500 font-medium">Amount Due</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900">
          {invoices.map((invoice, idx) => (
            <motion.tr
              key={invoice.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.02 }}
              className="hover:bg-zinc-900/30 transition-colors"
            >
              <td className="px-6 py-4 text-white font-mono">{invoice.invoiceNumber || invoice.externalId.substring(0, 12)}</td>
              <td className="px-6 py-4 text-zinc-400">{invoice.invoiceDate}</td>
              <td className="px-6 py-4">
                <StatusBadge status={invoice.status} />
              </td>
              <td className="px-6 py-4 text-right font-mono text-white">
                ${invoice.total.toLocaleString()}
              </td>
              <td className="px-6 py-4 text-right font-mono text-accent">
                {invoice.amountDue ? `$${invoice.amountDue.toLocaleString()}` : '-'}
              </td>
              <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{invoice.sourceSystem}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

function ProductsTable({ products, isLoading }: { products: Product[]; isLoading: boolean }) {
  if (isLoading) return <LoadingState />;
  if (products.length === 0) return <EmptyState entity="products" />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/50 border-b border-zinc-800">
          <tr>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Name</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">SKU</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Category</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Status</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Source</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">External ID</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900">
          {products.map((product, idx) => (
            <motion.tr
              key={product.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.02 }}
              className="hover:bg-zinc-900/30 transition-colors"
            >
              <td className="px-6 py-4 text-white font-medium">{product.name}</td>
              <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{product.sku || '-'}</td>
              <td className="px-6 py-4 text-zinc-400">{product.category || '-'}</td>
              <td className="px-6 py-4">
                <StatusBadge status={product.status} />
              </td>
              <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{product.sourceSystem}</td>
              <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{product.externalId.substring(0, 20)}...</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

function PaymentsTable({ payments, isLoading }: { payments: Payment[]; isLoading: boolean }) {
  if (isLoading) return <LoadingState />;
  if (payments.length === 0) return <EmptyState entity="payments" />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/50 border-b border-zinc-800">
          <tr>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Payment ID</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Date</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Method</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Status</th>
            <th className="px-6 py-4 text-right text-zinc-500 font-medium">Amount</th>
            <th className="px-6 py-4 text-left text-zinc-500 font-medium">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900">
          {payments.map((payment, idx) => (
            <motion.tr
              key={payment.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.02 }}
              className="hover:bg-zinc-900/30 transition-colors"
            >
              <td className="px-6 py-4 text-white font-mono text-xs">{payment.externalId.substring(0, 20)}</td>
              <td className="px-6 py-4 text-zinc-400">{payment.paymentDate}</td>
              <td className="px-6 py-4 text-zinc-400 capitalize">{payment.method || '-'}</td>
              <td className="px-6 py-4">
                <StatusBadge status={payment.status} />
              </td>
              <td className="px-6 py-4 text-right font-mono text-white">
                ${payment.amount.toLocaleString()} <span className="text-zinc-500">{payment.currency}</span>
              </td>
              <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{payment.sourceSystem}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
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
    uncollectible: 'border-red-900 text-red-500 bg-red-900/10',
    past_due: 'border-accent/50 text-accent bg-accent/10',
  };

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wide ${colors[status] || colors.inactive}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3 text-zinc-500">
        <RefreshCw size={18} className="animate-spin" />
        <span>Loading data...</span>
      </div>
    </div>
  );
}

function EmptyState({ entity }: { entity: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
      <Database size={32} className="mb-3 opacity-50" />
      <p>No {entity} found in this snapshot.</p>
      <p className="text-sm mt-1">Try triggering a new snapshot from your connected systems.</p>
    </div>
  );
}

