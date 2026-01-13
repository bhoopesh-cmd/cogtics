import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, Search, CheckCircle, Filter, ChevronRight, 
  Play, RefreshCw, X, Check, FileWarning, DollarSign 
} from 'lucide-react';
import * as api from '@/lib/api/endpoints';
import type { Issue, IssueSummary, IssueStatus, IssueSeverity, IssueCategory } from '@/lib/api/endpoints';

const SEVERITY_COLORS: Record<IssueSeverity, string> = {
  critical: 'text-red-500 bg-red-500/10',
  high: 'text-orange-500 bg-orange-500/10',
  medium: 'text-yellow-500 bg-yellow-500/10',
  low: 'text-blue-500 bg-blue-500/10',
  info: 'text-zinc-400 bg-zinc-500/10',
};

const STATUS_COLORS: Record<IssueStatus, string> = {
  open: 'text-orange-500 border-orange-500',
  acknowledged: 'text-blue-500 border-blue-500',
  resolved: 'text-green-500 border-green-500',
  dismissed: 'text-zinc-500 border-zinc-600',
};

const CATEGORY_LABELS: Record<IssueCategory, string> = {
  data_quality: 'Data Quality',
  billing: 'Billing',
  discount: 'Discount',
  revrec: 'Rev-Rec',
  credits: 'Credits',
  usage: 'Usage',
  lifecycle: 'Lifecycle',
  multi_entity: 'Multi-Entity',
  cross_snapshot: 'Cross-Snapshot',
  tax_fees: 'Tax/Fees',
  fx_currency: 'FX/Currency',
};

export function IssuesPage() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [summary, setSummary] = useState<IssueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<IssueStatus | ''>('');
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, [page, statusFilter, severityFilter, categoryFilter]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [issuesRes, summaryRes] = await Promise.all([
        api.listIssues({
          status: statusFilter || undefined,
          severity: severityFilter || undefined,
          category: categoryFilter || undefined,
          search: searchTerm || undefined,
          page,
          pageSize: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }),
        api.getIssueSummary(),
      ]);
      
      // Handle API response format { ok, status, data }
      if (!issuesRes.ok) {
        throw new Error(issuesRes.error || 'Failed to load issues');
      }
      if (!summaryRes.ok) {
        throw new Error(summaryRes.error || 'Failed to load issue summary');
      }
      
      setIssues(issuesRes.data.issues);
      setTotalPages(issuesRes.data.totalPages);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('Failed to load issues:', err);
      setError(err instanceof Error ? err.message : 'Failed to load issues. The database tables may not exist yet. Please run migrations.');
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkStatusUpdate(status: IssueStatus) {
    if (selectedIds.size === 0) return;
    
    try {
      const res = await api.bulkUpdateIssueStatus(Array.from(selectedIds), status);
      if (!res.ok) {
        alert('Failed to update issues: ' + (res.error || 'Unknown error'));
        return;
      }
      setSelectedIds(new Set());
      loadData();
    } catch (err) {
      console.error('Failed to update issues:', err);
    }
  }

  async function handleRunDetection() {
    try {
      const snapshotsRes = await api.listSnapshots({ limit: 1, status: 'complete' });
      if (!snapshotsRes.ok || !snapshotsRes.data.snapshots || snapshotsRes.data.snapshots.length === 0) {
        alert('No completed snapshots available');
        return;
      }
      
      const runRes = await api.triggerDetectionRun(snapshotsRes.data.snapshots[0].id);
      if (!runRes.ok) {
        alert('Failed to start detection: ' + (runRes.error || 'Unknown error'));
        return;
      }
      alert('Detection run started');
    } catch (err) {
      console.error('Failed to start detection:', err);
      alert('Failed to start detection: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }

  function toggleSelectAll() {
    if (selectedIds.size === (issues?.length ?? 0)) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set((issues ?? []).map(i => i.id)));
    }
  }

  const openCount = summary?.byStatus?.open ?? 0;

  // Show loading spinner
  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6500] mb-4"></div>
        <p className="text-zinc-500">Loading issues...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <AlertTriangle size={48} className="text-orange-500 mb-4" />
        <h2 className="text-xl font-medium text-white mb-2">Unable to Load Issues</h2>
        <p className="text-zinc-500 text-center max-w-md mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-white transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-900 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-light text-white tracking-tight">Issues & Risk</h1>
            <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">
              {openCount} Open
            </span>
          </div>
          <p className="text-zinc-500 mt-2">
            Investigate discrepancies across Contracts, Billing, and Usage.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleRunDetection}
            className="flex items-center gap-2 px-4 py-2 bg-[#ff6500] rounded-lg text-sm text-black font-medium hover:bg-[#ff6500]/90 transition-colors"
          >
            <Play size={16} /> Run Detection
          </button>
          <button 
            onClick={() => navigate('/issues/runs')}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
          >
            <RefreshCw size={16} /> View Runs
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
          >
            <Filter size={16} /> Filter
          </button>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadData()}
              className="pl-9 pr-4 py-2 bg-black border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-[#ff6500] w-64 placeholder-zinc-700"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex gap-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as IssueStatus)}
            className="px-3 py-2 bg-black border border-zinc-700 rounded text-sm text-white"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as IssueSeverity)}
            className="px-3 py-2 bg-black border border-zinc-700 rounded text-sm text-white"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as IssueCategory)}
            className="px-3 py-2 bg-black border border-zinc-700 rounded text-sm text-white"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button 
            onClick={() => { setStatusFilter(''); setSeverityFilter(''); setCategoryFilter(''); }}
            className="text-zinc-400 hover:text-white text-sm"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-5 gap-4">
          <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
            <div className="text-2xl font-light text-white">{summary.totalCount}</div>
            <div className="text-xs text-zinc-500 uppercase">Total Issues</div>
          </div>
          <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
            <div className="text-2xl font-light text-orange-500">{summary.byStatus?.open || 0}</div>
            <div className="text-xs text-zinc-500 uppercase">Open</div>
          </div>
          <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
            <div className="text-2xl font-light text-red-500">{summary.bySeverity?.critical || 0}</div>
            <div className="text-xs text-zinc-500 uppercase">Critical</div>
          </div>
          <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
            <div className="text-2xl font-light text-white">${(summary.totalImpact || 0).toLocaleString()}</div>
            <div className="text-xs text-zinc-500 uppercase">Total Impact</div>
          </div>
          <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
            <div className="text-2xl font-light text-white">{((summary.avgConfidence || 0) * 100).toFixed(0)}%</div>
            <div className="text-xs text-zinc-500 uppercase">Avg Confidence</div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-zinc-800 rounded-lg">
          <span className="text-sm text-zinc-300">{selectedIds.size} selected</span>
          <button 
            onClick={() => handleBulkStatusUpdate('resolved')}
            className="flex items-center gap-1 px-3 py-1 bg-green-600 rounded text-sm text-white hover:bg-green-500"
          >
            <Check size={14} /> Resolve
          </button>
          <button 
            onClick={() => handleBulkStatusUpdate('dismissed')}
            className="flex items-center gap-1 px-3 py-1 bg-zinc-600 rounded text-sm text-white hover:bg-zinc-500"
          >
            <X size={14} /> Dismiss
          </button>
          <button 
            onClick={() => handleBulkStatusUpdate('acknowledged')}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 rounded text-sm text-white hover:bg-blue-500"
          >
            <FileWarning size={14} /> Acknowledge
          </button>
          <button 
            onClick={() => setSelectedIds(new Set())}
            className="text-zinc-400 hover:text-white text-sm ml-auto"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Issues List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff6500]"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(issues?.length ?? 0) === 0 ? (
            <div className="text-center py-12">
              <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Issues Found</h3>
              <p className="text-zinc-500 max-w-md mx-auto">
                {statusFilter || severityFilter || categoryFilter 
                  ? 'No issues match your filters. Try adjusting them or clearing all filters.'
                  : 'Great news! No discrepancies have been detected. Run a detection scan to analyze your data.'}
              </p>
              {!(statusFilter || severityFilter || categoryFilter) && (
                <button
                  onClick={handleRunDetection}
                  className="mt-4 px-4 py-2 bg-[#ff6500] rounded text-sm text-black font-medium hover:bg-[#ff6500]/90 transition-colors"
                >
                  Run Detection
                </button>
              )}
            </div>
          ) : (
            (issues ?? []).map((issue, idx) => (
              <motion.div
                key={issue.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`group border rounded-lg p-5 transition-all duration-300 cursor-pointer relative overflow-hidden ${
                  issue.status === 'dismissed'
                    ? 'bg-zinc-950/30 border-zinc-900 opacity-60'
                    : 'bg-zinc-900/20 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/40'
                }`}
              >
                {/* Left Accent Bar */}
                {issue.status !== 'dismissed' && (
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    issue.severity === 'critical' ? 'bg-red-500' :
                    issue.severity === 'high' ? 'bg-orange-500' :
                    issue.severity === 'medium' ? 'bg-yellow-500' : 'bg-zinc-600'
                  }`} />
                )}

                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div className="mt-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(issue.id)}
                        onChange={() => toggleSelect(issue.id)}
                        className="w-4 h-4 rounded border-zinc-600 bg-transparent"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    
                    {/* Icon */}
                    <div className="mt-1">
                      <div className={`p-2 rounded ${SEVERITY_COLORS[issue.severity]}`}>
                        <AlertTriangle size={18} />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div onClick={() => navigate(`/issues/${issue.id}`)}>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-xs text-zinc-500">{issue.ruleId}</span>
                        <span className={`text-[10px] uppercase border px-1.5 rounded ${STATUS_COLORS[issue.status]}`}>
                          {issue.status}
                        </span>
                        <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-400">
                          {CATEGORY_LABELS[issue.category] || issue.category}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-sm max-w-2xl">
                        {issue.expected && issue.actual ? (
                          <>Expected: {JSON.stringify(issue.expected).slice(0, 50)}... | Actual: {JSON.stringify(issue.actual).slice(0, 50)}...</>
                        ) : (
                          `Rule ${issue.ruleId} detected an issue`
                        )}
                      </p>
                      <div className="flex items-center gap-6 mt-3 text-xs font-mono text-zinc-500">
                        {issue.contractId && <span>Contract: {issue.contractId.slice(0, 16)}...</span>}
                        {issue.invoiceId && <span>Invoice: {issue.invoiceId.slice(0, 16)}...</span>}
                        <span className={issue.confidence > 0.9 ? 'text-[#ff6500]' : ''}>
                          Confidence: {(issue.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right" onClick={() => navigate(`/issues/${issue.id}`)}>
                    {issue.impactAmount && (
                      <>
                        <div className="text-xl font-light text-white tracking-tight">
                          ${issue.impactAmount.toLocaleString()}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">
                          Est. Impact
                        </div>
                      </>
                    )}
                    <button className="mt-4 flex items-center gap-1 text-[#ff6500] text-sm hover:underline opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                      View Details <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 bg-zinc-800 rounded text-sm text-zinc-300 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-zinc-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 bg-zinc-800 rounded text-sm text-zinc-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
