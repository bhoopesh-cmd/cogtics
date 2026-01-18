import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, FileText, Layers } from 'lucide-react';
import {
  createSimulation,
  listSimulationTemplates,
  listSnapshots,
  type SimulationTemplate,
} from '@/lib/api/endpoints';

interface CreateSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (simulationId: string) => void;
}

interface Snapshot {
  id: string;
  name: string | null;
  status: string;
  createdAt: string;
}

export function CreateSimulationModal({
  isOpen,
  onClose,
  onCreated,
}: CreateSimulationModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [snapshotId, setSnapshotId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [templates, setTemplates] = useState<SimulationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [snapshotsRes, templatesRes] = await Promise.all([
        listSnapshots({ limit: 50, status: 'complete' }),
        listSimulationTemplates({ isActive: true }),
      ]);
      
      // Unwrap API responses
      if (snapshotsRes.ok) {
        setSnapshots(snapshotsRes.data.snapshots || []);
      }
      if (templatesRes.ok) {
        setTemplates(templatesRes.data.templates || []);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !snapshotId) {
      setError('Name and snapshot are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await createSimulation({
        name: name.trim(),
        description: description.trim() || undefined,
        snapshotId,
        templateId: templateId || undefined,
      });
      
      if (!res.ok) {
        throw new Error(res.error || 'Failed to create simulation');
      }
      
      onCreated(res.data.id);
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create simulation');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setSnapshotId('');
    setTemplateId('');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative z-10 w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl"
        >
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#ff6500]/10 rounded-lg">
                <Plus size={20} className="text-[#ff6500]" />
              </div>
              <h2 className="text-xl font-medium text-white">New Simulation</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Simulation Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q1 Price Adjustment Analysis"
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#ff6500] transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this simulation..."
                rows={3}
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#ff6500] transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                <FileText size={14} className="inline mr-1" />
                Base Snapshot *
              </label>
              <select
                value={snapshotId}
                onChange={(e) => setSnapshotId(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#ff6500] transition-colors appearance-none cursor-pointer"
                required
              >
                <option value="">Select a snapshot...</option>
                {snapshots.map((snap) => (
                  <option key={snap.id} value={snap.id}>
                    {snap.name || snap.id} ({new Date(snap.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                <Layers size={14} className="inline mr-1" />
                Template (Optional)
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#ff6500] transition-colors appearance-none cursor-pointer"
              >
                <option value="">Start from scratch</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.overridesCount} overrides)
                  </option>
                ))}
              </select>
              {templateId && (
                <p className="mt-2 text-xs text-zinc-500">
                  Overrides from this template will be copied to the new simulation.
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim() || !snapshotId}
                className="flex-1 px-4 py-3 bg-[#ff6500] text-black font-medium rounded-lg hover:bg-[#ff8533] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create Simulation'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
