import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ScrollText, User, Clock } from 'lucide-react';
import { listAuditLogs, type AuditLog } from '@/lib/api/endpoints';

export function AuditPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['audit'],
    queryFn: async () => {
      const res = await listAuditLogs(100);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const logs = data?.logs ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light text-white tracking-tight">Audit Log</h1>
        <p className="text-zinc-500 mt-2">
          Immutable record of all system actions and changes.
        </p>
      </div>

      {isLoading && <div className="text-zinc-500">Loading audit logs...</div>}
      {error && <div className="text-red-400">Error loading audit logs</div>}

      {logs.length === 0 && !isLoading && (
        <div className="p-6 bg-zinc-900/20 border border-zinc-800 rounded-lg text-center text-zinc-500">
          No audit logs found.
        </div>
      )}

      {logs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-zinc-800 rounded-lg overflow-hidden"
        >
          {logs.map((log, idx) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.02 }}
              className="flex items-start gap-4 p-4 border-b border-zinc-800 last:border-0 hover:bg-zinc-900/30 transition-colors"
            >
              <div className="p-2 bg-zinc-900 rounded text-zinc-500 mt-0.5">
                <ScrollText size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-medium text-white">{log.action}</span>
                  {log.resource && (
                    <span className="text-xs text-zinc-500 font-mono truncate max-w-xs">
                      {log.resource}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <User size={10} />
                    {log.actorUserId || 'System'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
