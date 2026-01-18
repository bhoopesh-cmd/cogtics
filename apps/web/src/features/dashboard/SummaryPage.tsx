import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle, TrendingUp, DollarSign, Users, FileText, Database } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DecorativeDots from '@/components/ui/DecorativeDots';
import { getSummaryStats, getLatestSnapshot, listInvoices, listContracts, type SummaryStats } from '@/lib/api/endpoints';

// Helper to format currency
function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

// Helper to format relative time
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// KPI card component
interface KPICardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  highlight?: boolean;
  delay: number;
  isLoading?: boolean;
}

function KPICard({ label, value, subValue, icon, trend, highlight, delay, isLoading }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`p-6 rounded-xl border ${
        highlight ? 'bg-zinc-900/80 border-[#ff6500]/30' : 'bg-black border-zinc-900'
      } relative overflow-hidden group`}
    >
      {highlight && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-[#ff6500]/10 blur-xl rounded-full -mr-8 -mt-8" />
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-zinc-500 text-sm font-medium">{label}</h3>
        <div className={`p-2 rounded-lg ${highlight ? 'bg-[#ff6500]/10 text-[#ff6500]' : 'bg-zinc-900 text-zinc-400'}`}>
          {icon}
        </div>
      </div>

      {isLoading ? (
        <div className="h-8 bg-zinc-800 animate-pulse rounded w-24" />
      ) : (
        <div className="flex items-baseline justify-between">
          <span
            className={`text-3xl font-light tracking-tight ${
              highlight ? 'text-white' : 'text-zinc-200'
            }`}
          >
            {value}
          </span>
          {trend && (
            <div
              className={`flex items-center text-xs font-mono ${
                trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-[#ff6500]' : 'text-zinc-500'
              }`}
            >
              {trend === 'up' ? <ArrowUpRight size={14} /> : trend === 'down' ? <ArrowDownRight size={14} /> : null}
              {subValue}
            </div>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="mt-6 h-1 w-full bg-zinc-800/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: isLoading ? '0%' : '60%' }}
          transition={{ duration: 1, delay: delay + 0.3 }}
          className={`h-full rounded-full ${highlight ? 'bg-[#ff6500]' : 'bg-zinc-600'}`}
        />
      </div>
    </motion.div>
  );
}

// Empty state component
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="col-span-full flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800 mb-6">
        <Database size={32} className="text-zinc-500" />
      </div>
      <h3 className="text-xl font-light text-white mb-2">No Data Available</h3>
      <p className="text-zinc-500 max-w-md mb-6">
        Connect an integration and run a sync to see your revenue data here.
      </p>
      <a
        href="/settings/integrations"
        className="px-4 py-2 bg-[#ff6500] text-white rounded-lg text-sm font-medium hover:bg-[#ff6500]/80 transition-colors"
      >
        Connect Integration
      </a>
    </motion.div>
  );
}

export function SummaryPage() {
  const queryClient = useQueryClient();

  // Fetch summary stats from API
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['summary-stats'],
    queryFn: async () => {
      const res = await getSummaryStats();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    staleTime: 30000, // 30 seconds
  });

  // Fetch latest snapshot info
  const { data: latestSnapshot, isLoading: snapshotLoading } = useQuery({
    queryKey: ['latest-snapshot'],
    queryFn: async () => {
      const res = await getLatestSnapshot();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    staleTime: 30000,
    retry: false, // Don't retry if no snapshot
  });

  // Fetch recent invoices for the chart
  const { data: invoicesData } = useQuery({
    queryKey: ['recent-invoices'],
    queryFn: async () => {
      const res = await listInvoices({ limit: 12 });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!stats,
    staleTime: 30000,
  });

  // Fetch recent contracts for simulations
  const { data: contractsData } = useQuery({
    queryKey: ['recent-contracts'],
    queryFn: async () => {
      const res = await listContracts({ limit: 5, status: 'active' });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!stats,
    staleTime: 30000,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['summary-stats'] });
    queryClient.invalidateQueries({ queryKey: ['latest-snapshot'] });
    queryClient.invalidateQueries({ queryKey: ['recent-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['recent-contracts'] });
    refetchStats();
  };

  const isLoading = statsLoading || snapshotLoading;
  const hasData = stats && stats.totalCustomers > 0;
  const isNoSnapshot = statsError && !hasData;

  // Generate chart data from invoices (monthly totals)
  const chartData = React.useMemo(() => {
    if (!invoicesData?.invoices?.length) {
      // Fallback to placeholder data when no invoices
      return [40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 65];
    }
    
    // Group invoices by month and sum totals
    const monthlyTotals: number[] = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthTotal = invoicesData.invoices
        .filter(inv => {
          const date = new Date(inv.invoiceDate);
          return date >= monthStart && date <= monthEnd;
        })
        .reduce((sum, inv) => sum + (inv.total || 0), 0);
      
      monthlyTotals.push(monthTotal);
    }
    
    // Normalize to percentages for display
    const max = Math.max(...monthlyTotals, 1);
    return monthlyTotals.map(v => Math.max(10, (v / max) * 100));
  }, [invoicesData]);

  // Get month labels
  const monthLabels = React.useMemo(() => {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const now = new Date();
    const labels: string[] = [];
    for (let i = 11; i >= 0; i -= 3) {
      const monthIndex = (now.getMonth() - i + 12) % 12;
      labels.push(months[monthIndex]);
    }
    return labels;
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-white tracking-tight">Executive Summary</h1>
          <p className="text-zinc-500 mt-2">Revenue integrity snapshot and high-impact risk signals.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-500">
            {latestSnapshot ? `Last synced: ${formatRelativeTime(latestSnapshot.completedAt)}` : 'No sync data'}
          </span>
          <button 
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-full hover:text-[#ff6500] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* No snapshot state */}
      {isNoSnapshot ? (
        <EmptyState />
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              label="Total ARR"
              value={formatCurrency(stats?.totalArr ?? 0)}
              subValue={`${stats?.activeContracts ?? 0} active`}
              icon={<DollarSign size={18} />}
              highlight
              delay={0}
              isLoading={isLoading}
            />
            <KPICard
              label="Active Customers"
              value={String(stats?.activeCustomers ?? 0)}
              subValue={`of ${stats?.totalCustomers ?? 0} total`}
              icon={<Users size={18} />}
              delay={0.1}
              isLoading={isLoading}
            />
            <KPICard
              label="Open Invoices"
              value={String(stats?.openInvoices ?? 0)}
              subValue={formatCurrency(stats?.amountDue ?? 0)}
              icon={<FileText size={18} />}
              trend={stats?.openInvoices && stats.openInvoices > 0 ? 'down' : 'neutral'}
              delay={0.2}
              isLoading={isLoading}
            />
            <KPICard
              label="Total Revenue"
              value={formatCurrency(stats?.totalRevenue ?? 0)}
              subValue={`${stats?.totalInvoices ?? 0} invoices`}
              icon={<TrendingUp size={18} />}
              trend="up"
              delay={0.3}
              isLoading={isLoading}
            />
          </div>

          {/* Main Chart Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
            {/* Chart */}
            <div className="lg:col-span-2 bg-black border border-zinc-900 rounded-xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8">
                <DecorativeDots variant="horizontal" className="opacity-30" />
              </div>
              <h3 className="text-lg font-light text-white mb-6">Revenue Trend</h3>
              <div className="flex items-end justify-between h-64 gap-2 px-4 border-b border-zinc-800/50 pb-4">
                {chartData.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 1, delay: i * 0.05 }}
                    className={`w-full rounded-t-sm ${
                      i === chartData.length - 1 ? 'bg-[#ff6500] opacity-80' : 'bg-zinc-800 hover:bg-zinc-700'
                    } transition-colors relative group cursor-pointer`}
                  >
                    {i === chartData.length - 1 && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 border border-[#ff6500]/50 text-[#ff6500] text-xs px-2 py-1 rounded whitespace-nowrap">
                        Current
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-xs font-mono text-zinc-600">
                {monthLabels.map((label, i) => (
                  <span key={i}>{label}</span>
                ))}
              </div>
            </div>

            {/* Insights Panel */}
            <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-light text-white mb-2">Quick Insights</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {hasData 
                    ? `Tracking ${stats?.totalCustomers ?? 0} customers with ${stats?.activeContracts ?? 0} active contracts.`
                    : 'Connect your data sources to see insights here.'}
                </p>
              </div>

              <div className="space-y-3">
                {contractsData?.contracts?.slice(0, 2).map((contract, idx) => (
                  <motion.a
                    key={contract.id}
                    href="/contracts"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                    className="p-3 border border-zinc-800 bg-black/50 rounded-lg hover:border-[#ff6500]/50 cursor-pointer transition-colors group block"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-mono ${idx === 0 ? 'text-[#ff6500]' : 'text-zinc-500'}`}>
                        {contract.status?.toUpperCase() ?? 'CONTRACT'}
                      </span>
                      <ArrowUpRight
                        size={12}
                        className="text-zinc-600 group-hover:text-[#ff6500] transition-colors"
                      />
                    </div>
                    <div className="text-sm text-zinc-300 truncate">{contract.name || contract.externalId}</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {contract.arr ? `ARR: ${formatCurrency(contract.arr)}` : 'No ARR data'}
                    </div>
                  </motion.a>
                ))}

                {(!contractsData?.contracts?.length) && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                      className="p-3 border border-zinc-800 bg-black/50 rounded-lg hover:border-[#ff6500]/50 cursor-pointer transition-colors group"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-[#ff6500] font-mono">SUGGESTED</span>
                        <ArrowUpRight
                          size={12}
                          className="text-zinc-600 group-hover:text-[#ff6500] transition-colors"
                        />
                      </div>
                      <div className="text-sm text-zinc-300">Connect Stripe</div>
                      <div className="text-xs text-zinc-500 mt-1">Import billing data</div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                      className="p-3 border border-zinc-800 bg-black/50 rounded-lg hover:border-[#ff6500]/50 cursor-pointer transition-colors group"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-zinc-500 font-mono">OPTIONAL</span>
                        <ArrowUpRight
                          size={12}
                          className="text-zinc-600 group-hover:text-[#ff6500] transition-colors"
                        />
                      </div>
                      <div className="text-sm text-zinc-300">Connect Salesforce</div>
                      <div className="text-xs text-zinc-500 mt-1">Import CRM data</div>
                    </motion.div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Snapshot Status Banner */}
          {latestSnapshot && latestSnapshot.status !== 'complete' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 p-4 rounded-xl border border-[#ff6500]/30 bg-[#ff6500]/5"
            >
              <div className="p-2 rounded-lg bg-[#ff6500]/10">
                <AlertCircle size={20} className="text-[#ff6500]" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-white">Data sync in progress</p>
                <p className="text-xs text-zinc-500">
                  Status: {latestSnapshot.status} • Started: {formatRelativeTime(latestSnapshot.startedAt)}
                </p>
              </div>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 text-sm text-[#ff6500] border border-[#ff6500]/30 rounded-lg hover:bg-[#ff6500]/10 transition-colors"
              >
                Refresh
              </button>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
