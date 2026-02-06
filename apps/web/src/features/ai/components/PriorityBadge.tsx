import React from 'react';
import type { RecommendationPriority } from '@/lib/api/endpoints';

interface PriorityBadgeProps {
  priority: RecommendationPriority;
}

const PRIORITY_CONFIG: Record<RecommendationPriority, { label: string; color: string }> = {
  critical: { label: 'Critical', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  high: { label: 'High', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  medium: { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  low: { label: 'Low', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.low;
  
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
}
