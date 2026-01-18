/**
 * Review Queue Page
 * 
 * Human review interface for low-confidence terms, conflicts,
 * and validation issues requiring manual review.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// Helper to get auth token
function getToken() {
  try {
    return localStorage.getItem('token') || undefined;
  } catch {
    return undefined;
  }
}

// ============================================
// Types
// ============================================

interface ReviewItem {
  id: string;
  itemType: string;
  termId: string | null;
  conflictId: string | null;
  documentId: string | null;
  contractVersionId: string | null;
  bundleId: string | null;
  priority: number;
  status: string;
  assignedTo: string | null;
  resolution: unknown | null;
  resolvedBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

interface ReviewQueueStats {
  reviewQueue: {
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    total: number;
  };
  conflicts: Record<string, number>;
}

interface TermConflict {
  id: string;
  bundleId: string | null;
  contractVersionId: string | null;
  termType: string;
  status: string;
  resolutionMethod: string | null;
  resolvedTermId: string | null;
  appliedRules: string[];
  resolutionReason: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  candidates: ConflictCandidate[];
}

interface ConflictCandidate {
  id: string;
  termId: string;
  documentId: string | null;
  documentName: string | null;
  documentType: string | null;
  precedenceScore: number;
  isWinningTerm: boolean;
  evidence: unknown;
  termType: string;
  value: unknown;
  confidence: number;
  matchedText: string;
}

// ============================================
// API Functions
// ============================================

async function fetchReviewItems(params: { status?: string; itemType?: string }): Promise<{ items: ReviewItem[]; counts: Record<string, number> }> {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.set('status', params.status);
  if (params.itemType) queryParams.set('itemType', params.itemType);
  
  const res = await apiClient.get<{ items: ReviewItem[]; counts: Record<string, number> }>(
    `/contracts/review?${queryParams.toString()}`,
    getToken()
  );
  if (!res.ok) throw new Error(res.error || 'Failed to fetch review items');
  return res.data!;
}

async function fetchReviewStats(): Promise<ReviewQueueStats> {
  const res = await apiClient.get<ReviewQueueStats>('/contracts/review/stats', getToken());
  if (!res.ok) throw new Error(res.error || 'Failed to fetch stats');
  return res.data!;
}

async function fetchConflict(id: string): Promise<TermConflict> {
  const res = await apiClient.get<TermConflict>(`/contracts/conflicts/${id}`, getToken());
  if (!res.ok) throw new Error(res.error || 'Failed to fetch conflict');
  return res.data!;
}

async function resolveReviewItem(id: string, resolution: { action: string; newValue?: unknown; reason?: string }): Promise<void> {
  const res = await apiClient.post(`/contracts/review/${id}/resolve`, { resolution }, getToken());
  if (!res.ok) throw new Error(res.error || 'Failed to resolve item');
}

async function skipReviewItem(id: string): Promise<void> {
  const res = await apiClient.post(`/contracts/review/${id}/skip`, {}, getToken());
  if (!res.ok) throw new Error(res.error || 'Failed to skip item');
}

async function resolveConflict(id: string, winningTermId: string, reason?: string): Promise<void> {
  const res = await apiClient.post(`/contracts/conflicts/${id}/resolve`, { winningTermId, reason }, getToken());
  if (!res.ok) throw new Error(res.error || 'Failed to resolve conflict');
}

// ============================================
// Components
// ============================================

export default function ReviewQueuePage() {
  const [selectedTab, setSelectedTab] = useState<'queue' | 'conflicts'>('queue');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['review-stats'],
    queryFn: fetchReviewStats,
    refetchInterval: 30000,
  });

  const { data: reviewData, isLoading } = useQuery({
    queryKey: ['review-items', statusFilter, typeFilter],
    queryFn: () => fetchReviewItems({ status: statusFilter, itemType: typeFilter || undefined }),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: { action: string; newValue?: unknown; reason?: string } }) =>
      resolveReviewItem(id, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-items'] });
      queryClient.invalidateQueries({ queryKey: ['review-stats'] });
      setSelectedItem(null);
    },
  });

  const skipMutation = useMutation({
    mutationFn: skipReviewItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-items'] });
      queryClient.invalidateQueries({ queryKey: ['review-stats'] });
      setSelectedItem(null);
    },
  });

  const pendingCount = stats?.reviewQueue?.byStatus?.pending ?? 0;
  const conflictCount = stats?.conflicts?.pending ?? 0;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-semibold mb-2">Review Queue</h1>
        <p className="text-zinc-500 mb-8">
          Review and resolve low-confidence extractions and conflicts
        </p>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard title="Pending Review" value={pendingCount} color="yellow" />
          <StatCard title="Conflicts" value={conflictCount} color="red" />
          <StatCard title="In Review" value={stats?.reviewQueue?.byStatus?.in_review ?? 0} color="blue" />
          <StatCard title="Resolved Today" value={stats?.reviewQueue?.byStatus?.resolved ?? 0} color="green" />
        </div>

        {/* Tabs */}
        <div className="border-b border-zinc-800 mb-6">
          <div className="flex gap-8">
            <button
              onClick={() => setSelectedTab('queue')}
              className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === 'queue'
                  ? 'border-white text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Review Queue ({pendingCount})
            </button>
            <button
              onClick={() => setSelectedTab('conflicts')}
              className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === 'conflicts'
                  ? 'border-white text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Term Conflicts ({conflictCount})
            </button>
          </div>
        </div>

        {selectedTab === 'queue' ? (
          <div className="flex gap-8">
            {/* Filters */}
            <div className="w-48 flex-shrink-0">
              <h3 className="text-sm font-medium text-zinc-400 mb-3">Status</h3>
              <div className="space-y-1">
                {['pending', 'in_review', 'resolved', 'skipped', 'escalated'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`w-full text-left px-3 py-2 rounded text-sm ${
                      statusFilter === status
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:bg-zinc-900'
                    }`}
                  >
                    {formatStatus(status)}
                    {stats?.reviewQueue?.byStatus?.[status] !== undefined && (
                      <span className="float-right text-zinc-500">
                        {stats.reviewQueue.byStatus[status]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <h3 className="text-sm font-medium text-zinc-400 mt-6 mb-3">Type</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setTypeFilter('')}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${
                    typeFilter === '' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900'
                  }`}
                >
                  All Types
                </button>
                {['low_confidence_term', 'conflict', 'llm_extraction', 'validation_error'].map(type => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`w-full text-left px-3 py-2 rounded text-sm ${
                      typeFilter === type ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900'
                    }`}
                  >
                    {formatItemType(type)}
                  </button>
                ))}
              </div>
            </div>

            {/* Items List */}
            <div className="flex-1">
              {isLoading ? (
                <div className="text-center py-12 text-zinc-500">Loading...</div>
              ) : reviewData?.items?.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  No items match the current filters
                </div>
              ) : (
                <div className="space-y-2">
                  {reviewData?.items?.map(item => (
                    <ReviewItemCard
                      key={item.id}
                      item={item}
                      isSelected={selectedItem?.id === item.id}
                      onClick={() => setSelectedItem(item)}
                      onResolve={(action) => resolveMutation.mutate({ id: item.id, resolution: { action } })}
                      onSkip={() => skipMutation.mutate(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Detail Panel */}
            {selectedItem && (
              <div className="w-96 flex-shrink-0">
                <ReviewItemDetail
                  item={selectedItem}
                  onClose={() => setSelectedItem(null)}
                  onResolve={(resolution) => resolveMutation.mutate({ id: selectedItem.id, resolution })}
                  onSkip={() => skipMutation.mutate(selectedItem.id)}
                />
              </div>
            )}
          </div>
        ) : (
          <ConflictsList
            selectedConflictId={selectedConflictId}
            onSelectConflict={setSelectedConflictId}
          />
        )}
      </div>
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  const colorClasses = {
    yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    red: 'bg-red-500/10 text-red-500 border-red-500/20',
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    green: 'bg-green-500/10 text-green-500 border-green-500/20',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm opacity-70">{title}</div>
    </div>
  );
}

function ReviewItemCard({
  item,
  isSelected,
  onClick,
  onResolve,
  onSkip,
}: {
  item: ReviewItem;
  isSelected: boolean;
  onClick: () => void;
  onResolve: (action: string) => void;
  onSkip: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? 'bg-zinc-800 border-zinc-600'
          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{formatItemType(item.itemType)}</span>
        <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(item.priority)}`}>
          P{item.priority}
        </span>
      </div>
      <div className="text-sm text-zinc-400 mb-3">
        {item.termId ? `Term: ${item.termId.substring(0, 12)}...` : ''}
        {item.conflictId ? `Conflict: ${item.conflictId.substring(0, 12)}...` : ''}
      </div>
      <div className="flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onResolve('accept'); }}
          className="px-3 py-1 text-xs bg-green-600 hover:bg-green-500 rounded"
        >
          Accept
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSkip(); }}
          className="px-3 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

function ReviewItemDetail({
  item,
  onClose,
  onResolve,
  onSkip,
}: {
  item: ReviewItem;
  onClose: () => void;
  onResolve: (resolution: { action: string; newValue?: unknown; reason?: string }) => void;
  onSkip: () => void;
}) {
  const [reason, setReason] = useState('');

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Review Details</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white">
          ×
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-zinc-500">Type</label>
          <div className="text-white">{formatItemType(item.itemType)}</div>
        </div>

        <div>
          <label className="text-sm text-zinc-500">Priority</label>
          <div className="text-white">{item.priority}</div>
        </div>

        <div>
          <label className="text-sm text-zinc-500">Created</label>
          <div className="text-white">{new Date(item.createdAt).toLocaleString()}</div>
        </div>

        <div>
          <label className="text-sm text-zinc-500 block mb-2">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm"
            rows={3}
            placeholder="Add notes about this resolution..."
          />
        </div>

        <div className="flex gap-2 pt-4">
          <button
            onClick={() => onResolve({ action: 'accept', reason })}
            className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded text-sm"
          >
            Accept
          </button>
          <button
            onClick={() => onResolve({ action: 'reject', reason })}
            className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded text-sm"
          >
            Reject
          </button>
          <button
            onClick={onSkip}
            className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

function ConflictsList({
  selectedConflictId,
  onSelectConflict,
}: {
  selectedConflictId: string | null;
  onSelectConflict: (id: string | null) => void;
}) {
  const queryClient = useQueryClient();

  const { data: conflicts } = useQuery({
    queryKey: ['conflicts'],
    queryFn: async () => {
      const res = await apiClient.get<{ conflicts: TermConflict[] }>('/contracts/conflicts', getToken());
      if (!res.ok) throw new Error(res.error || 'Failed to fetch conflicts');
      return res.data!.conflicts;
    },
  });

  const { data: selectedConflict } = useQuery({
    queryKey: ['conflict', selectedConflictId],
    queryFn: () => selectedConflictId ? fetchConflict(selectedConflictId) : null,
    enabled: !!selectedConflictId,
  });

  const resolveConflictMutation = useMutation({
    mutationFn: ({ id, winningTermId, reason }: { id: string; winningTermId: string; reason?: string }) =>
      resolveConflict(id, winningTermId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['review-stats'] });
      onSelectConflict(null);
    },
  });

  return (
    <div className="flex gap-8">
      <div className="flex-1">
        {conflicts?.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">No conflicts to resolve</div>
        ) : (
          <div className="space-y-2">
            {conflicts?.map(conflict => (
              <div
                key={conflict.id}
                onClick={() => onSelectConflict(conflict.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedConflictId === conflict.id
                    ? 'bg-zinc-800 border-zinc-600'
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{formatTermType(conflict.termType)}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    conflict.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'
                  }`}>
                    {conflict.status}
                  </span>
                </div>
                <div className="text-sm text-zinc-400">
                  {conflict.candidates?.length || 0} conflicting terms
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedConflict && (
        <div className="w-[500px] flex-shrink-0">
          <ConflictDetail
            conflict={selectedConflict}
            onResolve={(winningTermId, reason) => 
              resolveConflictMutation.mutate({ id: selectedConflict.id, winningTermId, reason })
            }
            onClose={() => onSelectConflict(null)}
          />
        </div>
      )}
    </div>
  );
}

function ConflictDetail({
  conflict,
  onResolve,
  onClose,
}: {
  conflict: TermConflict;
  onResolve: (winningTermId: string, reason?: string) => void;
  onClose: () => void;
}) {
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Resolve Conflict</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white">×</button>
      </div>

      <div className="mb-4">
        <div className="text-sm text-zinc-500 mb-1">Term Type</div>
        <div className="text-white font-medium">{formatTermType(conflict.termType)}</div>
      </div>

      <div className="text-sm text-zinc-500 mb-3">Select the winning term:</div>

      <div className="space-y-3 mb-6">
        {conflict.candidates?.map(candidate => (
          <div
            key={candidate.id}
            onClick={() => setSelectedTermId(candidate.termId)}
            className={`p-4 rounded border cursor-pointer transition-colors ${
              selectedTermId === candidate.termId
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">
                {candidate.documentName || 'Unknown Document'}
              </span>
              <span className="text-xs bg-zinc-700 px-2 py-1 rounded">
                {candidate.documentType || 'unknown'}
              </span>
            </div>
            <div className="font-mono text-sm mb-2">
              {JSON.stringify(candidate.value, null, 2).substring(0, 100)}
            </div>
            <div className="text-xs text-zinc-500">
              Confidence: {Math.round(candidate.confidence * 100)}% | 
              Precedence Score: {candidate.precedenceScore}
            </div>
            <div className="text-xs text-zinc-600 mt-2 italic">
              "{candidate.matchedText?.substring(0, 100)}..."
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <label className="text-sm text-zinc-500 block mb-2">Reason (optional)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm"
          rows={2}
          placeholder="Explain why this term was selected..."
        />
      </div>

      <button
        onClick={() => selectedTermId && onResolve(selectedTermId, reason)}
        disabled={!selectedTermId}
        className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded"
      >
        Resolve Conflict
      </button>
    </div>
  );
}

// ============================================
// Helpers
// ============================================

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatItemType(type: string): string {
  const labels: Record<string, string> = {
    'low_confidence_term': 'Low Confidence',
    'conflict': 'Conflict',
    'missing_required_term': 'Missing Term',
    'validation_error': 'Validation Error',
    'llm_extraction': 'LLM Extraction',
    'ocr_required': 'OCR Required',
  };
  return labels[type] || type;
}

function formatTermType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getPriorityColor(priority: number): string {
  if (priority >= 2) return 'bg-red-500/20 text-red-500';
  if (priority >= 1) return 'bg-yellow-500/20 text-yellow-500';
  return 'bg-zinc-700 text-zinc-400';
}
