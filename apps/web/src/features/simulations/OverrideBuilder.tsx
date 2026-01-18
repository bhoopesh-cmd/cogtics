import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import type { SimulationOverride } from '@/lib/api/endpoints';

interface OverrideBuilderProps {
  overrides: SimulationOverride[];
  onAddOverride: (override: Omit<SimulationOverride, 'id' | 'createdAt' | 'isValid' | 'validationMessage'>) => Promise<void>;
  onRemoveOverride: (overrideId: string) => Promise<void>;
  disabled?: boolean;
}

const OVERRIDE_TYPES = [
  { value: 'contract_term', label: 'Contract Term', description: 'Change ARR, dates, or billing frequency' },
  { value: 'price_change', label: 'Price Change', description: 'Apply percentage or absolute price changes' },
  { value: 'discount_change', label: 'Discount Change', description: 'Apply or modify discounts' },
  { value: 'timing_shift', label: 'Timing Shift', description: 'Shift recognition dates' },
  { value: 'billing_adjustment', label: 'Billing Adjustment', description: 'Adjust invoice amounts' },
  { value: 'usage_adjustment', label: 'Usage Adjustment', description: 'Add or modify usage events' },
] as const;

const TARGET_TYPES = [
  { value: 'contract', label: 'Contract' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'obligation', label: 'Obligation' },
  { value: 'line_item', label: 'Line Item' },
  { value: 'customer', label: 'Customer' },
] as const;

const CONTRACT_FIELDS = [
  { value: 'arr', label: 'ARR', type: 'number' },
  { value: 'discount_rate', label: 'Discount Rate', type: 'number' },
  { value: 'start_date', label: 'Start Date', type: 'date' },
  { value: 'end_date', label: 'End Date', type: 'date' },
  { value: 'billing_frequency', label: 'Billing Frequency', type: 'select' },
];

export function OverrideBuilder({
  overrides,
  onAddOverride,
  onRemoveOverride,
  disabled = false,
}: OverrideBuilderProps) {
  const [showForm, setShowForm] = useState(false);
  const [expandedOverrides, setExpandedOverrides] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [overrideType, setOverrideType] = useState<string>('contract_term');
  const [targetType, setTargetType] = useState<string>('contract');
  const [targetId, setTargetId] = useState('');
  const [fieldPath, setFieldPath] = useState('');
  const [overrideValue, setOverrideValue] = useState('');

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedOverrides);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedOverrides(newSet);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!targetId.trim()) {
      setError('Target ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parse the value based on field type
      let parsedValue: unknown = overrideValue;
      if (overrideType === 'contract_term') {
        const field = CONTRACT_FIELDS.find(f => f.value === fieldPath);
        if (field?.type === 'number') {
          parsedValue = parseFloat(overrideValue);
        }
      } else if (overrideType === 'price_change') {
        parsedValue = { pricePct: parseFloat(overrideValue) };
      } else if (overrideType === 'discount_change') {
        parsedValue = { discountPct: parseFloat(overrideValue) };
      }

      await onAddOverride({
        overrideType: overrideType as SimulationOverride['overrideType'],
        targetType: targetType as SimulationOverride['targetType'],
        targetId: targetId.trim(),
        fieldPath: fieldPath || null,
        originalValue: null,
        overrideValue: parsedValue,
        sequenceNumber: overrides.length,
      });

      // Reset form
      setTargetId('');
      setFieldPath('');
      setOverrideValue('');
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add override');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (overrideId: string) => {
    setLoading(true);
    try {
      await onRemoveOverride(overrideId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove override');
    } finally {
      setLoading(false);
    }
  };

  const getOverrideTypeLabel = (type: string) => {
    return OVERRIDE_TYPES.find(t => t.value === type)?.label || type;
  };

  const getTargetTypeLabel = (type: string) => {
    return TARGET_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-4">
      {/* Existing Overrides */}
      <div className="space-y-3">
        {overrides.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <p>No overrides added yet.</p>
            <p className="text-sm mt-1">Add overrides to modify snapshot data.</p>
          </div>
        ) : (
          overrides.map((override, idx) => (
            <motion.div
              key={override.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-zinc-800 rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-4 bg-zinc-900/50 cursor-pointer hover:bg-zinc-900/80 transition-colors"
                onClick={() => toggleExpanded(override.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-zinc-500">#{idx + 1}</span>
                  <span className="text-sm font-medium text-white">
                    {getOverrideTypeLabel(override.overrideType)}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {getTargetTypeLabel(override.targetType)}:{' '}
                    <span className="font-mono">{override.targetId.substring(0, 12)}...</span>
                  </span>
                  {!override.isValid && (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <AlertCircle size={12} />
                      Invalid
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!disabled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(override.id);
                      }}
                      className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  {expandedOverrides.has(override.id) ? (
                    <ChevronUp size={16} className="text-zinc-500" />
                  ) : (
                    <ChevronDown size={16} className="text-zinc-500" />
                  )}
                </div>
              </div>
              
              {expandedOverrides.has(override.id) && (
                <div className="p-4 bg-zinc-900/30 border-t border-zinc-800">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-500">Field:</span>{' '}
                      <span className="text-white">{override.fieldPath || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Sequence:</span>{' '}
                      <span className="text-white">{override.sequenceNumber}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-zinc-500">Value:</span>{' '}
                      <code className="text-[#ff6500] bg-zinc-800 px-2 py-1 rounded">
                        {JSON.stringify(override.overrideValue)}
                      </code>
                    </div>
                    {override.validationMessage && (
                      <div className="col-span-2 text-amber-400 text-xs">
                        {override.validationMessage}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Add Override Form */}
      {!disabled && (
        <>
          {showForm ? (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSubmit}
              className="p-4 border border-zinc-700 rounded-lg bg-zinc-900/50 space-y-4"
            >
              {error && (
                <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Override Type
                  </label>
                  <select
                    value={overrideType}
                    onChange={(e) => setOverrideType(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-[#ff6500]"
                  >
                    {OVERRIDE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Target Type
                  </label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-[#ff6500]"
                  >
                    {TARGET_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Target ID
                </label>
                <input
                  type="text"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="e.g., ctr_abc123..."
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-[#ff6500]"
                  required
                />
              </div>

              {overrideType === 'contract_term' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Field
                  </label>
                  <select
                    value={fieldPath}
                    onChange={(e) => setFieldPath(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-[#ff6500]"
                  >
                    <option value="">Select field...</option>
                    {CONTRACT_FIELDS.map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  New Value
                  {overrideType === 'price_change' && ' (% change)'}
                  {overrideType === 'discount_change' && ' (discount %)'}
                </label>
                <input
                  type={
                    overrideType === 'contract_term' && fieldPath?.includes('date')
                      ? 'date'
                      : 'text'
                  }
                  value={overrideValue}
                  onChange={(e) => setOverrideValue(e.target.value)}
                  placeholder="Enter new value..."
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-[#ff6500]"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-3 py-2 border border-zinc-700 rounded text-zinc-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-3 py-2 bg-[#ff6500] text-black font-medium rounded text-sm hover:bg-[#ff8533] disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Adding...' : 'Add Override'}
                </button>
              </div>
            </motion.form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 p-4 border border-dashed border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
            >
              <Plus size={16} />
              Add Override
            </button>
          )}
        </>
      )}
    </div>
  );
}
