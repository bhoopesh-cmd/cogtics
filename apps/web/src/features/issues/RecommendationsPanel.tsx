import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Play, Eye, ChevronRight, TrendingUp } from 'lucide-react';
import * as api from '@/lib/api/endpoints';
import type { AIRecommendation } from '@/lib/api/endpoints';

interface RecommendationsPanelProps {
  issueId: string;
}

export function RecommendationsPanel({ issueId }: RecommendationsPanelProps) {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, [issueId]);

  async function loadRecommendations() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getIssueRecommendations(issueId);
      if (!res.ok) throw new Error(res.error);
      setRecommendations(res.data.recommendations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSimulation(rec: AIRecommendation) {
    setActionLoading(rec.id);
    try {
      const res = await api.createSimulationFromRecommendation(rec.id);
      if (!res.ok) throw new Error(res.error);
      navigate(`/simulations/${res.data.simulationId}`);
    } catch (err) {
      console.error('Failed to create simulation:', err);
    } finally {
      setActionLoading(null);
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="text-[#ff6500]" size={20} />
          <h3 className="text-lg font-medium text-white">AI Recommendations</h3>
        </div>
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#ff6500]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="text-[#ff6500]" size={20} />
          <h3 className="text-lg font-medium text-white">AI Recommendations</h3>
        </div>
        <p className="text-sm text-zinc-500">{error}</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null; // Don't show panel if no recommendations
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="text-[#ff6500]" size={20} />
        <h3 className="text-lg font-medium text-white">AI Recommendations</h3>
        <span className="text-xs text-zinc-500">({recommendations.length})</span>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white mb-1 truncate">
                  {rec.title}
                </h4>
                <p className="text-xs text-zinc-500 line-clamp-2 mb-2">
                  {rec.description}
                </p>
                {rec.estimatedImpact?.revenueChange !== undefined && (
                  <div className="flex items-center gap-1 text-xs">
                    <TrendingUp size={12} className="text-green-400" />
                    <span className="text-green-400">
                      {rec.estimatedImpact.revenueChange > 0 ? '+' : ''}
                      {formatCurrency(rec.estimatedImpact.revenueChange)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate(`/ai/recommendations/${rec.id}`)}
                  className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                  title="View Details"
                >
                  <Eye size={14} className="text-zinc-400" />
                </button>
                {rec.status === 'pending' && (
                  <button
                    onClick={() => handleCreateSimulation(rec)}
                    disabled={actionLoading === rec.id}
                    className="p-1.5 hover:bg-purple-500/20 rounded transition-colors disabled:opacity-50"
                    title="Create Simulation"
                  >
                    <Play size={14} className="text-purple-400" />
                  </button>
                )}
                <ChevronRight size={14} className="text-zinc-600" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
