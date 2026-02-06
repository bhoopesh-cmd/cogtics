import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, AlertTriangle, Lightbulb, Tag, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AIAnalysis {
  rootCause?: string;
  businessImpact?: string;
  suggestedFix?: string;
  confidence?: number;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  tags?: string[];
  relatedIssueIds?: string[];
  needsReview?: boolean;
}

interface AIAnalysisPanelProps {
  analysis: AIAnalysis | null;
}

export function AIAnalysisPanel({ analysis }: AIAnalysisPanelProps) {
  if (!analysis) {
    return null;
  }

  const hasContent = analysis.rootCause || analysis.businessImpact || analysis.suggestedFix;
  
  if (!hasContent) {
    return null;
  }

  const priorityColors = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/30',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-[#ff6500]" size={20} />
          <h3 className="text-lg font-medium text-white">AI Analysis</h3>
        </div>
        {analysis.needsReview && (
          <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
            <AlertTriangle size={12} />
            Needs Review
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Root Cause */}
        {analysis.rootCause && (
          <div>
            <h4 className="text-sm text-zinc-500 mb-2">Root Cause</h4>
            <p className="text-sm text-zinc-300">{analysis.rootCause}</p>
          </div>
        )}

        {/* Business Impact */}
        {analysis.businessImpact && (
          <div>
            <h4 className="text-sm text-zinc-500 mb-2">Business Impact</h4>
            <p className="text-sm text-zinc-300">{analysis.businessImpact}</p>
          </div>
        )}

        {/* Suggested Fix */}
        {analysis.suggestedFix && (
          <div>
            <h4 className="text-sm text-zinc-500 mb-2 flex items-center gap-1">
              <Lightbulb size={14} />
              Suggested Fix
            </h4>
            <div className="bg-zinc-800/50 rounded-lg p-3 border-l-2 border-[#ff6500]">
              <p className="text-sm text-zinc-300">{analysis.suggestedFix}</p>
            </div>
          </div>
        )}

        {/* Priority & Confidence */}
        <div className="flex items-center gap-4 pt-2">
          {analysis.priority && (
            <span className={`px-2 py-1 rounded text-xs font-medium border ${priorityColors[analysis.priority]}`}>
              {analysis.priority.toUpperCase()} PRIORITY
            </span>
          )}
          {analysis.confidence !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Confidence:</span>
              <span className="text-xs text-zinc-300">{Math.round(analysis.confidence * 100)}%</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {analysis.tags && analysis.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2">
            <Tag size={14} className="text-zinc-500" />
            {analysis.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Related Issues */}
        {analysis.relatedIssueIds && analysis.relatedIssueIds.length > 0 && (
          <div className="pt-2 border-t border-zinc-800">
            <h4 className="text-sm text-zinc-500 mb-2">Related Issues</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.relatedIssueIds.map((issueId) => (
                <Link
                  key={issueId}
                  to={`/issues/${issueId}`}
                  className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300 transition-colors"
                >
                  {issueId.slice(0, 12)}...
                  <ExternalLink size={10} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
