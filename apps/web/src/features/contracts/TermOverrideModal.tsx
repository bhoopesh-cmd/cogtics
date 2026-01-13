import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { overrideContractTerm, removeContractTermOverride } from '@/lib/api/endpoints';

interface TermOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  term: any;
  contractId: string;
  onSuccess: () => void;
}

const TERM_TYPE_LABELS: Record<string, string> = {
  pricing_model: 'Pricing Model',
  billing_cadence: 'Billing Cadence',
  discount: 'Discount',
  renewal_terms: 'Renewal Terms',
  termination_terms: 'Termination Terms',
  usage_caps: 'Usage Caps',
  payment_terms: 'Payment Terms',
  uplift: 'Price Uplift',
  auto_renew: 'Auto Renew',
  notice_period: 'Notice Period',
  contract_value: 'Contract Value',
  start_date: 'Start Date',
  end_date: 'End Date',
  term_length: 'Term Length',
};

export function TermOverrideModal({
  isOpen,
  onClose,
  term,
  contractId,
  onSuccess,
}: TermOverrideModalProps) {
  const [overrideValue, setOverrideValue] = useState('');
  const [reason, setReason] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  // Reset form when term changes
  useEffect(() => {
    if (term) {
      setOverrideValue(JSON.stringify(term.isOverridden ? term.value : term.originalValue ?? term.value, null, 2));
      setReason('');
      setParseError(null);
    }
  }, [term]);

  const overrideMutation = useMutation({
    mutationFn: async () => {
      let parsedValue: any;
      try {
        parsedValue = JSON.parse(overrideValue);
      } catch {
        throw new Error('Invalid JSON value');
      }

      const res = await overrideContractTerm(contractId, term.id, parsedValue, reason || undefined);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const res = await removeContractTermOverride(contractId, term.id);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParseError(null);

    try {
      JSON.parse(overrideValue);
    } catch {
      setParseError('Invalid JSON format');
      return;
    }

    overrideMutation.mutate();
  };

  if (!term) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div
              className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <div>
                  <h2 className="text-lg font-medium">Override Term Value</h2>
                  <p className="text-sm text-zinc-500">
                    {TERM_TYPE_LABELS[term.termType] || term.termType}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* Current Value */}
                <div>
                  <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">
                    Current Extracted Value
                  </label>
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-sm font-mono text-zinc-400 max-h-24 overflow-y-auto">
                    {JSON.stringify(term.originalValue ?? term.value, null, 2)}
                  </div>
                </div>

                {/* Confidence */}
                <div className="flex items-center gap-4 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="text-xs text-zinc-500">
                    <span className="uppercase tracking-wider">Confidence:</span>{' '}
                    <span className={
                      term.confidence >= 80 ? 'text-green-400' :
                      term.confidence >= 50 ? 'text-yellow-400' :
                      'text-red-400'
                    }>
                      {term.confidence}%
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    <span className="uppercase tracking-wider">Method:</span>{' '}
                    <span className="capitalize">{term.extractionMethod}</span>
                  </div>
                </div>

                {/* Override Value */}
                <div>
                  <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">
                    Override Value (JSON)
                  </label>
                  <textarea
                    value={overrideValue}
                    onChange={(e) => {
                      setOverrideValue(e.target.value);
                      setParseError(null);
                    }}
                    rows={5}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm font-mono focus:outline-none focus:border-accent resize-none"
                    placeholder='{"model": "per_user"}'
                  />
                  {parseError && (
                    <p className="mt-1 text-xs text-red-400">{parseError}</p>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">
                    Reason (Optional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-accent resize-none"
                    placeholder="Explain why this value is being corrected..."
                  />
                </div>

                {/* Error */}
                {overrideMutation.isError && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    <AlertTriangle size={16} />
                    {overrideMutation.error instanceof Error
                      ? overrideMutation.error.message
                      : 'Failed to save override'}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  {term.isOverridden ? (
                    <button
                      type="button"
                      onClick={() => removeMutation.mutate()}
                      disabled={removeMutation.isPending}
                      className="px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {removeMutation.isPending ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        'Remove Override'
                      )}
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={overrideMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-accent text-black rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                    >
                      {overrideMutation.isPending ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Save Override
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
