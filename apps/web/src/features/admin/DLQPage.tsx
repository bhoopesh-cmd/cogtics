/**
 * Dead Letter Queue Admin Page (Phase 11)
 * 
 * Displays DLQ entries with filtering, requeue, and discard actions.
 */
import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api/client';

interface DLQEntry {
  id: string;
  original_job_id: string;
  queue_name: string;
  job_type: string;
  error_message: string | null;
  error_stack: string | null;
  attempt_count: number;
  max_attempts: number;
  first_failed_at: string;
  last_failed_at: string;
  status: 'failed' | 'requeued' | 'discarded';
  created_at: string;
}

interface DLQStats {
  total: number;
  failed: number;
  requeued: number;
  discarded: number;
  byQueue: Record<string, number>;
  byType: Record<string, number>;
}

export function DLQPage() {
  const [entries, setEntries] = useState<DLQEntry[]>([]);
  const [stats, setStats] = useState<DLQStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<DLQEntry | null>(null);
  const [filter, setFilter] = useState<{
    status: string;
    queue_name: string;
    job_type: string;
  }>({
    status: 'failed',
    queue_name: '',
    job_type: '',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      if (filter.queue_name) params.set('queue_name', filter.queue_name);
      if (filter.job_type) params.set('job_type', filter.job_type);

      const response = await apiClient.get<{ entries: DLQEntry[] }>(`/admin/dlq?${params.toString()}`, token);
      if (response.ok) {
        setEntries(response.data.entries || []);
      }
    } catch (err) {
      console.error('Failed to fetch DLQ entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiClient.get<DLQStats>('/admin/dlq/stats', token);
      if (response.ok) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch DLQ stats:', err);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchStats();
  }, [filter]);

  const handleRequeue = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await apiClient.post(`/admin/dlq/${id}/requeue`, undefined, token);
      fetchEntries();
      fetchStats();
    } catch (err) {
      console.error('Failed to requeue job:', err);
    }
  };

  const handleDiscard = async (id: string) => {
    if (!confirm('Are you sure you want to discard this job? This action cannot be undone.')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await apiClient.delete(`/admin/dlq/${id}`, token);
      fetchEntries();
      fetchStats();
    } catch (err) {
      console.error('Failed to discard job:', err);
    }
  };

  const handleBulkRequeue = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      const token = localStorage.getItem('token');
      for (const id of selectedIds) {
        await apiClient.post(`/admin/dlq/${id}/requeue`, undefined, token);
      }
      setSelectedIds(new Set());
      fetchEntries();
      fetchStats();
    } catch (err) {
      console.error('Failed to bulk requeue:', err);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map(e => e.id)));
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dead Letter Queue</h1>
        <p className="text-gray-600 mt-1">View and manage failed jobs</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Failed</div>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Requeued</div>
            <div className="text-2xl font-bold text-blue-600">{stats.requeued}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Discarded</div>
            <div className="text-2xl font-bold text-gray-600">{stats.discarded}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4">
          <select
            className="border rounded px-3 py-2"
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="failed">Failed</option>
            <option value="requeued">Requeued</option>
            <option value="discarded">Discarded</option>
          </select>
          <input
            type="text"
            placeholder="Queue name..."
            className="border rounded px-3 py-2"
            value={filter.queue_name}
            onChange={(e) => setFilter({ ...filter, queue_name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Job type..."
            className="border rounded px-3 py-2"
            value={filter.job_type}
            onChange={(e) => setFilter({ ...filter, job_type: e.target.value })}
          />
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkRequeue}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Requeue Selected ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Entries Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No DLQ entries found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === entries.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Queue</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Job Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Error</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Attempts</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Last Failed</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(entry.id)}
                      onChange={() => toggleSelect(entry.id)}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm">{entry.queue_name}</td>
                  <td className="px-4 py-3 text-sm font-mono">{entry.job_type}</td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => setSelectedEntry(entry)}
                      className="text-red-600 hover:underline truncate max-w-xs block"
                    >
                      {entry.error_message || 'Unknown error'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {entry.attempt_count} / {entry.max_attempts}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(entry.last_failed_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        entry.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : entry.status === 'requeued'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {entry.status === 'failed' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRequeue(entry.id)}
                          className="text-blue-600 hover:underline"
                        >
                          Requeue
                        </button>
                        <button
                          onClick={() => handleDiscard(entry.id)}
                          className="text-red-600 hover:underline"
                        >
                          Discard
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Error Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Error Details</h2>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="mb-4">
                <div className="text-sm text-gray-500">Job ID</div>
                <div className="font-mono">{selectedEntry.original_job_id}</div>
              </div>
              <div className="mb-4">
                <div className="text-sm text-gray-500">Queue / Type</div>
                <div>{selectedEntry.queue_name} / {selectedEntry.job_type}</div>
              </div>
              <div className="mb-4">
                <div className="text-sm text-gray-500">Error Message</div>
                <div className="text-red-600">{selectedEntry.error_message}</div>
              </div>
              {selectedEntry.error_stack && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">Stack Trace</div>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
                    {selectedEntry.error_stack}
                  </pre>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              {selectedEntry.status === 'failed' && (
                <>
                  <button
                    onClick={() => {
                      handleRequeue(selectedEntry.id);
                      setSelectedEntry(null);
                    }}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Requeue
                  </button>
                  <button
                    onClick={() => {
                      handleDiscard(selectedEntry.id);
                      setSelectedEntry(null);
                    }}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Discard
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedEntry(null)}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
