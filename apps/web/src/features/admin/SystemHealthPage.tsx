/**
 * System Health Admin Page (Phase 11)
 * 
 * Displays real-time health status, queue depths, and links to Grafana dashboards.
 */
import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api/client';

interface HealthCheck {
  status: boolean;
  latencyMs?: number;
}

interface QueueInfo {
  depth: number;
  oldestJobAge?: number;
}

interface DetailedHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    storage: HealthCheck;
  };
  queues: Record<string, QueueInfo>;
  dlq: { totalCount: number };
  version: string;
  uptime: number;
  timestamp: string;
}

export function SystemHealthPage() {
  const [health, setHealth] = useState<DetailedHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiClient.get<DetailedHealth>('/health/detailed', token);
      if (response.ok) {
        setHealth(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch health status');
      }
    } catch (err) {
      setError('Failed to fetch health status');
      console.error('Health check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Poll every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCheckColor = (check: HealthCheck) => {
    return check.status ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Loading health status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="text-gray-600 mt-1">Real-time health monitoring</p>
        </div>
        <button
          onClick={fetchHealth}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      {health && (
        <>
          {/* Overall Status */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${getStatusColor(health.status)}`} />
              <div>
                <h2 className="text-xl font-semibold capitalize">{health.status}</h2>
                <div className="text-sm text-gray-500">
                  Version: {health.version} | Uptime: {formatUptime(health.uptime)}
                </div>
              </div>
            </div>
          </div>

          {/* Service Checks */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Database</div>
                  <div className={`font-semibold ${getCheckColor(health.checks.database)}`}>
                    {health.checks.database.status ? 'Connected' : 'Disconnected'}
                  </div>
                </div>
                {health.checks.database.latencyMs !== undefined && (
                  <div className="text-sm text-gray-500">
                    {health.checks.database.latencyMs}ms
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Redis</div>
                  <div className={`font-semibold ${getCheckColor(health.checks.redis)}`}>
                    {health.checks.redis.status ? 'Connected' : 'Disconnected'}
                  </div>
                </div>
                {health.checks.redis.latencyMs !== undefined && (
                  <div className="text-sm text-gray-500">
                    {health.checks.redis.latencyMs}ms
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Storage</div>
                  <div className={`font-semibold ${getCheckColor(health.checks.storage)}`}>
                    {health.checks.storage.status ? 'Available' : 'Unavailable'}
                  </div>
                </div>
                {health.checks.storage.latencyMs !== undefined && (
                  <div className="text-sm text-gray-500">
                    {health.checks.storage.latencyMs}ms
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DLQ Alert */}
          {health.dlq.totalCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-yellow-600 font-semibold">⚠️ Dead Letter Queue</span>
                <span className="text-yellow-700">
                  {health.dlq.totalCount} failed job(s) require attention
                </span>
                <a
                  href="/admin/dlq"
                  className="ml-auto text-yellow-700 underline hover:text-yellow-800"
                >
                  View DLQ →
                </a>
              </div>
            </div>
          )}

          {/* Queue Depths */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Queue Depths</h3>
            {Object.keys(health.queues).length === 0 ? (
              <div className="text-gray-500">No pending jobs</div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(health.queues).map(([queueName, info]) => (
                  <div key={queueName} className="border rounded p-3">
                    <div className="text-sm text-gray-500 truncate" title={queueName}>
                      {queueName}
                    </div>
                    <div className="text-xl font-semibold">{info.depth}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Monitoring Links</h3>
            <div className="grid grid-cols-4 gap-4">
              <a
                href="http://localhost:3001"
                target="_blank"
                rel="noopener noreferrer"
                className="border rounded p-4 text-center hover:bg-gray-50"
              >
                <div className="text-2xl mb-2">📊</div>
                <div className="font-medium">Grafana</div>
                <div className="text-sm text-gray-500">Dashboards</div>
              </a>
              <a
                href="http://localhost:9090"
                target="_blank"
                rel="noopener noreferrer"
                className="border rounded p-4 text-center hover:bg-gray-50"
              >
                <div className="text-2xl mb-2">📈</div>
                <div className="font-medium">Prometheus</div>
                <div className="text-sm text-gray-500">Metrics</div>
              </a>
              <a
                href="/admin/dlq"
                className="border rounded p-4 text-center hover:bg-gray-50"
              >
                <div className="text-2xl mb-2">🔄</div>
                <div className="font-medium">Dead Letter Queue</div>
                <div className="text-sm text-gray-500">Failed Jobs</div>
              </a>
              <a
                href="/admin/jobs"
                className="border rounded p-4 text-center hover:bg-gray-50"
              >
                <div className="text-2xl mb-2">⚙️</div>
                <div className="font-medium">Jobs</div>
                <div className="text-sm text-gray-500">All Jobs</div>
              </a>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-500 text-right">
            Last updated: {new Date(health.timestamp).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}
