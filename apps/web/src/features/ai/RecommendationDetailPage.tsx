import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Lightbulb, Play, Check, X, 
  ExternalLink, Clock, User, FileText, AlertTriangle 
} from 'lucide-react';
import * as api from '@/lib/api/endpoints';
import type { AIRecommendation, Issue } from '@/lib/api/endpoints';
import { 
  PriorityBadge, 
  EffortIndicator, 
  ImpactDisplay, 
  ReviewStatusBadge,
  DismissModal 
} from './components';

export function RecommendationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recommendation, setRecommendation] = useState<(AIRecommendation & { issues?: Issue[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [showDismissModal, setShowDismissModal] = useState(false);

  useEffect(() => {
    if (id) loadRecommendation();
  }, [id]);

  async function loadRecommendation() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRecommendation(id);
      if (!res.ok) throw new Error(res.error);
      setRecommendation(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendation');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSimulation() {
    if (!id) return;
    setActionLoading(true);
    try {
      const res = await api.createSimulationFromRecommendation(id);
      if (!res.ok) throw new Error(res.error);
      navigate(`/simulations/${res.data.simulationId}`);
    } catch (err) {
      console.error('Failed to create simulation:', err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAccept() {
    if (!id) return;
    setActionLoading(true);
    try {
      const res = await api.acceptRecommendation(id);
      if (!res.ok) throw new Error(res.error);
      loadRecommendation();
    } catch (err) {
      console.error('Failed to accept:', err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApply() {
    if (!id) return;
    setActionLoading(true);
    try {
      const res = await api.applyRecommendation(id);
      if (!res.ok) throw new Error(res.error);
      loadRecommendation();
    } catch (err) {
      console.error('Failed to apply:', err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDismiss(notes?: string) {
    if (!id) return;
    const res = await api.dismissRecommendation(id, notes);
    if (!res.ok) throw new Error(res.error);
    setShowDismissModal(false);
    loadRecommendation();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff6500]" />
      </div>
    );
  }

  if (error || !recommendation) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/ai/recommendations')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white"
        >
          <ArrowLeft size={20} />
          Back to Recommendations
        </button>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
          {error || 'Recommendation not found'}
        </div>
      </div>
    );
  }

  const suggestedOverrides = recommendation.suggestedSimulation?.overrides || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
        <button
          onClick={() => navigate('/ai/recommendations')}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-zinc-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Lightbulb className="text-[#ff6500]" size={24} />
            <PriorityBadge priority={recommendation.priority} />
            <ReviewStatusBadge status={recommendation.status} />
          </div>
          <h1 className="text-xl font-semibold text-white">{recommendation.title}</h1>
        </div>

        {recommendation.status === 'pending' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateSimulation}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Play size={18} />
              Create Simulation
            </button>
            <button
              onClick={handleAccept}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Check size={18} />
              Accept
            </button>
            <button
              onClick={() => setShowDismissModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
            >
              <X size={18} />
              Dismiss
            </button>
          </div>
        )}

        {recommendation.status === 'accepted' && (
          <button
            onClick={handleApply}
            disabled={actionLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Check size={18} />
            Apply Recommendation
          </button>
        )}
      </div>

      {/* Simulation Link */}
      {recommendation.simulationId && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Play className="text-purple-500" size={20} />
              <span className="text-purple-400">
                A simulation was created from this recommendation
              </span>
            </div>
            <Link
              to={`/simulations/${recommendation.simulationId}`}
              className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
            >
              View Simulation <ExternalLink size={14} />
            </Link>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
          >
            <h2 className="text-lg font-medium text-white mb-4">Description</h2>
            <p className="text-zinc-300 whitespace-pre-wrap">{recommendation.description}</p>
          </motion.div>

          {/* AI Reasoning */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
          >
            <h2 className="text-lg font-medium text-white mb-4">AI Reasoning</h2>
            <div className="bg-zinc-800/50 rounded-lg p-4 border-l-4 border-[#ff6500]">
              <p className="text-zinc-300 whitespace-pre-wrap">{recommendation.reasoning}</p>
            </div>
          </motion.div>

          {/* Suggested Overrides */}
          {suggestedOverrides.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
            >
              <h2 className="text-lg font-medium text-white mb-4">Suggested Changes</h2>
              <div className="space-y-3">
                {suggestedOverrides.map((override, idx) => (
                  <div
                    key={idx}
                    className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-white capitalize">
                        {override.type?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">
                        {override.targetId}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-zinc-500">Field: </span>
                        <span className="text-zinc-300">{override.field}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">From: </span>
                        <span className="text-red-400 font-mono">
                          {JSON.stringify(override.originalValue)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">To: </span>
                        <span className="text-green-400 font-mono">
                          {JSON.stringify(override.newValue)}
                        </span>
                      </div>
                      {override.description && (
                        <div className="col-span-2">
                          <span className="text-zinc-500">Note: </span>
                          <span className="text-zinc-400">{override.description}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Related Issues */}
          {recommendation.issues && recommendation.issues.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
            >
              <h2 className="text-lg font-medium text-white mb-4">Related Issues</h2>
              <div className="space-y-2">
                {recommendation.issues.map((issue) => (
                  <Link
                    key={issue.id}
                    to={`/issues/${issue.id}`}
                    className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle 
                        size={16} 
                        className={
                          issue.severity === 'critical' ? 'text-red-500' :
                          issue.severity === 'high' ? 'text-orange-500' :
                          'text-yellow-500'
                        } 
                      />
                      <span className="font-mono text-sm text-zinc-400">{issue.ruleId}</span>
                      <span className="text-sm text-zinc-300">{issue.category}</span>
                    </div>
                    <ExternalLink size={14} className="text-zinc-500" />
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Impact */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
          >
            <h2 className="text-sm text-zinc-500 mb-3">Estimated Impact</h2>
            <ImpactDisplay impact={recommendation.estimatedImpact} size="lg" />
            {recommendation.estimatedImpact?.timeHorizon && (
              <p className="text-xs text-zinc-500 mt-2">
                Time horizon: {recommendation.estimatedImpact.timeHorizon}
              </p>
            )}
          </motion.div>

          {/* Effort */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
          >
            <h2 className="text-sm text-zinc-500 mb-3">Implementation Effort</h2>
            <EffortIndicator effort={recommendation.effort} />
          </motion.div>

          {/* Metadata */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4"
          >
            <h2 className="text-sm text-zinc-500">Details</h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock size={14} className="text-zinc-500" />
                <span className="text-zinc-500">Created:</span>
                <span className="text-zinc-300">
                  {new Date(recommendation.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <FileText size={14} className="text-zinc-500" />
                <span className="text-zinc-500">Issues:</span>
                <span className="text-zinc-300">
                  {recommendation.issueIds.length}
                </span>
              </div>

              {recommendation.actionedAt && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={14} className="text-zinc-500" />
                    <span className="text-zinc-500">Actioned:</span>
                    <span className="text-zinc-300">
                      {new Date(recommendation.actionedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {recommendation.actionedBy && (
                    <div className="flex items-center gap-2 text-sm">
                      <User size={14} className="text-zinc-500" />
                      <span className="text-zinc-500">By:</span>
                      <span className="text-zinc-300">{recommendation.actionedBy}</span>
                    </div>
                  )}
                </>
              )}

              {recommendation.actionNotes && (
                <div className="pt-2 border-t border-zinc-800">
                  <span className="text-xs text-zinc-500">Notes:</span>
                  <p className="text-sm text-zinc-300 mt-1">{recommendation.actionNotes}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* IDs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-3"
          >
            <h2 className="text-sm text-zinc-500">References</h2>
            <div className="space-y-2 text-xs font-mono">
              <div>
                <span className="text-zinc-500">ID: </span>
                <span className="text-zinc-400">{recommendation.id}</span>
              </div>
              <div>
                <span className="text-zinc-500">Snapshot: </span>
                <span className="text-zinc-400">{recommendation.snapshotId}</span>
              </div>
              {recommendation.runId && (
                <div>
                  <span className="text-zinc-500">Run: </span>
                  <span className="text-zinc-400">{recommendation.runId}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      {showDismissModal && recommendation && (
        <DismissModal
          isOpen={true}
          onClose={() => setShowDismissModal(false)}
          onConfirm={handleDismiss}
          title={recommendation.title}
          itemType="recommendation"
        />
      )}
    </div>
  );
}
