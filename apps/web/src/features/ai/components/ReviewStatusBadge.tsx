import React from 'react';
import type { AIDiscoveryReviewStatus, RecommendationStatus } from '@/lib/api/endpoints';

interface ReviewStatusBadgeProps {
  status: AIDiscoveryReviewStatus | RecommendationStatus;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  confirmed: { label: 'Confirmed', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  dismissed: { label: 'Dismissed', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
  accepted: { label: 'Accepted', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  simulated: { label: 'Simulated', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  applied: { label: 'Applied', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

export function ReviewStatusBadge({ status }: ReviewStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
}
