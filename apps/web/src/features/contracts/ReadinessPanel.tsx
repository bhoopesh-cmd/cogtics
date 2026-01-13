import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Shield,
  AlertCircle,
  Check,
} from 'lucide-react';
import { getContractReadiness, markContractReviewed } from '@/lib/api/endpoints';

interface ReadinessPanelProps {
  contractId: string;
}

export function ReadinessPanel({ contractId }: ReadinessPanelProps) {
  const queryClient = useQueryClient();

  const { data: readiness, isLoading } = useQuery({
    queryKey: ['contract-readiness', contractId],
    queryFn: async () => {
      const res = await getContractReadiness(contractId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const markReviewedMutation = useMutation({
    mutationFn: async () => {
      const res = await markContractReviewed(contractId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-readiness', contractId] });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle size={48} className="text-green-400" />;
      case 'needs_review':
        return <AlertTriangle size={48} className="text-yellow-400" />;
      default:
        return <XCircle size={48} className="text-red-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'text-green-400';
      case 'needs_review':
        return 'text-yellow-400';
      default:
        return 'text-red-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-500/10 border-green-500/30';
      case 'needs_review':
        return 'bg-yellow-500/10 border-yellow-500/30';
      default:
        return 'bg-red-500/10 border-red-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  const status = readiness?.status || 'incomplete';
  const confidenceScore = readiness?.confidenceScore || 0;
  const missingTerms = readiness?.missingTerms || [];
  const lowConfidenceTerms = readiness?.lowConfidenceTerms || [];

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`p-8 rounded-xl border ${getStatusBg(status)} text-center`}
      >
        <div className="flex justify-center mb-4">
          {getStatusIcon(status)}
        </div>
        <h2 className={`text-2xl font-medium mb-2 ${getStatusColor(status)}`}>
          {status === 'ready' && 'Ready for Use'}
          {status === 'needs_review' && 'Needs Review'}
          {status === 'incomplete' && 'Incomplete'}
        </h2>
        <p className="text-zinc-400 mb-6">
          {status === 'ready' && 'This contract has all required terms extracted with high confidence.'}
          {status === 'needs_review' && 'Some terms are missing or have low confidence and need manual review.'}
          {status === 'incomplete' && 'Critical terms are missing. Please upload a complete contract document.'}
        </p>

        {status !== 'ready' && (
          <button
            onClick={() => markReviewedMutation.mutate()}
            disabled={markReviewedMutation.isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-black rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {markReviewedMutation.isPending ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            Mark as Reviewed
          </button>
        )}

        {readiness?.reviewedAt && (
          <div className="mt-4 text-xs text-zinc-500">
            Reviewed on {new Date(readiness.reviewedAt).toLocaleString()}
          </div>
        )}
      </motion.div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-center">
          <div className="text-3xl font-light text-accent mb-1">
            {confidenceScore}%
          </div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">
            Confidence
          </div>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-center">
          <div className="text-3xl font-light text-white mb-1">
            {readiness?.extractedTermsCount || 0}
          </div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">
            Terms Extracted
          </div>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-center">
          <div className="text-3xl font-light text-white mb-1">
            {readiness?.requiredTermsCount || 0}
          </div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">
            Required Terms
          </div>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-center">
          <div className={`text-3xl font-light mb-1 ${missingTerms.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {missingTerms.length}
          </div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">
            Missing Terms
          </div>
        </div>
      </div>

      {/* Issues */}
      {(missingTerms.length > 0 || lowConfidenceTerms.length > 0) && (
        <div className="grid grid-cols-2 gap-6">
          {/* Missing Terms */}
          {missingTerms.length > 0 && (
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={18} className="text-red-400" />
                <h3 className="font-medium">Missing Terms</h3>
              </div>
              <div className="space-y-2">
                {missingTerms.map((term: string) => (
                  <div
                    key={term}
                    className="flex items-center gap-2 p-2 bg-red-500/5 border border-red-500/20 rounded"
                  >
                    <XCircle size={14} className="text-red-400" />
                    <span className="text-sm capitalize">
                      {term.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low Confidence Terms */}
          {lowConfidenceTerms.length > 0 && (
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={18} className="text-yellow-400" />
                <h3 className="font-medium">Low Confidence Terms</h3>
              </div>
              <div className="space-y-2">
                {lowConfidenceTerms.map((item: { termType: string; confidence: number }) => (
                  <div
                    key={item.termType}
                    className="flex items-center justify-between p-2 bg-yellow-500/5 border border-yellow-500/20 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-yellow-400" />
                      <span className="text-sm capitalize">
                        {item.termType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-yellow-400">
                      {Math.round(item.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ready State */}
      {status === 'ready' && missingTerms.length === 0 && lowConfidenceTerms.length === 0 && (
        <div className="p-6 bg-green-500/5 border border-green-500/20 rounded-lg text-center">
          <div className="flex justify-center mb-3">
            <Shield size={32} className="text-green-400" />
          </div>
          <h3 className="font-medium text-green-400 mb-2">All Checks Passed</h3>
          <p className="text-sm text-zinc-400">
            This contract is ready for downstream processing including revenue recognition and anomaly detection.
          </p>
        </div>
      )}
    </div>
  );
}
