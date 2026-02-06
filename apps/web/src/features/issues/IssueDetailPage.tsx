import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, AlertTriangle, CheckCircle, X, Clock, 
  FileText, Database, ChevronRight, ExternalLink 
} from 'lucide-react';
import * as api from '@/lib/api/endpoints';
import type { IssueDetail, IssueStatus } from '@/lib/api/endpoints';
import { EvidencePanel } from './EvidencePanel';
import { AIAnalysisPanel } from './AIAnalysisPanel';
import { RecommendationsPanel } from './RecommendationsPanel';

const STATUS_ACTIONS: { status: IssueStatus; label: string; color: string }[] = [
  { status: 'acknowledged', label: 'Acknowledge', color: 'bg-blue-600 hover:bg-blue-500' },
  { status: 'resolved', label: 'Resolve', color: 'bg-green-600 hover:bg-green-500' },
  { status: 'dismissed', label: 'Dismiss', color: 'bg-zinc-600 hover:bg-zinc-500' },
];

export function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<IssueStatus | null>(null);

  useEffect(() => {
    if (id) loadIssue();
  }, [id]);

  async function loadIssue() {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.getIssue(id);
      if (!res.ok) throw new Error(res.error);
      setIssue(res.data);
    } catch (err) {
      console.error('Failed to load issue:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(status: IssueStatus) {
    if (!id) return;
    
    try {
      const res = await api.updateIssueStatus(id, status, reason || undefined);
      if (!res.ok) throw new Error(res.error);
      setShowReasonInput(false);
      setReason('');
      setPendingStatus(null);
      loadIssue();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  }

  function initiateStatusChange(status: IssueStatus) {
    setPendingStatus(status);
    setShowReasonInput(true);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff6500]"></div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="text-center py-12 text-zinc-500">
        Issue not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-zinc-900 pb-6">
        <button 
          onClick={() => navigate('/issues')}
          className="p-2 hover:bg-zinc-800 rounded transition-colors"
        >
          <ArrowLeft size={20} className="text-zinc-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg text-white">{issue.ruleId}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              issue.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
              issue.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
              issue.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-zinc-500/20 text-zinc-400'
            }`}>
              {issue.severity.toUpperCase()}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs border ${
              issue.status === 'open' ? 'border-orange-500 text-orange-400' :
              issue.status === 'resolved' ? 'border-green-500 text-green-400' :
              issue.status === 'dismissed' ? 'border-zinc-600 text-zinc-400' :
              'border-blue-500 text-blue-400'
            }`}>
              {issue.status.toUpperCase()}
            </span>
          </div>
          <p className="text-zinc-500 mt-1">Issue Key: {issue.issueKey}</p>
        </div>
        
        {/* Status Actions */}
        {issue.status !== 'resolved' && issue.status !== 'dismissed' && (
          <div className="flex gap-2">
            {STATUS_ACTIONS.filter(a => a.status !== issue.status).map(action => (
              <button
                key={action.status}
                onClick={() => initiateStatusChange(action.status)}
                className={`px-4 py-2 rounded-lg text-sm text-white ${action.color}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reason Input Modal */}
      {showReasonInput && pendingStatus && (
        <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
          <label className="block text-sm text-zinc-400 mb-2">
            Reason for status change (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-3 bg-black border border-zinc-700 rounded text-white text-sm resize-none"
            rows={2}
            placeholder="Enter reason..."
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleStatusUpdate(pendingStatus)}
              className="px-4 py-2 bg-[#ff6500] rounded text-sm text-black font-medium"
            >
              Confirm {pendingStatus}
            </button>
            <button
              onClick={() => { setShowReasonInput(false); setPendingStatus(null); }}
              className="px-4 py-2 bg-zinc-700 rounded text-sm text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="col-span-2 space-y-6">
          {/* Expected vs Actual */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-4">Expected vs Actual</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm text-zinc-400 mb-2">Expected</h4>
                <pre className="p-3 bg-black rounded text-sm text-green-400 overflow-auto max-h-48">
                  {JSON.stringify(issue.expected, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="text-sm text-zinc-400 mb-2">Actual</h4>
                <pre className="p-3 bg-black rounded text-sm text-red-400 overflow-auto max-h-48">
                  {JSON.stringify(issue.actual, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          {/* Sources */}
          {issue.sources && issue.sources.length > 0 && (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">Evidence Sources</h3>
              <div className="space-y-3">
                {issue.sources.map((source) => (
                  <div 
                    key={source.id}
                    className="flex items-center justify-between p-3 bg-black/50 rounded border border-zinc-800"
                  >
                    <div className="flex items-center gap-3">
                      <Database size={16} className="text-zinc-500" />
                      <div>
                        <span className="text-sm text-white capitalize">{source.sourceType}</span>
                        {source.fieldName && (
                          <span className="text-zinc-500 text-xs ml-2">
                            → {source.fieldName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs font-mono text-zinc-400">
                      {source.sourceId.slice(0, 24)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status History */}
          {issue.history && issue.history.length > 0 && (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">Status History</h3>
              <div className="space-y-3">
                {issue.history.map((entry, idx) => (
                  <div 
                    key={entry.id}
                    className="flex items-start gap-3 pl-4 border-l-2 border-zinc-700"
                  >
                    <Clock size={14} className="text-zinc-500 mt-1" />
                    <div>
                      <div className="text-sm text-white">
                        {entry.fromStatus} → {entry.toStatus}
                      </div>
                      {entry.reason && (
                        <p className="text-xs text-zinc-500 mt-1">{entry.reason}</p>
                      )}
                      <p className="text-xs text-zinc-600 mt-1">
                        {new Date(entry.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis Panel */}
          <AIAnalysisPanel analysis={(issue as any).aiAnalysis || null} />

          {/* AI Recommendations Panel */}
          <RecommendationsPanel issueId={issue.id} />

          {/* Phase 8: Evidence Pack */}
          <EvidencePanel issueId={issue.id} isAdmin={true} />
        </div>

        {/* Right Column - Metadata */}
        <div className="space-y-6">
          {/* Impact */}
          {issue.impactAmount !== null && (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
              <h3 className="text-sm text-zinc-400 mb-2">Estimated Impact</h3>
              <div className="text-3xl font-light text-white">
                ${issue.impactAmount.toLocaleString()}
                <span className="text-sm text-zinc-500 ml-2">{issue.currency}</span>
              </div>
            </div>
          )}

          {/* Confidence */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-sm text-zinc-400 mb-2">Confidence Score</h3>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-light text-white">
                {(issue.confidence * 100).toFixed(0)}%
              </div>
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#ff6500]"
                  style={{ width: `${issue.confidence * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Related Entities */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-sm text-zinc-400 mb-4">Related Entities</h3>
            <div className="space-y-3">
              {issue.contractId && (
                <Link 
                  to={`/data/contracts/${issue.contractId}`}
                  className="flex items-center justify-between p-2 hover:bg-zinc-800 rounded transition-colors"
                >
                  <span className="text-sm text-white">Contract</span>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    {issue.contractId.slice(0, 12)}...
                    <ExternalLink size={12} />
                  </div>
                </Link>
              )}
              {issue.invoiceId && (
                <Link 
                  to={`/data/invoices/${issue.invoiceId}`}
                  className="flex items-center justify-between p-2 hover:bg-zinc-800 rounded transition-colors"
                >
                  <span className="text-sm text-white">Invoice</span>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    {issue.invoiceId.slice(0, 12)}...
                    <ExternalLink size={12} />
                  </div>
                </Link>
              )}
              {issue.customerId && (
                <Link 
                  to={`/data/customers/${issue.customerId}`}
                  className="flex items-center justify-between p-2 hover:bg-zinc-800 rounded transition-colors"
                >
                  <span className="text-sm text-white">Customer</span>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    {issue.customerId.slice(0, 12)}...
                    <ExternalLink size={12} />
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* Data Quality Flags */}
          {issue.dataQualityFlags && issue.dataQualityFlags.length > 0 && (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
              <h3 className="text-sm text-zinc-400 mb-4">Data Quality Flags</h3>
              <div className="flex flex-wrap gap-2">
                {issue.dataQualityFlags.map((flag, idx) => (
                  <span 
                    key={idx}
                    className="px-2 py-1 bg-yellow-500/10 text-yellow-500 text-xs rounded"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-sm text-zinc-400 mb-4">Metadata</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Rule Version</span>
                <span className="text-white font-mono">{issue.ruleVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Category</span>
                <span className="text-white">{issue.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Created</span>
                <span className="text-white">{new Date(issue.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Updated</span>
                <span className="text-white">{new Date(issue.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
