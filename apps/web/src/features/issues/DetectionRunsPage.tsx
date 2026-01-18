import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, RefreshCw, CheckCircle, XCircle, Clock, Loader } from 'lucide-react';
import * as api from '@/lib/api/endpoints';
import type { DetectionRun } from '@/lib/api/endpoints';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock size={16} className="text-zinc-400" />,
  running: <Loader size={16} className="text-blue-400 animate-spin" />,
  completed: <CheckCircle size={16} className="text-green-400" />,
  failed: <XCircle size={16} className="text-red-400" />,
  cancelled: <XCircle size={16} className="text-zinc-400" />,
};

export function DetectionRunsPage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<DetectionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [runDetail, setRunDetail] = useState<api.DetectionRunDetail | null>(null);

  useEffect(() => {
    loadRuns();
  }, []);

  async function loadRuns() {
    setLoading(true);
    try {
      const res = await api.listDetectionRuns({ limit: 50 });
      if (!res.ok) {
        console.error('Failed to load runs:', res.error);
        return;
      }
      setRuns(res.data.runs ?? []);
    } catch (err) {
      console.error('Failed to load runs:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadRunDetail(runId: string) {
    try {
      const res = await api.getDetectionRun(runId);
      if (!res.ok) {
        console.error('Failed to load run detail:', res.error);
        return;
      }
      setRunDetail(res.data);
    } catch (err) {
      console.error('Failed to load run detail:', err);
    }
  }

  async function handleReplay(runId: string) {
    try {
      const res = await api.replayDetectionRun(runId);
      if (!res.ok) {
        alert('Failed to start replay: ' + (res.error || 'Unknown error'));
        return;
      }
      alert('Replay started');
      loadRuns();
    } catch (err) {
      console.error('Failed to replay:', err);
    }
  }

  function formatDuration(startedAt: string | null, finishedAt: string | null): string {
    if (!startedAt) return '-';
    const start = new Date(startedAt).getTime();
    const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
    const seconds = Math.round((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
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
          <h1 className="text-2xl font-light text-white">Detection Runs</h1>
          <p className="text-zinc-500">View and manage detection run history</p>
        </div>
        <button 
          onClick={loadRuns}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:text-white"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Runs List */}
        <div className="col-span-2 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff6500]"></div>
            </div>
          ) : (runs?.length ?? 0) === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              No detection runs found.
            </div>
          ) : (
            (runs ?? []).map((run) => (
              <div
                key={run.id}
                onClick={() => { setSelectedRun(run.id); loadRunDetail(run.id); }}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedRun === run.id
                    ? 'bg-zinc-800/50 border-[#ff6500]'
                    : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {STATUS_ICONS[run.status]}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-white">{run.id.slice(0, 16)}...</span>
                        <span className="text-xs text-zinc-500">v{run.rulesetVersion}</span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {run.startedAt ? new Date(run.startedAt).toLocaleString() : 'Not started'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-light text-white">
                      {run.issuesTotal ?? '-'}
                    </div>
                    <div className="text-xs text-zinc-500">issues</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                  <span>Duration: {formatDuration(run.startedAt, run.finishedAt)}</span>
                  {run.issuesBySeverity && (
                    <>
                      <span className="text-red-400">{run.issuesBySeverity.critical || 0} critical</span>
                      <span className="text-orange-400">{run.issuesBySeverity.high || 0} high</span>
                    </>
                  )}
                </div>
                {run.errorMessage && (
                  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                    {run.errorMessage}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Run Detail */}
        <div className="space-y-4">
          {selectedRun && runDetail ? (
            <>
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
                <h3 className="text-sm text-zinc-400 mb-4">Run Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Status</span>
                    <span className="text-white capitalize">{runDetail.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Ruleset</span>
                    <span className="text-white font-mono">{runDetail.rulesetVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total Issues</span>
                    <span className="text-white">{runDetail.issuesTotal ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Duration</span>
                    <span className="text-white">{formatDuration(runDetail.startedAt, runDetail.finishedAt)}</span>
                  </div>
                </div>

                {runDetail.status === 'completed' && (
                  <button
                    onClick={() => handleReplay(runDetail.id)}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-300 hover:text-white"
                  >
                    <RefreshCw size={14} /> Replay Run
                  </button>
                )}
              </div>

              {/* Severity Breakdown */}
              {runDetail.issuesBySeverity && Object.keys(runDetail.issuesBySeverity).length > 0 && (
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
                  <h3 className="text-sm text-zinc-400 mb-4">By Severity</h3>
                  <div className="space-y-2">
                    {Object.entries(runDetail.issuesBySeverity).map(([severity, count]) => (
                      <div key={severity} className="flex justify-between items-center">
                        <span className={`text-sm capitalize ${
                          severity === 'critical' ? 'text-red-400' :
                          severity === 'high' ? 'text-orange-400' :
                          severity === 'medium' ? 'text-yellow-400' :
                          'text-zinc-400'
                        }`}>{severity}</span>
                        <span className="text-white font-mono">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rule Breakdown */}
              {runDetail.ruleBreakdown && Object.keys(runDetail.ruleBreakdown).length > 0 && (
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
                  <h3 className="text-sm text-zinc-400 mb-4">By Rule</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {Object.entries(runDetail.ruleBreakdown)
                      .sort(([,a], [,b]) => b - a)
                      .map(([ruleId, count]) => (
                        <div key={ruleId} className="flex justify-between items-center">
                          <span className="text-sm text-white font-mono">{ruleId}</span>
                          <span className="text-zinc-400">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6 text-center text-zinc-500">
              Select a run to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
