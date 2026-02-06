import React, { useState } from 'react';
import { X, ArrowUpCircle } from 'lucide-react';
import type { IssueSeverity } from '@/lib/api/endpoints';

interface PromoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { severity?: IssueSeverity; notes?: string }) => Promise<void>;
  title: string;
  currentSeverity: IssueSeverity;
}

const SEVERITIES: IssueSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];

export function PromoteModal({ isOpen, onClose, onConfirm, title, currentSeverity }: PromoteModalProps) {
  const [severity, setSeverity] = useState<IssueSeverity>(currentSeverity);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm({ severity, notes: notes || undefined });
      onClose();
    } catch (error) {
      console.error('Failed to promote:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <ArrowUpCircle className="text-green-500" size={24} />
          <h2 className="text-lg font-semibold text-white">Promote to Issue</h2>
        </div>

        <p className="text-sm text-zinc-400 mb-4">
          Promoting: <span className="text-white">{title}</span>
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as IssueSeverity)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#ff6500]"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this promotion..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6500] resize-none"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Promoting...' : 'Promote to Issue'}
          </button>
        </div>
      </div>
    </div>
  );
}
