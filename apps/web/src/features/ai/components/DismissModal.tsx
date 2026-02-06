import React, { useState } from 'react';
import { X, XCircle } from 'lucide-react';

interface DismissModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => Promise<void>;
  title: string;
  itemType?: 'discovery' | 'recommendation';
}

export function DismissModal({ isOpen, onClose, onConfirm, title, itemType = 'discovery' }: DismissModalProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(notes || undefined);
      onClose();
    } catch (error) {
      console.error('Failed to dismiss:', error);
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
          <XCircle className="text-zinc-500" size={24} />
          <h2 className="text-lg font-semibold text-white">
            Dismiss {itemType === 'discovery' ? 'Discovery' : 'Recommendation'}
          </h2>
        </div>

        <p className="text-sm text-zinc-400 mb-4">
          Dismissing: <span className="text-white">{title}</span>
        </p>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">Reason (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why is this being dismissed? (e.g., false positive, not applicable)"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6500] resize-none"
            rows={3}
          />
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
            className="px-4 py-2 text-sm bg-zinc-600 hover:bg-zinc-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Dismissing...' : 'Dismiss'}
          </button>
        </div>
      </div>
    </div>
  );
}
